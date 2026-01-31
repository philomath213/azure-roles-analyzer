export interface EffectivePermissions {
  roleId: string;
  controlPlane: {
    allowed: string[];
    denied: string[];
    hasWildcard: boolean;
  };
  dataPlane: {
    allowed: string[];
    denied: string[];
    hasWildcard: boolean;
  };
}
