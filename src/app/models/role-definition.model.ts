import { Permission } from './permission.model';

export type RoleType = 'BuiltInRole' | 'CustomRole';

export interface RoleDefinition {
  id: string;
  name: string;
  type: RoleType;
  description: string;
  assignableScopes: string[];
  permissions: Permission[];
}
