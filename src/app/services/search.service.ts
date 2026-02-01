import { Injectable, signal, computed } from '@angular/core';
import type { RoleDefinition } from '../models';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly searchQuerySignal = signal('');

  readonly searchQuery = this.searchQuerySignal.asReadonly();
  readonly hasSearchQuery = computed(() => this.searchQuerySignal().trim().length > 0);

  setSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  clearSearch(): void {
    this.searchQuerySignal.set('');
  }

  filterRoles(roles: RoleDefinition[]): RoleDefinition[] {
    const query = this.searchQuerySignal().trim().toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter((role) => this.matchesSearch(role, query));
  }

  private matchesSearch(role: RoleDefinition, query: string): boolean {
    const nameMatch = role.name.toLowerCase().includes(query);
    const descriptionMatch = role.description.toLowerCase().includes(query);

    return nameMatch || descriptionMatch;
  }
}
