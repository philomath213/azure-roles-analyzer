import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  output,
} from '@angular/core';
import type { RoleDefinition } from '../../models';
import { PermissionEngineService } from '../../services';
import type { TabId } from '../../services';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-role-details',
  templateUrl: './role-details.component.html',
  styleUrl: './role-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetailsComponent {
  private readonly permissionEngine = inject(PermissionEngineService);

  readonly role = input.required<RoleDefinition>();
  readonly activeTab = input<TabId>('overview');

  readonly tabChange = output<TabId>();
  readonly closeDetails = output<void>();

  readonly tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'control-plane', label: 'Control Plane' },
    { id: 'data-plane', label: 'Data Plane' },
  ];

  readonly controlPlaneActions = computed(() => {
    const role = this.role();
    const merged = this.permissionEngine.mergePermissionBlocks(role.permissions);
    return merged.actions;
  });

  readonly controlPlaneNotActions = computed(() => {
    const role = this.role();
    const merged = this.permissionEngine.mergePermissionBlocks(role.permissions);
    return merged.notActions;
  });

  readonly dataPlaneActions = computed(() => {
    const role = this.role();
    const merged = this.permissionEngine.mergePermissionBlocks(role.permissions);
    return merged.dataActions;
  });

  readonly dataPlaneNotActions = computed(() => {
    const role = this.role();
    const merged = this.permissionEngine.mergePermissionBlocks(role.permissions);
    return merged.notDataActions;
  });

  readonly hasControlPlanePermissions = computed(() => {
    return this.controlPlaneActions().length > 0 || this.controlPlaneNotActions().length > 0;
  });

  readonly hasDataPlanePermissions = computed(() => {
    return this.dataPlaneActions().length > 0 || this.dataPlaneNotActions().length > 0;
  });

  onTabClick(tabId: TabId): void {
    this.tabChange.emit(tabId);
  }

  onClose(): void {
    this.closeDetails.emit();
  }
}
