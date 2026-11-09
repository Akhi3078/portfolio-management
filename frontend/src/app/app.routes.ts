import type { Routes } from '@angular/router';

/**
 * Every screen is lazily loaded, so the dashboard does not ship the form's code.
 *
 * The project form is reached by two routes - one for create, which knows the
 * portfolio, and one for edit, which knows only the project - and the component
 * works out which it is from the route inputs it receives.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Portfolio dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'portfolios/:portfolioId/projects/new',
    title: 'New project',
    loadComponent: () =>
      import('./features/project-form/project-form.component').then(
        (m) => m.ProjectFormComponent
      ),
  },
  {
    path: 'projects/:projectId/edit',
    title: 'Edit project',
    loadComponent: () =>
      import('./features/project-form/project-form.component').then(
        (m) => m.ProjectFormComponent
      ),
  },
  {
    path: 'portfolios/:portfolioId',
    title: 'Portfolio',
    loadComponent: () =>
      import('./features/portfolio/portfolio.component').then(
        (m) => m.PortfolioComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
