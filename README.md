# Portfolio Management

A portfolio and project tracker for the Strategic Delivery Office, built for the
AD Ports Group Lead Full Stack Developer assessment.

**Angular 19** frontend · **.NET 8** Web API · in-memory storage · ADP Standard design system.

Two separate applications, each started on its own, on its own port, talking only
over HTTP.

---

## Prerequisites

| Tool | Version used |
|---|---|
| .NET SDK | 8.0 or later (the API targets `net8.0`) |
| Node.js | 22 or later (Angular 19 requires `>=22`) |
| npm | 10 or later |

> The API targets `net8.0`. A newer SDK builds it fine as long as the .NET 8
> runtime is installed; `dotnet --list-runtimes` should show a
> `Microsoft.AspNetCore.App 8.0.x`.

---

## Running the applications

Start each one in its own terminal.

### 1. Backend — http://localhost:5080

```bash
cd backend
dotnet run --project src/PortfolioManagement.Api
```

- API root: <http://localhost:5080/api/portfolios>
- **Swagger UI: <http://localhost:5080/swagger>** (the root `/` redirects here)

Seed data loads into memory at startup, so the data resets on every restart.

### 2. Frontend — http://localhost:4200

```bash
cd frontend
npm install
npm start
```

Then open <http://localhost:4200>.

