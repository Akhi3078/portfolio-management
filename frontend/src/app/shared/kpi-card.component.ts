import { Component, input } from '@angular/core';

/**
 * A single dashboard figure, built on the ADP Standard Card.
 *
 * The label is an eyebrow above the number, which is the pattern the design system
 * documents for a small caption over a heading.
 */
@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="adp-standard-card kpi">
      <span class="eyebrow kpi-label">{{ label() }}</span>
      <span class="h1 kpi-value">{{ value() }}</span>
      @if (hint()) {
        <span class="caption kpi-hint">{{ hint() }}</span>
      }
    </div>
  `,
  styles: `
    .kpi {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .kpi-label {
      color: var(--muted-foreground);
    }

    .kpi-value {
      color: var(--foreground);
    }

    .kpi-hint {
      color: var(--muted-foreground);
    }
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>('');
}
