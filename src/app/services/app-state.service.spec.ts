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

    it('should set the active tab to effective-permissions', () => {
      service.setActiveTab('effective-permissions');
      expect(service.activeTab()).toBe('effective-permissions');
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
});
