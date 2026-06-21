import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import type { RoleDefinition } from '../../models';
import type { RoleComparison } from '../../models/role-comparison.model';
import { RoleService, AppStateService } from '../../services';
import { RoleCompareService } from '../../services/role-compare.service';

@Component({
  selector: 'app-role-compare',
  templateUrl: './role-compare.component.html',
  styleUrl: './role-compare.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleCompareComponent {
  private readonly roleService = inject(RoleService);
  private readonly compareService = inject(RoleCompareService);
  private readonly appState = inject(AppStateService);

  protected readonly allRoles = this.roleService.roles;

  protected readonly searchA = signal('');
  protected readonly searchB = signal('');
  protected readonly roleA = this.appState.compareRoleA;
  protected readonly roleB = this.appState.compareRoleB;

  protected readonly filteredA = computed(() => {
    const q = this.searchA().toLowerCase();
    const all = this.allRoles();
    return q
      ? all.filter(
          (r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
        )
      : all;
  });

  protected readonly filteredB = computed(() => {
    const q = this.searchB().toLowerCase();
    const all = this.allRoles();
    return q
      ? all.filter(
          (r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
        )
      : all;
  });

  protected readonly comparison = computed(() => {
    const a = this.roleA();
    const b = this.roleB();
    return a && b ? this.compareService.compareRoles(a, b) : null;
  });

  protected selectRoleA(role: RoleDefinition): void {
    this.appState.setCompareRoleA(role);
    this.searchA.set('');
  }

  protected selectRoleB(role: RoleDefinition): void {
    this.appState.setCompareRoleB(role);
    this.searchB.set('');
  }

  protected clearRoleA(): void {
    this.appState.clearCompareRoleA();
  }

  protected clearRoleB(): void {
    this.appState.clearCompareRoleB();
  }

  protected onSearchA(e: Event): void {
    this.searchA.set((e.target as HTMLInputElement).value);
  }

  protected onSearchB(e: Event): void {
    this.searchB.set((e.target as HTMLInputElement).value);
  }

  protected relationshipLabel(
    rel: RoleComparison['relationship'],
    nameA: string,
    nameB: string,
  ): string {
    switch (rel) {
      case 'a-subset-of-b':
        return `${nameA} \u2286 ${nameB} \u2014 A has fewer permissions`;
      case 'b-subset-of-a':
        return `${nameB} \u2286 ${nameA} \u2014 B has fewer permissions`;
      case 'equal':
        return 'Equivalent \u2014 same effective permissions';
      case 'none':
        return 'No subset relationship';
    }
  }

  protected hasDiffContent(
    diff: { onlyInA: string[]; shared: string[]; onlyInB: string[] },
  ): boolean {
    return diff.onlyInA.length > 0 || diff.shared.length > 0 || diff.onlyInB.length > 0;
  }
}
