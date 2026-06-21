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

  it('should create', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render two picker elements', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    const pickers = fixture.nativeElement.querySelectorAll('.picker');
    expect(pickers.length).toBe(2);
  });

  it('should show search inputs when no roles are selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input[type="search"]');
    expect(inputs.length).toBe(2);
  });

  it('should show Role A results list when no role is selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();
    const lists = fixture.nativeElement.querySelectorAll('.results-list');
    expect(lists.length).toBe(2);
  });

  it('should show selected card and hide search when Role A is selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    // Load some roles into the service
    const roleService = TestBed.inject(RoleService);
    roleService.addUploadedRoles([roleA, roleB]);
    fixture.detectChanges();

    // Click the first result item in picker A
    const resultItems = fixture.nativeElement
      .querySelectorAll('.picker')[0]
      .querySelectorAll('.result-item') as NodeListOf<HTMLElement>;
    expect(resultItems.length).toBeGreaterThan(0);
    resultItems[0].click();
    fixture.detectChanges();

    // Should now show selected card, not search input
    const pickerA = fixture.nativeElement.querySelectorAll('.picker')[0];
    expect(pickerA.querySelector('.selected-card')).toBeTruthy();
    expect(pickerA.querySelector('input[type="search"]')).toBeFalsy();
  });

  it('should restore search input when clear button is clicked', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    // Click the clear button
    const clearBtn = fixture.nativeElement
      .querySelectorAll('.picker')[0]
      .querySelector('.clear-btn') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();

    // Search input should be back
    const pickerA = fixture.nativeElement.querySelectorAll('.picker')[0];
    expect(pickerA.querySelector('input[type="search"]')).toBeTruthy();
    expect(pickerA.querySelector('.selected-card')).toBeFalsy();
  });

  it('should show prompt when only one role is selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.compare-prompt')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.comparison-result')).toBeFalsy();
  });

  it('should show comparison result when both roles are selected', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comparison-result')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.compare-prompt')).toBeFalsy();
  });

  it('should display the relationship badge', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.rel-badge') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should display diff columns when both roles have permissions', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    appState.setCompareRoleB(roleB);
    fixture.detectChanges();

    const diffCols = fixture.nativeElement.querySelectorAll('.diff-col');
    expect(diffCols.length).toBeGreaterThan(0);
  });

  it('should render selected role name in the selected card', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    const selectedName = fixture.nativeElement
      .querySelectorAll('.picker')[0]
      .querySelector('.selected-name') as HTMLElement;
    expect(selectedName.textContent).toContain('Owner');
  });

  it('should have accessible clear button with aria-label', () => {
    const fixture = TestBed.createComponent(RoleCompareComponent);
    fixture.detectChanges();

    const appState = TestBed.inject(AppStateService);
    appState.setCompareRoleA(roleA);
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement
      .querySelectorAll('.picker')[0]
      .querySelector('.clear-btn') as HTMLButtonElement;
    expect(clearBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('should use RoleCompareService to build comparison', () => {
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
