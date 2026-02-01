import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import type { HierarchyNode, RoleDefinition } from '../../models';

@Component({
  selector: 'app-hierarchy-tree',
  templateUrl: './hierarchy-tree.component.html',
  styleUrl: './hierarchy-tree.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, Tree, TreeItem, TreeItemGroup],
})
export class HierarchyTreeComponent {
  /** Root nodes of the hierarchy */
  readonly roots = input.required<HierarchyNode[]>();

  /** Currently selected role ID */
  readonly selectedRoleId = input<string | null>(null);

  /** Emitted when a role is selected */
  readonly roleSelect = output<RoleDefinition>();

  /** Selected values for the tree (single selection) */
  readonly selectedValues = signal<string[]>([]);

  /** Total count of roles in the tree */
  readonly totalCount = computed(() => this.countNodes(this.roots()));

  /** Count nodes recursively */
  private countNodes(nodes: HierarchyNode[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      count += this.countNodes(node.children);
    }
    return count;
  }

  /** Handle selection change from tree */
  onSelectionChange(values: string[]): void {
    this.selectedValues.set(values);
    if (values.length > 0) {
      const role = this.findRoleById(this.roots(), values[0]);
      if (role) {
        this.roleSelect.emit(role);
      }
    }
  }

  /** Find a role by ID in the hierarchy */
  private findRoleById(nodes: HierarchyNode[], id: string): RoleDefinition | null {
    for (const node of nodes) {
      if (node.role.id === id) {
        return node.role;
      }
      const found = this.findRoleById(node.children, id);
      if (found) {
        return found;
      }
    }
    return null;
  }
}
