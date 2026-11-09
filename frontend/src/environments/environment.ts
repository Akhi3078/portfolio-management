/**
 * Environment configuration. The API base URL lives here and nowhere else;
 * components and services receive it through the API_BASE_URL injection token.
 *
 * Swapped for environment.production.ts at build time by the fileReplacements
 * entry in angular.json.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5080/api',
} as const;
