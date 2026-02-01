import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';
import type { RoleDefinition } from '../models';

describe('SearchService', () => {
  let service: SearchService;

  const mockRoles: RoleDefinition[] = [
    {
      id: 'role-1',
      name: 'Owner',
      type: 'BuiltInRole',
      description: 'Full access to all resources',
      assignableScopes: ['/'],
      permissions: [{ actions: ['*'], notActions: [], dataActions: [], notDataActions: [] }],
    },
    {
      id: 'role-2',
      name: 'Reader',
      type: 'BuiltInRole',
      description: 'Read-only access to resources',
      assignableScopes: ['/'],
      permissions: [{ actions: ['*/read'], notActions: [], dataActions: [], notDataActions: [] }],
    },
    {
      id: 'role-3',
      name: 'Storage Blob Data Contributor',
      type: 'BuiltInRole',
      description: 'Allows for read, write and delete access to Azure Storage blob containers',
      assignableScopes: ['/'],
      permissions: [{ actions: [], notActions: [], dataActions: ['*'], notDataActions: [] }],
    },
    {
      id: 'role-4',
      name: 'Custom Admin',
      type: 'CustomRole',
      description: 'Custom administrator role',
      assignableScopes: ['/subscriptions/test'],
      permissions: [{ actions: ['*'], notActions: [], dataActions: [], notDataActions: [] }],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
  });

  afterEach(() => {
    service.clearSearch();
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have empty search query initially', () => {
      expect(service.searchQuery()).toBe('');
    });

    it('should have hasSearchQuery as false initially', () => {
      expect(service.hasSearchQuery()).toBe(false);
    });
  });

  describe('setSearchQuery', () => {
    it('should update search query', () => {
      service.setSearchQuery('owner');
      expect(service.searchQuery()).toBe('owner');
    });

    it('should set hasSearchQuery to true when query is not empty', () => {
      service.setSearchQuery('test');
      expect(service.hasSearchQuery()).toBe(true);
    });

    it('should set hasSearchQuery to false when query is only whitespace', () => {
      service.setSearchQuery('   ');
      expect(service.hasSearchQuery()).toBe(false);
    });
  });

  describe('clearSearch', () => {
    it('should clear the search query', () => {
      service.setSearchQuery('owner');
      service.clearSearch();
      expect(service.searchQuery()).toBe('');
    });

    it('should set hasSearchQuery to false', () => {
      service.setSearchQuery('owner');
      service.clearSearch();
      expect(service.hasSearchQuery()).toBe(false);
    });
  });

  describe('filterRoles', () => {
    it('should return all roles when search query is empty', () => {
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(4);
    });

    it('should return all roles when search query is whitespace only', () => {
      service.setSearchQuery('   ');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(4);
    });

    it('should filter by name (case-insensitive)', () => {
      service.setSearchQuery('owner');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Owner');
    });

    it('should filter by name with uppercase query', () => {
      service.setSearchQuery('OWNER');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Owner');
    });

    it('should filter by description (case-insensitive)', () => {
      service.setSearchQuery('read-only');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Reader');
    });

    it('should match partial name', () => {
      service.setSearchQuery('stor');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Storage Blob Data Contributor');
    });

    it('should match partial description', () => {
      service.setSearchQuery('blob');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Storage Blob Data Contributor');
    });

    it('should return multiple matches', () => {
      service.setSearchQuery('access');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(3);
    });

    it('should return empty array when no matches', () => {
      service.setSearchQuery('nonexistent');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(0);
    });

    it('should match on both name and description', () => {
      service.setSearchQuery('custom');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Custom Admin');
    });

    it('should handle special characters in search', () => {
      service.setSearchQuery('read-only');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
    });

    it('should trim search query before filtering', () => {
      service.setSearchQuery('  owner  ');
      const result = service.filterRoles(mockRoles);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Owner');
    });
  });
});
