import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { HierarchyNode, RoleDefinition } from '../../models';

@Component({
  selector: 'app-hierarchy-tree',
  templateUrl: './hierarchy-tree.component.html',
  styleUrl: './hierarchy-tree.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
})
export class HierarchyTreeComponent {
  readonly roots = input.required<HierarchyNode[]>();
  readonly roleSelect = output<RoleDefinition>();

  /**
   * Set of role IDs whose children are currently visible.
   * Children are rendered via @if — not hidden with CSS — so collapsed subtrees
   * have zero DOM presence and are never touched by change detection.
   */
  private readonly expandedIds = signal(new Set<string>());

  /** The currently selected role ID. */
  readonly selectedId = signal<string | null>(null);

  /** True when the given node is expanded. */
  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  /**
   * Clicking a node:
   * - toggles expansion when it has children
   * - always selects the role and emits it to the parent
   */
  onNodeClick(event: MouseEvent | null, node: HierarchyNode): void {
    event?.stopPropagation();
    if (node.children.length > 0) {
      this.expandedIds.update((prev) => {
        const next = new Set(prev);
        if (next.has(node.role.id)) {
          next.delete(node.role.id);
        } else {
          next.add(node.role.id);
        }
        return next;
      });
    }
    this.selectedId.set(node.role.id);
    this.roleSelect.emit(node.role);
  }

  protected onNodeKeydown(event: KeyboardEvent, node: HierarchyNode): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.onNodeClick(null, node);
    }
  }

}
