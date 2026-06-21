import { Injectable, signal, computed } from '@angular/core';
import type { RoleDefinition } from '../models';

export type TabId = 'overview' | 'control-plane' | 'data-plane';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly selectedRoleSignal = signal<RoleDefinition | null>(null);
  private readonly activeTabSignal = signal<TabId>('overview');

  readonly selectedRole = this.selectedRoleSignal.asReadonly();
  readonly activeTab = this.activeTabSignal.asReadonly();

  readonly hasSelectedRole = computed(() => this.selectedRoleSignal() !== null);

  private readonly compareRoleASignal = signal<RoleDefinition | null>(null);
  private readonly compareRoleBSignal = signal<RoleDefinition | null>(null);

  readonly compareRoleA = this.compareRoleASignal.asReadonly();
  readonly compareRoleB = this.compareRoleBSignal.asReadonly();

  selectRole(role: RoleDefinition | null): void {
    this.selectedRoleSignal.set(role);
    if (role !== null) {
      this.activeTabSignal.set('overview');
    }
  }

  clearSelection(): void {
    this.selectedRoleSignal.set(null);
  }

  setActiveTab(tab: TabId): void {
    this.activeTabSignal.set(tab);
  }

  /** Fill A first, then B. When both full: old-B → A, new role → B. */
  addToComparison(role: RoleDefinition): void {
    if (!this.compareRoleASignal()) {
      this.compareRoleASignal.set(role);
    } else if (!this.compareRoleBSignal()) {
      this.compareRoleBSignal.set(role);
    } else {
      this.compareRoleASignal.set(this.compareRoleBSignal()!);
      this.compareRoleBSignal.set(role);
    }
  }

  setCompareRoleA(role: RoleDefinition | null): void {
    this.compareRoleASignal.set(role);
  }

  setCompareRoleB(role: RoleDefinition | null): void {
    this.compareRoleBSignal.set(role);
  }

  clearCompareRoleA(): void {
    this.compareRoleASignal.set(null);
  }

  clearCompareRoleB(): void {
    this.compareRoleBSignal.set(null);
  }
}
