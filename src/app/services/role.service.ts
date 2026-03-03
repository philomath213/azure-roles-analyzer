import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RoleDefinition } from '../models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly rolesSignal = signal<RoleDefinition[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly roles = this.rolesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly roleCount = computed(() => this.rolesSignal().length);
  readonly builtInRoles = computed(() =>
    this.rolesSignal().filter((r) => r.type === 'BuiltInRole')
  );
  readonly customRoles = computed(() =>
    this.rolesSignal().filter((r) => r.type === 'CustomRole')
  );

  loadRoles(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http.get<RoleDefinition[]>('/assets/data/AzureBuiltinRoles.json').subscribe({
      next: (roles) => {
        this.rolesSignal.set(this.normalizeRoles(roles));
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set(`Failed to load roles: ${err.message}`);
        this.loadingSignal.set(false);
      },
    });
  }

  getRoleById(id: string): RoleDefinition | undefined {
    return this.rolesSignal().find((r) => r.id === id);
  }

  getRoleByName(name: string): RoleDefinition | undefined {
    return this.rolesSignal().find((r) => r.name === name);
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
