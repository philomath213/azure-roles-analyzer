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
  ): HierarchyNode => ({
    role,
    children,
    depth,
  });

  // Sample hierarchy:
  // Owner (root)
  //   ├── Contributor
  //   │   └── Reader
  //   └── Custom Role
  // Storage Blob Contributor (root)
  //   └── Storage Blob Reader
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
      const header = compiled.querySelector('h2');
      expect(header?.textContent).toBe('Role Hierarchy');
    });

    it('should display total role count', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const info = compiled.querySelector('.tree-info');
      expect(info?.textContent).toContain('6 roles');
    });

    it('should render tree container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tree = compiled.querySelector('[ngTree]');
      expect(tree).toBeTruthy();
    });

    it('should render tree items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const allItems = compiled.querySelectorAll('[ngTreeItem]');
      expect(allItems.length).toBeGreaterThan(0);
    });

    it('should display role names', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const names = compiled.querySelectorAll('.node-name');
      const nameTexts = Array.from(names).map((n) => n.textContent);
      expect(nameTexts).toContain('Owner');
      expect(nameTexts).toContain('Contributor');
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

  describe('selection', () => {
    it('should emit roleSelect when selection changes', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');

      component.onSelectionChange(['owner-id']);

      expect(spy).toHaveBeenCalledWith(ownerRole);
    });

    it('should not emit when selection is empty', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');

      component.onSelectionChange([]);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should update selectedValues signal', () => {
      component.onSelectionChange(['contributor-id']);

      expect(component.selectedValues()).toEqual(['contributor-id']);
    });

    it('should find nested role by ID', () => {
      const spy = vi.spyOn(component.roleSelect, 'emit');

      component.onSelectionChange(['reader-id']);

      expect(spy).toHaveBeenCalledWith(readerRole);
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
      const tree = compiled.querySelector('[role="tree"]');
      expect(tree).toBeTruthy();
    });

    it('should have treeitem role on nodes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('[role="treeitem"]');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have group role on nested lists', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const groups = compiled.querySelectorAll('[role="group"]');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('should show empty state when no roots provided', () => {
      fixture.componentRef.setInput('roots', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.empty-state');
      expect(emptyState?.textContent).toContain('No roles in hierarchy');
    });

    it('should not show tree container when empty', () => {
      fixture.componentRef.setInput('roots', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const tree = compiled.querySelector('.tree-container');
      expect(tree).toBeFalsy();
    });
  });
});
