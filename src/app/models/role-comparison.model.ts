import type { RoleDefinition } from './role-definition.model';

export interface PermissionDiff {
  onlyInA: string[];
  shared: string[];
  onlyInB: string[];
}

export interface RoleComparison {
  roleA: RoleDefinition;
  roleB: RoleDefinition;
  /** Subset/superset relationship based on effective permissions */
  relationship: 'a-subset-of-b' | 'b-subset-of-a' | 'equal' | 'none';
  controlPlane: PermissionDiff;
  controlPlaneNot: PermissionDiff;
  dataPlane: PermissionDiff;
  dataPlaneNot: PermissionDiff;
}
