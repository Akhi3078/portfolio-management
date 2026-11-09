using PortfolioManagement.Api.Api.Dtos;
using PortfolioManagement.Api.Domain;
using PortfolioManagement.Api.Infrastructure;

namespace PortfolioManagement.Api.Application;

/// <summary>
/// Portfolio reads, including the dashboard roll-up. The summary is computed here
/// rather than stored, for the same reason health is: it is a function of the
/// projects, so a stored copy would be a second truth.
/// </summary>
public sealed class PortfolioService(
    InMemoryStore store,
    IHealthCalculator healthCalculator,
    IClock clock)
{
    public IReadOnlyList<PortfolioResponse> GetAll()
    {
        var today = clock.Today;

        return store.Portfolios
            .OrderBy(p => p.Code, StringComparer.OrdinalIgnoreCase)
            .Select(p => ToResponse(p, today))
            .ToList();
    }

    public PortfolioResponse GetById(int id)
    {
        var portfolio = store.FindPortfolio(id)
            ?? throw new NotFoundException($"Portfolio {id} was not found.");

        return ToResponse(portfolio, clock.Today);
    }

    private PortfolioResponse ToResponse(Portfolio portfolio, DateOnly today)
    {
        var projects = store.ProjectsInPortfolio(portfolio.Id);

        var healths = projects
            .Select(p => healthCalculator.Calculate(p, today))
            .ToList();

        var counts = new HealthCountsDto(
            Green: healths.Count(h => h == Health.Green),
            Amber: healths.Count(h => h == Health.Amber),
            Red: healths.Count(h => h == Health.Red));

        return new PortfolioResponse(
            portfolio.Id,
            portfolio.Code,
            portfolio.Name,
            portfolio.Description,
            portfolio.Owner,
            projects.Count,
            projects.Sum(p => p.Budget),
            projects.Sum(p => p.ActualCost),
            counts);
    }
}
