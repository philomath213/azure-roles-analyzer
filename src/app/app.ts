import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RoleService, AppStateService, SearchService } from './services';
import type { TabId } from './services';
import type { RoleDefinition } from './models';
import { RoleDetailsComponent, RoleListComponent, RoleSearchComponent } from './components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RoleDetailsComponent, RoleListComponent, RoleSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly appState = inject(AppStateService);
  private readonly searchService = inject(SearchService);

  protected readonly roles = this.roleService.roles;
  protected readonly roleCount = this.roleService.roleCount;
  protected readonly builtInCount = this.roleService.builtInRoles;
  protected readonly customCount = this.roleService.customRoles;
  protected readonly loading = this.roleService.loading;
  protected readonly error = this.roleService.error;

  protected readonly selectedRole = this.appState.selectedRole;
  protected readonly activeTab = this.appState.activeTab;
  protected readonly hasSelectedRole = this.appState.hasSelectedRole;

  protected readonly filteredRoles = computed(() => {
    return this.searchService.filterRoles(this.roles());
  });

  protected readonly hasSearchQuery = this.searchService.hasSearchQuery;

  ngOnInit(): void {
    this.roleService.loadRoles();
  }

  onRoleSelect(role: RoleDefinition): void {
    this.appState.selectRole(role);
  }

  onTabChange(tab: TabId): void {
    this.appState.setActiveTab(tab);
  }

  onCloseDetails(): void {
    this.appState.clearSelection();
  }
}
