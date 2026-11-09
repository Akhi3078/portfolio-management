using PortfolioManagement.Api.Api.Dtos;
using PortfolioManagement.Api.Domain;
using PortfolioManagement.Api.Infrastructure;

namespace PortfolioManagement.Api.Application;

/// <summary>
/// Everything the projects endpoints do. Controllers translate HTTP to these calls
/// and back; all of the behaviour lives here so it can be tested without a request.
/// </summary>
public sealed class ProjectService(
    InMemoryStore store,
    IHealthCalculator healthCalculator,
    IClock clock,
    ILogger<ProjectService> logger)
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 200;

    public ProjectResponse GetById(int id)
    {
        var project = store.FindProject(id)
            ?? throw new NotFoundException($"Project {id} was not found.");

        return ToResponse(project, clock.Today);
    }

    /// <summary>
    /// Filters, sorts and pages the projects of one portfolio.
    ///
    /// Health is computed before filtering, because health is a derived field and
    /// callers filter on the value they can see. That also means filtering cannot
    /// be pushed into a database query unchanged if this moves to EF Core - a
    /// deliberate trade for having exactly one definition of the rule.
    /// </summary>
    public PagedResult<ProjectResponse> GetForPortfolio(int portfolioId, ProjectQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (store.FindPortfolio(portfolioId) is null)
        {
            throw new NotFoundException($"Portfolio {portfolioId} was not found.");
        }

        var today = clock.Today;

        IEnumerable<ProjectResponse> projects = store
            .ProjectsInPortfolio(portfolioId)
            .Select(p => ToResponse(p, today))
            .ToList();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            projects = projects.Where(p =>
                p.Code.Contains(term, StringComparison.OrdinalIgnoreCase)
                || p.Name.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        if (query.Status is not null)
        {
            projects = projects.Where(p => p.Status == query.Status);
        }

        if (query.Health is not null)
        {
            projects = projects.Where(p => p.Health == query.Health);
        }

        var filtered = Sort(projects, query.SortBy, query.SortDir).ToList();

        var pageSize = Math.Clamp(query.PageSize ?? DefaultPageSize, 1, MaxPageSize);
        var page = Math.Max(query.Page ?? 1, 1);

        var items = filtered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<ProjectResponse>(items, page, pageSize, filtered.Count);
    }

    public ProjectResponse Create(int portfolioId, CreateProjectRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (store.FindPortfolio(portfolioId) is null)
        {
            throw new NotFoundException($"Portfolio {portfolioId} was not found.");
        }

        var code = request.Code!.Trim();

        if (store.ProjectCodeExists(code))
        {
            throw new ConflictException($"Project code {code} is already in use.");
        }

        var project = new Project
        {
            PortfolioId = portfolioId,
            Code = code,
            Name = request.Name!.Trim(),
            Owner = request.Owner!.Trim(),
            Status = request.Status!.Value,
            StartDate = request.StartDate!.Value,
            EndDate = request.EndDate!.Value,
            Budget = request.Budget!.Value,
            ActualCost = request.ActualCost ?? 0m,
            Progress = request.Progress ?? 0
        };

        store.AddProject(project);

        logger.LogInformation(
            "Created project {ProjectCode} (id {ProjectId}) in portfolio {PortfolioId}.",
            project.Code, project.Id, portfolioId);

        return ToResponse(project, clock.Today);
    }

    public ProjectResponse Update(int id, UpdateProjectRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var project = store.FindProject(id)
            ?? throw new NotFoundException($"Project {id} was not found.");

        var code = request.Code!.Trim();

        if (store.ProjectCodeExists(code, exceptId: id))
        {
            throw new ConflictException($"Project code {code} is already in use.");
        }

        project.Code = code;
        project.Name = request.Name!.Trim();
        project.Owner = request.Owner!.Trim();
        project.Status = request.Status!.Value;
        project.StartDate = request.StartDate!.Value;
        project.EndDate = request.EndDate!.Value;
        project.Budget = request.Budget!.Value;
        project.ActualCost = request.ActualCost ?? 0m;
        project.Progress = request.Progress ?? 0;

        logger.LogInformation(
            "Updated project {ProjectCode} (id {ProjectId}).", project.Code, project.Id);

        return ToResponse(project, clock.Today);
    }

    public void Delete(int id)
    {
        if (!store.RemoveProject(id))
        {
            throw new NotFoundException($"Project {id} was not found.");
        }

        logger.LogInformation("Deleted project {ProjectId}.", id);
    }

    /// <summary>
    /// The one place a domain Project becomes a response, so health is applied on
    /// every path out of the API and cannot be forgotten on a new endpoint.
    /// </summary>
    private ProjectResponse ToResponse(Project project, DateOnly today)
        => new(
            project.Id,
            project.PortfolioId,
            project.Code,
            project.Name,
            project.Owner,
            project.Status,
            project.StartDate,
            project.EndDate,
            project.Budget,
            project.ActualCost,
            project.Progress,
            healthCalculator.Calculate(project, today),
            Math.Round(HealthCalculator.ExpectedProgress(project.StartDate, project.EndDate, today), 1));

    private static IEnumerable<ProjectResponse> Sort(
        IEnumerable<ProjectResponse> projects, string? sortBy, string? sortDir)
    {
        var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);

        Func<ProjectResponse, object> key = (sortBy ?? "code").ToLowerInvariant() switch
        {
            "name" => p => p.Name,
            "owner" => p => p.Owner,
            "status" => p => p.Status,
            "health" => p => p.Health,
            "enddate" => p => p.EndDate,
            "startdate" => p => p.StartDate,
            "budget" => p => p.Budget,
            "actualcost" => p => p.ActualCost,
            "progress" => p => p.Progress,
            _ => p => p.Code
        };

        return descending
            ? projects.OrderByDescending(key)
            : projects.OrderBy(key);
    }
}
