import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RoleService } from '../../services';

@Component({
  selector: 'app-role-uploader',
  templateUrl: './role-uploader.component.html',
  styleUrl: './role-uploader.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleUploaderComponent {
  private readonly roleService = inject(RoleService);

  protected readonly uploadedCount = this.roleService.uploadedRoleCount;
  protected readonly hasUploaded = this.roleService.hasUploadedRoles;
  protected readonly uploadError = signal<string | null>(null);

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = ''; // allow re-selecting the same file
    this.uploadError.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: unknown = JSON.parse(e.target?.result as string);
        this.roleService.addUploadedRoles(parsed);
      } catch (err) {
        this.uploadError.set(
          err instanceof Error ? err.message : 'Failed to parse the JSON file.'
        );
      }
    };
    reader.onerror = () => this.uploadError.set('Failed to read the file.');
    reader.readAsText(file);
  }

  onClear(): void {
    this.roleService.clearUploadedRoles();
    this.uploadError.set(null);
  }
}
