import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchService } from '../../services';

@Component({
  selector: 'app-role-search',
  imports: [FormsModule],
  templateUrl: './role-search.component.html',
  styleUrl: './role-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSearchComponent implements OnInit {
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchValue = signal('');
  readonly searchChange = output<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchService.setSearchQuery(query);
        this.searchChange.emit(query);
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
    this.searchSubject.next(value);
  }

  onClear(): void {
    this.searchValue.set('');
    this.searchSubject.next('');
  }
}
