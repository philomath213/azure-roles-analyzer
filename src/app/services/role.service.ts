import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RoleDefinition } from '../models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private static readonly STORAGE_KEY = 'azure-roles-analyzer.uploaded-roles';

  private readonly http = inject(HttpClient);
  private readonly builtInRolesSignal = signal<RoleDefinition[]>([]);
  private readonly uploadedRolesSignal = signal<RoleDefinition[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly roles = computed(() => [
    ...this.builtInRolesSignal(),
    ...this.uploadedRolesSignal(),
  ]);
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly roleCount = computed(() => this.roles().length);
  readonly builtInRoles = computed(() => this.roles().filter((r) => r.type === 'BuiltInRole'));
  readonly customRoles = computed(() => this.roles().filter((r) => r.type === 'CustomRole'));

  readonly uploadedRoles = this.uploadedRolesSignal.asReadonly();
  readonly uploadedRoleCount = computed(() => this.uploadedRolesSignal().length);
  readonly hasUploadedRoles = computed(() => this.uploadedRolesSignal().length > 0);

  constructor() {
    this.loadUploadedRolesFromStorage();
  }

  loadRoles(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http.get<RoleDefinition[]>('assets/data/AzureBuiltinRoles.json').subscribe({
      next: (roles) => {
        this.builtInRolesSignal.set(this.normalizeRoles(roles));
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set(`Failed to load roles: ${err.message}`);
        this.loadingSignal.set(false);
      },
    });
  }

  getRoleById(id: string): RoleDefinition | undefined {
    return this.roles().find((r) => r.id === id);
  }

  getRoleByName(name: string): RoleDefinition | undefined {
    return this.roles().find((r) => r.name === name);
  }

  addUploadedRoles(data: unknown): void {
    const roles = RoleService.validateRoleArray(data);
    const normalized = this.normalizeRoles(roles);
    this.uploadedRolesSignal.set(normalized);
    localStorage.setItem(RoleService.STORAGE_KEY, JSON.stringify(normalized));
  }

  clearUploadedRoles(): void {
    this.uploadedRolesSignal.set([]);
    localStorage.removeItem(RoleService.STORAGE_KEY);
  }

  private loadUploadedRolesFromStorage(): void {
    try {
      const stored = localStorage.getItem(RoleService.STORAGE_KEY);
      if (!stored) return;
      const roles = RoleService.validateRoleArray(JSON.parse(stored) as unknown);
      this.uploadedRolesSignal.set(this.normalizeRoles(roles));
    } catch {
      localStorage.removeItem(RoleService.STORAGE_KEY);
    }
  }

  private static validateRoleArray(data: unknown): RoleDefinition[] {
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of role definitions.');
    }
    if (data.length === 0) {
      throw new Error('The file contains no role definitions.');
    }
    for (let i = 0; i < data.length; i++) {
      const item = data[i] as Record<string, unknown>;
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Entry at index ${i} is not an object.`);
      }
      if (typeof item['id'] !== 'string' || !item['id']) {
        throw new Error(`Entry at index ${i} is missing a valid "id".`);
      }
      if (typeof item['name'] !== 'string' || !item['name']) {
        throw new Error(`Entry at index ${i} is missing a valid "name".`);
      }
      if (!Array.isArray(item['permissions'])) {
        throw new Error(`Entry at index ${i} is missing a "permissions" array.`);
      }
    }
    return data as RoleDefinition[];
  }

  private normalizeRoles(roles: RoleDefinition[]): RoleDefinition[] {
    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((p) => ({
        actions: p.actions ?? [],
        notActions: p.notActions ?? [],
        dataActions: p.dataActions ?? [],
        notDataActions: p.notDataActions ?? [],
      })),
    }));
  }
}
