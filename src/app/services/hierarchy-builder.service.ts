import { Injectable, inject } from '@angular/core';
import type {
  RoleDefinition,
  HierarchyNode,
  RoleHierarchy,
  RoleRelationship,
} from '../models';
import { PermissionEngineService } from './permission-engine.service';
import { matchesPattern } from '../utils/permission-matcher';

@Injectable({ providedIn: 'root' })
export class HierarchyBuilderService {
  private readonly permissionEngine = inject(PermissionEngineService);

  /**
   * Builds a role hierarchy tree from a list of roles.
   * Parent roles contain (are supersets of) child role permissions.
   */
  buildHierarchy(roles: RoleDefinition[]): RoleHierarchy {
    if (roles.length === 0) {
      return { roots: [], totalRoles: 0, nodeMap: new Map() };
    }

    // Create nodes for all roles
    const nodeMap = new Map<string, HierarchyNode>();
    for (const role of roles) {
      nodeMap.set(role.id, {
        role,
        children: [],
        depth: 0,
      });
    }

    // Find all parent-child relationships
    const relationships = this.findAllRelationships(roles);

    // Build the tree structure
    const roots = this.buildTree(roles, relationships, nodeMap);

    return {
      roots,
      totalRoles: roles.length,
      nodeMap,
    };
  }

