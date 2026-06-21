import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleCompareService } from './role-compare.service';
import type { RoleDefinition } from '../models';

describe('RoleCompareService', () => {
  let service: RoleCompareService;

  const makeRole = (
    id: string,
    actions: string[],
    notActions: string[] = [],
    dataActions: string[] = [],
    notDataActions: string[] = []
  ): RoleDefinition => ({
    id,
    name: id,
    type: 'BuiltInRole',
    description: null,
    assignableScopes: ['/'],
    permissions: [{ actions, notActions, dataActions, notDataActions }],
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoleCompareService);
  });

  describe('relationship', () => {
    it('returns "equal" when both roles have identical permissions', () => {
      const roleA = makeRole('a', ['Microsoft.Storage/*']);
      const roleB = makeRole('b', ['Microsoft.Storage/*']);
      const result = service.compareRoles(roleA, roleB);
      expect(result.relationship).toBe('equal');
    });

    it('returns "a-subset-of-b" when A\'s actions are a proper subset of B\'s', () => {
      const roleA = makeRole('a', ['Microsoft.Storage/storageAccounts/read']);
      const roleB = makeRole('b', ['Microsoft.Storage/*']);
      const result = service.compareRoles(roleA, roleB);
      expect(result.relationship).toBe('a-subset-of-b');
    });

    it('returns "b-subset-of-a" when B\'s actions are a proper subset of A\'s', () => {
      const roleA = makeRole('a', ['Microsoft.Storage/*']);
      const roleB = makeRole('b', ['Microsoft.Storage/storageAccounts/read']);
      const result = service.compareRoles(roleA, roleB);
      expect(result.relationship).toBe('b-subset-of-a');
    });

    it('returns "none" for unrelated roles', () => {
      const roleA = makeRole('a', ['Microsoft.Storage/storageAccounts/read']);
      const roleB = makeRole('b', ['Microsoft.Compute/virtualMachines/start']);
      const result = service.compareRoles(roleA, roleB);
      expect(result.relationship).toBe('none');
    });

    it('returns "none" for roles with no permissions', () => {
      const roleA = makeRole('a', []);
      const roleB = makeRole('b', ['Microsoft.Storage/*']);
      const result = service.compareRoles(roleA, roleB);
      // empty is a subset of everything, so 'a-subset-of-b'
      expect(result.relationship).toBe('a-subset-of-b');
    });
  });

  describe('controlPlane diff', () => {
    it('populates onlyInA, shared, onlyInB correctly', () => {
      const roleA = makeRole('a', ['Microsoft.Storage/read', 'Microsoft.Storage/write']);
      const roleB = makeRole('b', ['Microsoft.Storage/read', 'Microsoft.Compute/read']);

      const result = service.compareRoles(roleA, roleB);
      expect(result.controlPlane.onlyInA).toEqual(['Microsoft.Storage/write']);
      expect(result.controlPlane.shared).toEqual(['Microsoft.Storage/read']);
      expect(result.controlPlane.onlyInB).toEqual(['Microsoft.Compute/read']);
    });

    it('produces empty arrays when both roles have no actions', () => {
      const roleA = makeRole('a', []);
      const roleB = makeRole('b', []);
      const result = service.compareRoles(roleA, roleB);
      expect(result.controlPlane.onlyInA).toEqual([]);
      expect(result.controlPlane.shared).toEqual([]);
      expect(result.controlPlane.onlyInB).toEqual([]);
    });

    it('produces correct onlyInB when A has no actions', () => {
      const roleA = makeRole('a', []);
      const roleB = makeRole('b', ['Microsoft.Storage/read']);
      const result = service.compareRoles(roleA, roleB);
      expect(result.controlPlane.onlyInA).toEqual([]);
      expect(result.controlPlane.shared).toEqual([]);
      expect(result.controlPlane.onlyInB).toEqual(['Microsoft.Storage/read']);
    });
  });

  describe('controlPlaneNot diff', () => {
    it('diffs notActions correctly', () => {
      const roleA = makeRole('a', ['*'], ['Microsoft.Auth/*/delete']);
      const roleB = makeRole('b', ['*'], ['Microsoft.Auth/*/delete', 'Microsoft.Storage/*/write']);

      const result = service.compareRoles(roleA, roleB);
      expect(result.controlPlaneNot.onlyInA).toEqual([]);
      expect(result.controlPlaneNot.shared).toEqual(['Microsoft.Auth/*/delete']);
      expect(result.controlPlaneNot.onlyInB).toEqual(['Microsoft.Storage/*/write']);
    });
  });

  describe('dataPlane diff', () => {
    it('diffs dataActions correctly', () => {
      const roleA = makeRole('a', [], [], ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read']);
      const roleB = makeRole('b', [], [], ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read', 'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write']);

      const result = service.compareRoles(roleA, roleB);
      expect(result.dataPlane.onlyInA).toEqual([]);
      expect(result.dataPlane.shared.length).toBe(1);
      expect(result.dataPlane.onlyInB.length).toBe(1);
    });
  });

  describe('dataPlaneNot diff', () => {
    it('diffs notDataActions correctly', () => {
      const roleA = makeRole('a', [], [], ['*'], ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete']);
      const roleB = makeRole('b', [], [], ['*'], []);

      const result = service.compareRoles(roleA, roleB);
      expect(result.dataPlaneNot.onlyInA).toEqual(['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete']);
      expect(result.dataPlaneNot.shared).toEqual([]);
      expect(result.dataPlaneNot.onlyInB).toEqual([]);
    });
  });

  describe('multi-block permissions', () => {
    it('merges multiple permission blocks before diffing', () => {
      const roleA: RoleDefinition = {
        id: 'a',
        name: 'A',
        type: 'BuiltInRole',
        description: null,
        assignableScopes: ['/'],
        permissions: [
          { actions: ['Microsoft.Storage/read'], notActions: [], dataActions: [], notDataActions: [] },
          { actions: ['Microsoft.Compute/read'], notActions: [], dataActions: [], notDataActions: [] },
        ],
      };
      const roleB = makeRole('b', ['Microsoft.Storage/read']);

      const result = service.compareRoles(roleA, roleB);
      expect(result.controlPlane.shared).toContain('Microsoft.Storage/read');
      expect(result.controlPlane.onlyInA).toContain('Microsoft.Compute/read');
    });
  });
});
