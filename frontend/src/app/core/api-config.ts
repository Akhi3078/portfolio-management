import { InjectionToken } from '@angular/core';

/**
 * The single seam between the app and the API's location.
 *
 * Components never mention a URL and never read `environment` directly: they call
 * a service, and the services resolve their URLs from this token. That keeps the
 * base URL configuration rather than something compiled into a component, and it
 * means tests can provide a different value without touching any code.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
