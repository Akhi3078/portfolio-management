import { Component, computed, input } from '@angular/core';
import { STATUS_LABELS, type ProjectStatus } from '../core/models';

/**
 * Project status as an ADP Standard Badge.
 *
 * "Not started" is the one status with no semantic colour of its own, so it uses
 * the neutral variant defined in styles.css from the accent tokens. Status text is
 * always visible.
 */
const STATUS_VARIANT: Readonly<Record<ProjectStatus, string>> = {
  NotStarted: 'adp-standard-badge-neutral',
  InProgress: 'adp-standard-badge-info',
  OnHold: 'adp-standard-badge-warning',
  Completed: 'adp-standard-badge-success',
  Cancelled: 'adp-standard-badge-danger',
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="adp-standard-badge {{ variant() }}">{{ label() }}</span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ProjectStatus>();

  protected readonly variant = computed(() => STATUS_VARIANT[this.status()]);
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
