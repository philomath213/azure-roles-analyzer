import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleUploaderComponent } from './role-uploader.component';
import { RoleService } from '../../services';
import type { RoleDefinition } from '../../models';

describe('RoleUploaderComponent', () => {
  let roleService: RoleService;

  const mockRole: RoleDefinition = {
    id: 'uploaded-role-1',
    name: 'My Custom Role',
    type: 'CustomRole',
    description: 'Uploaded custom role',
    assignableScopes: ['/subscriptions/test'],
    permissions: [
      { actions: ['Microsoft.Storage/*'], notActions: [], dataActions: [], notDataActions: [] },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleUploaderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    roleService = TestBed.inject(RoleService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the upload button', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.upload-btn') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Upload Roles');
  });

  it('should not show the uploaded badge when no roles are uploaded', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.uploaded-badge')).toBeFalsy();
  });

  it('should show the uploaded badge with count when roles are present', () => {
    roleService.addUploadedRoles([mockRole]);

    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.uploaded-badge') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('1 custom role');
  });

  it('should use plural "roles" for multiple uploaded roles', () => {
    const second: RoleDefinition = { ...mockRole, id: 'uploaded-role-2', name: 'Second Role' };
    roleService.addUploadedRoles([mockRole, second]);

    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.uploaded-badge') as HTMLElement;
    expect(badge.textContent).toContain('2 custom roles');
  });

  it('should show a clear button inside the badge', () => {
    roleService.addUploadedRoles([mockRole]);

    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement.querySelector('.clear-btn') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.getAttribute('aria-label')).toContain('Clear 1 uploaded role');
  });

  it('should clear uploaded roles and hide the badge when clear is clicked', () => {
    roleService.addUploadedRoles([mockRole]);

    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement.querySelector('.clear-btn') as HTMLButtonElement;
    clearBtn.click();
    fixture.detectChanges();

    expect(roleService.hasUploadedRoles()).toBe(false);
    expect(fixture.nativeElement.querySelector('.uploaded-badge')).toBeFalsy();
  });

  it('should not show an error message initially', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upload-error')).toBeFalsy();
  });

  it('should show an error message when uploadError signal is set', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    // Directly set uploadError via component method by triggering an invalid upload
    const component = fixture.componentInstance as unknown as { uploadError: { set: (v: string) => void } };
    component.uploadError.set('JSON must be an array of role definitions.');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.upload-error') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('JSON must be an array');
    expect(errorEl.getAttribute('role')).toBe('alert');
  });

  it('should clear error when onClear is called', () => {
    roleService.addUploadedRoles([mockRole]);

    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      uploadError: { set: (v: string | null) => void };
      onClear: () => void;
    };
    component.uploadError.set('some error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upload-error')).toBeTruthy();

    component.onClear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upload-error')).toBeFalsy();
  });

  it('should have an accessible file input', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-label')).toBeTruthy();
    expect(input.getAttribute('accept')).toBe('.json');
  });
});
