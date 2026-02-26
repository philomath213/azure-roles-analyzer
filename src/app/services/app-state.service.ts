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
}
