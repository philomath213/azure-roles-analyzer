import { Injectable } from '@angular/core';
import type { RoleDefinition, Permission } from '../models';
import { matchesPattern, matchesAnyPattern } from '../utils/permission-matcher';

@Injectable({ providedIn: 'root' })
export class PermissionEngineService {
  private readonly cache = new Map<string, Permission>();

  /**
   * Returns the effective permissions for a role as a Permission object.
   * - actions/notActions represent the effective control plane
   * - dataActions/notDataActions represent the effective data plane
   * Effective means: actions filtered to remove those denied by notActions patterns.
   *
   * Results are cached for performance.
   */
  getEffective(role: RoleDefinition): Permission {
    const cached = this.cache.get(role.id);
    if (cached) {
      return cached;
    }

    const merged = this.mergePermissionBlocks(role.permissions);

    const result: Permission = {
      actions: this.filterActions(merged.actions, merged.notActions),
      notActions: merged.notActions,
      dataActions: this.filterActions(merged.dataActions, merged.notDataActions),
      notDataActions: merged.notDataActions,
    };

    this.cache.set(role.id, result);
    return result;
  }

  /**
   * Merges multiple permission blocks into a single unified view.
   * Azure roles can have multiple permission blocks that need to be combined.
   */
  mergePermissionBlocks(permissions: Permission[]): Permission {
    const merged: Permission = {
      actions: [],
      notActions: [],
      dataActions: [],
      notDataActions: [],
    };

    for (const perm of permissions) {
      merged.actions.push(...perm.actions);
      merged.notActions.push(...perm.notActions);
      merged.dataActions.push(...perm.dataActions);
      merged.notDataActions.push(...perm.notDataActions);
    }

    // Remove duplicates
    merged.actions = [...new Set(merged.actions)];
    merged.notActions = [...new Set(merged.notActions)];
    merged.dataActions = [...new Set(merged.dataActions)];
    merged.notDataActions = [...new Set(merged.notDataActions)];

    return merged;
  }

  /**
   * Checks if a permission pattern matches a specific permission string.
   */
  matchesPermission(pattern: string, permission: string): boolean {
    return matchesPattern(pattern, permission);
  }

  /**
   * Checks if a role grants a specific permission.
   * Takes into account both Actions and NotActions.
   */
  roleGrantsPermission(role: RoleDefinition, permission: string): boolean {
    const effective = this.getEffective(role);
    return this.planeGrantsPermission(effective.actions, effective.notActions, permission);
  }

  /**
   * Checks if a role grants a specific data action.
   */
  roleGrantsDataAction(role: RoleDefinition, dataAction: string): boolean {
    const effective = this.getEffective(role);
    return this.planeGrantsPermission(effective.dataActions, effective.notDataActions, dataAction);
  }

  /**
   * Gets all permissions a role effectively grants (for analysis).
   * When given a list of known permissions, expands wildcards and
   * removes denied permissions.
   */
  getEffectivePermissionList(
    role: RoleDefinition,
    knownPermissions: string[]
  ): { controlPlane: string[]; dataPlane: string[] } {
    const effective = this.getEffective(role);

    const controlPlane = knownPermissions.filter((perm) =>
      this.planeGrantsPermission(effective.actions, effective.notActions, perm)
    );

    const dataPlane = knownPermissions.filter((perm) =>
      this.planeGrantsPermission(effective.dataActions, effective.notDataActions, perm)
    );

    return { controlPlane, dataPlane };
  }

  /**
   * Clears the cache. Useful when roles are reloaded.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Filters actions by removing those denied by notActions patterns.
   */
  private filterActions(actions: string[], notActions: string[]): string[] {
    return actions.filter((action) => {
      if (notActions.includes(action)) {
        return false;
      }
      return !this.isActionDenied(action, notActions);
    });
  }

  /**
   * Checks if a specific action is denied by NotActions patterns.
   * For wildcard actions, they are denied only if explicitly listed in notActions.
   * For specific actions, they are denied if they match any notAction pattern.
   */
  private isActionDenied(action: string, notActions: string[]): boolean {
    // If action contains a wildcard, only deny if explicitly in notActions
    if (action.includes('*')) {
      return notActions.includes(action);
    }

    // For specific actions, check if any notAction pattern matches
    return matchesAnyPattern(notActions, action);
  }

  /**
   * Checks if a set of allowed/denied patterns grants a specific permission.
   */
  private planeGrantsPermission(allowed: string[], denied: string[], permission: string): boolean {
    // First check if any allowed pattern matches
    const isAllowed = matchesAnyPattern(allowed, permission);
    if (!isAllowed) {
      return false;
    }

    // Then check if it's explicitly denied
    const isDenied = matchesAnyPattern(denied, permission);
    return !isDenied;
  }
}
