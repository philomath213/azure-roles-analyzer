import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  output,
  signal,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { RoleDefinition } from '../../models';
import {
  PermissionSearchService,
  type SearchMode,
  type PermissionPlane,
} from '../../services/permission-search.service';

@Component({
  selector: 'app-permission-search',
  templateUrl: './permission-search.component.html',
  styleUrl: './permission-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionSearchComponent implements OnInit {
  private readonly searchService = inject(PermissionSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputSubject = new Subject<string>();

  readonly roles = input.required<RoleDefinition[]>();
  readonly selectedRoleId = input<string | null>(null);
  readonly roleSelect = output<RoleDefinition>();

  /** Textarea content — initialized from service so it persists across view-mode switches. */
  protected readonly textValue = signal(this.searchService.permissions().join('\n'));

  protected readonly mode = this.searchService.mode;
  protected readonly plane = this.searchService.plane;
  protected readonly hasPermissions = this.searchService.hasPermissions;

  protected readonly results = computed(() =>
    this.searchService.scoreRoles(this.roles())
  );

  ngOnInit(): void {
    this.inputSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const permissions = value
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        this.searchService.setPermissions(permissions);
      });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.textValue.set(value);
    this.inputSubject.next(value);
  }

  protected setMode(mode: SearchMode): void {
    this.searchService.setMode(mode);
  }

  protected setPlane(plane: PermissionPlane): void {
    this.searchService.setPlane(plane);
  }

  protected onRoleClick(role: RoleDefinition): void {
    this.roleSelect.emit(role);
  }

  protected onResultKeydown(event: KeyboardEvent, role: RoleDefinition): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.roleSelect.emit(role);
    }
  }

  protected switchToOrMode(): void {
    this.searchService.setMode('OR');
  }
}
