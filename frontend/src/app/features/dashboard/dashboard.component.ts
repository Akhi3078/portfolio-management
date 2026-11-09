import { Component, computed, inject, signal } from '@angular/core';
import { AedPipe } from '../../core/formatting';
import type { Portfolio } from '../../core/models';
import { PortfolioApiService } from '../../core/portfolio-api.service';
import { messageFrom } from '../../core/problem-details';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { PortfolioCardComponent } from '../../shared/portfolio-card.component';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * The dashboard: five KPI tiles and one card per portfolio.
 *
 * Every figure is derived from the single GET /api/portfolios response, which
 * already carries each portfolio's project count, budget roll-up and health
 * counts. Nothing is totalled by fetching projects per portfolio.
 */
@Component({
  selector: 'app-dashboard',
  imports: [PageHeaderComponent, KpiCardComponent, PortfolioCardComponent, AedPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly api = inject(PortfolioApiService);

  protected readonly state = signal<LoadState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly portfolios = signal<readonly Portfolio[]>([]);

  protected readonly totalProjects = computed(() =>
    this.portfolios().reduce((sum, p) => sum + p.projectCount, 0)
  );

  protected readonly totalBudget = computed(() =>
    this.portfolios().reduce((sum, p) => sum + p.totalBudget, 0)
  );

  protected readonly totalActualCost = computed(() =>
    this.portfolios().reduce((sum, p) => sum + p.totalActualCost, 0)
  );

  /** Red is the "at risk" signal, per the health rule. */
  protected readonly projectsAtRisk = computed(() =>
    this.portfolios().reduce((sum, p) => sum + p.healthCounts.red, 0)
  );

  protected readonly projectsAtRiskShare = computed(() => {
    const total = this.totalProjects();

    return total === 0
      ? 'No projects yet'
      : `${Math.round((this.projectsAtRisk() / total) * 100)}% of ${total} projects`;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.api.getPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios.set(portfolios);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(messageFrom(error));
        this.state.set('error');
      },
    });
  }
}