  /**
   * Finds all parent-child relationships between roles.
   * A role is a child of another if its permissions are a proper subset.
   */
  findAllRelationships(roles: RoleDefinition[]): RoleRelationship[] {
    const relationships: RoleRelationship[] = [];

    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        if (i === j) continue;

        const potentialParent = roles[i];
        const potentialChild = roles[j];

        if (this.isProperSubset(potentialChild, potentialParent)) {
          relationships.push({
            parentId: potentialParent.id,
            childId: potentialChild.id,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Checks if roleB's permissions are a proper subset of roleA's permissions.
   * This means roleA can do everything roleB can do, plus more.
   */
  isProperSubset(child: RoleDefinition, parent: RoleDefinition): boolean {
    if (child.id === parent.id) {
      return false;
    }

    const isSubset = this.isSubsetOf(child, parent);
    const isEqual = isSubset && this.isSubsetOf(parent, child);

    return isSubset && !isEqual;
  }

  /**
   * Checks if roleB's permissions are a subset of (or equal to) roleA's permissions.
   */
  isSubsetOf(child: RoleDefinition, parent: RoleDefinition): boolean {
    const childEffective = this.permissionEngine.getEffective(child);
    const parentEffective = this.permissionEngine.getEffective(parent);

    // Check control plane: all child's allowed must be covered by parent's allowed
    const controlPlaneOk = this.isPlaneCovered(
      childEffective.actions,
      parentEffective.actions,
      parentEffective.notActions
    );

    // Check data plane: all child's allowed must be covered by parent's allowed
    const dataPlaneOk = this.isPlaneCovered(
      childEffective.dataActions,
      parentEffective.dataActions,
      parentEffective.notDataActions
    );

    return controlPlaneOk && dataPlaneOk;
  }

  /**
   * Checks if all child patterns are covered by parent patterns.
   * A child pattern is covered if the parent has patterns that match
   * at least everything the child pattern matches.
   */
  private isPlaneCovered(
    childPatterns: string[],
    parentPatterns: string[],
    parentDenied: string[]
  ): boolean {
    // Empty child is always a subset
    if (childPatterns.length === 0) {
      return true;
    }

    // Non-empty child can't be subset of empty parent
    if (parentPatterns.length === 0) {
      return false;
    }

    // Each child pattern must be covered by some parent pattern
    for (const childPattern of childPatterns) {
      const isCovered = this.isPatternCoveredBy(childPattern, parentPatterns, parentDenied);
      if (!isCovered) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a pattern is covered by a set of parent patterns.
   * Pattern A is covered by pattern B if B matches everything A matches.
   */
  private isPatternCoveredBy(
    pattern: string,
    coveringPatterns: string[],
    deniedPatterns: string[]
  ): boolean {
    // If child has global wildcard '*', it can do EVERYTHING
    // Parent must also have '*' with NO denials to fully cover it
    if (pattern === '*') {
      const parentHasGlobalWildcard = coveringPatterns.includes('*');
      // If parent doesn't have '*' or has any denials, child's '*' is not covered
      return parentHasGlobalWildcard && deniedPatterns.length === 0;
    }

    // For non-global wildcards, check if parent's denials would block anything
    // the child's pattern allows
    if (pattern.includes('*') && deniedPatterns.length > 0) {
      // Check if any denied pattern overlaps with this pattern
      for (const denied of deniedPatterns) {
        // If the child's pattern could match something the parent denies,
        // then the child is not fully covered
        if (this.patternsOverlap(pattern, denied)) {
          return false;
        }
      }
    }

    // Check if any covering pattern covers this pattern
    for (const coveringPattern of coveringPatterns) {
      if (this.patternCovers(coveringPattern, pattern)) {
        // For non-wildcard patterns, check if specifically denied
        const isDenied = deniedPatterns.some((denied) => matchesPattern(denied, pattern));
        if (!isDenied) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if two patterns could match the same permission string.
   * For example, patterns ending in '/read' and '/Delete' do NOT overlap
   * because they have different trailing segments.
   */
  private patternsOverlap(pattern1: string, pattern2: string): boolean {
    // If either is global wildcard, they overlap
    if (pattern1 === '*' || pattern2 === '*') {
      return true;
    }

    // Check if one pattern covers the other (either direction)
    if (this.patternCovers(pattern1, pattern2) || this.patternCovers(pattern2, pattern1)) {
      return true;
    }

    const parts1 = pattern1.split('/');
    const parts2 = pattern2.split('/');

    // Key insight: if both patterns have non-wildcard trailing segments that differ,
    // they cannot overlap (e.g., */read vs */Delete)
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];

    // If both trailing segments are non-wildcards and different, no overlap
    if (!last1.includes('*') && !last2.includes('*')) {
      if (last1.toLowerCase() !== last2.toLowerCase()) {
        return false;
      }
    }

    // Check for structural overlap by comparing segments from the start
    // Patterns like '*/read' (2 segments) vs 'Microsoft.Auth/*/Delete' (3 segments)
    // need careful comparison
    const minLen = Math.min(parts1.length, parts2.length);
    for (let i = 0; i < minLen; i++) {
      const p1 = parts1[i];
      const p2 = parts2[i];

      // If either is a pure wildcard, continue (could match anything)
      if (p1 === '*' || p2 === '*') continue;

      // Partial wildcards - check if they could match each other
      if (p1.includes('*') || p2.includes('*')) {
        if (matchesPattern(p1, p2) || matchesPattern(p2, p1)) continue;
        return false;
      }

      // Non-wildcard segments must match (case-insensitive)
      if (p1.toLowerCase() !== p2.toLowerCase()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if pattern A covers pattern B.
   * A covers B if A matches everything B matches.
   *
   * Examples:
   * - '*' covers everything
   * - '* /read' covers 'Microsoft.Storage/* /read'
   * - 'Microsoft.Storage/*' covers 'Microsoft.Storage/storageAccounts/read'
   */
  patternCovers(covering: string, covered: string): boolean {
    // Same pattern always covers
    if (covering === covered) {
      return true;
    }

    // Global wildcard covers everything
    if (covering === '*') {
      return true;
    }

    // If covered is *, only * can cover it
    if (covered === '*') {
      return false;
    }

    // For wildcard patterns, we need to check if covering is "broader"
    // A pattern A is broader than B if every string matching B also matches A

    // Strategy: Check if the covering pattern would match the covered pattern
    // when treating the covered pattern as a literal string (for non-wildcard parts)

    // If covered has no wildcards, check if covering matches it
    if (!covered.includes('*')) {
      return matchesPattern(covering, covered);
    }

    // Both have wildcards - compare structure
    return this.wildcardPatternCovers(covering, covered);
  }

  /**
   * Compares two wildcard patterns to determine if one covers the other.
   * Uses segment-by-segment comparison.
   */
  private wildcardPatternCovers(covering: string, covered: string): boolean {
    const coveringParts = covering.split('/');
    const coveredParts = covered.split('/');

    // If covering is shorter but ends with *, it might still cover
    // e.g., "Microsoft.*" doesn't cover "Microsoft.Storage/accounts/read"
    // but "Microsoft.*/*" might

    let coveringIdx = 0;
    let coveredIdx = 0;

    while (coveredIdx < coveredParts.length) {
      if (coveringIdx >= coveringParts.length) {
        // Covering ran out but covered didn't
        // Only OK if last covering part was *
        return coveringParts[coveringParts.length - 1] === '*';
      }

      const coveringPart = coveringParts[coveringIdx];
      const coveredPart = coveredParts[coveredIdx];

      if (coveringPart === '*') {
        // * matches any segment, move both forward
        coveringIdx++;
        coveredIdx++;
      } else if (coveredPart === '*') {
        // Covered has wildcard but covering doesn't at this position
        // Covering can't cover a broader pattern
        if (!coveringPart.includes('*')) {
          return false;
        }
        // Both have wildcards in this segment
        if (!this.segmentCovers(coveringPart, coveredPart)) {
          return false;
        }
        coveringIdx++;
        coveredIdx++;
      } else if (coveringPart.includes('*') || coveredPart.includes('*')) {
        // One or both have partial wildcards
        if (!this.segmentCovers(coveringPart, coveredPart)) {
          return false;
        }
        coveringIdx++;
        coveredIdx++;
      } else {
        // Both are literal - must match exactly (case-insensitive)
        if (coveringPart.toLowerCase() !== coveredPart.toLowerCase()) {
          return false;
        }
        coveringIdx++;
        coveredIdx++;
      }
    }

    // Covered is exhausted, covering must also be exhausted or have only wildcards left
    while (coveringIdx < coveringParts.length) {
      if (coveringParts[coveringIdx] !== '*' && coveringParts[coveringIdx] !== '') {
        return false;
      }
      coveringIdx++;
    }

    return true;
  }

  /**
   * Checks if a segment pattern covers another segment pattern.
   */
  private segmentCovers(covering: string, covered: string): boolean {
    if (covering === '*') return true;
    if (covering === covered) return true;
    if (covered === '*') return false;

    // If covering has * and covered doesn't, covering is broader
    if (covering.includes('*') && !covered.includes('*')) {
      return matchesPattern(covering, covered);
    }

    // If both have *, compare positions
    // e.g., "Microsoft.*" covers "Microsoft.Storage" but not vice versa
    if (covering.includes('*') && covered.includes('*')) {
      // Simple heuristic: if covering's non-wildcard prefix is prefix of covered's
      const coveringPrefix = covering.split('*')[0];
      const coveredPrefix = covered.split('*')[0];
      return (
        coveredPrefix.toLowerCase().startsWith(coveringPrefix.toLowerCase()) ||
        coveringPrefix === ''
      );
    }

    return false;
  }

  /**
   * Builds the tree structure from relationships.
   * Finds immediate parents (no intermediate roles between parent and child).
   */
  private buildTree(
    roles: RoleDefinition[],
    relationships: RoleRelationship[],
    nodeMap: Map<string, HierarchyNode>
  ): HierarchyNode[] {
    // Build adjacency lists
    const parents = new Map<string, Set<string>>(); // childId -> parentIds
    const children = new Map<string, Set<string>>(); // parentId -> childIds

    for (const role of roles) {
      parents.set(role.id, new Set());
      children.set(role.id, new Set());
    }

    for (const rel of relationships) {
      parents.get(rel.childId)?.add(rel.parentId);
      children.get(rel.parentId)?.add(rel.childId);
    }

    // Find immediate parents (transitive reduction)
    // Parent P is immediate if there's no intermediate role I where child ⊂ I ⊂ P
    const immediateChildren = new Map<string, Set<string>>();
    for (const role of roles) {
      immediateChildren.set(role.id, new Set());
    }

    for (const rel of relationships) {
      const parentId = rel.parentId;
      const childId = rel.childId;

      // Check if there's an intermediate role
      let hasIntermediate = false;
      const parentChildren = children.get(parentId) ?? new Set();
      const childParents = parents.get(childId) ?? new Set();

      for (const potentialIntermediate of parentChildren) {
        if (potentialIntermediate === childId) continue;
        if (childParents.has(potentialIntermediate)) {
          // potentialIntermediate is both a child of parent and a parent of child
          hasIntermediate = true;
          break;
        }
      }

      if (!hasIntermediate) {
        immediateChildren.get(parentId)?.add(childId);
      }
    }

    // Build tree nodes with children
    for (const [parentId, childIds] of immediateChildren) {
      const parentNode = nodeMap.get(parentId);
      if (parentNode) {
        for (const childId of childIds) {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            parentNode.children.push(childNode);
          }
        }
        // Sort children by name for consistent ordering
        parentNode.children.sort((a, b) => a.role.name.localeCompare(b.role.name));
      }
    }

    // Find roots (roles with no parents)
    const roots: HierarchyNode[] = [];
    for (const role of roles) {
      const roleParents = parents.get(role.id);
      if (!roleParents || roleParents.size === 0) {
        const node = nodeMap.get(role.id);
        if (node) {
          roots.push(node);
        }
      }
    }

    // Calculate depths
    this.calculateDepths(roots, 0);

    // Sort roots by name
    roots.sort((a, b) => a.role.name.localeCompare(b.role.name));

    return roots;
  }

  /**
   * Recursively calculates depths for all nodes.
   */
  private calculateDepths(nodes: HierarchyNode[], depth: number): void {
    for (const node of nodes) {
      node.depth = depth;
      this.calculateDepths(node.children, depth + 1);
    }
  }

  /**
   * Flattens the hierarchy tree into a list for display.
   */
  flattenHierarchy(hierarchy: RoleHierarchy): HierarchyNode[] {
    const result: HierarchyNode[] = [];
    const visited = new Set<string>();

    const visit = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        if (!visited.has(node.role.id)) {
          visited.add(node.role.id);
          result.push(node);
          visit(node.children);
        }
      }
    };

    visit(hierarchy.roots);
    return result;
  }

  /**
   * Finds the path from a role to the root of the hierarchy.
   */
  findPathToRoot(hierarchy: RoleHierarchy, roleId: string): RoleDefinition[] {
    const path: RoleDefinition[] = [];
    const visited = new Set<string>();

    const findPath = (nodes: HierarchyNode[], target: string): boolean => {
      for (const node of nodes) {
        if (visited.has(node.role.id)) continue;
        visited.add(node.role.id);

        if (node.role.id === target) {
          path.unshift(node.role);
          return true;
        }

        if (findPath(node.children, target)) {
          path.unshift(node.role);
          return true;
        }
      }
      return false;
    };

    findPath(hierarchy.roots, roleId);
    return path;
  }
}
