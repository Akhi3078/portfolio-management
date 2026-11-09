import { Component, computed, input } from '@angular/core';
import type { Health } from '../core/models';

/**
 * Health as an ADP Standard Badge.
 *
 * The mapping the design system prescribes: Green to success, Amber to warning,
 * Red to danger. The label is always rendered, so colour is never the only signal.
 */
const HEALTH_VARIANT: Readonly<Record<Health, string>> = {
  Green: 'adp-standard-badge-success',
  Amber: 'adp-standard-badge-warning',
  Red: 'adp-standard-badge-danger',
};

@Component({
  selector: 'app-health-badge',
  template: `
    <span class="adp-standard-badge {{ variant() }}">{{ health() }}</span>
  `,
})
export class HealthBadgeComponent {
  readonly health = input.required<Health>();

  protected readonly variant = computed(() => HEALTH_VARIANT[this.health()]);
}
