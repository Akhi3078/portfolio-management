import { Component, input } from '@angular/core';

/**
 * The Cover pattern.
 *
 * Cover is NOT a component in this design system: it has no README, it is absent
 * from the README's component table, and its preview.html uses page-local classes
 * (.cover, .name, .lead) rather than any adp-standard-* class. So the page header
 * is composed from tokens and the type classes here instead of importing a class
 * that does not exist.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="cover">
      @if (eyebrow()) {
        <p class="eyebrow cover-eyebrow">{{ eyebrow() }}</p>
      }
      <h1 class="h1 cover-title">{{ title() }}</h1>
      @if (lead()) {
        <p class="body cover-lead">{{ lead() }}</p>
      }
      <ng-content />
    </header>
  `,
  styles: `
    .cover {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding-block: var(--space-6);
    }

    .cover-eyebrow {
      margin: 0;
      color: var(--primary);
    }

    .cover-title {
      margin: 0;
      color: var(--foreground);
    }

    .cover-lead {
      margin: 0;
      max-width: 72ch;
      color: var(--muted-foreground);
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly lead = input<string>('');
}
