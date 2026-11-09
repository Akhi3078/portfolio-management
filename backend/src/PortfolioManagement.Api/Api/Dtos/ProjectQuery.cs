using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Api.Dtos;

/// <summary>
/// Filtering, sorting and paging for the projects list, bound from the query string.
/// Search and filters are applied on the server: the client never receives rows it
/// then has to hide.
/// </summary>
public sealed class ProjectQuery
{
    /// <summary>Case-insensitive match on code or name.</summary>
    public string? Search { get; set; }

    public ProjectStatus? Status { get; set; }

    public Health? Health { get; set; }

    /// <summary>code, name, owner, status, health, endDate, budget, actualCost or progress.</summary>
    public string? SortBy { get; set; }

    /// <summary>asc or desc. Anything else is treated as asc.</summary>
    public string? SortDir { get; set; }

    public int? Page { get; set; }

    public int? PageSize { get; set; }
}
