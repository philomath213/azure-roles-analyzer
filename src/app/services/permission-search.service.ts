import { Injectable, computed, inject, signal } from '@angular/core';
import type { Permission, RoleDefinition } from '../models';
import type { PermissionSearchResult } from '../models/permission-search-result.model';
import { PermissionEngineService } from './permission-engine.service';

export type SearchMode = 'AND' | 'OR';
export type PermissionPlane = 'control' | 'data' | 'both';

@Injectable({ providedIn: 'root' })
export class PermissionSearchService {
  private readonly permissionEngine = inject(PermissionEngineService);

  private readonly permissionsSignal = signal<string[]>([]);
  private readonly modeSignal = signal<SearchMode>('AND');
  private readonly planeSignal = signal<PermissionPlane>('both');

  readonly permissions = this.permissionsSignal.asReadonly();
  readonly mode = this.modeSignal.asReadonly();
  readonly plane = this.planeSignal.asReadonly();
  readonly hasPermissions = computed(() => this.permissionsSignal().length > 0);

  setPermissions(permissions: string[]): void {
    this.permissionsSignal.set([...new Set(permissions)]);
  }

  setMode(mode: SearchMode): void {
    this.modeSignal.set(mode);
  }

  setPlane(plane: PermissionPlane): void {
    this.planeSignal.set(plane);
  }

  clearSearch(): void {
    this.permissionsSignal.set([]);
  }

  /**
   * Scores and filters roles against the current permission search.
   * Reads permissionsSignal, modeSignal, and planeSignal — fully reactive
   * inside a computed(). Returns [] when no permissions are set.
   */
  scoreRoles(roles: RoleDefinition[]): PermissionSearchResult[] {
    const permissions = this.permissionsSignal();
    const mode = this.modeSignal();
    const plane = this.planeSignal();

    if (permissions.length === 0) {
      return [];
    }

    const results = roles.map((role) => {
      const matchCount = this.computeMatchCount(role, permissions, plane);
      // AND — actual ratio so users see how complete each role is (e.g. 50% = 1 of 2)
      // OR  — binary 100% when any permission matches (the OR criterion is fully satisfied)
      const matchPercent =
        mode === 'OR'
          ? matchCount > 0 ? 100 : 0
          : Math.round((matchCount / permissions.length) * 100);
      const merged = this.permissionEngine.mergePermissionBlocks(role.permissions);
      const overpermissionPercent = this.computeOverpermission(merged, permissions, plane);

      return {
        role,
        matchCount,
        totalSearched: permissions.length,
        matchPercent,
        overpermissionPercent,
      };
    });

    // Both modes: show any role with at least one matching permission.
    // matchPercent semantics differ:
    //   AND — actual ratio (1 of 2 = 50%), useful to see how complete each role is
    //   OR  — binary 100% for any match (the OR condition is fully satisfied)
    const filtered = results.filter((r) => r.matchCount > 0);

    filtered.sort((a, b) => {
      if (b.matchPercent !== a.matchPercent) {
        return b.matchPercent - a.matchPercent;
      }
      return a.overpermissionPercent - b.overpermissionPercent;
    });

    return filtered;
  }

  private computeMatchCount(
    role: RoleDefinition,
    permissions: string[],
    plane: PermissionPlane
  ): number {
    let count = 0;
    for (const perm of permissions) {
      const grantedByControl =
        plane !== 'data' && this.permissionEngine.roleGrantsPermission(role, perm);
      const grantedByData =
        plane !== 'control' && this.permissionEngine.roleGrantsDataAction(role, perm);
      if (grantedByControl || grantedByData) {
        count++;
      }
    }
    return count;
  }

  private computeOverpermission(
    merged: Permission,
    searched: string[],
    plane: PermissionPlane
  ): number {
    const roleActions =
      plane === 'control'
        ? merged.actions
        : plane === 'data'
          ? merged.dataActions
          : [...merged.actions, ...merged.dataActions];

    if (roleActions.length === 0) {
      return 0;
    }

    const searchedSet = new Set(searched.map((p) => p.toLowerCase()));
    const excessCount = roleActions.filter((a) => !searchedSet.has(a.toLowerCase())).length;
    return Math.round((excessCount / roleActions.length) * 100);
  }
}
