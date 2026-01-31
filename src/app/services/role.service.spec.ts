import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RoleService } from './role.service';
import { RoleDefinition } from '../models';

describe('RoleService', () => {
  let service: RoleService;
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
    {
      id: '/subscriptions/test/providers/Microsoft.Authorization/roleDefinitions/3',
      name: 'Custom Admin',
      type: 'CustomRole',
      description: 'Custom admin role',
      assignableScopes: ['/subscriptions/test'],
      permissions: [
        {
          actions: ['Microsoft.Compute/*'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RoleService],
    });
    service = TestBed.inject(RoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial empty state', () => {
    expect(service.roles()).toEqual([]);
    expect(service.roleCount()).toBe(0);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  describe('loadRoles', () => {
    it('should load roles from JSON file', () => {
      service.loadRoles();

      const req = httpMock.expectOne('/assets/data/roles-data.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockRoles);

      expect(service.roles().length).toBe(3);
      expect(service.roleCount()).toBe(3);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should set loading state while fetching', () => {
      service.loadRoles();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.flush(mockRoles);

      expect(service.loading()).toBe(false);
    });

    it('should handle errors gracefully', () => {
      service.loadRoles();

      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });

      expect(service.roles()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.error()).toContain('Failed to load roles');
    });

    it('should normalize roles with missing permission fields', () => {
      const incompleteRoles = [
        {
          id: 'test-id',
          name: 'Test Role',
          type: 'BuiltInRole' as const,
          description: 'Test description',
          assignableScopes: ['/'],
          permissions: [
            {
              actions: ['*/read'],
            },
          ],
        },
      ];

      service.loadRoles();

      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.flush(incompleteRoles);

      const loadedRole = service.roles()[0];
      expect(loadedRole.permissions[0].notActions).toEqual([]);
      expect(loadedRole.permissions[0].dataActions).toEqual([]);
      expect(loadedRole.permissions[0].notDataActions).toEqual([]);
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      service.loadRoles();
      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.flush(mockRoles);
    });

    it('should compute builtInRoles correctly', () => {
      expect(service.builtInRoles().length).toBe(2);
      expect(service.builtInRoles().every((r) => r.type === 'BuiltInRole')).toBe(true);
    });

    it('should compute customRoles correctly', () => {
      expect(service.customRoles().length).toBe(1);
      expect(service.customRoles().every((r) => r.type === 'CustomRole')).toBe(true);
    });
  });

  describe('getRoleById', () => {
    beforeEach(() => {
      service.loadRoles();
      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.flush(mockRoles);
    });

    it('should return role by id', () => {
      const role = service.getRoleById(
        '/subscriptions/test/providers/Microsoft.Authorization/roleDefinitions/1'
      );
      expect(role).toBeDefined();
      expect(role?.name).toBe('Owner');
    });

    it('should return undefined for non-existent id', () => {
      const role = service.getRoleById('non-existent-id');
      expect(role).toBeUndefined();
    });
  });

  describe('getRoleByName', () => {
    beforeEach(() => {
      service.loadRoles();
      const req = httpMock.expectOne('/assets/data/roles-data.json');
      req.flush(mockRoles);
    });

    it('should return role by name', () => {
      const role = service.getRoleByName('Reader');
      expect(role).toBeDefined();
      expect(role?.name).toBe('Reader');
    });

    it('should return undefined for non-existent name', () => {
      const role = service.getRoleByName('Non-existent Role');
      expect(role).toBeUndefined();
    });
  });
});
