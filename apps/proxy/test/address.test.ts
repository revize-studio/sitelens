import { describe, expect, it } from 'vitest';
import { hostProblem, isPublicAddress, withinSites } from '../src/address';

describe('isPublicAddress', () => {
  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1'])(
    'accepts the public IPv4 address %s',
    (address) => expect(isPublicAddress(address)).toBe(true),
  );
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.5.4',
    '172.31.255.255',
    '192.0.2.10',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
  ])('refuses the IPv4 address %s', (address) => expect(isPublicAddress(address)).toBe(false));
  it.each(['2606:4700:4700::1111', '2a00:1450:4001:82a::200e', '2001:4860:4860::8888'])(
    'accepts the public IPv6 address %s',
    (address) => expect(isPublicAddress(address)).toBe(true),
  );
  it.each([
    '::',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:a00:1',
    '64:ff9b::a00:1',
    '2001:db8::1',
    '2002:c0a8:101::1',
    '2001:0:4136:e378::1',
    '[::1]',
  ])('refuses the IPv6 address %s', (address) => expect(isPublicAddress(address)).toBe(false));
  it('reads an IPv4-mapped public address as public', () => {
    expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true);
  });
  it('refuses text that is not an address', () => {
    expect(isPublicAddress('example.com')).toBe(false);
    expect(isPublicAddress('1.2.3')).toBe(false);
    expect(isPublicAddress('1::2::3')).toBe(false);
  });
});

describe('hostProblem', () => {
  it.each([
    'localhost',
    'printer.local',
    'intranet',
    'nas.home.arpa',
    'app.internal',
    '127.0.0.1',
    '[::1]',
    '10.0.0.1',
    '..',
    'localhost..',
    'a..b.com',
  ])('refuses %s', (host) => expect(hostProblem(host)).not.toBeNull());
  it('accepts an ordinary domain name, also with a trailing dot', () => {
    expect(hostProblem('example.com')).toBeNull();
    expect(hostProblem('www.example.co.uk.')).toBeNull();
  });
});

describe('withinSites', () => {
  it('counts the site with or without www, and nothing else under it', () => {
    expect(withinSites('www.example.com', ['example.com'])).toBe(true);
    expect(withinSites('example.com.', ['example.com'])).toBe(true);
    expect(withinSites('cdn.example.com', ['example.com'])).toBe(false);
    expect(withinSites('evil.github.io', ['github.io'])).toBe(false);
  });
});
