import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ElementRef,
} from '@angular/core';
import type { RoleDefinition } from '../../models';
import type { PermissionDiff, RoleComparison } from '../../models/role-comparison.model';
import { RoleService, AppStateService } from '../../services';
import { RoleCompareService } from '../../services/role-compare.service';

type DiffTag = 'a' | 'b' | 'shared';
type Verdict = 'identical' | 'a-subset' | 'b-subset' | 'disjoint' | 'partial';
type CategoryStatus = 'both-empty' | 'identical' | 'differs';

interface DiffRow {
  permission: string;
  prefix: string;
  leaf: string;
  tag: DiffTag;
}

interface CategoryView {
  key: string;
  title: string;
  anchorId: string;
  counts: { a: number; shared: number; b: number };
  status: CategoryStatus;
  rows: DiffRow[];
}

const CATEGORY_DEFS = [
  { key: 'controlPlane', title: 'Control Plane Actions', anchorId: 'cat-control-actions' },
  { key: 'controlPlaneNot', title: 'Control Plane NotActions', anchorId: 'cat-control-notactions' },
  { key: 'dataPlane', title: 'Data Plane Actions', anchorId: 'cat-data-actions' },
  { key: 'dataPlaneNot', title: 'Data Plane NotDataActions', anchorId: 'cat-data-notactions' },
] as const;

