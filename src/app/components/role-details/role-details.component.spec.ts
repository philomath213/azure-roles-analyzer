import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RoleDetailsComponent } from './role-details.component';
import { PermissionEngineService } from '../../services';
import type { RoleDefinition } from '../../models';

describe('RoleDetailsComponent', () => {
  let component: RoleDetailsComponent;
  let fixture: ComponentFixture<RoleDetailsComponent>;

  const ownerRole: RoleDefinition = {
    id: 'owner-role-id',
    name: 'Owner',
    type: 'BuiltInRole',
    description: 'Grants full access to manage all resources',
    assignableScopes: ['/'],
    permissions: [
      {
        actions: ['*'],
        notActions: [],
        dataActions: ['*'],
        notDataActions: [],
      },
    ],
  };

  const contributorRole: RoleDefinition = {
    id: 'contributor-role-id',
    name: 'Contributor',
    type: 'BuiltInRole',
    description: 'Grants full access except authorization',
    assignableScopes: ['/'],
    permissions: [
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
    ],
  };

  const customRole: RoleDefinition = {
    id: 'custom-role-id',
    name: 'Custom VM Reader',
    type: 'CustomRole',
    description: 'Custom role for reading VMs',
    assignableScopes: ['/subscriptions/123', '/subscriptions/456'],
    permissions: [
      {
        actions: ['Microsoft.Compute/virtualMachines/read'],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  const emptyRole: RoleDefinition = {
    id: 'empty-role-id',
    name: 'Empty Role',
    type: 'CustomRole',
    description: 'Role with no permissions',
    assignableScopes: [],
    permissions: [
      {
        actions: [],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleDetailsComponent],
      providers: [PermissionEngineService],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleDetailsComponent);
    component = fixture.componentInstance;
  });

  describe('Overview tab', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'overview');
      fixture.detectChanges();
    });

    it('should display role name', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h2')?.textContent).toContain('Owner');
    });

    it('should display role type badge', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.role-type-badge');
      expect(badge?.textContent?.trim()).toBe('Built-in');
      expect(badge?.classList.contains('built-in')).toBe(true);
    });

    it('should display custom role type badge correctly', () => {
      fixture.componentRef.setInput('role', customRole);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.role-type-badge');
      expect(badge?.textContent?.trim()).toBe('Custom');
      expect(badge?.classList.contains('built-in')).toBe(false);
    });

    it('should display role description', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.description')?.textContent).toContain(
        'Grants full access to manage all resources'
      );
    });

    it('should display role ID', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.role-id')?.textContent).toContain('owner-role-id');
    });

    it('should display assignable scopes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const scopesList = compiled.querySelector('.scopes-list');
      expect(scopesList?.textContent).toContain('/');
    });

    it('should show empty state for no assignable scopes', () => {
      fixture.componentRef.setInput('role', emptyRole);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('No assignable scopes defined');
    });

    it('should display permission summary counts', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const summary = compiled.querySelector('.permission-summary');
      expect(summary).toBeTruthy();
    });
  });

  describe('Control Plane tab', () => {
    it('should display actions for control plane', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'control-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('*');
    });

    it('should show wildcard notice for roles with * in actions', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'control-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.wildcard-notice')).toBeTruthy();
      expect(compiled.querySelector('.wildcard-notice')?.textContent).toContain('wildcard');
    });

    it('should not show wildcard notice for roles without * in actions', () => {
      fixture.componentRef.setInput('role', customRole);
      fixture.componentRef.setInput('activeTab', 'control-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.wildcard-notice')).toBeFalsy();
    });

    it('should display notActions for control plane', () => {
      fixture.componentRef.setInput('role', contributorRole);
      fixture.componentRef.setInput('activeTab', 'control-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Microsoft.Authorization/*/Delete');
      expect(compiled.textContent).toContain('Microsoft.Authorization/*/Write');
    });

    it('should show empty state when no control plane permissions', () => {
      fixture.componentRef.setInput('role', emptyRole);
      fixture.componentRef.setInput('activeTab', 'control-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('No control plane permissions defined');
    });
  });

  describe('Data Plane tab', () => {
    it('should display data actions', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'data-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('*');
    });

    it('should show wildcard notice for roles with * in data actions', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'data-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.wildcard-notice')).toBeTruthy();
      expect(compiled.querySelector('.wildcard-notice')?.textContent).toContain('wildcard');
    });

    it('should not show wildcard notice when no * in data actions', () => {
      fixture.componentRef.setInput('role', customRole);
      fixture.componentRef.setInput('activeTab', 'data-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.wildcard-notice')).toBeFalsy();
    });

    it('should show empty state when no data plane permissions', () => {
      fixture.componentRef.setInput('role', contributorRole);
      fixture.componentRef.setInput('activeTab', 'data-plane');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('No data plane permissions defined');
    });
  });

  describe('tabs', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.componentRef.setInput('activeTab', 'overview');
      fixture.detectChanges();
    });

    it('should render all three tabs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tabs = compiled.querySelectorAll('.tab-button');
      expect(tabs.length).toBe(3);
    });

    it('should mark active tab correctly', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const activeTab = compiled.querySelector('.tab-button.active');
      expect(activeTab?.textContent?.trim()).toBe('Overview');
    });

    it('should emit tabChange when clicking a tab', () => {
      const tabChangeSpy = vi.spyOn(component.tabChange, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const controlPlaneTab = compiled.querySelectorAll('.tab-button')[1];

      (controlPlaneTab as HTMLElement).click();

      expect(tabChangeSpy).toHaveBeenCalledWith('control-plane');
    });

    it('should have correct aria attributes for tabs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tabs = compiled.querySelectorAll('.tab-button');

      tabs.forEach((tab) => {
        expect(tab.getAttribute('role')).toBe('tab');
        expect(tab.hasAttribute('aria-selected')).toBe(true);
        expect(tab.hasAttribute('aria-controls')).toBe(true);
      });
    });

    it('should have correct tablist role', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tablist = compiled.querySelector('.tabs');
      expect(tablist?.getAttribute('role')).toBe('tablist');
    });

    it('should have correct tabpanel role for content', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('[role="tabpanel"]');
      expect(panel).toBeTruthy();
    });
  });

  describe('close button', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.detectChanges();
    });

    it('should have a close button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.close-button')).toBeTruthy();
    });

    it('should emit closeDetails event when clicking close button', () => {
      const closeSpy = vi.spyOn(component.closeDetails, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const closeButton = compiled.querySelector('.close-button') as HTMLElement;

      closeButton.click();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should have accessible label for close button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const closeButton = compiled.querySelector('.close-button');
      expect(closeButton?.getAttribute('aria-label')).toBe('Close role details');
    });
  });

  describe('computed properties', () => {
    it('should compute control plane actions', () => {
      fixture.componentRef.setInput('role', customRole);
      fixture.detectChanges();

      expect(component.controlPlaneActions()).toEqual([
        'Microsoft.Compute/virtualMachines/read',
      ]);
    });

    it('should compute control plane not actions', () => {
      fixture.componentRef.setInput('role', contributorRole);
      fixture.detectChanges();

      expect(component.controlPlaneNotActions()).toContain('Microsoft.Authorization/*/Delete');
    });

    it('should compute hasControlPlanePermissions correctly', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.detectChanges();
      expect(component.hasControlPlanePermissions()).toBe(true);

      fixture.componentRef.setInput('role', emptyRole);
      fixture.detectChanges();
      expect(component.hasControlPlanePermissions()).toBe(false);
    });

    it('should compute hasDataPlanePermissions correctly', () => {
      fixture.componentRef.setInput('role', ownerRole);
      fixture.detectChanges();
      expect(component.hasDataPlanePermissions()).toBe(true);

      fixture.componentRef.setInput('role', contributorRole);
      fixture.detectChanges();
      expect(component.hasDataPlanePermissions()).toBe(false);
    });
  });
});
