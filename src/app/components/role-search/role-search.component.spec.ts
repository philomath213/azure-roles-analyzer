import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RoleSearchComponent } from './role-search.component';
import { SearchService } from '../../services';

describe('RoleSearchComponent', () => {
  let component: RoleSearchComponent;
  let fixture: ComponentFixture<RoleSearchComponent>;
  let searchService: SearchService;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [RoleSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleSearchComponent);
    component = fixture.componentInstance;
    searchService = TestBed.inject(SearchService);
    fixture.detectChanges();
  });

  afterEach(() => {
    searchService.clearSearch();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render search input', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('input[type="search"]');
      expect(input).toBeTruthy();
    });

    it('should have accessible label', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const label = compiled.querySelector('label[for="role-search"]');
      expect(label).toBeTruthy();
      expect(label?.textContent).toBe('Search roles');
    });

    it('should have placeholder text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Search by name or description...');
    });

    it('should render search icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icon = compiled.querySelector('.search-icon');
      expect(icon).toBeTruthy();
    });

    it('should not show clear button when search is empty', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-button');
      expect(clearButton).toBeFalsy();
    });
  });

  describe('input behavior', () => {
    it('should update searchValue on input', () => {
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.searchValue()).toBe('test');
    });

    it('should show clear button when search has value', () => {
      component.searchValue.set('test');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-button');
      expect(clearButton).toBeTruthy();
    });

    it('should clear search when clear button is clicked', () => {
      component.searchValue.set('test');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-button') as HTMLElement;
      clearButton.click();
      fixture.detectChanges();

      expect(component.searchValue()).toBe('');
    });
  });

  describe('debouncing', () => {
    it('should debounce search input', () => {
      const spy = vi.spyOn(searchService, 'setSearchQuery');
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = 'o';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);

      input.value = 'ow';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);

      input.value = 'own';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);

      expect(spy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('own');
    });

    it('should wait 300ms before updating search service', () => {
      const spy = vi.spyOn(searchService, 'setSearchQuery');
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = 'owner';
      input.dispatchEvent(new Event('input'));

      vi.advanceTimersByTime(299);
      expect(spy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(spy).toHaveBeenCalledWith('owner');
    });

    it('should not emit duplicate values', () => {
      const spy = vi.spyOn(searchService, 'setSearchQuery');
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('output events', () => {
    it('should emit searchChange after debounce', () => {
      const spy = vi.spyOn(component.searchChange, 'emit');
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = 'owner';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      expect(spy).toHaveBeenCalledWith('owner');
    });

    it('should emit searchChange when cleared', () => {
      component.searchValue.set('test');
      fixture.detectChanges();
      vi.advanceTimersByTime(300);

      const spy = vi.spyOn(component.searchChange, 'emit');
      const clearButton = fixture.nativeElement.querySelector('.clear-button') as HTMLElement;
      clearButton.click();
      vi.advanceTimersByTime(300);

      expect(spy).toHaveBeenCalledWith('');
    });
  });

  describe('accessibility', () => {
    it('should have visually hidden label', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const label = compiled.querySelector('label');
      expect(label?.classList.contains('visually-hidden')).toBe(true);
    });

    it('should have aria-label on clear button', () => {
      component.searchValue.set('test');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-button');
      expect(clearButton?.getAttribute('aria-label')).toBe('Clear search');
    });

    it('should have aria-hidden on icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const searchIcon = compiled.querySelector('.search-icon');
      expect(searchIcon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have autocomplete off', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('input');
      expect(input?.getAttribute('autocomplete')).toBe('off');
    });
  });
});
