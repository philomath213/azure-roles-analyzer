import { Injectable, inject } from '@angular/core';
import type { RoleDefinition } from '../models';
import type { PermissionDiff, RoleComparison } from '../models/role-comparison.model';
import { PermissionEngineService } from './permission-engine.service';
import { HierarchyBuilderService } from './hierarchy-builder.service';

@Injectable({ providedIn: 'root' })
export class RoleCompareService {
  private readonly permissionEngine = inject(PermissionEngineService);
  private readonly hierarchyBuilder = inject(HierarchyBuilderService);

  compareRoles(roleA: RoleDefinition, roleB: RoleDefinition): RoleComparison {
    const mergedA = this.permissionEngine.mergePermissionBlocks(roleA.permissions);
    const mergedB = this.permissionEngine.mergePermissionBlocks(roleB.permissions);

    const aSubB = this.hierarchyBuilder.isSubsetOf(roleA, roleB);
    const bSubA = this.hierarchyBuilder.isSubsetOf(roleB, roleA);

    const relationship: RoleComparison['relationship'] =
      aSubB && bSubA
        ? 'equal'
        : aSubB
          ? 'a-subset-of-b'
          : bSubA
            ? 'b-subset-of-a'
            : 'none';

    return {
      roleA,
      roleB,
      relationship,
      controlPlane: this.diff(mergedA.actions, mergedB.actions),
      controlPlaneNot: this.diff(mergedA.notActions, mergedB.notActions),
      dataPlane: this.diff(mergedA.dataActions, mergedB.dataActions),
      dataPlaneNot: this.diff(mergedA.notDataActions, mergedB.notDataActions),
    };
  }

  private diff(a: string[], b: string[]): PermissionDiff {
    const setA = new Set(a);
    const setB = new Set(b);
    return {
      onlyInA: a.filter((x) => !setB.has(x)),
      shared: a.filter((x) => setB.has(x)),
      onlyInB: b.filter((x) => !setA.has(x)),
    };
  }
}
