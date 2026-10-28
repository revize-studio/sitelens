import { runChecks, type Scores } from '@sitelens/core';
import { describe, expect, it } from 'vitest';
import { page, site } from '../../core/test/site';
import { buildReport, defaultTheme, renderReport } from '../src';

const snapshot = site([
  page('/', '<!doctype html><html lang="pl"><head><title>Firma</title></head><body></body></html>'),
]);
const outcome = runChecks(snapshot);
const assets = { logoSvg: '<svg></svg>', fontSans: '', fontMono: '' };
const scored = (overall: number): Scores => ({ overall, categories: [] });

describe('the note about Revize Studio', () => {
  it('ends the problem list of a weak result', () => {
    const report = buildReport(snapshot, outcome, scored(47), 'pl');
    expect(report.offerHelp).toBe(true);
    expect(renderReport(report, assets)).toContain('href="https://revize.pl"');
  });

  it('leaves good results without it', () => {
    const report = buildReport(snapshot, outcome, scored(70), 'en');
    expect(report.offerHelp).toBe(false);
    expect(renderReport(report, assets)).not.toContain('revize.pl');
  });

  it('stays out of white-label reports', () => {
    const report = buildReport(snapshot, outcome, scored(30), 'pl');
    expect(renderReport(report, assets, { ...defaultTheme, studioNote: false })).not.toContain('revize.pl');
  });
});
