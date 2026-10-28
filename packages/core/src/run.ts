import { allChecks } from './checks';
import { htmlPages } from './checks/helpers';
import type { Category, CheckDefinition, DataKey, Finding, SiteSnapshot } from './model';

export interface CheckOutcome {
  findings: Finding[];
  /** Checks that could not run because this mode did not collect their data */
  skipped: { checkId: string; category: Category; missing: DataKey[] }[];
  /** Checks that threw; reported in the appendix instead of ending the audit */
  failed: { checkId: string; message: string }[];
}

/** Runs the checks on a collected snapshot. Pure: no network, no file system. */
export function runChecks(site: SiteSnapshot, checks: CheckDefinition[] = allChecks): CheckOutcome {
  const outcome: CheckOutcome = { findings: [], skipped: [], failed: [] };
  const ctx = { pageCount: htmlPages(site).length };
  for (const check of checks) {
    const missing = check.requires.filter((key) => !site.available.includes(key));
    if (missing.length) {
      outcome.skipped.push({ checkId: check.id, category: check.category, missing });
      continue;
    }
    try {
      outcome.findings.push(...check.run(site, ctx));
    } catch (error) {
      outcome.failed.push({ checkId: check.id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return outcome;
}
