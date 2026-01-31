export {
  patternToRegex,
  matchesPattern,
  matchesAnyPattern,
  filterMatchingPermissions,
  isPermissionDenied,
  expandWildcard,
} from './permission-matcher';

export {
  validatePermission,
  validatePattern,
  isValidPermission,
  isValidPattern,
  sanitizePermission,
} from './permission-validator';

export type { ValidationResult } from './permission-validator';
