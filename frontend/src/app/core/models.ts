/**
 * The API contract, typed. These mirror the response DTOs exactly, so a change on
 * the server surfaces here as a compile error rather than as undefined at runtime.
 */

export type ProjectStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'OnHold'
  | 'Completed'
  | 'Cancelled';

export type Health = 'Green' | 'Amber' | 'Red';

/** Every status, in lifecycle order, for filter and form dropdowns. */
export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'NotStarted',
  'InProgress',
  'OnHold',
  'Completed',
  'Cancelled',
] as const;

export const HEALTH_VALUES: readonly Health[] = ['Green', 'Amber', 'Red'] as const;

/** Human-readable status labels; the enum names are not display text. */
export const STATUS_LABELS: Readonly<Record<ProjectStatus, string>> = {
  NotStarted: 'Not started',
  InProgress: 'In progress',
  OnHold: 'On hold',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

export interface HealthCounts {
  readonly green: number;
  readonly amber: number;
  readonly red: number;
}

export interface Portfolio {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly owner: string;
  readonly projectCount: number;
  readonly totalBudget: number;
  readonly totalActualCost: number;
  readonly healthCounts: HealthCounts;
}

export interface Project {
  readonly id: number;
  readonly portfolioId: number;
  readonly code: string;
  readonly name: string;
  readonly owner: string;
  readonly status: ProjectStatus;
  /** ISO date, no time part. */
  readonly startDate: string;
  /** ISO date, no time part. */
  readonly endDate: string;
  readonly budget: number;
  readonly actualCost: number;
  readonly progress: number;
  /** Calculated by the server on every read. Never sent back. */
  readonly health: Health;
  /** Share of the planned duration elapsed, 0-100, as the server computed it. */
  readonly expectedProgress: number;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

/**
 * What the client may send when creating or updating a project.
 *
 * `health` is deliberately absent, mirroring the server DTOs: the field cannot be
 * sent, so it cannot be ignored by accident.
 */
export interface ProjectWriteModel {
  readonly code: string;
  readonly name: string;
  readonly owner: string;
  readonly status: ProjectStatus;
  readonly startDate: string;
  readonly endDate: string;
  readonly budget: number;
  readonly actualCost: number;
  readonly progress: number;
}

/** Query parameters for the projects list, matching the API's query string. */
export interface ProjectListQuery {
  readonly search?: string;
  readonly status?: ProjectStatus | '';
  readonly health?: Health | '';
  readonly sortBy?: string;
  readonly sortDir?: 'asc' | 'desc';
  readonly page?: number;
  readonly pageSize?: number;
}
