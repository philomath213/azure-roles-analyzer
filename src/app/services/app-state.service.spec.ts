import { TestBed } from '@angular/core/testing';
import { AppStateService } from './app-state.service';
import type { RoleDefinition } from '../models';

describe('AppStateService', () => {
  let service: AppStateService;

  const mockRole: RoleDefinition = {
    id: 'test-role-id',
    name: 'Test Role',
    type: 'BuiltInRole',
    description: 'A test role',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['Microsoft.Compute/*'],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppStateService],
    });
    service = TestBed.inject(AppStateService);
  });

  describe('initial state', () => {
    it('should have no selected role initially', () => {
      expect(service.selectedRole()).toBeNull();
    });

    it('should have overview as the default active tab', () => {
      expect(service.activeTab()).toBe('overview');
    });

    it('should have hasSelectedRole as false initially', () => {
      expect(service.hasSelectedRole()).toBe(false);
    });
  });

  describe('selectRole', () => {
    it('should set the selected role', () => {
      service.selectRole(mockRole);

      expect(service.selectedRole()).toEqual(mockRole);
      expect(service.hasSelectedRole()).toBe(true);
    });

    it('should reset active tab to overview when selecting a role', () => {
      service.setActiveTab('control-plane');
      service.selectRole(mockRole);

      expect(service.activeTab()).toBe('overview');
    });

    it('should allow setting role to null', () => {
      service.selectRole(mockRole);
      service.selectRole(null);

      expect(service.selectedRole()).toBeNull();
      expect(service.hasSelectedRole()).toBe(false);
    });

    it('should not reset tab when selecting null', () => {
      service.selectRole(mockRole);
      service.setActiveTab('control-plane');
      service.selectRole(null);

      expect(service.activeTab()).toBe('control-plane');
    });
  });

  describe('clearSelection', () => {
    it('should clear the selected role', () => {
      service.selectRole(mockRole);
      service.clearSelection();

      expect(service.selectedRole()).toBeNull();
      expect(service.hasSelectedRole()).toBe(false);
    });
  });

  describe('setActiveTab', () => {
    it('should set the active tab to overview', () => {
      service.setActiveTab('overview');
      expect(service.activeTab()).toBe('overview');
    });

    it('should set the active tab to control-plane', () => {
      service.setActiveTab('control-plane');
      expect(service.activeTab()).toBe('control-plane');
    });

    it('should set the active tab to data-plane', () => {
      service.setActiveTab('data-plane');
      expect(service.activeTab()).toBe('data-plane');
    });

  });

  describe('hasSelectedRole computed', () => {
    it('should return true when a role is selected', () => {
      service.selectRole(mockRole);
      expect(service.hasSelectedRole()).toBe(true);
    });

    it('should return false when no role is selected', () => {
      expect(service.hasSelectedRole()).toBe(false);
    });

    it('should update reactively', () => {
      expect(service.hasSelectedRole()).toBe(false);
      service.selectRole(mockRole);
      expect(service.hasSelectedRole()).toBe(true);
      service.clearSelection();
      expect(service.hasSelectedRole()).toBe(false);
    });
  });

  describe('compare queue', () => {
    const roleB: RoleDefinition = {
      id: 'role-b',
      name: 'Role B',
      type: 'BuiltInRole',
      description: null,
      assignableScopes: ['/'],
      permissions: [{ actions: ['*/read'], notActions: [], dataActions: [], notDataActions: [] }],
    };

    const roleC: RoleDefinition = {
      id: 'role-c',
      name: 'Role C',
      type: 'CustomRole',
      description: null,
      assignableScopes: ['/'],
      permissions: [{ actions: ['Microsoft.Storage/*'], notActions: [], dataActions: [], notDataActions: [] }],
    };

    it('should start with no compare roles', () => {
      expect(service.compareRoleA()).toBeNull();
      expect(service.compareRoleB()).toBeNull();
    });

    it('addToComparison with empty queue sets Role A', () => {
      service.addToComparison(mockRole);
      expect(service.compareRoleA()).toEqual(mockRole);
      expect(service.compareRoleB()).toBeNull();
    });

    it('addToComparison with only A set fills Role B', () => {
      service.addToComparison(mockRole);
      service.addToComparison(roleB);
      expect(service.compareRoleA()).toEqual(mockRole);
      expect(service.compareRoleB()).toEqual(roleB);
    });

    it('addToComparison with both set rotates: old-B → A, new → B', () => {
      service.addToComparison(mockRole);
      service.addToComparison(roleB);
      service.addToComparison(roleC);
      expect(service.compareRoleA()).toEqual(roleB);
      expect(service.compareRoleB()).toEqual(roleC);
    });

    it('clearCompareRoleA clears only Role A', () => {
      service.addToComparison(mockRole);
      service.addToComparison(roleB);
      service.clearCompareRoleA();
      expect(service.compareRoleA()).toBeNull();
      expect(service.compareRoleB()).toEqual(roleB);
    });

    it('clearCompareRoleB clears only Role B', () => {
      service.addToComparison(mockRole);
      service.addToComparison(roleB);
      service.clearCompareRoleB();
      expect(service.compareRoleA()).toEqual(mockRole);
      expect(service.compareRoleB()).toBeNull();
    });

    it('setCompareRoleA overrides Role A directly', () => {
      service.addToComparison(mockRole);
      service.setCompareRoleA(roleB);
      expect(service.compareRoleA()).toEqual(roleB);
    });

    it('setCompareRoleB overrides Role B directly', () => {
      service.addToComparison(mockRole);
      service.addToComparison(roleB);
      service.setCompareRoleB(roleC);
      expect(service.compareRoleB()).toEqual(roleC);
    });

    it('setCompareRoleA with null clears Role A', () => {
      service.addToComparison(mockRole);
      service.setCompareRoleA(null);
      expect(service.compareRoleA()).toBeNull();
    });
  });
});
