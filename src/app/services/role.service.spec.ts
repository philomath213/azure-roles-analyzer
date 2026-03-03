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

      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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

      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
      req.flush(mockRoles);

      expect(service.loading()).toBe(false);
    });

    it('should handle errors gracefully', () => {
      service.loadRoles();

      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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

      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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
      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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
      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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
      const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
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

  describe('upload functionality', () => {
    const uploadedRole: RoleDefinition = {
      id: 'uploaded-role-1',
      name: 'My Custom Role',
      type: 'CustomRole',
      description: 'Uploaded custom role',
      assignableScopes: ['/subscriptions/test'],
      permissions: [{ actions: ['Microsoft.Storage/*'], notActions: [], dataActions: [], notDataActions: [] }],
    };

    afterEach(() => {
      localStorage.clear();
    });

    describe('addUploadedRoles', () => {
      it('should update uploadedRoles, uploadedRoleCount and hasUploadedRoles signals', () => {
        service.addUploadedRoles([uploadedRole]);

        expect(service.uploadedRoles().length).toBe(1);
        expect(service.uploadedRoleCount()).toBe(1);
        expect(service.hasUploadedRoles()).toBe(true);
      });

      it('should merge uploaded roles with built-in roles in roles()', () => {
        service.loadRoles();
        const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
        req.flush(mockRoles);

        service.addUploadedRoles([uploadedRole]);

        expect(service.roles().length).toBe(4);
        expect(service.roles().some((r) => r.id === uploadedRole.id)).toBe(true);
        expect(service.roles().some((r) => r.name === 'Owner')).toBe(true);
      });

      it('should not replace built-in roles', () => {
        service.loadRoles();
        const req = httpMock.expectOne('assets/data/AzureBuiltinRoles.json');
        req.flush(mockRoles);

        service.addUploadedRoles([uploadedRole]);

        expect(service.builtInRoles().length).toBe(2);
      });

      it('should persist uploaded roles to localStorage', () => {
        service.addUploadedRoles([uploadedRole]);

        const stored = localStorage.getItem('azure-roles-analyzer.uploaded-roles');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!) as RoleDefinition[];
        expect(parsed.length).toBe(1);
        expect(parsed[0].id).toBe(uploadedRole.id);
      });

      it('should replace previous upload on re-upload', () => {
        service.addUploadedRoles([uploadedRole]);

        const newRole: RoleDefinition = { ...uploadedRole, id: 'uploaded-role-2', name: 'Second Role' };
        service.addUploadedRoles([newRole]);

        expect(service.uploadedRoles().length).toBe(1);
        expect(service.uploadedRoles()[0].id).toBe('uploaded-role-2');
      });

      it('should throw when data is not an array', () => {
        expect(() => service.addUploadedRoles({ id: 'x', name: 'x' })).toThrow(
          'JSON must be an array of role definitions.'
        );
      });

      it('should throw when array is empty', () => {
        expect(() => service.addUploadedRoles([])).toThrow('no role definitions');
      });

      it('should throw when an entry is missing id', () => {
        expect(() =>
          service.addUploadedRoles([{ name: 'No ID', permissions: [] }])
        ).toThrow('missing a valid "id"');
      });

      it('should throw when an entry is missing name', () => {
        expect(() =>
          service.addUploadedRoles([{ id: 'x', permissions: [] }])
        ).toThrow('missing a valid "name"');
      });

      it('should throw when an entry is missing permissions array', () => {
        expect(() =>
          service.addUploadedRoles([{ id: 'x', name: 'x', permissions: 'bad' }])
        ).toThrow('missing a "permissions" array');
      });
    });

    describe('clearUploadedRoles', () => {
      it('should clear uploaded roles signal', () => {
        service.addUploadedRoles([uploadedRole]);
        service.clearUploadedRoles();

        expect(service.uploadedRoles()).toEqual([]);
        expect(service.uploadedRoleCount()).toBe(0);
        expect(service.hasUploadedRoles()).toBe(false);
      });

      it('should remove item from localStorage', () => {
        service.addUploadedRoles([uploadedRole]);
        service.clearUploadedRoles();

        expect(localStorage.getItem('azure-roles-analyzer.uploaded-roles')).toBeNull();
      });
    });

    describe('localStorage persistence on construction', () => {
      it('should load uploaded roles from localStorage when service is created', () => {
        localStorage.setItem(
          'azure-roles-analyzer.uploaded-roles',
          JSON.stringify([uploadedRole])
        );

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [provideHttpClient(), provideHttpClientTesting(), RoleService],
        });
        const freshService = TestBed.inject(RoleService);
        httpMock = TestBed.inject(HttpTestingController);

        expect(freshService.uploadedRoles().length).toBe(1);
        expect(freshService.uploadedRoles()[0].id).toBe(uploadedRole.id);
      });

      it('should silently clear corrupt localStorage data', () => {
        localStorage.setItem('azure-roles-analyzer.uploaded-roles', 'not valid json{{');

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [provideHttpClient(), provideHttpClientTesting(), RoleService],
        });
        const freshService = TestBed.inject(RoleService);
        httpMock = TestBed.inject(HttpTestingController);

        expect(freshService.uploadedRoles()).toEqual([]);
        expect(localStorage.getItem('azure-roles-analyzer.uploaded-roles')).toBeNull();
      });
    });

    describe('getRoleById / getRoleByName with uploaded roles', () => {
      beforeEach(() => {
        service.addUploadedRoles([uploadedRole]);
      });

      it('should find an uploaded role by id', () => {
        const role = service.getRoleById('uploaded-role-1');
        expect(role).toBeDefined();
        expect(role?.name).toBe('My Custom Role');
      });

      it('should find an uploaded role by name', () => {
        const role = service.getRoleByName('My Custom Role');
        expect(role).toBeDefined();
        expect(role?.id).toBe('uploaded-role-1');
      });
    });
  });
});
