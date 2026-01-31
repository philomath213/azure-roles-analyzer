import { isValidPattern, isValidPermission } from './permission-validator';

/**
 * Converts an Azure permission pattern to a RegExp.
 * Azure wildcards use * to match any characters within a segment or across segments.
 */
export function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with regex that matches anything (including /)
  const regexPattern = escaped.replace(/\*/g, '.*');
  return new RegExp('^' + regexPattern + '$', 'i');
}

/**
 * Checks if a permission string matches a pattern.
 * Patterns can include wildcards (*).
 */
export function matchesPattern(pattern: string, permission: string): boolean {
  // Handle null/undefined
  if (pattern == null || permission == null) {
    return false;
  }

  // Global wildcard matches everything including empty
  if (pattern === '*') {
    return true;
  }

  // Empty pattern matches empty permission (regex behavior)
  if (pattern === '' && permission === '') {
    return true;
  }

  // Validate inputs using the permission validator
  if (!isValidPattern(pattern) || !isValidPermission(permission)) {
    return false;
  }

  const regex = patternToRegex(pattern);
  return regex.test(permission);
}

/**
 * Checks if any pattern in a list matches the given permission.
 */
export function matchesAnyPattern(patterns: string[], permission: string): boolean {
  return patterns.some((pattern) => matchesPattern(pattern, permission));
}

/**
 * Filters permissions that match any of the given patterns.
 */
export function filterMatchingPermissions(patterns: string[], permissions: string[]): string[] {
  return permissions.filter((permission) => matchesAnyPattern(patterns, permission));
}

/**
 * Checks if a permission is denied by any NotActions pattern.
 */
export function isPermissionDenied(permission: string, notActions: string[]): boolean {
  return matchesAnyPattern(notActions, permission);
}

/**
 * Expands a wildcard pattern to list which specific permissions it would grant
 * from a known set of all possible permissions.
 */
export function expandWildcard(pattern: string, allPermissions: string[]): string[] {
  if (pattern === '*') {
    return [...allPermissions];
  }
  return allPermissions.filter((permission) => matchesPattern(pattern, permission));
}
