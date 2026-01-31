export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePermission(permission: string | null | undefined): ValidationResult {
  if (permission == null) {
    return { valid: false, error: 'Permission cannot be null or undefined' };
  }

  if (permission === '') {
    return { valid: false, error: 'Permission cannot be empty' };
  }

  if (permission.includes('//')) {
    return { valid: false, error: 'Permission cannot contain consecutive slashes' };
  }

  if (permission === '*') {
    return { valid: true };
  }

  if (permission.startsWith('/')) {
    return { valid: false, error: 'Permission cannot start with a slash' };
  }

  if (permission.endsWith('/')) {
    return { valid: false, error: 'Permission cannot end with a slash' };
  }

  return { valid: true };
}

export function validatePattern(pattern: string | null | undefined): ValidationResult {
  if (pattern == null) {
    return { valid: false, error: 'Pattern cannot be null or undefined' };
  }

  if (pattern === '') {
    return { valid: false, error: 'Pattern cannot be empty' };
  }

  if (pattern.includes('//')) {
    return { valid: false, error: 'Pattern cannot contain consecutive slashes' };
  }

  return { valid: true };
}

export function isValidPermission(permission: string | null | undefined): boolean {
  return validatePermission(permission).valid;
}

export function isValidPattern(pattern: string | null | undefined): boolean {
  return validatePattern(pattern).valid;
}

export function sanitizePermission(permission: string | null | undefined): string | null {
  if (permission == null) {
    return null;
  }
  return permission.trim();
}
