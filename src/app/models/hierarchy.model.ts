import type { RoleDefinition } from './role-definition.model';

/**
 * Represents a node in the role hierarchy tree.
 * Parent roles contain (are supersets of) child role permissions.
 */
export interface HierarchyNode {
  role: RoleDefinition;
  children: HierarchyNode[];
  depth: number;
}

/**
 * Represents the complete role hierarchy.
 */
export interface RoleHierarchy {
  /** Root nodes (roles that aren't subsets of any other role) */
  roots: HierarchyNode[];
  /** Total number of roles in the hierarchy */
  totalRoles: number;
  /** Map of role ID to its node for quick lookup */
  nodeMap: Map<string, HierarchyNode>;
}

/**
 * Represents a parent-child relationship between roles.
 */
export interface RoleRelationship {
  parentId: string;
  childId: string;
}
