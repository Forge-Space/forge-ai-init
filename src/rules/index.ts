import { securityRules } from './security.js';
import { engineeringRules } from './engineering.js';
import { errorHandlingRules } from './error-handling.js';
import { scalabilityRules } from './scalability.js';
import { typeSafetyRules } from './type-safety.js';
import { asyncRules } from './async.js';
import { reactRules } from './react.js';
import { architectureRules } from './architecture.js';
import { accessibilityRules } from './accessibility.js';
import { hardcodedValuesRules } from './hardcoded-values.js';

export const RULES = [
  ...securityRules,
  ...engineeringRules,
  ...errorHandlingRules,
  ...scalabilityRules,
  ...typeSafetyRules,
  ...asyncRules,
  ...reactRules,
  ...architectureRules,
  ...accessibilityRules,
  ...hardcodedValuesRules,
];
