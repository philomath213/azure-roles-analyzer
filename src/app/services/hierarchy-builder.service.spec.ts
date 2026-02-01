import { TestBed } from '@angular/core/testing';
import { HierarchyBuilderService } from './hierarchy-builder.service';
import type { RoleDefinition } from '../models';

describe('HierarchyBuilderService', () => {
  let service: HierarchyBuilderService;

  // Mock roles representing common Azure RBAC patterns
  const ownerRole: RoleDefinition = {
    id: 'owner-id',
    name: 'Owner',
    type: 'BuiltInRole',
    description: 'Full access to all resources',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['*'],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  const contributorRole: RoleDefinition = {
    id: 'contributor-id',
    name: 'Contributor',
    type: 'BuiltInRole',
    description: 'Can manage all resources but cannot grant access',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['*'],
        notActions: [
          "Microsoft.Authorization/*/Delete",
          "Microsoft.Authorization/*/Write",
          "Microsoft.Authorization/elevateAccess/Action",
          "Microsoft.Blueprint/blueprintAssignments/write",
          "Microsoft.Blueprint/blueprintAssignments/delete",
          "Microsoft.Compute/galleries/share/action",
          "Microsoft.Purview/consents/write",
          "Microsoft.Purview/consents/delete",
          "Microsoft.Resources/deploymentStacks/manageDenySetting/action",
          "Microsoft.Subscription/cancel/action",
          "Microsoft.Subscription/enable/action",
        ],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  const readerRole: RoleDefinition = {
    id: 'reader-id',
    name: 'Reader',
    type: 'BuiltInRole',
    description: 'Read-only access',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['*/read'],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  const storageBlobDataContributor: RoleDefinition = {
    id: 'storage-blob-contributor-id',
    name: 'Storage Blob Data Contributor',
    type: 'BuiltInRole',
    description: 'Read, write, and delete Azure Storage containers and blobs',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: [
          "Microsoft.Storage/storageAccounts/blobServices/containers/delete",
          "Microsoft.Storage/storageAccounts/blobServices/containers/read",
          "Microsoft.Storage/storageAccounts/blobServices/containers/write",
          "Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action",
        ],
        notActions: [],
        dataActions: [
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write",
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/move/action",
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/add/action",
        ],
        notDataActions: [],
      },
    ],
  };


  const storageSMBShareElevatedContributor: RoleDefinition = {
    id: "storage-file-data-smb-share-elevated-contributor",
    name: "Storage File Data SMB Share Elevated Contributor",
    type: "BuiltInRole",
    description: "Allows for read, write, delete and modify NTFS permission access in Azure Storage file shares over SMB",
    assignableScopes: ["/"],
    permissions: [
      {
        actions: [],
        notActions: [],
        dataActions: [
          "Microsoft.Storage/storageAccounts/fileServices/fileshares/files/read",
          "Microsoft.Storage/storageAccounts/fileServices/fileshares/files/write",
          "Microsoft.Storage/storageAccounts/fileServices/fileshares/files/delete",
          "Microsoft.Storage/storageAccounts/fileServices/fileshares/files/modifypermissions/action"
        ],
        notDataActions: []
      }
    ],
  }

  const storageBlobDataReader: RoleDefinition = {
    id: 'storage-blob-reader-id',
    name: 'Storage Blob Data Reader',
    type: 'BuiltInRole',
    description: 'Read Azure Storage containers and blobs',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: [
          "Microsoft.Storage/storageAccounts/blobServices/containers/read",
          "Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action",
        ],
        notActions: [],
        dataActions: [
          "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
        ],
        notDataActions: [],
      },
    ],
  };

  const isolatedRole: RoleDefinition = {
    id: 'isolated-role-id',
    name: 'Isolated Role',
    type: 'CustomRole',
    description: 'Role with unique permissions',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['Microsoft.Unique/*/action'],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HierarchyBuilderService);
  });

  describe('patternCovers', () => {
    it('should return true for identical patterns', () => {
      expect(service.patternCovers('*/read', '*/read')).toBe(true);
      expect(service.patternCovers('Microsoft.Storage/*', 'Microsoft.Storage/*')).toBe(true);
    });

    it('should return true when global wildcard covers any pattern', () => {
      expect(service.patternCovers('*', '*/read')).toBe(true);
      expect(service.patternCovers('*', 'Microsoft.Storage/storageAccounts/read')).toBe(true);
      expect(service.patternCovers('*', 'Microsoft.Authorization/*/Delete')).toBe(true);
    });

    it('should return false when non-wildcard tries to cover wildcard', () => {
      expect(service.patternCovers('*/read', '*')).toBe(false);
      expect(service.patternCovers('Microsoft.Storage/*', '*')).toBe(false);
    });

    it('should correctly compare wildcard patterns', () => {
      expect(service.patternCovers('*/read', 'Microsoft.Storage/storageAccounts/read')).toBe(true);
      expect(service.patternCovers('Microsoft.Storage/*', 'Microsoft.Storage/storageAccounts/read')).toBe(true);
    });

    it('should return false when patterns do not overlap', () => {
      expect(service.patternCovers('*/read', 'Microsoft.Storage/storageAccounts/write')).toBe(false);
      expect(service.patternCovers('Microsoft.Compute/*', 'Microsoft.Storage/storageAccounts/read')).toBe(false);
    });

    it('should handle multi-segment wildcards', () => {
      expect(service.patternCovers('Microsoft.Storage/*/containers/*',
        'Microsoft.Storage/storageAccounts/blobServices/containers/read')).toBe(true);
    });
  });

  describe('isSubsetOf', () => {
    it('should return true when child has fewer permissions than parent', () => {
      expect(service.isSubsetOf(readerRole, ownerRole)).toBe(true);
      expect(service.isSubsetOf(readerRole, contributorRole)).toBe(true);
    });

    it('should return false when child has more permissions than parent', () => {
      expect(service.isSubsetOf(ownerRole, readerRole)).toBe(false);
      expect(service.isSubsetOf(contributorRole, readerRole)).toBe(false);
    });

    it('should return true when roles have equal permissions', () => {
      expect(service.isSubsetOf(ownerRole, ownerRole)).toBe(true);
    });

    it('should handle data plane permissions', () => {
      expect(service.isSubsetOf(storageBlobDataReader, storageBlobDataContributor)).toBe(true);
      expect(service.isSubsetOf(storageBlobDataContributor, storageBlobDataReader)).toBe(false);
    });

    it('should handle roles with no permissions', () => {
      const emptyRole: RoleDefinition = {
        id: 'empty-id',
        name: 'Empty',
        type: 'CustomRole',
        description: 'No permissions',
        assignableScopes: ['/'],
        permissions: [{ actions: [], notActions: [], dataActions: [], notDataActions: [] }],
      };
      expect(service.isSubsetOf(emptyRole, ownerRole)).toBe(true);
      expect(service.isSubsetOf(emptyRole, readerRole)).toBe(true);
    });
  });

  describe('isProperSubset', () => {
    it('should return true when child has strictly fewer permissions', () => {
      expect(service.isProperSubset(readerRole, ownerRole)).toBe(true);
      expect(service.isProperSubset(contributorRole, ownerRole)).toBe(true);
    });

    it('should return false for identical roles', () => {
      expect(service.isProperSubset(ownerRole, ownerRole)).toBe(false);
    });

    it('should return false when roles are equal but different objects', () => {
      const ownerCopy: RoleDefinition = {
        ...ownerRole,
        id: 'owner-copy-id',
      };
      expect(service.isProperSubset(ownerCopy, ownerRole)).toBe(false);
    });

    it('should return false when parent has fewer permissions', () => {
      expect(service.isProperSubset(ownerRole, readerRole)).toBe(false);
    });

    it('should correctly handle parent-child role relationships with overlapping permissions', () => {
      const parentRole: RoleDefinition = {
        id: 'parent-role-id',
        name: 'Parent Role',
        type: 'CustomRole',
        description: 'Parent Role',
        assignableScopes: ['/'],
        permissions: [{
          actions: [
            "Microsoft.Storage/storageAccounts/*",
          ], notActions: [
            "Microsoft.Storage/storageAccounts/keys/list/action",
          ], dataActions: [], notDataActions: []
        }],
      };
      const childRole: RoleDefinition = {
        id: 'child-role-id',
        name: 'Child Role',
        type: 'CustomRole',
        description: 'Child Role',
        assignableScopes: ['/'],
        permissions: [{
          actions: [
            "Microsoft.Storage/storageAccounts/blobServices/*",
          ], notActions: [
            "Microsoft.Storage/storageAccounts/keys/*",
          ], dataActions: [], notDataActions: []
        }],
      };
      expect(service.isProperSubset(childRole, parentRole)).toBe(true);
    });
  });

  describe('findAllRelationships', () => {
    it('should find Owner -> Reader relationship', () => {
      const relationships = service.findAllRelationships([ownerRole, readerRole]);
      expect(relationships).toContainEqual({
        parentId: 'owner-id',
        childId: 'reader-id',
      });
    });

    it('should find Owner -> Contributor -> Reader chain', () => {
      const relationships = service.findAllRelationships([ownerRole, contributorRole, readerRole]);

      expect(relationships).toContainEqual({
        parentId: 'owner-id',
        childId: 'contributor-id',
      });
      expect(relationships).toContainEqual({
        parentId: 'owner-id',
        childId: 'reader-id',
      });
      expect(relationships).toContainEqual({
        parentId: 'contributor-id',
        childId: 'reader-id',
      });
    });

    it('should return empty array for single role', () => {
      const relationships = service.findAllRelationships([ownerRole]);
      expect(relationships).toEqual([]);
    });

    it('should return empty array for unrelated roles', () => {
      const relationships = service.findAllRelationships([isolatedRole, storageBlobDataReader]);
      // These roles have completely different permission sets with no overlap
      expect(relationships.length).toBe(0);
    });
  });

  describe('buildHierarchy', () => {
    it('should build correct hierarchy for Owner -> Contributor -> Reader', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);

      expect(hierarchy.totalRoles).toBe(3);
      expect(hierarchy.roots.length).toBe(1);
      expect(hierarchy.roots[0].role.id).toBe('owner-id');
    });

    it('should place Reader as grandchild of Owner', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);

      const ownerNode = hierarchy.roots[0];
      expect(ownerNode.children.length).toBe(1);
      expect(ownerNode.children[0].role.id).toBe('contributor-id');

      const contributorNode = ownerNode.children[0];
      expect(contributorNode.children.length).toBe(1);
      expect(contributorNode.children[0].role.id).toBe('reader-id');
    });

    it('should handle empty input', () => {
      const hierarchy = service.buildHierarchy([]);
      expect(hierarchy.roots).toEqual([]);
      expect(hierarchy.totalRoles).toBe(0);
    });

    it('should handle single role', () => {
      const hierarchy = service.buildHierarchy([readerRole]);
      expect(hierarchy.roots.length).toBe(1);
      expect(hierarchy.roots[0].role.id).toBe('reader-id');
      expect(hierarchy.roots[0].children.length).toBe(0);
    });

    it('should have multiple roots for unrelated roles', () => {
      const hierarchy = service.buildHierarchy([isolatedRole, storageBlobDataReader]);
      expect(hierarchy.roots.length).toBe(2);
    });

    it('should calculate correct depths', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);

      expect(hierarchy.roots[0].depth).toBe(0); // Owner
      expect(hierarchy.roots[0].children[0].depth).toBe(1); // Contributor
      expect(hierarchy.roots[0].children[0].children[0].depth).toBe(2); // Reader
    });

    it('should include all roles in nodeMap', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);

      expect(hierarchy.nodeMap.has('owner-id')).toBe(true);
      expect(hierarchy.nodeMap.has('contributor-id')).toBe(true);
      expect(hierarchy.nodeMap.has('reader-id')).toBe(true);
    });

    it('should handle storage blob hierarchy correctly', () => {
      // Note: Owner has dataActions: [], so Storage Blob roles (which have dataActions)
      // are NOT subsets of Owner. They form a separate hierarchy.
      const hierarchy = service.buildHierarchy([
        ownerRole,
        storageBlobDataContributor,
        storageBlobDataReader,
      ]);

      // Should have 2 roots: Owner (control plane only) and Storage Blob Contributor
      // (has data plane permissions that Owner doesn't have)
      expect(hierarchy.roots.length).toBe(2);

      // Find the Storage Blob Contributor root
      const blobContributorRoot = hierarchy.roots.find(
        (r) => r.role.id === 'storage-blob-contributor-id'
      );
      expect(blobContributorRoot).toBeTruthy();

      // Storage Blob Data Reader should be child of Blob Contributor
      if (blobContributorRoot) {
        const blobReader = blobContributorRoot.children.find(
          (c) => c.role.id === 'storage-blob-reader-id'
        );
        expect(blobReader).toBeTruthy();
      }
    });
  });

  describe('flattenHierarchy', () => {
    it('should flatten hierarchy in depth-first order', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);
      const flattened = service.flattenHierarchy(hierarchy);

      expect(flattened.length).toBe(3);
      expect(flattened[0].role.id).toBe('owner-id');
      expect(flattened[1].role.id).toBe('contributor-id');
      expect(flattened[2].role.id).toBe('reader-id');
    });

    it('should handle empty hierarchy', () => {
      const hierarchy = service.buildHierarchy([]);
      const flattened = service.flattenHierarchy(hierarchy);
      expect(flattened).toEqual([]);
    });

    it('should not duplicate nodes', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);
      const flattened = service.flattenHierarchy(hierarchy);

      const ids = flattened.map(n => n.role.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('findPathToRoot', () => {
    it('should find path from Reader to Owner', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);
      const path = service.findPathToRoot(hierarchy, 'reader-id');

      expect(path.length).toBe(3);
      expect(path[0].id).toBe('owner-id');
      expect(path[1].id).toBe('contributor-id');
      expect(path[2].id).toBe('reader-id');
    });

    it('should return single-element path for root', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);
      const path = service.findPathToRoot(hierarchy, 'owner-id');

      expect(path.length).toBe(1);
      expect(path[0].id).toBe('owner-id');
    });

    it('should return empty path for non-existent role', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);
      const path = service.findPathToRoot(hierarchy, 'non-existent-id');

      expect(path).toEqual([]);
    });
  });

  describe('circular dependency prevention', () => {
    it('should not create circular references', () => {
      const hierarchy = service.buildHierarchy([ownerRole, contributorRole, readerRole]);

      const visited = new Set<string>();
      const checkCircular = (node: { role: RoleDefinition; children: typeof node[] }): boolean => {
        if (visited.has(node.role.id)) {
          return true; // Circular!
        }
        visited.add(node.role.id);
        for (const child of node.children) {
          if (checkCircular(child)) {
            return true;
          }
        }
        visited.delete(node.role.id);
        return false;
      };

      for (const root of hierarchy.roots) {
        expect(checkCircular(root)).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle roles with only notActions', () => {
      const notActionsOnly: RoleDefinition = {
        id: 'notactions-only-id',
        name: 'NotActions Only',
        type: 'CustomRole',
        description: 'Role with only notActions',
        assignableScopes: ['/'],
        permissions: [
          {
            actions: ['*'],
            notActions: ['*/delete', '*/write'],
            dataActions: [],
            notDataActions: [],
          },
        ],
      };

      const hierarchy = service.buildHierarchy([ownerRole, notActionsOnly, readerRole]);
      expect(hierarchy.totalRoles).toBe(3);
    });

    it('should handle roles with data plane permissions only', () => {
      const dataPlaneOnly: RoleDefinition = {
        id: 'data-plane-only-id',
        name: 'Data Plane Only',
        type: 'CustomRole',
        description: 'Role with only data plane permissions',
        assignableScopes: ['/'],
        permissions: [
          {
            actions: [],
            notActions: [],
            dataActions: ['Microsoft.Storage/storageAccounts/fileServices/fileshares/files/read'],
            notDataActions: [],
          },
        ],
      };

      const hierarchy = service.buildHierarchy([storageSMBShareElevatedContributor, dataPlaneOnly]);
      expect(hierarchy.totalRoles).toBe(2);
      // Owner should be parent since it has * for both planes
      expect(hierarchy.roots[0].role.id).toBe('storage-file-data-smb-share-elevated-contributor');
    });
  });
});
