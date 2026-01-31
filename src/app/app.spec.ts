import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { RoleDefinition } from './models';

describe('App', () => {
  let httpMock: HttpTestingController;

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
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    const req = httpMock.expectOne('/assets/data/roles-data.json');
    req.flush(mockRoles);

    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('/assets/data/roles-data.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Azure RBAC Role Analyzer');
  });

  it('should display role count after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('/assets/data/roles-data.json');
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

    const req = httpMock.expectOne('/assets/data/roles-data.json');
    req.flush(mockRoles);
  });

  it('should display roles after loading', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const req = httpMock.expectOne('/assets/data/roles-data.json');
    req.flush(mockRoles);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const roleItems = compiled.querySelectorAll('.role-list li');
    expect(roleItems.length).toBe(2);
  });
});
