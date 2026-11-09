import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/api-config';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // withComponentInputBinding lets route params and query params arrive as
    // component inputs, so screens declare what they need instead of reaching
    // into ActivatedRoute.
    provideRouter(routes, withComponentInputBinding()),

    provideHttpClient(withFetch()),

    // The only place the configured base URL is read. Everything else injects
    // API_BASE_URL, so no component or service mentions a host or a port.
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
  ],
};
