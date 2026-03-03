import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { AppStateService, SearchService } from './services';
import type { RoleDefinition } from './models';

describe('App', () => {
  let httpMock: HttpTestingController;
  let appState: AppStateService;
  let searchService: SearchService;

  const mockRoles: RoleDefinition[] = [
    {
      id: '/subscriptions/test/providers/Microsoft.Authorization/roleDefinitions/1',
      name: 'Owner',
      type: 'BuiltInRole',
      description: 'Full access to all resources',
      assignableScopes: ['/'],
      permissions: [
        {
          actions: ['*'],
          notActions: [],
          dataActions: ['*'],
          notDataActions: [],
        },
      ],
    },
    {
      id: '/subscriptions/test/providers/Microsoft.Authorization/roleDefinitions/2',
      name: 'Reader',
      type: 'BuiltInRole',
      description: 'Read-only access',
      assignableScopes: ['/'],
      permissions: [
        {
          actions: ['*/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    appState = TestBed.inject(AppStateService);
    searchService = TestBed.inject(SearchService);
  });

  afterEach(() => {
    httpMock.verify();
    appState.clearSelection();
    searchService.clearSearch();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Azure RBAC Role Analyzer');
  });

  it('should display role count after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const statValue = compiled.querySelector('.stat-value');
    expect(statValue?.textContent).toBe('2');
  });

  it('should display loading state initially', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading')).toBeTruthy();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);
  });

  it('should display roles after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const roleItems = compiled.querySelectorAll('.role-item');
    expect(roleItems.length).toBe(2);
  });

  it('should select a role when clicked', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    expect(appState.selectedRole()).toEqual(mockRoles[0]);
  });

  it('should display role details when a role is selected', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-role-details')).toBeTruthy();
  });

  it('should hide role details when closed', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    const closeButton = compiled.querySelector('.close-button') as HTMLElement;
    closeButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-role-details')).toBeFalsy();
  });

  it('should mark selected role as selected in the list', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    expect(firstRole.classList.contains('selected')).toBe(true);
  });

  it('should have accessible role items', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const roleItems = compiled.querySelectorAll('.role-item');

    roleItems.forEach((item) => {
      expect(item.getAttribute('role')).toBe('button');
      expect(item.getAttribute('tabindex')).toBe('0');
    });
  });

  it('should display app-role-list component after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-role-list')).toBeTruthy();
  });

  it('should have two-panel layout when role is selected', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    const mainContent = compiled.querySelector('.main-content');
    expect(mainContent?.classList.contains('has-details')).toBe(true);
    expect(compiled.querySelector('.list-panel')).toBeTruthy();
    expect(compiled.querySelector('.details-panel')).toBeTruthy();
  });

  it('should remove has-details class when role is deselected', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRole = compiled.querySelector('.role-item') as HTMLElement;
    firstRole.click();
    fixture.detectChanges();

    const closeButton = compiled.querySelector('.close-button') as HTMLElement;
    closeButton.click();
    fixture.detectChanges();

    const mainContent = compiled.querySelector('.main-content');
    expect(mainContent?.classList.contains('has-details')).toBe(false);
    expect(compiled.querySelector('.details-panel')).toBeFalsy();
  });

  it('should display app-role-search component after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-role-search')).toBeTruthy();
  });

  it('should filter roles when search query is set', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    searchService.setSearchQuery('owner');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const roleItems = compiled.querySelectorAll('.role-item');
    expect(roleItems.length).toBe(1);
  });

  it('should show search results count when searching', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    searchService.setSearchQuery('owner');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const resultsCount = compiled.querySelector('.search-results-count');
    expect(resultsCount).toBeTruthy();
    expect(resultsCount?.textContent).toContain('1 of 2 roles');
  });

  it('should show total roles count when not searching', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const resultsCount = compiled.querySelector('.search-results-count');
    expect(resultsCount).toBeTruthy();
    expect(resultsCount?.textContent).toContain('2 roles');
  });

  it('should show all roles when search is cleared', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    searchService.setSearchQuery('owner');
    fixture.detectChanges();

    searchService.clearSearch();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const roleItems = compiled.querySelectorAll('.role-item');
    expect(roleItems.length).toBe(2);
  });
});
