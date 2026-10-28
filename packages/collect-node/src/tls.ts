import { connect, type DetailedPeerCertificate } from 'node:tls';
import type { TlsInfo } from '@sitelens/core';

const iso = (date: string | undefined) => (date ? new Date(date).toISOString() : undefined);

function issuerName(cert: DetailedPeerCertificate): string | undefined {
  const issuer = cert.issuer as Record<string, string | string[] | undefined> | undefined;
  const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return pick(issuer?.O) ?? pick(issuer?.CN);
}

/**
 * Opens a TLS connection the way a browser would (with SNI) and reads the certificate.
 * Verification is reported, not enforced: a broken certificate is exactly what we want to see.
 */
export function inspectTls(hostname: string, port = 443, timeoutMs = 10_000): Promise<TlsInfo> {
  return new Promise((resolve, reject) => {
    const socket = connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate(true);
        const altNames = (cert.subjectaltname ?? '')
          .split(',')
          .map((entry) => entry.trim().replace(/^DNS:/, ''))
          .filter(Boolean);
        resolve({
          authorized: socket.authorized,
          error: socket.authorizationError ? String(socket.authorizationError) : undefined,
          protocol: socket.getProtocol() ?? undefined,
          issuer: issuerName(cert),
          subject: (cert.subject as Record<string, string> | undefined)?.CN,
          altNames,
          validFrom: iso(cert.valid_from),
          validTo: iso(cert.valid_to),
        });
        socket.end();
      },
    );
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`TLS handshake with ${hostname} timed out`));
    });
    socket.on('error', reject);
  });
}
