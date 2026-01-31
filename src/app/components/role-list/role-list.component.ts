import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { RoleDefinition } from '../../models';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleListComponent {
  readonly roles = input.required<RoleDefinition[]>();
  readonly selectedRoleId = input<string | null>(null);

  readonly roleSelect = output<RoleDefinition>();

  onRoleClick(role: RoleDefinition): void {
    this.roleSelect.emit(role);
  }

  isSelected(role: RoleDefinition): boolean {
    return this.selectedRoleId() === role.id;
  }
}
