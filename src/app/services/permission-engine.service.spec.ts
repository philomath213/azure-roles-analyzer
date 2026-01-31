import { TestBed } from '@angular/core/testing';
import { PermissionEngineService } from './permission-engine.service';
import type { RoleDefinition, Permission } from '../models';

describe('PermissionEngineService', () => {
  let service: PermissionEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PermissionEngineService],
    });
    service = TestBed.inject(PermissionEngineService);
  });

  afterEach(() => {
    service.clearCache();
  });

  const createRole = (
    id: string,
    permissions: Permission[],
    name = 'Test Role'
  ): RoleDefinition => ({
    id,
    name,
    type: 'BuiltInRole',
    description: 'Test role',
    assignableScopes: ['/'],
    permissions,
  });

  describe('mergePermissionBlocks', () => {
    it('should merge multiple permission blocks', () => {
      const permissions: Permission[] = [
        {
          actions: ['Microsoft.Compute/*'],
          notActions: ['Microsoft.Compute/*/delete'],
          dataActions: [],
          notDataActions: [],
        },
        {
          actions: ['Microsoft.Storage/*'],
          notActions: [],
          dataActions: ['Microsoft.Storage/*/read'],
          notDataActions: [],
        },
      ];

      const merged = service.mergePermissionBlocks(permissions);

      expect(merged.actions).toContain('Microsoft.Compute/*');
      expect(merged.actions).toContain('Microsoft.Storage/*');
      expect(merged.notActions).toContain('Microsoft.Compute/*/delete');
      expect(merged.dataActions).toContain('Microsoft.Storage/*/read');
    });

    it('should remove duplicate entries', () => {
      const permissions: Permission[] = [
        {
          actions: ['Microsoft.Compute/*', '*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
        {
          actions: ['Microsoft.Compute/*', 'Microsoft.Storage/*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ];

      const merged = service.mergePermissionBlocks(permissions);

      expect(merged.actions.filter((a) => a === 'Microsoft.Compute/*').length).toBe(1);
    });
  });

  describe('computeEffectivePermissions', () => {
    it('should compute effective permissions for Owner role', () => {
      const ownerRole = createRole('owner', [
        {
          actions: ['*'],
          notActions: [],
          dataActions: ['*'],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(ownerRole);

      expect(effective.controlPlane.allowed).toContain('*');
      expect(effective.controlPlane.hasWildcard).toBe(true);
      expect(effective.controlPlane.denied).toEqual([]);
      expect(effective.dataPlane.allowed).toContain('*');
      expect(effective.dataPlane.hasWildcard).toBe(true);
    });

    it('should compute effective permissions for Contributor role', () => {
      const contributorRole = createRole('contributor', [
        {
          actions: ['*'],
          notActions: [
            'Microsoft.Authorization/*/Delete',
            'Microsoft.Authorization/*/Write',
            'Microsoft.Authorization/elevateAccess/Action',
          ],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(contributorRole);

      expect(effective.controlPlane.allowed).toContain('*');
      expect(effective.controlPlane.denied).toContain('Microsoft.Authorization/*/Delete');
      expect(effective.controlPlane.denied).toContain('Microsoft.Authorization/*/Write');
    });

    it('should compute effective permissions for Reader role', () => {
      const readerRole = createRole('reader', [
        {
          actions: ['*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(readerRole);

      expect(effective.controlPlane.allowed).toContain('*/read');
      expect(effective.controlPlane.hasWildcard).toBe(false);
      expect(effective.dataPlane.allowed).toEqual([]);
    });

    it('should handle roles with only data actions', () => {
      const dataRole = createRole('data-role', [
        {
          actions: [],
          notActions: [],
          dataActions: ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(dataRole);

      expect(effective.controlPlane.allowed).toEqual([]);
      expect(effective.dataPlane.allowed).toContain(
        'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'
      );
    });

    it('should cache results', () => {
      const role = createRole('cached-role', [
        {
          actions: ['*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const first = service.computeEffectivePermissions(role);
      const second = service.computeEffectivePermissions(role);

      expect(first).toBe(second); // Same reference (cached)
    });

    it('should filter out explicitly denied actions', () => {
      const role = createRole('filtered-role', [
        {
          actions: ['Microsoft.Compute/*', 'Microsoft.Storage/*'],
          notActions: ['Microsoft.Compute/*'],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(role);

      expect(effective.controlPlane.allowed).not.toContain('Microsoft.Compute/*');
      expect(effective.controlPlane.allowed).toContain('Microsoft.Storage/*');
    });
  });

  describe('matchesPermission', () => {
    it('should match exact permissions', () => {
      expect(
        service.matchesPermission(
          'Microsoft.Compute/virtualMachines/read',
          'Microsoft.Compute/virtualMachines/read'
        )
      ).toBe(true);
    });

    it('should match wildcard patterns', () => {
      expect(
        service.matchesPermission('Microsoft.Compute/*', 'Microsoft.Compute/virtualMachines/read')
      ).toBe(true);
    });

    it('should match global wildcard', () => {
      expect(service.matchesPermission('*', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
    });
  });

  describe('roleGrantsPermission', () => {
    it('should return true when role grants permission via wildcard', () => {
      const role = createRole('test', [
        {
          actions: ['*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      expect(service.roleGrantsPermission(role, 'Microsoft.Compute/virtualMachines/read')).toBe(
        true
      );
    });

    it('should return true when role grants permission via specific pattern', () => {
      const role = createRole('test', [
        {
          actions: ['Microsoft.Compute/*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      expect(service.roleGrantsPermission(role, 'Microsoft.Compute/virtualMachines/read')).toBe(
        true
      );
    });

    it('should return false when permission is denied by notActions', () => {
      const role = createRole('test', [
        {
          actions: ['*'],
          notActions: ['Microsoft.Authorization/*'],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      expect(
        service.roleGrantsPermission(role, 'Microsoft.Authorization/roleAssignments/write')
      ).toBe(false);
    });

    it('should return false when role does not grant permission', () => {
      const role = createRole('test', [
        {
          actions: ['Microsoft.Compute/*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      expect(
        service.roleGrantsPermission(role, 'Microsoft.Storage/storageAccounts/read')
      ).toBe(false);
    });
  });

  describe('roleGrantsDataAction', () => {
    it('should return true for granted data actions', () => {
      const role = createRole('test', [
        {
          actions: [],
          notActions: [],
          dataActions: ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*'],
          notDataActions: [],
        },
      ]);

      expect(
        service.roleGrantsDataAction(
          role,
          'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'
        )
      ).toBe(true);
    });

    it('should return false for denied data actions', () => {
      const role = createRole('test', [
        {
          actions: [],
          notActions: [],
          dataActions: ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*'],
          notDataActions: [
            'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete',
          ],
        },
      ]);

      expect(
        service.roleGrantsDataAction(
          role,
          'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete'
        )
      ).toBe(false);
    });
  });

  describe('getEffectivePermissionList', () => {
    const knownPermissions = [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Compute/virtualMachines/write',
      'Microsoft.Compute/virtualMachines/delete',
      'Microsoft.Storage/storageAccounts/read',
      'Microsoft.Authorization/roleAssignments/write',
    ];

    it('should return all permissions for Owner role', () => {
      const ownerRole = createRole('owner', [
        {
          actions: ['*'],
          notActions: [],
          dataActions: ['*'],
          notDataActions: [],
        },
      ]);

      const result = service.getEffectivePermissionList(ownerRole, knownPermissions);

      expect(result.controlPlane).toEqual(knownPermissions);
    });

    it('should exclude denied permissions for Contributor', () => {
      const contributorRole = createRole('contributor', [
        {
          actions: ['*'],
          notActions: ['Microsoft.Authorization/*'],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const result = service.getEffectivePermissionList(contributorRole, knownPermissions);

      expect(result.controlPlane).not.toContain('Microsoft.Authorization/roleAssignments/write');
      expect(result.controlPlane).toContain('Microsoft.Compute/virtualMachines/read');
    });

    it('should return only matching permissions for scoped roles', () => {
      const computeRole = createRole('compute', [
        {
          actions: ['Microsoft.Compute/*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const result = service.getEffectivePermissionList(computeRole, knownPermissions);

      expect(result.controlPlane).toEqual([
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/virtualMachines/write',
        'Microsoft.Compute/virtualMachines/delete',
      ]);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      const role = createRole('cached-role', [
        {
          actions: ['*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const first = service.computeEffectivePermissions(role);
      service.clearCache();
      const second = service.computeEffectivePermissions(role);

      expect(first).not.toBe(second); // Different references after cache clear
      expect(first).toEqual(second); // But same values
    });
  });

  describe('edge cases', () => {
    it('should handle empty permissions array', () => {
      const role = createRole('empty', []);

      const effective = service.computeEffectivePermissions(role);

      expect(effective.controlPlane.allowed).toEqual([]);
      expect(effective.dataPlane.allowed).toEqual([]);
    });

    it('should handle role with empty permission block', () => {
      const role = createRole('empty-block', [
        {
          actions: [],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(role);

      expect(effective.controlPlane.allowed).toEqual([]);
      expect(effective.dataPlane.allowed).toEqual([]);
    });

    it('should handle complex Azure role patterns', () => {
      // Real-world VM Contributor pattern
      const vmContributor = createRole('vm-contributor', [
        {
          actions: [
            'Microsoft.Authorization/*/read',
            'Microsoft.Compute/availabilitySets/*',
            'Microsoft.Compute/virtualMachines/*',
            'Microsoft.Network/networkInterfaces/*',
          ],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ]);

      const effective = service.computeEffectivePermissions(vmContributor);

      expect(effective.controlPlane.allowed.length).toBe(4);
      expect(effective.controlPlane.hasWildcard).toBe(false);
    });
  });
});
