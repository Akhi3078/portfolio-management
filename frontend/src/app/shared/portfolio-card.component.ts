import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AedPipe, SpendSharePipe } from '../core/formatting';
import type { Portfolio } from '../core/models';

/**
 * One portfolio on the dashboard, built on the ADP Standard Card.
 *
 * The whole card is an anchor rather than a div with a click handler, so it is
 * reachable by keyboard and shows the focus ring for free.
 */
@Component({
  selector: 'app-portfolio-card',
  imports: [RouterLink, AedPipe, SpendSharePipe],
  template: `
    <a class="adp-standard-card card-link" [routerLink]="['/portfolios', portfolio().id]">
      <span class="eyebrow code">{{ portfolio().code }}</span>

      <h3 class="adp-standard-card-title">{{ portfolio().name }}</h3>

      <p class="adp-standard-card-body owner">{{ portfolio().owner }}</p>

      <dl class="figures">
        <div>
          <dt class="caption">Projects</dt>
          <dd class="title">{{ portfolio().projectCount }}</dd>
        </div>
        <div>
          <dt class="caption">Budget</dt>
          <dd class="title">{{ portfolio().totalBudget | aed }}</dd>
        </div>
        <div>
          <dt class="caption">Spend</dt>
          <dd class="title">
            {{ portfolio().totalActualCost | aed }}
            <span class="caption share">
              ({{ portfolio().totalActualCost | spendShare: portfolio().totalBudget }}
              of budget)
            </span>
          </dd>
        </div>
      </dl>

      <div class="badges">
        <span class="adp-standard-badge adp-standard-badge-success">
          {{ portfolio().healthCounts.green }} Green
        </span>
        <span class="adp-standard-badge adp-standard-badge-warning">
          {{ portfolio().healthCounts.amber }} Amber
        </span>
        <span class="adp-standard-badge adp-standard-badge-danger">
          {{ portfolio().healthCounts.red }} Red
        </span>
      </div>
    </a>
  `,
  styles: `
    .card-link {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      text-decoration: none;
      color: inherit;
      transition: box-shadow 150ms, border-color 150ms;
    }

    .card-link:hover {
      box-shadow: var(--shadow-raised);
      border-color: var(--border);
    }

    .card-link:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus);
    }

    .code {
      color: var(--primary);
    }

    .owner {
      margin: 0;
    }

    .figures {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(var(--grid-min-figure), 1fr));
      gap: var(--space-3);
      margin: var(--space-2) 0 0;
    }

    .figures dt {
      color: var(--muted-foreground);
      margin-block-end: var(--space-1);
    }

    .figures dd {
      margin: 0;
      color: var(--foreground);
    }

    .share {
      color: var(--muted-foreground);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-block-start: var(--space-2);
    }
  `,
})
export class PortfolioCardComponent {
  readonly portfolio = input.required<Portfolio>();
}
