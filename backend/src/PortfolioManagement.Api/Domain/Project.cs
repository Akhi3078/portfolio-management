namespace PortfolioManagement.Api.Domain;

/// <summary>
/// A project inside a portfolio. Money is AED; dates are date-only.
/// Note there is deliberately no Health property: health is a function of this
/// state plus today's date, so storing it would let it drift out of date.
/// </summary>
public sealed class Project
{
    public int Id { get; set; }

    public int PortfolioId { get; set; }

    /// <summary>Unique across all projects, format <c>PRJ-</c> plus exactly 3 digits.</summary>
    public required string Code { get; set; }

    public required string Name { get; set; }

    public required string Owner { get; set; }

    public ProjectStatus Status { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public decimal Budget { get; set; }

    public decimal ActualCost { get; set; }

    /// <summary>Percent complete, 0-100.</summary>
    public int Progress { get; set; }
}
