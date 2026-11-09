import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { AedPipe, AppDatePipe, SpendSharePipe } from '../../core/formatting';
import {
  HEALTH_VALUES,
  PROJECT_STATUSES,
  STATUS_LABELS,
  type Health,
  type Portfolio,
  type Project,
  type ProjectStatus,
} from '../../core/models';
import { PortfolioApiService } from '../../core/portfolio-api.service';
import { ProjectApiService } from '../../core/project-api.service';
import { messageFrom } from '../../core/problem-details';
import { routeParam } from '../../core/route-inputs';
import { HealthBadgeComponent } from '../../shared/health-badge.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

type LoadState = 'loading' | 'ready' | 'error';

/** Columns the API can sort by, so the UI cannot ask for one it does not support. */
const SORTABLE = [
  'code',
  'name',
  'owner',
  'status',
  'health',
  'endDate',
  'budget',
  'actualCost',
  'progress',
] as const;

type SortableColumn = (typeof SORTABLE)[number];

/**
 * One portfolio, with a Projects tab and an Overview tab.
 *
 * Filters, sorting and paging live in the URL query string and arrive here as
 * component inputs (withComponentInputBinding). That gives three things at once:
 * the URL is the single source of truth, a refresh or a shared link keeps the
 * filters, and back/forward work. Changing a filter navigates; an effect reacts
 * to the new inputs and re-queries the API.
 *
 * Nothing is filtered in the browser - every filter is a query parameter.
 */
@Component({
  selector: 'app-portfolio',
  imports: [
    RouterLink,
    HealthBadgeComponent,
    StatusBadgeComponent,
    AedPipe,
    AppDatePipe,
    SpendSharePipe,
  ],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css',
})
export class PortfolioComponent {
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ---- Route and query-string inputs ---------------------------------------

  readonly portfolioId = input.required<string>();

  // Each query-param input needs a transform, not just a default. When a
  // parameter is absent from the URL the router binds `undefined` over the
  // declared default, which would put the string "undefined" in the search box.
  readonly search = input('', { transform: routeParam('') });
  readonly status = input('', { transform: routeParam('') });
  readonly health = input('', { transform: routeParam('') });
  readonly sortBy = input('code', { transform: routeParam('code') });
  readonly sortDir = input('asc', { transform: routeParam('asc') });
  readonly page = input('1', { transform: routeParam('1') });
  readonly pageSize = input('10', { transform: routeParam('10') });
  readonly tab = input('projects', { transform: routeParam('projects') });

  // ---- View state ----------------------------------------------------------

  protected readonly portfolioState = signal<LoadState>('loading');
  protected readonly portfolio = signal<Portfolio | null>(null);
  protected readonly portfolioError = signal('');

