import type { RoleDefinition } from './role-definition.model';

export interface PermissionSearchResult {
  role: RoleDefinition;
  matchCount: number;
  totalSearched: number;
  matchPercent: number;
  overpermissionPercent: number;
}
