import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import type {
  PagedResult,
  Portfolio,
  Project,
  ProjectListQuery,
  ProjectWriteModel,
} from './models';

/**
 * The typed client for everything under /api/portfolios.
 *
 * All filtering, sorting and paging is expressed as query parameters and handled
 * by the server: the UI asks for the rows it is going to show, it never fetches
 * everything and filters locally.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getPortfolios(): Observable<Portfolio[]> {
    return this.http.get<Portfolio[]>(`${this.baseUrl}/portfolios`);
  }

  getPortfolio(id: number): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${this.baseUrl}/portfolios/${id}`);
  }

  getProjects(
    portfolioId: number,
    query: ProjectListQuery = {}
  ): Observable<PagedResult<Project>> {
    return this.http.get<PagedResult<Project>>(
      `${this.baseUrl}/portfolios/${portfolioId}/projects`,
      { params: toHttpParams(query) }
    );
  }

  createProject(
    portfolioId: number,
    project: ProjectWriteModel
  ): Observable<Project> {
    return this.http.post<Project>(
      `${this.baseUrl}/portfolios/${portfolioId}/projects`,
      project
    );
  }
}

/**
 * Builds the query string, omitting anything blank so the URL carries only the
 * filters that are actually active.
 */
function toHttpParams(query: ProjectListQuery): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }

  return params;
}
