import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HierarchyTreeComponent } from './hierarchy-tree.component';
import type { HierarchyNode, RoleDefinition } from '../../models';

describe('HierarchyTreeComponent', () => {
  let component: HierarchyTreeComponent;
  let fixture: ComponentFixture<HierarchyTreeComponent>;

  const createRole = (
    id: string,
    name: string,
    type: 'BuiltInRole' | 'CustomRole' = 'BuiltInRole'
  ): RoleDefinition => ({
    id,
    name,
    type,
    description: `${name} description`,
    assignableScopes: ['/'],
    permissions: [{ actions: ['*'], notActions: [], dataActions: [], notDataActions: [] }],
  });

  const createNode = (
    role: RoleDefinition,
    children: HierarchyNode[] = [],
    depth = 0
  ): HierarchyNode => ({ role, children, depth });

  // Sample hierarchy:
  // Owner (root, depth 0)
  //   ├── Contributor (depth 1)
  //   │   └── Reader (depth 2)
  //   └── Custom Role (depth 1)
  // Storage Blob Contributor (root, depth 0)
  //   └── Storage Blob Reader (depth 1)
  const ownerRole = createRole('owner-id', 'Owner');
  const contributorRole = createRole('contributor-id', 'Contributor');
  const readerRole = createRole('reader-id', 'Reader');
  const customRole = createRole('custom-id', 'Custom Role', 'CustomRole');
  const blobContributorRole = createRole('blob-contributor-id', 'Storage Blob Data Contributor');
  const blobReaderRole = createRole('blob-reader-id', 'Storage Blob Data Reader');

  const readerNode = createNode(readerRole, [], 2);
  const contributorNode = createNode(contributorRole, [readerNode], 1);
  const customNode = createNode(customRole, [], 1);
  const ownerNode = createNode(ownerRole, [contributorNode, customNode], 0);
  const blobReaderNode = createNode(blobReaderRole, [], 1);
  const blobContributorNode = createNode(blobContributorRole, [blobReaderNode], 0);

  const testRoots: HierarchyNode[] = [ownerNode, blobContributorNode];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HierarchyTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HierarchyTreeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roots', testRoots);
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should display tree header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h2')?.textContent).toBe('Role Hierarchy');
    });

    it('should display total role count', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.tree-info')?.textContent).toContain('6 roles');
    });

    it('should render tree container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[role="tree"]')).toBeTruthy();
    });

    it('should render only root nodes initially (collapsed by default)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('[role="treeitem"]');
      // Only Owner and Storage Blob Data Contributor are visible initially
      expect(items.length).toBe(2);
    });

    it('should display root node names', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const names = Array.from(compiled.querySelectorAll('.node-name')).map(
        (n) => n.textContent?.trim()
      );
      expect(names).toContain('Owner');
      expect(names).toContain('Storage Blob Data Contributor');
    });

    it('should display role type badges', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.node-type');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]?.textContent?.trim()).toBe('Built-in');
    });

    it('should show children count for nodes with children', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const counts = compiled.querySelectorAll('.children-count');
      expect(counts.length).toBeGreaterThan(0);
    });
  });

  describe('expand / collapse', () => {
    it('should expand a node and show its direct children when clicked', () => {
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const names = Array.from(compiled.querySelectorAll('.node-name')).map(
        (n) => n.textContent?.trim()
      );
      expect(names).toContain('Contributor');
      expect(names).toContain('Custom Role');
    });

    it('should not render grandchildren until intermediate node is also expanded', () => {
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      // Reader is a grandchild — only visible after Contributor is also expanded
      const getNames = () =>
        Array.from(fixture.nativeElement.querySelectorAll('.node-name')).map((n) =>
          (n as Element).textContent?.trim()
        );

      expect(getNames()).not.toContain('Reader');

      component.onNodeClick(contributorNode);
      fixture.detectChanges();

      const names = getNames();
      expect(names).toContain('Reader');
    });

    it('should collapse an expanded node and remove its children from the DOM', () => {
      component.onNodeClick(ownerNode); // expand
      fixture.detectChanges();
      component.onNodeClick(ownerNode); // collapse
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const names = Array.from(compiled.querySelectorAll('.node-name')).map(
        (n) => n.textContent?.trim()
      );
      expect(names).not.toContain('Contributor');
      expect(names).not.toContain('Custom Role');
    });

    it('should set aria-expanded="true" when a node is expanded', () => {
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const ownerItem = Array.from(compiled.querySelectorAll('[role="treeitem"]')).find((el) =>
        el.querySelector('.node-name')?.textContent?.includes('Owner')
      );
      expect(ownerItem?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should set aria-expanded="false" after collapsing a node', () => {
      component.onNodeClick(ownerNode); // expand
      fixture.detectChanges();
      component.onNodeClick(ownerNode); // collapse
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const ownerItem = Array.from(compiled.querySelectorAll('[role="treeitem"]')).find((el) =>
        el.querySelector('.node-name')?.textContent?.includes('Owner')
      );
      expect(ownerItem?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not set aria-expanded on leaf nodes', () => {
      // Expand Owner so Custom Role (a leaf) is visible
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const customItem = Array.from(compiled.querySelectorAll('[role="treeitem"]')).find((el) =>
        el.querySelector('.node-name')?.textContent?.includes('Custom Role')
      );
      expect(customItem?.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('selection', () => {
    it('should emit roleSelect when a node is clicked', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      component.onNodeClick(ownerNode);
      expect(spy).toHaveBeenCalledWith(ownerRole);
    });

    it('should emit roleSelect for a leaf node', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      component.onNodeClick(customNode);
      expect(spy).toHaveBeenCalledWith(customRole);
    });

    it('should set selectedId when a node is clicked', () => {
      component.onNodeClick(ownerNode);
      expect(component.selectedId()).toBe('owner-id');
    });

    it('should update selectedId when a different node is clicked', () => {
      component.onNodeClick(ownerNode);
      component.onNodeClick(blobContributorNode);
      expect(component.selectedId()).toBe('blob-contributor-id');
    });

    it('should set aria-selected="true" on the selected node', () => {
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const ownerItem = Array.from(compiled.querySelectorAll('[role="treeitem"]')).find((el) =>
        el.querySelector('.node-name')?.textContent?.includes('Owner')
      );
      expect(ownerItem?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('totalCount', () => {
    it('should count all nodes including nested', () => {
      expect(component.totalCount()).toBe(6);
    });

    it('should return 0 for empty roots', () => {
      fixture.componentRef.setInput('roots', []);
      fixture.detectChanges();
      expect(component.totalCount()).toBe(0);
    });

    it('should count single root correctly', () => {
      fixture.componentRef.setInput('roots', [ownerNode]);
      fixture.detectChanges();
      // Owner + Contributor + Reader + Custom Role = 4
      expect(component.totalCount()).toBe(4);
    });
  });

  describe('accessibility', () => {
    it('should have tree role on container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[role="tree"]')).toBeTruthy();
    });

    it('should have treeitem role on root nodes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('[role="treeitem"]');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have group role on expanded node children', () => {
      // Groups only appear after a node is expanded
      component.onNodeClick(ownerNode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const groups = compiled.querySelectorAll('[role="group"]');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should have tabindex=0 on tree items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('[role="treeitem"]');
      items.forEach((item) => {
        expect(item.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should select and expand node on Enter key', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const ownerItem = compiled.querySelectorAll('[role="treeitem"]')[0] as HTMLElement;

      ownerItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(ownerRole);
      expect(component.selectedId()).toBe('owner-id');
    });

    it('should select and expand node on Space key', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const ownerItem = compiled.querySelectorAll('[role="treeitem"]')[0] as HTMLElement;

      ownerItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(ownerRole);
    });
  });

  describe('empty state', () => {
    it('should show empty state when no roots provided', () => {
      fixture.componentRef.setInput('roots', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.empty-state')?.textContent).toContain(
        'No roles in hierarchy'
      );
    });

    it('should not show tree container when empty', () => {
      fixture.componentRef.setInput('roots', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.tree-container')).toBeFalsy();
    });
  });
});
