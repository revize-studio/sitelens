import type { CheckDefinition } from '../model';
import { accessibilityChecks } from './accessibility';
import { otherChecks } from './other';
import { performanceChecks } from './performance';
import { securityChecks } from './security';
import { seoChecks } from './seo';

/** Every check, in report order. */
export const allChecks: CheckDefinition[] = [
  ...performanceChecks,
  ...seoChecks,
  ...accessibilityChecks,
  ...securityChecks,
  ...otherChecks,
];
