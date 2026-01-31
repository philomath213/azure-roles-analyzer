import {
  patternToRegex,
  matchesPattern,
  matchesAnyPattern,
  filterMatchingPermissions,
  isPermissionDenied,
  expandWildcard,
} from './permission-matcher';

describe('Permission Matcher Utilities', () => {
  describe('patternToRegex', () => {
    it('should escape special regex characters', () => {
      const regex = patternToRegex('Microsoft.Compute/virtualMachines/read');
      expect(regex.source).toContain('Microsoft\\.Compute');
    });

    it('should convert * to .* for matching', () => {
      const regex = patternToRegex('Microsoft.Compute/*');
      expect(regex.source).toContain('.*');
    });

    it('should create case-insensitive regex', () => {
      const regex = patternToRegex('Microsoft.Compute/*');
      expect(regex.flags).toContain('i');
    });
  });

  describe('matchesPattern', () => {
    describe('exact matches', () => {
      it('should match exact permission strings', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/virtualMachines/read',
            'Microsoft.Compute/virtualMachines/read'
          )
        ).toBe(true);
      });

      it('should not match different permission strings', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/virtualMachines/read',
            'Microsoft.Compute/virtualMachines/write'
          )
        ).toBe(false);
      });

      it('should match case-insensitively', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/virtualMachines/read',
            'microsoft.compute/virtualmachines/READ'
          )
        ).toBe(true);
      });
    });

    describe('global wildcard (*)', () => {
      it('should match everything with *', () => {
        expect(matchesPattern('*', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
        expect(matchesPattern('*', 'Microsoft.Storage/storageAccounts/write')).toBe(true);
        expect(matchesPattern('*', 'anything')).toBe(true);
      });
    });

    describe('trailing wildcard (Microsoft.Compute/*)', () => {
      it('should match all actions under a resource provider', () => {
        expect(matchesPattern('Microsoft.Compute/*', 'Microsoft.Compute/virtualMachines/read')).toBe(
          true
        );
        expect(
          matchesPattern('Microsoft.Compute/*', 'Microsoft.Compute/virtualMachines/write')
        ).toBe(true);
        expect(matchesPattern('Microsoft.Compute/*', 'Microsoft.Compute/disks/delete')).toBe(true);
      });

      it('should match nested resources', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/*',
            'Microsoft.Compute/virtualMachines/extensions/read'
          )
        ).toBe(true);
      });

      it('should not match other providers', () => {
        expect(
          matchesPattern('Microsoft.Compute/*', 'Microsoft.Storage/storageAccounts/read')
        ).toBe(false);
      });
    });

    describe('leading wildcard (*/read)', () => {
      it('should match all read actions', () => {
        expect(matchesPattern('*/read', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
        expect(matchesPattern('*/read', 'Microsoft.Storage/storageAccounts/read')).toBe(true);
      });

      it('should not match non-read actions', () => {
        expect(matchesPattern('*/read', 'Microsoft.Compute/virtualMachines/write')).toBe(false);
        expect(matchesPattern('*/read', 'Microsoft.Compute/virtualMachines/delete')).toBe(false);
      });
    });

    describe('middle wildcard (Microsoft.*/virtualMachines/read)', () => {
      it('should match across different providers', () => {
        expect(
          matchesPattern('Microsoft.*/virtualMachines/read', 'Microsoft.Compute/virtualMachines/read')
        ).toBe(true);
        expect(
          matchesPattern('Microsoft.*/virtualMachines/read', 'Microsoft.ClassicCompute/virtualMachines/read')
        ).toBe(true);
      });

      it('should not match different resource types', () => {
        expect(
          matchesPattern('Microsoft.*/virtualMachines/read', 'Microsoft.Compute/disks/read')
        ).toBe(false);
      });
    });

    describe('complex patterns', () => {
      it('should match Microsoft.Compute/virtualMachines/*/read', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/virtualMachines/*/read',
            'Microsoft.Compute/virtualMachines/extensions/read'
          )
        ).toBe(true);
      });

      it('should match patterns with multiple wildcards', () => {
        expect(matchesPattern('Microsoft.*/*/read', 'Microsoft.Compute/virtualMachines/read')).toBe(
          true
        );
        expect(matchesPattern('Microsoft.*/*/read', 'Microsoft.Storage/storageAccounts/read')).toBe(
          true
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        expect(matchesPattern('', '')).toBe(true);
        expect(matchesPattern('*', '')).toBe(true);
        expect(matchesPattern('', 'something')).toBe(false);
      });

      it('should handle patterns with only wildcard segments', () => {
        expect(matchesPattern('*/*', 'Microsoft.Compute/read')).toBe(true);
        expect(matchesPattern('*/*/*', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
      });

      it('should match the full string only, not substrings', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/read',
            'XMicrosoft.Compute/readY'
          )
        ).toBe(false);
      });

      it('should not match permissions with extra slashes', () => {
        expect(
          matchesPattern(
            'Microsoft.Compute/*',
            'Microsoft.Compute//virtualMachines/read'
          )
        ).toBe(false);
      });

      it('should return false for null or undefined inputs', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(matchesPattern(null as any, 'Microsoft.Compute/read')).toBe(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(matchesPattern('Microsoft.Compute/*', null as any)).toBe(false);
      });

    });
  });

  describe('matchesAnyPattern', () => {
    it('should return true if any pattern matches', () => {
      const patterns = ['Microsoft.Compute/*', 'Microsoft.Storage/*'];
      expect(matchesAnyPattern(patterns, 'Microsoft.Compute/virtualMachines/read')).toBe(true);
      expect(matchesAnyPattern(patterns, 'Microsoft.Storage/storageAccounts/read')).toBe(true);
    });

    it('should return false if no pattern matches', () => {
      const patterns = ['Microsoft.Compute/*', 'Microsoft.Storage/*'];
      expect(matchesAnyPattern(patterns, 'Microsoft.Network/virtualNetworks/read')).toBe(false);
    });

    it('should return false for empty patterns array', () => {
      expect(matchesAnyPattern([], 'Microsoft.Compute/virtualMachines/read')).toBe(false);
    });

    it('should stop evaluating once a match is found', () => {
      const patterns = ['Microsoft.Compute/*', '***INVALID***'];
      expect(
        matchesAnyPattern(patterns, 'Microsoft.Compute/virtualMachines/read')
      ).toBe(true);
    });
  });

  describe('filterMatchingPermissions', () => {
    it('should filter permissions that match patterns', () => {
      const patterns = ['Microsoft.Compute/*'];
      const permissions = [
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/disks/write',
        'Microsoft.Storage/storageAccounts/read',
      ];

      const result = filterMatchingPermissions(patterns, permissions);
      expect(result).toEqual([
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/disks/write',
      ]);
    });

    it('should return empty array if patterns are empty', () => {
      expect(filterMatchingPermissions([], ['Microsoft.Compute/read'])).toEqual([]);
    });

    it('should preserve duplicates if present', () => {
      const permissions = [
        'Microsoft.Compute/read',
        'Microsoft.Compute/read',
      ];
      expect(
        filterMatchingPermissions(['Microsoft.Compute/*'], permissions)
      ).toEqual(permissions);
    });

  });

  describe('isPermissionDenied', () => {
    it('should return true if permission matches notActions', () => {
      const notActions = ['Microsoft.Authorization/*/Delete', 'Microsoft.Authorization/*/Write'];
      expect(isPermissionDenied('Microsoft.Authorization/roleAssignments/Delete', notActions)).toBe(
        true
      );
    });

    it('should return false if permission does not match notActions', () => {
      const notActions = ['Microsoft.Authorization/*/Delete'];
      expect(isPermissionDenied('Microsoft.Compute/virtualMachines/read', notActions)).toBe(false);
    });

    it('should be case-insensitive when matching notActions', () => {
      const notActions = ['microsoft.authorization/*/delete'];
      expect(
        isPermissionDenied(
          'Microsoft.Authorization/roleAssignments/Delete',
          notActions
        )
      ).toBe(true);
    });
  });

  describe('expandWildcard', () => {
    const allPermissions = [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Compute/virtualMachines/write',
      'Microsoft.Compute/disks/read',
      'Microsoft.Storage/storageAccounts/read',
      'Microsoft.Storage/storageAccounts/write',
    ];

    it('should expand * to all permissions', () => {
      const result = expandWildcard('*', allPermissions);
      expect(result).toEqual(allPermissions);
    });

    it('should expand provider wildcard to matching permissions', () => {
      const result = expandWildcard('Microsoft.Compute/*', allPermissions);
      expect(result).toEqual([
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/virtualMachines/write',
        'Microsoft.Compute/disks/read',
      ]);
    });

    it('should expand action wildcard to matching permissions', () => {
      const result = expandWildcard('*/read', allPermissions);
      expect(result).toEqual([
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/disks/read',
        'Microsoft.Storage/storageAccounts/read',
      ]);
    });

    it('should return empty array if no permissions match', () => {
      const result = expandWildcard('Microsoft.Network/*', allPermissions);
      expect(result).toEqual([]);
    });

    it('should return exact permission if it exists', () => {
      const result = expandWildcard(
        'Microsoft.Compute/disks/read',
        allPermissions
      );
      expect(result).toEqual(['Microsoft.Compute/disks/read']);
    });

    it('should not de-duplicate expanded permissions', () => {
      const permissions = [
        'Microsoft.Compute/read',
        'Microsoft.Compute/read',
      ];
      expect(expandWildcard('*', permissions)).toEqual(permissions);
    });
  });
});