@Component({
  selector: 'app-role-compare',
  templateUrl: './role-compare.component.html',
  styleUrl: './role-compare.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleCompareComponent {
  private readonly roleService = inject(RoleService);
  private readonly compareService = inject(RoleCompareService);
  private readonly appState = inject(AppStateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly categoryDefs = CATEGORY_DEFS;

  protected readonly allRoles = this.roleService.roles;
  protected readonly roleA = this.appState.compareRoleA;
  protected readonly roleB = this.appState.compareRoleB;

  // Combobox state
  protected readonly searchA = signal('');
  protected readonly searchB = signal('');
  protected readonly openA = signal(false);
  protected readonly openB = signal(false);
  protected readonly activeIndexA = signal(-1);
  protected readonly activeIndexB = signal(-1);

  // Diff controls
  protected readonly showOnlyDiff = signal(false);
  protected readonly filterText = signal('');

  protected readonly filteredA = computed(() => this.filterRoles(this.searchA()));
  protected readonly filteredB = computed(() => this.filterRoles(this.searchB()));

  protected readonly comparison = computed<RoleComparison | null>(() => {
    const a = this.roleA();
    const b = this.roleB();
    return a && b ? this.compareService.compareRoles(a, b) : null;
  });

  /** Totals of A-only / shared / B-only across all four categories. */
  protected readonly totals = computed(() => {
    const cmp = this.comparison();
    if (!cmp) return { a: 0, shared: 0, b: 0 };
    let a = 0;
    let shared = 0;
    let b = 0;
    for (const def of CATEGORY_DEFS) {
      const d = cmp[def.key] as PermissionDiff;
      a += d.onlyInA.length;
      shared += d.shared.length;
      b += d.onlyInB.length;
    }
    return { a, shared, b };
  });

  /** Plain-English verdict derived from the relationship + diff totals (presentation only). */
  protected readonly verdict = computed<Verdict | null>(() => {
    const cmp = this.comparison();
    if (!cmp) return null;
    switch (cmp.relationship) {
      case 'equal':
        return 'identical';
      case 'a-subset-of-b':
        return 'a-subset';
      case 'b-subset-of-a':
        return 'b-subset';
      case 'none':
        return this.totals().shared === 0 ? 'disjoint' : 'partial';
    }
  });

  /** Proportion-bar segment widths (percent). */
  protected readonly barSegments = computed(() => {
    const t = this.totals();
    const sum = t.a + t.shared + t.b;
    if (sum === 0) return { a: 0, shared: 0, b: 0 };
    return { a: (t.a / sum) * 100, shared: (t.shared / sum) * 100, b: (t.b / sum) * 100 };
  });

  /** Per-category model with unified, filtered diff rows. Reactive to filterText/showOnlyDiff. */
  protected readonly categoryViews = computed<CategoryView[]>(() => {
    const cmp = this.comparison();
    if (!cmp) return [];
    const filter = this.filterText().trim().toLowerCase();
    const onlyDiff = this.showOnlyDiff();

    return CATEGORY_DEFS.map((def) => {
      const d = cmp[def.key] as PermissionDiff;
      const counts = { a: d.onlyInA.length, shared: d.shared.length, b: d.onlyInB.length };
      const status: CategoryStatus =
        counts.a + counts.shared + counts.b === 0
          ? 'both-empty'
          : counts.a === 0 && counts.b === 0
            ? 'identical'
            : 'differs';

      // Differences first (A only, then B only), then shared.
      const rows: DiffRow[] = [
        ...d.onlyInA.map((p) => this.makeRow(p, 'a')),
        ...d.onlyInB.map((p) => this.makeRow(p, 'b')),
        ...(onlyDiff ? [] : d.shared.map((p) => this.makeRow(p, 'shared'))),
      ].filter((r) => !filter || r.permission.toLowerCase().includes(filter));

      return { ...def, counts, status, rows };
    });
  });

  /** True when both roles are selected but neither declares any permission. */
  protected readonly allEmpty = computed(
    () => this.comparison() !== null && this.categoryViews().every((c) => c.status === 'both-empty'),
  );

  // --- Combobox: search/select/clear ---

  protected onSearchA(e: Event): void {
    this.searchA.set((e.target as HTMLInputElement).value);
    this.openA.set(true);
    this.activeIndexA.set(-1);
  }

  protected onSearchB(e: Event): void {
    this.searchB.set((e.target as HTMLInputElement).value);
    this.openB.set(true);
    this.activeIndexB.set(-1);
  }

  protected onFocusA(): void {
    this.openA.set(true);
  }

  protected onFocusB(): void {
    this.openB.set(true);
  }

  protected onBlurA(): void {
    // Defer so an option click registers before the list closes.
    setTimeout(() => this.openA.set(false), 120);
  }

  protected onBlurB(): void {
    setTimeout(() => this.openB.set(false), 120);
  }

  protected selectRoleA(role: RoleDefinition): void {
    this.appState.setCompareRoleA(role);
    this.searchA.set('');
    this.openA.set(false);
    this.activeIndexA.set(-1);
  }

  protected selectRoleB(role: RoleDefinition): void {
    this.appState.setCompareRoleB(role);
    this.searchB.set('');
    this.openB.set(false);
    this.activeIndexB.set(-1);
  }

  protected clearRoleA(): void {
    this.appState.clearCompareRoleA();
    this.searchA.set('');
    this.openA.set(false);
  }

  protected clearRoleB(): void {
    this.appState.clearCompareRoleB();
    this.searchB.set('');
    this.openB.set(false);
  }

  protected onKeydownA(e: KeyboardEvent): void {
    this.handleComboKeydown(e, this.filteredA(), this.activeIndexA, this.openA, (r) =>
      this.selectRoleA(r),
    );
  }

  protected onKeydownB(e: KeyboardEvent): void {
    this.handleComboKeydown(e, this.filteredB(), this.activeIndexB, this.openB, (r) =>
      this.selectRoleB(r),
    );
  }

  /** Swap A and B; the comparison recomputes automatically. */
  protected swap(): void {
    const a = this.roleA();
    const b = this.roleB();
    this.appState.setCompareRoleA(b);
    this.appState.setCompareRoleB(a);
  }

  // --- Copy / export ---

  protected copyPermission(permission: string): void {
    void navigator.clipboard?.writeText(permission).catch(() => undefined);
  }

  protected copyDiff(): void {
    const cmp = this.comparison();
    const v = this.verdict();
    if (!cmp || !v) return;

    const lines: string[] = [
      `Compare: ${cmp.roleA.name} (A) vs ${cmp.roleB.name} (B)`,
      `${this.verdictLabel(v)} — ${this.verdictExplanation(v, cmp.roleA.name, cmp.roleB.name)}`,
      '',
    ];
    for (const def of CATEGORY_DEFS) {
      const d = cmp[def.key] as PermissionDiff;
      if (d.onlyInA.length + d.shared.length + d.onlyInB.length === 0) continue;
      lines.push(`## ${def.title}`);
      for (const p of d.onlyInA) lines.push(`  A only   ${p}`);
      for (const p of d.onlyInB) lines.push(`  B only   ${p}`);
      for (const p of d.shared) lines.push(`  shared   ${p}`);
      lines.push('');
    }
    void navigator.clipboard?.writeText(lines.join('\n')).catch(() => undefined);
  }

  protected scrollTo(anchorId: string): void {
    // Scroll only the diff-body container — scrollIntoView() would also scroll
    // ancestor containers (e.g. the list-panel), hiding the view controls above.
    const host = this.host.nativeElement as HTMLElement;
    const container = host.querySelector('.diff-body') as HTMLElement | null;
    const target = host.querySelector(`#${anchorId}`) as HTMLElement | null;
    if (!container || !target) return;
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }

  // --- Display helpers ---

  protected tagLabel(tag: DiffTag): string {
    return tag === 'a' ? 'A only' : tag === 'b' ? 'B only' : 'shared';
  }

  protected verdictLabel(v: Verdict): string {
    switch (v) {
      case 'identical':
        return 'Identical';
      case 'a-subset':
        return 'A ⊆ B';
      case 'b-subset':
        return 'B ⊆ A';
      case 'disjoint':
        return 'Disjoint';
      case 'partial':
        return 'Partial overlap';
    }
  }

  protected verdictExplanation(v: Verdict, nameA: string, nameB: string): string {
    switch (v) {
      case 'identical':
        return `${nameA} and ${nameB} grant the same effective permissions.`;
      case 'a-subset':
        return `${nameA} is a subset of ${nameB} — A grants fewer permissions.`;
      case 'b-subset':
        return `${nameB} is a subset of ${nameA} — B grants fewer permissions.`;
      case 'disjoint':
        return `${nameA} and ${nameB} share no permissions.`;
      case 'partial':
        return `${nameA} and ${nameB} share some permissions, and each has unique ones.`;
    }
  }

  protected categoryStatusLabel(c: CategoryView): string {
    switch (c.status) {
      case 'both-empty':
        return 'None';
      case 'identical':
        return 'Identical';
      case 'differs':
        return `${c.counts.a + c.counts.b} differ`;
    }
  }

  private filterRoles(q: string): RoleDefinition[] {
    const query = q.trim().toLowerCase();
    const all = this.allRoles();
    if (!query) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.description?.toLowerCase().includes(query) ?? false),
    );
  }

  private makeRow(permission: string, tag: DiffTag): DiffRow {
    const { prefix, leaf } = this.splitPermission(permission);
    return { permission, prefix, leaf, tag };
  }

  /** Splits a permission at its last '/' so the provider prefix can be muted. */
  splitPermission(p: string): { prefix: string; leaf: string } {
    const i = p.lastIndexOf('/');
    if (i === -1) return { prefix: '', leaf: p };
    return { prefix: p.slice(0, i + 1), leaf: p.slice(i + 1) };
  }

  private handleComboKeydown(
    e: KeyboardEvent,
    items: RoleDefinition[],
    activeIndex: { (): number; set: (v: number) => void; update: (fn: (v: number) => number) => void },
    open: { set: (v: boolean) => void },
    select: (role: RoleDefinition) => void,
  ): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        open.set(true);
        activeIndex.update((i) => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        activeIndex.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        const i = activeIndex();
        if (i >= 0 && i < items.length) {
          e.preventDefault();
          select(items[i]);
        }
        break;
      }
      case 'Escape':
        open.set(false);
        break;
    }
  }
}
