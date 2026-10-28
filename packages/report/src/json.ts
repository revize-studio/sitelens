import type { CheckOutcome, Lang, Scores, SiteSnapshot } from '@sitelens/core';

export interface AuditJsonInput {
  version: string;
  /** The address as the person typed it */
  url: string;
  pages: number;
  lang: Lang;
  snapshot: SiteSnapshot;
  scores: Scores;
  outcome: CheckOutcome;
  warnings: string[];
  finishedAt: string;
}

/** The raw results in the format `sitelens --json` writes, the same for the CLI and the online audit. */
export function auditJson(input: AuditJsonInput) {
  const { snapshot, outcome } = input;
  return {
    schemaVersion: 1,
    tool: { name: 'sitelens', version: input.version },
    target: { url: input.url, finalUrl: snapshot.site.finalUrl },
    startedAt: snapshot.startedAt,
    finishedAt: input.finishedAt,
    settings: { pages: input.pages, lang: input.lang, mode: snapshot.mode },
    versions: snapshot.versions,
    pages: snapshot.pages.map((p) => ({ url: p.url, finalUrl: p.finalUrl, status: p.status })),
    scores: input.scores,
    findings: outcome.findings,
    skipped: outcome.skipped,
    failed: outcome.failed,
    warnings: input.warnings,
  };
}