`npm start` regenerates `src/styles/tokens.css` from the design system's
`tokens.json` first (see [Design system](#design-system)).

---

## Tests

```bash
# Backend: the health rule, every branch, and the seed-data oracle
cd backend && dotnet test            # 38 tests

# Frontend: form validation, server-error mapping, health badge
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless   # 11 tests
```

---

## Configuration

| What | Where | Default |
|---|---|---|
| API base URL (frontend) | `frontend/src/environments/environment.ts` | `http://localhost:5080/api` |
| Allowed CORS origin (backend) | `backend/src/PortfolioManagement.Api/appsettings.json` → `Cors:AllowedOrigins` | `http://localhost:4200` |
| API port | `backend/src/PortfolioManagement.Api/Properties/launchSettings.json` | `5080` |

The base URL is never written into a component: it is read once in
`app.config.ts` and supplied through the `API_BASE_URL` injection token, so every
service resolves its URLs from configuration.

If you change the frontend port, update `Cors:AllowedOrigins` to match.

---

## Project structure

```
backend/
  src/PortfolioManagement.Api/
    Domain/          Portfolio, Project, ProjectStatus, Health
    Application/     HealthCalculator  <- the business rule, pure and injectable
                     PortfolioService, ProjectService, IClock, exceptions
    Infrastructure/  InMemoryStore, SeedData
    Api/
      Controllers/   PortfoliosController, ProjectsController  (thin)
      Dtos/          request and response contracts
      Middleware/    DomainExceptionHandler  -> Problem Details
  tests/PortfolioManagement.Tests/
    HealthCalculatorTests.cs    every branch and every boundary
    SeedDataHealthTests.cs      the seed set as a correctness oracle

frontend/
  scripts/generate-tokens.mjs   builds tokens.css from the design system
  src/
    environments/               the API base URL
    styles/tokens.css           GENERATED - do not edit
    assets/adp/                 the design system, copied verbatim, never edited
    app/
      core/                     typed API clients, models, Problem Details, formatting
      shared/                   HealthBadge, StatusBadge, KpiCard, PortfolioCard, PageHeader
      features/
        dashboard/              KPI tiles and portfolio cards
        portfolio/              Tabs, filters, projects table, delete confirmation
        project-form/           create and edit, with per-field validation
```

---

## The health rule

Health is **never stored and never accepted from a client**. The server
recalculates it every time it returns a project.
[`HealthCalculator`](backend/src/PortfolioManagement.Api/Application/HealthCalculator.cs)
is a pure class that takes the project and the date to judge it against. The five
conditions are checked top to bottom and the **first match wins**:

| # | Condition | Result |
|---|---|---|
| 1 | `actualCost > budget` | Red — over budget |
| 2 | `endDate < today` and status not Completed/Cancelled | Red — overdue |
| 3 | `actualCost > 90% of budget` | Amber — budget at risk |
| 4 | status is InProgress and `expectedProgress - progress > 20` | Amber — behind schedule |
| 5 | otherwise | Green |

where `expectedProgress = clamp(0, 100, (today - startDate) / (endDate - startDate) × 100)`.

Two details that are easy to get wrong and are both covered by tests:

- Both budget comparisons are **strictly greater than**. A project at exactly 90%
  of budget is **Green**, not Amber. `PRJ-008` in the seed data is exactly 90.0%.
- **`today` is a parameter**, not `DateTime.Today` read inside the class. The
  overdue branch cannot otherwise be tested, and `PRJ-004` is only Red because
  today is past its end date.

### Expected results for the seed data

Verified at **2026-11-09**:

| Project | Spend | Expected | Actual | Health | Branch |
|---|---|---|---|---|---|
| PRJ-001 | 41.7% | 40.9 | 50 | Green | — |
| PRJ-002 | 45.0% | 42.8 | 5 | **Amber** | 4 — behind schedule |
| PRJ-003 | 108.3% | 64.1 | 70 | **Red** | 1 — over budget |
| PRJ-004 | 60.0% | 100.0 | 40 | **Red** | 2 — overdue |
| PRJ-005 | 95.0% | 56.3 | 60 | **Amber** | 3 — budget at risk |
| PRJ-006 | 83.3% | 100.0 | 100 | Green | Completed, exempt from 2 |
| PRJ-007 | 0.0% | 0.0 | 0 | Green | — |
| PRJ-008 | **90.0%** | 48.6 | 60 | **Green** | the 90% boundary |

Dashboard totals: PF-01 1/1/1 · PF-02 1/1/1 · PF-03 2/0/0 · 2 of 8 at risk (25%).

---

## API

| Method | Path | Returns |
|---|---|---|
| GET | `/api/portfolios` | All portfolios with `projectCount`, `totalBudget`, `totalActualCost`, `healthCounts` |
| GET | `/api/portfolios/{id}` | One portfolio with the same summary |
| GET | `/api/portfolios/{id}/projects` | `{ items, page, pageSize, totalCount }`. Query: `search`, `status`, `health`, `sortBy`, `sortDir`, `page`, `pageSize` |
| GET | `/api/projects/{id}` | One project, including calculated health |
| POST | `/api/portfolios/{id}/projects` | 201 Created with the new project |
| PUT | `/api/projects/{id}` | The updated project |
| DELETE | `/api/projects/{id}` | 204 No Content |

The projects list always returns the paged envelope, so the Must-have and
Should-have forms of that endpoint are one contract rather than two shapes.

**Errors.** `400` returns RFC 9457 Problem Details with a per-field `errors`
dictionary whose keys are the camelCase field names the client sent:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "endDate": ["End date must be on or after start date."],
    "progress": ["Progress must be 100 when status is Completed."]
  }
}
```

`404` when a portfolio or project does not exist. `409` when a project code is
already in use. A `health` value sent by the client is ignored — the inbound DTOs
have no such field, so it cannot arrive at all.

---

## Design system

The UI uses the **ADP Standard** design system (internally *Harbor Design System*
v1.0.2, class prefix `adp-standard-`) and no other UI kit.

The system ships `components/bundle.css`, which is written entirely against CSS
variables — but **it does not ship a `tokens.css`**, only `tokens.json`. Without
those variables every component renders unstyled.

So `frontend/scripts/generate-tokens.mjs` generates `src/styles/tokens.css` from
`tokens.json`: 23 colours across both themes, 11 spacing, 7 radius, 5 shadow and
8 control tokens, plus the 11 type classes that `bundle.css` declares shorthands
for but never defines. It runs automatically before `start`, `build` and `test`,
or on demand with `npm run tokens`.

Stylesheets load in this order (`angular.json` → `styles`):

1. `src/styles/tokens.css` — generated
2. `src/assets/adp/components/bundle.css` — the design system, verbatim
3. `src/styles.css` — project overrides, kept small

**The design system folder is never edited.** `src/assets/adp/` is a byte-for-byte
copy of the supplied zip. Overrides live only in `src/styles.css`: a neutral Badge
variant for "Not started", the invalid-state border for `select`/`textarea` (the
bundle styles it for `input` only), link-as-button decoration, and named grid
breakpoints — the one thing the system does not tokenise.

Component usage follows the brief: Card for KPI tiles and portfolio cards, Badge
for status and health, Table for the projects list, Tabs for Projects/Overview,
Field for every input, Button for every action. Health maps to the semantic
variants: **Green → success, Amber → warning, Red → danger**, always with the text
visible.

`Cover` is used as a *pattern*, not a component: it has no README, is absent from
the component table, and its preview uses page-local classes with no
`adp-standard-cover` to import. The page header is composed from tokens instead.

State comes from ARIA attributes, as the bundle requires: tabs bind
`aria-selected` and invalid inputs bind `aria-invalid`. An `.active` or `.error`
class would produce no visual change.

---

## Notable decisions

- **Health lives in one class, not a controller.** Controllers bind, delegate and
  pick a status code. `ProjectService` has a single mapping method, so health is
  applied on every path out of the API and cannot be forgotten on a new endpoint.
- **`health` is omitted from inbound DTOs entirely** rather than stripped, so
  "ignored" is true by construction.
- **Filters are query parameters, applied on the server.** Nothing is filtered in
  the browser. They also live in the URL, so a refresh or a shared link keeps
  them, and back/forward work.
- **`SystemTextJsonValidationMetadataProvider` is registered** so that the keys in
  the 400 `errors` dictionary are camelCase. Without it ASP.NET Core returns the
  CLR property names (`EndDate`), and the frontend cannot match a server error to
  the field that caused it.
- **A 409 is shown on the code field**, not in a banner — the only uniqueness rule
  in the API is the project code.
- **Money and dates are formatted in exactly two places** (`core/formatting.ts`),
  so the app is consistent by construction. ISO dates are parsed as local dates;
  `new Date('2027-06-30')` is UTC midnight and displays as the 29th west of
  Greenwich.

---

## Not done

Deliberately out of scope, in the brief's own Stretch list:

- Create portfolio (`POST /api/portfolios`)
- Optimistic concurrency (ETag / row version)
- Dockerfiles and `docker-compose.yml`
- JWT authentication with Viewer and Manager roles
- A budget-versus-spend chart on the Overview tab

Known gaps:

- The delete confirmation dialog does not trap focus or close on `Escape`. It is
  reachable and labelled, but a production version would use the CDK's dialog
  primitives for focus management.
- Storage is in-memory and single-process, so data resets on restart and the app
  cannot be scaled out. `InMemoryStore` is the seam a repository backed by EF Core
  would replace.
- The projects list recomputes health for the whole portfolio before filtering, so
  health filtering cannot be pushed into a database query unchanged. That is the
  cost of having exactly one definition of the rule, and it is the right trade at
  this size.
