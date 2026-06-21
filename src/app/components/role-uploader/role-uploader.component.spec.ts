import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleUploaderComponent } from './role-uploader.component';

describe('RoleUploaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleUploaderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
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

  it('should have an accessible file input', () => {
    const fixture = TestBed.createComponent(RoleUploaderComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-label')).toBeTruthy();
    expect(input.getAttribute('accept')).toBe('.json');
  });
});
