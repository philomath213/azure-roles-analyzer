import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleCompareComponent } from './role-compare.component';
import { RoleService, AppStateService } from '../../services';
import { RoleCompareService } from '../../services/role-compare.service';
import type { RoleDefinition } from '../../models';
import type { RoleComparison } from '../../models/role-comparison.model';

describe('RoleCompareComponent', () => {
  const makeRole = (id: string, name: string, actions: string[] = []): RoleDefinition => ({
    id,
    name,
    type: 'BuiltInRole',
    description: null,
    assignableScopes: ['/'],
    permissions: [{ actions, notActions: [], dataActions: [], notDataActions: [] }],
  });

  const roleA = makeRole('role-a', 'Owner', ['*']);
  const roleB = makeRole('role-b', 'Reader', ['*/read']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleCompareComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    const appState = TestBed.inject(AppStateService);
    appState.clearCompareRoleA();
    appState.clearCompareRoleB();
    localStorage.clear();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render two compact pickers with combobox inputs', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.picker').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('input[role="combobox"]').length).toBe(2);
  });

  it('should render an accessible swap button', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    const swap = fixture.nativeElement.querySelector('.swap-btn') as HTMLButtonElement;
    expect(swap).toBeTruthy();
    expect(swap.getAttribute('aria-label')).toBe('Swap Role A and Role B');
  });

  it('should open the listbox with options when the A input is focused', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const roleService = TestBed.inject(RoleService);
    roleService.addUploadedRoles([roleA, roleB]);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#combo-input-a') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const listbox = fixture.nativeElement.querySelector('#listbox-a');
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox.querySelectorAll('.combo-option').length).toBeGreaterThan(0);
  });

  it('should show the selected role and hide the input when Role A is chosen', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    const pickerA = fixture.nativeElement.querySelectorAll('.picker')[0];
    expect(pickerA.querySelector('.combo-selected')).toBeTruthy();
    expect(pickerA.querySelector('.sel-name')?.textContent).toContain('Owner');
    expect(pickerA.querySelector('input[role="combobox"]')).toBeFalsy();
  });

  it('should restore the combobox input when the clear button is clicked', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement
      .querySelectorAll('.picker')[0]
      .querySelector('.combo-clear') as HTMLButtonElement;
    expect(clearBtn.getAttribute('aria-label')).toBe('Clear Role A selection');
    clearBtn.click();
    fixture.detectChanges();

    const pickerA = fixture.nativeElement.querySelectorAll('.picker')[0];
    expect(pickerA.querySelector('input[role="combobox"]')).toBeTruthy();
    expect(pickerA.querySelector('.combo-selected')).toBeFalsy();
  });

  it('should swap A and B when the swap button is clicked', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.swap-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(appState.compareRoleA()).toEqual(roleB);
    expect(appState.compareRoleB()).toEqual(roleA);
  });

  it('should show the friendly prompt when fewer than two roles are selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.compare-prompt')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.summary')).toBeFalsy();
  });

  it('should show the summary with a verdict badge when both roles are selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.compare-prompt')).toBeFalsy();
    const badge = fixture.nativeElement.querySelector('.verdict-badge') as HTMLElement;
    expect(badge.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should render four category overview cards', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ov-card').length).toBe(4);
  });

  it('should render unified diff rows tagged A only / B only', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.diff-row');
    expect(rows.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.tag-a')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.tag-b')).toBeTruthy();
  });

  it('should hide shared rows when "show only differences" is enabled', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    // A superset of B with overlap so a shared row exists in the literal diff.
    const sharedA = makeRole('s-a', 'A', ['Microsoft.Compute/read', 'Microsoft.Compute/write']);
    const sharedB = makeRole('s-b', 'B', ['Microsoft.Compute/read']);

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(sharedA);
    appState.setCompareRoleB(sharedB);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tag-shared')).toBeTruthy();

    const component = fixture.componentInstance as unknown as {
      showOnlyDiff: { set: (v: boolean) => void };
    };
    component.showOnlyDiff.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tag-shared')).toBeFalsy();
  });

  it('should list shared permissions for an all-shared plane when not filtering to differences', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    // Identical permissions → control plane is all-shared (no A-only / B-only).
    const same = ['Microsoft.Compute/virtualMachines/read'];
    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(makeRole('same-a', 'A', same));
    appState.setCompareRoleB(makeRole('same-b', 'B', same));
    fixture.detectChanges();

    // Shared rows must be visible while "show only differences" is off (default).
    const shared = fixture.nativeElement.querySelector('.tag-shared');
    expect(shared).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.diff-row')).toBeTruthy();

    // Enabling the toggle collapses the all-shared plane to a note instead.
    const component = fixture.componentInstance as unknown as {
      showOnlyDiff: { set: (v: boolean) => void };
    };
    component.showOnlyDiff.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tag-shared')).toBeFalsy();
  });

  it('should provide a copy button per permission row', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    const copyBtn = fixture.nativeElement.querySelector('.row-copy') as HTMLButtonElement;
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.getAttribute('aria-label')).toContain('Copy');
  });

  it('should split a permission into a muted prefix and emphasized leaf', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    const component = fixture.componentInstance;
    expect(component.splitPermission('Microsoft.KeyVault/vaults/read')).toEqual({
      prefix: 'Microsoft.KeyVault/vaults/',
      leaf: 'read',
    });
    expect(component.splitPermission('*')).toEqual({ prefix: '', leaf: '*' });
  });

  it('should use RoleCompareService to build the comparison', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const compareService = TestBed.inject(RoleCompareService);
    const spy = vi.spyOn(compareService, 'compareRoles').mockReturnValue({
      roleA,
      roleB,
      relationship: 'b-subset-of-a',
      controlPlane: { onlyInA: ['*'], shared: [], onlyInB: ['*/read'] },
      controlPlaneNot: { onlyInA: [], shared: [], onlyInB: [] },
      dataPlane: { onlyInA: [], shared: [], onlyInB: [] },
      dataPlaneNot: { onlyInA: [], shared: [], onlyInB: [] },
    } satisfies RoleComparison);

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(roleA, roleB);
  });
});
