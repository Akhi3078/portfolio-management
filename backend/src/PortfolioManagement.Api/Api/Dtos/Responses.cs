using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Api.Dtos;

/// <summary>Health tally used on the dashboard cards.</summary>
public sealed record HealthCountsDto(int Green, int Amber, int Red);

/// <summary>A portfolio plus the roll-up the dashboard needs in one request.</summary>
public sealed record PortfolioResponse(
    int Id,
    string Code,
    string Name,
    string? Description,
    string Owner,
    int ProjectCount,
    decimal TotalBudget,
    decimal TotalActualCost,
    HealthCountsDto HealthCounts);

/// <summary>
/// A project as the API returns it. Health is present here and nowhere on the
/// inbound side, which is what makes it read-only.
/// </summary>
public sealed record ProjectResponse(
    int Id,
    int PortfolioId,
    string Code,
    string Name,
    string Owner,
    ProjectStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal Budget,
    decimal ActualCost,
    int Progress,
    Health Health,
    decimal ExpectedProgress);

/// <summary>Envelope for the paged projects list.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
