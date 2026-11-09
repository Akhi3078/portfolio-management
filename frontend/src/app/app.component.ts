import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/**
 * The app shell.
 *
 * The host carries `adp-standard-root`, which is the class every preview.html
 * wraps its content in: it sets the background, the foreground colour and the
 * base font. Without it the page renders white with browser defaults.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  host: { class: 'adp-standard-root' },
  template: `
    <header class="adp-standard-header">
      <a class="brand h3" routerLink="/">Portfolio Management</a>
      <span class="caption brand-sub">AD Ports Group &middot; Strategic Delivery Office</span>
    </header>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .brand {
      color: var(--foreground);
      text-decoration: none;
      border-radius: var(--radius-sm);
    }

    .brand:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus);
    }

    .brand-sub {
      color: var(--muted-foreground);
    }

    .content {
      width: 100%;
      max-width: var(--control-content-max);
      margin-inline: auto;
      padding-inline: var(--space-5);
      padding-block-end: var(--space-8);
    }
  `,
})
export class AppComponent {}
