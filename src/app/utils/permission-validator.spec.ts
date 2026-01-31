import {
  validatePermission,
  validatePattern,
  isValidPermission,
  isValidPattern,
  sanitizePermission,
} from './permission-validator';

describe('Permission Validator', () => {
  describe('validatePermission', () => {
    describe('valid permissions', () => {
      it('should accept standard Azure permission format', () => {
        const result = validatePermission('Microsoft.Compute/virtualMachines/read');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept wildcard permission', () => {
        expect(validatePermission('*').valid).toBe(true);
      });

      it('should accept permission with wildcards', () => {
        expect(validatePermission('Microsoft.Compute/*').valid).toBe(true);
        expect(validatePermission('*/read').valid).toBe(true);
        expect(validatePermission('Microsoft.*/virtualMachines/read').valid).toBe(true);
      });

      it('should accept nested resource permissions', () => {
        expect(
          validatePermission(
            'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'
          ).valid
        ).toBe(true);
      });
    });

    describe('invalid permissions', () => {
      it('should reject null', () => {
        const result = validatePermission(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('null');
      });

      it('should reject undefined', () => {
        const result = validatePermission(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('null');
      });

      it('should reject empty string', () => {
        const result = validatePermission('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should reject consecutive slashes', () => {
        const result = validatePermission('Microsoft.Compute//virtualMachines/read');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive slashes');
      });

      it('should reject leading slash', () => {
        const result = validatePermission('/Microsoft.Compute/virtualMachines/read');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('start with a slash');
      });

      it('should reject trailing slash', () => {
        const result = validatePermission('Microsoft.Compute/virtualMachines/');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('end with a slash');
      });
    });
  });

  describe('validatePattern', () => {
    describe('valid patterns', () => {
      it('should accept standard patterns', () => {
        expect(validatePattern('Microsoft.Compute/*').valid).toBe(true);
        expect(validatePattern('*/read').valid).toBe(true);
        expect(validatePattern('*').valid).toBe(true);
      });

      it('should reject empty pattern', () => {
        const result = validatePattern('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should accept complex wildcard patterns', () => {
        expect(validatePattern('Microsoft.*/*/read').valid).toBe(true);
        expect(validatePattern('*/*/*').valid).toBe(true);
      });
    });

    describe('invalid patterns', () => {
      it('should reject null', () => {
        const result = validatePattern(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('null');
      });

      it('should reject undefined', () => {
        const result = validatePattern(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('null');
      });

      it('should reject consecutive slashes', () => {
        const result = validatePattern('Microsoft.Compute//read');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive slashes');
      });
    });
  });

  describe('isValidPermission', () => {
    it('should return true for valid permissions', () => {
      expect(isValidPermission('Microsoft.Compute/virtualMachines/read')).toBe(true);
      expect(isValidPermission('*')).toBe(true);
    });

    it('should return false for invalid permissions', () => {
      expect(isValidPermission(null)).toBe(false);
      expect(isValidPermission(undefined)).toBe(false);
      expect(isValidPermission('')).toBe(false);
      expect(isValidPermission('Microsoft.Compute//read')).toBe(false);
    });
  });

  describe('isValidPattern', () => {
    it('should return true for valid patterns', () => {
      expect(isValidPattern('Microsoft.Compute/*')).toBe(true);
      expect(isValidPattern('*')).toBe(true);
    });

    it('should return false for invalid patterns', () => {
      expect(isValidPattern(null)).toBe(false);
      expect(isValidPattern(undefined)).toBe(false);
      expect(isValidPattern('')).toBe(false);
      expect(isValidPattern('Microsoft//')).toBe(false);
    });
  });

  describe('sanitizePermission', () => {
    it('should trim whitespace', () => {
      expect(sanitizePermission('  Microsoft.Compute/read  ')).toBe('Microsoft.Compute/read');
      expect(sanitizePermission('\tMicrosoft.Compute/read\n')).toBe('Microsoft.Compute/read');
    });

    it('should return null for null input', () => {
      expect(sanitizePermission(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(sanitizePermission(undefined)).toBeNull();
    });

    it('should return empty string if only whitespace', () => {
      expect(sanitizePermission('   ')).toBe('');
    });
  });
});
