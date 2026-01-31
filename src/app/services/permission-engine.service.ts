import { Injectable } from '@angular/core';
import type { RoleDefinition, EffectivePermissions, Permission } from '../models';
import { matchesPattern, matchesAnyPattern } from '../utils/permission-matcher';

export interface PermissionPlane {
  allowed: string[];
  denied: string[];
  hasWildcard: boolean;
}

export interface MergedPermissions {
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

@Injectable({ providedIn: 'root' })
export class PermissionEngineService {
  private readonly cache = new Map<string, EffectivePermissions>();

  /**
   * Computes effective permissions for a role.
   * Effective permissions = Actions - NotActions (for control plane)
   * and DataActions - NotDataActions (for data plane).
   *
   * Results are cached for performance.
   */
  computeEffectivePermissions(role: RoleDefinition): EffectivePermissions {
    const cached = this.cache.get(role.id);
    if (cached) {
      return cached;
    }

    const merged = this.mergePermissionBlocks(role.permissions);

    const controlPlane = this.computePlanePermissions(merged.actions, merged.notActions);

    const dataPlane = this.computePlanePermissions(merged.dataActions, merged.notDataActions);

    const result: EffectivePermissions = {
      roleId: role.id,
      controlPlane,
      dataPlane,
    };

    this.cache.set(role.id, result);
    return result;
  }

  /**
   * Merges multiple permission blocks into a single unified view.
   * Azure roles can have multiple permission blocks that need to be combined.
   */
  mergePermissionBlocks(permissions: Permission[]): MergedPermissions {
    const merged: MergedPermissions = {
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
   * Computes effective permissions for a single plane (control or data).
   * Returns allowed actions minus denied actions.
   */
  computePlanePermissions(actions: string[], notActions: string[]): PermissionPlane {
    const hasWildcard = actions.includes('*');

    // For effective permissions, we need to track:
    // 1. What's explicitly allowed (actions)
    // 2. What's explicitly denied (notActions)
    // The effective set is conceptually: actions - notActions

    // Filter out any actions that are covered by notActions
    const effectiveAllowed = actions.filter((action) => {
      // If this action is explicitly denied, remove it
      if (notActions.includes(action)) {
        return false;
      }
      // If this action matches any notAction pattern, it's denied
      // But wildcards in notActions only deny matching wildcards in actions
      // A specific action in actions is denied if it matches a notAction pattern
      return !this.isActionDenied(action, notActions);
    });

    return {
      allowed: effectiveAllowed,
      denied: notActions,
      hasWildcard,
    };
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
    const effective = this.computeEffectivePermissions(role);
    return this.planeGrantsPermission(effective.controlPlane, permission);
  }

  /**
   * Checks if a role grants a specific data action.
   */
  roleGrantsDataAction(role: RoleDefinition, dataAction: string): boolean {
    const effective = this.computeEffectivePermissions(role);
    return this.planeGrantsPermission(effective.dataPlane, dataAction);
  }

  /**
   * Checks if a permission plane grants a specific permission.
   */
  private planeGrantsPermission(plane: PermissionPlane, permission: string): boolean {
    // First check if any allowed pattern matches
    const isAllowed = matchesAnyPattern(plane.allowed, permission);
    if (!isAllowed) {
      return false;
    }

    // Then check if it's explicitly denied
    const isDenied = matchesAnyPattern(plane.denied, permission);
    return !isDenied;
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
    const effective = this.computeEffectivePermissions(role);

    const controlPlane = knownPermissions.filter((perm) =>
      this.planeGrantsPermission(effective.controlPlane, perm)
    );

    const dataPlane = knownPermissions.filter((perm) =>
      this.planeGrantsPermission(effective.dataPlane, perm)
    );

    return { controlPlane, dataPlane };
  }

  /**
   * Clears the cache. Useful when roles are reloaded.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