  protected readonly projectsState = signal<LoadState>('loading');
  protected readonly projects = signal<readonly Project[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly projectsError = signal('');

  /** The project awaiting delete confirmation, or null when no dialog is open. */
  protected readonly pendingDelete = signal<Project | null>(null);
  protected readonly deleteError = signal('');
  protected readonly deleting = signal(false);

  /** Local mirror of the search box so typing stays responsive while debouncing. */
  protected readonly searchText = signal('');
  private readonly searchInput = new Subject<string>();

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly healthValues = HEALTH_VALUES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly sortableColumns = SORTABLE;

  protected readonly numericId = computed(() => Number(this.portfolioId()));
  protected readonly currentPage = computed(() => Number(this.page()) || 1);
  protected readonly currentPageSize = computed(() => Number(this.pageSize()) || 10);

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.currentPageSize()))
  );

  protected readonly firstRowOnPage = computed(() =>
    this.totalCount() === 0
      ? 0
      : (this.currentPage() - 1) * this.currentPageSize() + 1
  );

  protected readonly lastRowOnPage = computed(() =>
    Math.min(this.currentPage() * this.currentPageSize(), this.totalCount())
  );

  protected readonly hasActiveFilters = computed(
    () => this.search() !== '' || this.status() !== '' || this.health() !== ''
  );

  protected readonly onProjectsTab = computed(() => this.tab() !== 'overview');

  constructor() {
    // The portfolio header only depends on which portfolio is open, so it is not
    // refetched when a filter changes.
    effect(() => {
      const id = this.numericId();

      this.portfolioState.set('loading');

      this.portfolioApi.getPortfolio(id).subscribe({
        next: (portfolio) => {
          this.portfolio.set(portfolio);
          this.portfolioState.set('ready');
        },
        error: (error: unknown) => {
          this.portfolioError.set(messageFrom(error));
          this.portfolioState.set('error');
        },
      });
    });

    // Re-queries whenever the portfolio or any query parameter changes.
    effect(() => {
      this.loadProjects({
        portfolioId: this.numericId(),
        search: this.search(),
        status: this.status(),
        health: this.health(),
        sortBy: this.sortBy(),
        sortDir: this.sortDir(),
        page: this.currentPage(),
        pageSize: this.currentPageSize(),
      });
    });

    // Keep the search box in step when the URL changes from outside the box -
    // a Clear filters click, a back navigation, or a shared link.
    effect(() => this.searchText.set(this.search()));

    // Debounced so typing does not fire a request per keystroke. takeUntilDestroyed
    // picks up the DestroyRef from the constructor's injection context.
    this.searchInput
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => this.patchQuery({ search: value || null, page: null }));
  }

  // ---- Loading -------------------------------------------------------------

  private loadProjects(query: {
    portfolioId: number;
    search: string;
    status: string;
    health: string;
    sortBy: string;
    sortDir: string;
    page: number;
    pageSize: number;
  }): void {
    this.projectsState.set('loading');

    this.portfolioApi
      .getProjects(query.portfolioId, {
        search: query.search,
        status: query.status as ProjectStatus | '',
        health: query.health as Health | '',
        sortBy: query.sortBy,
        sortDir: query.sortDir === 'desc' ? 'desc' : 'asc',
        page: query.page,
        pageSize: query.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.projects.set(result.items);
          this.totalCount.set(result.totalCount);
          this.projectsState.set('ready');
        },
        error: (error: unknown) => {
          this.projectsError.set(messageFrom(error));
          this.projectsState.set('error');
        },
      });
  }

  protected reloadProjects(): void {
    this.loadProjects({
      portfolioId: this.numericId(),
      search: this.search(),
      status: this.status(),
      health: this.health(),
      sortBy: this.sortBy(),
      sortDir: this.sortDir(),
      page: this.currentPage(),
      pageSize: this.currentPageSize(),
    });
  }

  // ---- Filter, sort and page interactions ----------------------------------

  /**
   * Writes a patch into the query string. A null value drops the parameter, so a
   * cleared filter leaves a clean URL rather than `?status=`.
   */
  private patchQuery(patch: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onSearchInput(value: string): void {
    this.searchText.set(value);
    this.searchInput.next(value.trim());
  }

  protected onStatusChange(value: string): void {
    this.patchQuery({ status: value || null, page: null });
  }

  protected onHealthChange(value: string): void {
    this.patchQuery({ health: value || null, page: null });
  }

  protected onPageSizeChange(value: string): void {
    this.patchQuery({ pageSize: value, page: null });
  }

  protected clearFilters(): void {
    this.patchQuery({ search: null, status: null, health: null, page: null });
  }

  protected selectTab(tab: 'projects' | 'overview'): void {
    this.patchQuery({ tab: tab === 'projects' ? null : tab });
  }

  /** Clicking the active column flips direction; a new column starts ascending. */
  protected toggleSort(column: SortableColumn): void {
    const flip = this.sortBy() === column && this.sortDir() !== 'desc';

    this.patchQuery({ sortBy: column, sortDir: flip ? 'desc' : null });
  }

  protected ariaSortFor(column: SortableColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== column) {
      return 'none';
    }

    return this.sortDir() === 'desc' ? 'descending' : 'ascending';
  }

  protected goToPage(page: number): void {
    this.patchQuery({ page: page <= 1 ? null : page });
  }

  // ---- Delete --------------------------------------------------------------

  protected askToDelete(project: Project): void {
    this.deleteError.set('');
    this.pendingDelete.set(project);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const project = this.pendingDelete();

    if (!project) {
      return;
    }

    this.deleting.set(true);

    this.projectApi.deleteProject(project.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.refreshAfterWrite();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(messageFrom(error));
      },
    });
  }

  /**
   * After a delete the portfolio totals change too, so both requests are reissued.
   * If the last row of the last page went, step back a page so the user is not
   * left looking at an empty table.
   */
  private refreshAfterWrite(): void {
    const lastPage = Math.max(1, Math.ceil((this.totalCount() - 1) / this.currentPageSize()));

    if (this.currentPage() > lastPage) {
      this.goToPage(lastPage);
    } else {
      this.reloadProjects();
    }

    this.portfolioApi.getPortfolio(this.numericId()).subscribe({
      next: (portfolio) => this.portfolio.set(portfolio),
      error: () => {
        /* The table already reloaded; a stale header is not worth an error state. */
      },
    });
  }
}
