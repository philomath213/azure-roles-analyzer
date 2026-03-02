import { TestBed } from '@angular/core/testing';
import { PermissionSearchService } from './permission-search.service';
import type { RoleDefinition } from '../models';

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

describe('PermissionSearchService', () => {
  let service: PermissionSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionSearchService);
  });

  describe('initial state', () => {
    it('should have empty permissions', () => {
      expect(service.permissions()).toEqual([]);
    });

    it('should default to AND mode', () => {
      expect(service.mode()).toBe('AND');
    });

    it('should default to both plane', () => {
      expect(service.plane()).toBe('both');
    });

    it('should report hasPermissions as false', () => {
      expect(service.hasPermissions()).toBe(false);
    });
  });

  describe('setPermissions', () => {
    it('should update permissions signal', () => {
      service.setPermissions(['Microsoft.Storage/*/read']);
      expect(service.permissions()).toEqual(['Microsoft.Storage/*/read']);
    });

    it('should set hasPermissions to true when permissions provided', () => {
      service.setPermissions(['Microsoft.Storage/*/read']);
      expect(service.hasPermissions()).toBe(true);
    });

    it('should set hasPermissions to false when empty array provided', () => {
      service.setPermissions(['perm']);
      service.setPermissions([]);
      expect(service.hasPermissions()).toBe(false);
    });
  });

  describe('setMode', () => {
    it('should update mode signal', () => {
      service.setMode('OR');
      expect(service.mode()).toBe('OR');
    });
  });

  describe('setPlane', () => {
    it('should update plane signal', () => {
      service.setPlane('control');
      expect(service.plane()).toBe('control');
    });
  });

  describe('clearSearch', () => {
    it('should clear permissions', () => {
      const permissions = ['perm1', 'perm2']
      service.setPermissions(permissions);
      expect(service.hasPermissions()).toBe(true);
      expect(service.permissions()).toEqual(permissions);
      service.clearSearch();
      expect(service.permissions()).toEqual([]);
      expect(service.hasPermissions()).toBe(false);
    });
  });

  describe('scoreRoles', () => {
    it('should return empty array when no permissions set', () => {
      const roles = [makeRole('r1', ['*'])];
      expect(service.scoreRoles(roles)).toEqual([]);
    });

    it('should return empty array when roles list is empty', () => {
      service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
      expect(service.scoreRoles([])).toEqual([]);
    });

    describe('match calculation', () => {
      // suggestion 4: split multi-mode it() into separate AND / OR tests
      it('should give 100% match when role has exact action (AND mode)', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const role = makeRole('r1', ['Microsoft.Storage/storageAccounts/read']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(100);
        expect(result.matchCount).toBe(1);
        expect(result.totalSearched).toBe(1);
      });

      it('should give 100% match when role has exact action (OR mode)', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        service.setMode('OR');
        const role = makeRole('r1', ['Microsoft.Storage/storageAccounts/read']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(100);
        expect(result.matchCount).toBe(1);
        expect(result.totalSearched).toBe(1);
      });

      it('should handle duplicate permission', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read', 'Microsoft.Storage/storageAccounts/read', 'Microsoft.Storage/storageAccounts/write']);
        const role = makeRole('r1', ['Microsoft.Storage/storageAccounts/read', 'Microsoft.Storage/storageAccounts/write']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(100);
        expect(result.matchCount).toBe(2);
        expect(result.totalSearched).toBe(2);
      });

      it('should match case-insensitively', () => {
        service.setPermissions(['microsoft.storage/storageaccounts/read']);
        const role = makeRole('r1', ['Microsoft.Storage/storageAccounts/read']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(100);
      });

      it('should give 50% match for 1 of 2 permissions covered (AND Mode)', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        service.setMode('AND');
        const role = makeRole('r1', ['Microsoft.Storage/*']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(50);
        expect(result.matchCount).toBe(1);
      });

      it('should give 100% match for 1 of 2 permissions covered (OR Mode)', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        service.setMode('OR');
        const role = makeRole('r1', ['Microsoft.Storage/*']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(100);
        expect(result.matchCount).toBe(1);
      });

      it('should give 0% match when role has no matching actions (OR Mode)', () => {
        service.setPermissions(['Microsoft.Compute/virtualMachines/read']);
        const role = makeRole('r1', ['Microsoft.Storage/*']);
        service.setMode('OR');
        expect(service.scoreRoles([role])).toEqual([]);
      });

      it('should give 0% match when role has no matching actions (AND Mode)', () => {
        service.setPermissions(['Microsoft.Compute/virtualMachines/read']);
        const role = makeRole('r1', ['Microsoft.Storage/*']);
        service.setMode('AND');
        expect(service.scoreRoles([role])).toEqual([]);
      });

      // suggestion 4: group wildcard-related tests under a nested describe
      describe('wildcard patterns', () => {
        // suggestion 4: split multi-mode it() into separate AND / OR tests
        it('should give 100% match when role wildcard covers searched permission (AND mode)', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
          const role = makeRole('r1', ['*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should give 100% match when role wildcard covers searched permission (OR mode)', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
          service.setMode('OR');
          const role = makeRole('r1', ['*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        // suggestion 1: was 'should give 100% match when role wildcard covers wildcard' (duplicate name)
        it('should give 100% match when searching * and role has * (AND mode)', () => {
          service.setPermissions(['*']);
          const role = makeRole('r1', ['*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should give 100% match when searching * and role has * (OR mode)', () => {
          service.setPermissions(['*']);
          service.setMode('OR');
          const role = makeRole('r1', ['*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        // suggestion 1: was 'should give 100% match when role wildcard covers wildcard' (duplicate name)
        it('should give 100% match when searching mid-segment wildcard and role has exact same pattern (AND mode)', () => {
          service.setPermissions(['Microsoft.Storage/*/read']);
          const role = makeRole('r1', ['Microsoft.Storage/*/read']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should give 100% match when searching mid-segment wildcard and role has exact same pattern (OR mode)', () => {
          service.setPermissions(['Microsoft.Storage/*/read']);
          service.setMode('OR');
          const role = makeRole('r1', ['Microsoft.Storage/*/read']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        // suggestion 4: split multi-mode it() into separate AND / OR tests
        it('should give 100% match when role namespace wildcard covers searched permission (AND mode)', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
          const role = makeRole('r1', ['Microsoft.Storage/*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should give 100% match when role namespace wildcard covers searched permission (OR mode)', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
          service.setMode('OR');
          const role = makeRole('r1', ['Microsoft.Storage/*']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should match mid-segment wildcard', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/blobServices/read']);
          const role = makeRole('r1', ['Microsoft.Storage/*/read']);
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
        });

        it('should not match when action differs with mid-segment wildcard', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/blobServices/write']);
          const role = makeRole('r1', ['Microsoft.Storage/*/read']);
          expect(service.scoreRoles([role])).toEqual([]);
        });
      });

      // suggestion 4: group notActions-related tests under a nested describe
      describe('notActions deny rules', () => {
        // suggestion 3: was 'should respect notActions when calculating match (Test Case 1)'
        it('should deny permission when it is explicitly listed in notActions', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/delete']);
          const role = makeRole('r1', ['Microsoft.Storage/*'], ['Microsoft.Storage/storageAccounts/delete']);
          service.setMode('OR');
          expect(service.scoreRoles([role])).toEqual([]);
        });

        // suggestion 3: was 'should respect notActions when calculating match (Test Case 2)'
        it('should allow permission when a different action is in notActions', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/write']);
          const role = makeRole('r1', ['Microsoft.Storage/*'], ['Microsoft.Storage/storageAccounts/delete']);
          service.setMode('OR');
          const [result] = service.scoreRoles([role]);
          expect(result.totalSearched).toEqual(1);
          expect(result.matchCount).toEqual(1);
          expect(result.matchPercent).toEqual(100);
        });

        it('should deny permission when notActions wildcard overrides actions wildcard', () => {
          service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
          service.setMode('OR');
          const role = makeRole('r1',
            ['Microsoft.Storage/*'], // broad allow
            ['Microsoft.Storage/storageAccounts/*'] // narrower deny
          );
          // Deny must win → no match
          expect(service.scoreRoles([role])).toEqual([]);
        });

        it('should still allow other non-denied actions in same namespace', () => {
          service.setPermissions(['Microsoft.Storage/blobServices/read']);
          service.setMode('OR');
          const role = makeRole(
            'r1',
            ['Microsoft.Storage/*'],
            ['Microsoft.Storage/storageAccounts/*']
          );
          const [result] = service.scoreRoles([role]);
          expect(result.matchPercent).toBe(100);
          expect(result.matchCount).toBe(1);
        });
      });
    });

    describe('overpermission calculation', () => {
      it('should give 0% overpermission for exact action match', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const role = makeRole('r1', ['Microsoft.Storage/storageAccounts/read']);
        const [result] = service.scoreRoles([role]);
        expect(result.overpermissionPercent).toBe(0);
      });

      it('should give 100% overpermission when role has wildcard but searched for specific', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const role = makeRole('r1', ['*']);
        const [result] = service.scoreRoles([role]);
        expect(result.overpermissionPercent).toBe(100);
      });

      // suggestion 1+3: was 'should give 0% match when role wildcard covers wildcard' (wrong verb, duplicate name)
      it('should give 0% overpermission when role wildcard equals searched wildcard (*)', () => {
        service.setPermissions(['*']);
        const role = makeRole('r1', ['*']);
        const [resultAnd] = service.scoreRoles([role]);
        expect(resultAnd.overpermissionPercent).toBe(0);
        service.setMode("OR")
        const [resultOr] = service.scoreRoles([role]);
        expect(resultOr.overpermissionPercent).toBe(0);
      });

      // suggestion 1+3: was 'should give 0% match when role wildcard covers wildcard' (wrong verb, duplicate name)
      it('should give 0% overpermission when role pattern equals searched mid-segment wildcard', () => {
        service.setPermissions(['Microsoft.Storage/*/read']);
        const role = makeRole('r1', ['Microsoft.Storage/*/read']);
        const [resultAnd] = service.scoreRoles([role]);
        expect(resultAnd.overpermissionPercent).toBe(0);
        service.setMode("OR")
        const [resultOr] = service.scoreRoles([role]);
        expect(resultOr.overpermissionPercent).toBe(0);
      });

      it('should give 50% overpermission when half of role actions are extra', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const role = makeRole('r1', [
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        const [result] = service.scoreRoles([role]);
        expect(result.overpermissionPercent).toBe(50);
      });

      // suggestion 3: was 'should give 0% overpermission when role has no actions'
      // (no results are returned at all — overpermission is never reached)
      it('should exclude role with no actions from results', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const role = makeRole('r1', []);
        service.setMode('OR');
        expect(service.scoreRoles([role])).toEqual([]);
      });
    });

    describe('AND mode', () => {
      beforeEach(() => service.setMode('AND'));

      it('should return all roles with any match, sorted by matchPercent desc', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        const fullMatch = makeRole('full', ['*']);
        const partialMatch = makeRole('partial', ['Microsoft.Storage/*']);
        const results = service.scoreRoles([fullMatch, partialMatch]);
        expect(results.map((r) => r.role.id)).toEqual(['full', 'partial']);
      });

      it('should return partial-match role with correct matchPercent', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        const role = makeRole('r1', ['Microsoft.Storage/*']);
        const [result] = service.scoreRoles([role]);
        expect(result.matchPercent).toBe(50);
        expect(result.matchCount).toBe(1);
      });
    });

    describe('OR mode', () => {
      beforeEach(() => service.setMode('OR'));

      it('should return roles with any match', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        const storageRole = makeRole('storage', ['Microsoft.Storage/*']);
        const computeRole = makeRole('compute', ['Microsoft.Compute/*']);
        const noMatchRole = makeRole('none', ['Microsoft.Network/*']);
        const results = service.scoreRoles([storageRole, computeRole, noMatchRole]);
        const ids = results.map((r) => r.role.id);
        expect(ids).toContain('storage');
        expect(ids).toContain('compute');
        expect(ids).not.toContain('none');
      });
    });

    describe('plane selection', () => {
      const controlRole = makeRole('ctrl', ['Microsoft.Storage/*'], [], [], []);
      const dataRole = makeRole('data', [], [], ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'], []);
      const bothRole = makeRole(
        'both',
        ['Microsoft.Storage/*'],
        [],
        ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'],
        []
      );

      it('control plane only: matches control actions, ignores data actions', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        service.setPlane('control');
        const results = service.scoreRoles([controlRole, dataRole]);
        const ids = results.map((r) => r.role.id);
        expect(ids).toContain('ctrl');
        expect(ids).not.toContain('data');
      });

      it('data plane only: matches data actions, ignores control actions', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read']);
        service.setPlane('data');
        const results = service.scoreRoles([controlRole, dataRole]);
        const ids = results.map((r) => r.role.id);
        expect(ids).not.toContain('ctrl');
        expect(ids).toContain('data');
      });

      it('both: matches either plane', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        service.setPlane('both');
        const results = service.scoreRoles([controlRole, dataRole]);
        const ids = results.map((r) => r.role.id);
        expect(ids).toContain('ctrl');
        expect(ids).not.toContain('data');
      });

      it('control plane overpermission uses only merged.actions', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        service.setPlane('control');
        // bothRole has ['Microsoft.Storage/*'] as actions (1 action, not in searched set → 100%)
        const results = service.scoreRoles([bothRole]);
        expect(results[0].overpermissionPercent).toBe(100);
      });

      it('data plane overpermission uses only merged.dataActions', () => {
        const perm = 'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read';
        service.setPermissions([perm]);
        service.setPlane('data');
        const results = service.scoreRoles([dataRole]);
        // dataRole has exactly that one data action in searched set → 0% overpermission
        expect(results[0].overpermissionPercent).toBe(0);
      });

      // suggestion 4: moved here from match calculation — this is a plane-specific deny test
      it('should respect notDataActions in data plane', () => {
        const perm = 'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read';
        service.setPermissions([perm]);
        service.setPlane('data');
        const role = makeRole('r1', [], [], ['Microsoft.Storage/*'], [perm]);
        expect(service.scoreRoles([role])).toEqual([]);
      });
    });

    describe('sorting', () => {
      it('should sort by matchPercent descending', () => {
        service.setPermissions([
          'Microsoft.Storage/storageAccounts/read',
          'Microsoft.Compute/virtualMachines/read',
        ]);
        service.setMode('AND');
        const fullMatch = makeRole('full', ['*']);
        const partialMatch = makeRole('partial', ['Microsoft.Storage/*']);
        const results = service.scoreRoles([partialMatch, fullMatch]);
        expect(results[0].role.id).toBe('full');
        expect(results[1].role.id).toBe('partial');
      });

      it('should sort by overpermissionPercent ascending when matchPercent is equal', () => {
        service.setPermissions(['Microsoft.Storage/storageAccounts/read']);
        const moreExtra = makeRole('more', ['Microsoft.Storage/storageAccounts/read', 'Microsoft.Compute/*']);
        const lessExtra = makeRole('less', ['Microsoft.Storage/storageAccounts/read']);
        const results = service.scoreRoles([moreExtra, lessExtra]);
        expect(results[0].role.id).toBe('less');
        expect(results[1].role.id).toBe('more');
      });
    });
  });
});
