import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RoleListComponent } from './role-list.component';
import type { RoleDefinition } from '../../models';

describe('RoleListComponent', () => {
  let component: RoleListComponent;
  let fixture: ComponentFixture<RoleListComponent>;

  const mockRoles: RoleDefinition[] = [
    {
      id: 'role-1',
      name: 'Owner',
      type: 'BuiltInRole',
      description: 'Full access to all resources',
      assignableScopes: ['/'],
      permissions: [
        {
          actions: ['*'],
          notActions: [],
          dataActions: ['*'],
          notDataActions: [],
        },
      ],
    },
    {
      id: 'role-2',
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
    },
    {
      id: 'role-3',
      name: 'Custom Role',
      type: 'CustomRole',
      description: 'A custom role for testing',
      assignableScopes: ['/subscriptions/test'],
      permissions: [
        {
          actions: ['Microsoft.Storage/*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleListComponent);
    component = fixture.componentInstance;
  });

  describe('rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should display all roles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');
      expect(roleItems.length).toBe(3);
    });

    it('should display role names', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const roleNames = compiled.querySelectorAll('.role-name');
      expect(roleNames[0].textContent).toBe('Owner');
      expect(roleNames[1].textContent).toBe('Reader');
      expect(roleNames[2].textContent).toBe('Custom Role');
    });

    it('should display role descriptions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const descriptions = compiled.querySelectorAll('.role-description');
      expect(descriptions[0].textContent).toBe('Full access to all resources');
      expect(descriptions[1].textContent).toBe('Read-only access');
    });

    it('should show Built-in badge for BuiltInRole', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.role-type-badge');
      expect(badges[0].textContent?.trim()).toBe('Built-in');
      expect(badges[0].classList.contains('built-in')).toBe(true);
    });

    it('should show Custom badge for CustomRole', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.role-type-badge');
      expect(badges[2].textContent?.trim()).toBe('Custom');
      expect(badges[2].classList.contains('built-in')).toBe(false);
    });

    it('should have section with proper aria-label', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const section = compiled.querySelector('section');
      expect(section?.getAttribute('aria-label')).toBe('Role list');
    });

    it('should display section heading', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h2');
      expect(heading?.textContent).toBe('Available Roles');
    });
  });

  describe('empty state', () => {
    it('should display empty state when no roles', () => {
      fixture.componentRef.setInput('roles', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.empty-state');
      expect(emptyState?.textContent).toBe('No roles available');
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
    });

    it('should not have any selected role by default', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const selectedItems = compiled.querySelectorAll('.role-item.selected');
      expect(selectedItems.length).toBe(0);
    });

    it('should mark role as selected when selectedRoleId matches', () => {
      fixture.componentRef.setInput('selectedRoleId', 'role-1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');
      expect(roleItems[0].classList.contains('selected')).toBe(true);
      expect(roleItems[1].classList.contains('selected')).toBe(false);
    });

    it('should update selection when selectedRoleId changes', () => {
      fixture.componentRef.setInput('selectedRoleId', 'role-1');
      fixture.detectChanges();

      fixture.componentRef.setInput('selectedRoleId', 'role-2');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');
      expect(roleItems[0].classList.contains('selected')).toBe(false);
      expect(roleItems[1].classList.contains('selected')).toBe(true);
    });

    it('should have aria-pressed attribute matching selection state', () => {
      fixture.componentRef.setInput('selectedRoleId', 'role-2');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');
      expect(roleItems[0].getAttribute('aria-pressed')).toBe('false');
      expect(roleItems[1].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('events', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
    });

    it('should emit roleSelect when clicking a role', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItem = compiled.querySelector('.role-item') as HTMLElement;

      roleItem.click();

      expect(spy).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('should emit roleSelect when pressing Enter on a role', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItem = compiled.querySelector('.role-item') as HTMLElement;

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      roleItem.dispatchEvent(enterEvent);

      expect(spy).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('should emit roleSelect when pressing Space on a role', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItem = compiled.querySelector('.role-item') as HTMLElement;

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      roleItem.dispatchEvent(spaceEvent);

      expect(spy).toHaveBeenCalledWith(mockRoles[0]);
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
    });

    it('should have role="button" on each role item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');

      roleItems.forEach((item) => {
        expect(item.getAttribute('role')).toBe('button');
      });
    });

    it('should have tabindex="0" on each role item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');

      roleItems.forEach((item) => {
        expect(item.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should have aria-pressed attribute on each role item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const roleItems = compiled.querySelectorAll('.role-item');

      roleItems.forEach((item) => {
        expect(item.hasAttribute('aria-pressed')).toBe(true);
      });
    });
  });

  describe('isSelected method', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', mockRoles);
    });

    it('should return false when no role is selected', () => {
      fixture.componentRef.setInput('selectedRoleId', null);
      fixture.detectChanges();

      expect(component.isSelected(mockRoles[0])).toBe(false);
    });

    it('should return true when role id matches selectedRoleId', () => {
      fixture.componentRef.setInput('selectedRoleId', 'role-1');
      fixture.detectChanges();

      expect(component.isSelected(mockRoles[0])).toBe(true);
    });

    it('should return false when role id does not match selectedRoleId', () => {
      fixture.componentRef.setInput('selectedRoleId', 'role-1');
      fixture.detectChanges();

      expect(component.isSelected(mockRoles[1])).toBe(false);
    });
  });
});
