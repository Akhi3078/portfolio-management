namespace PortfolioManagement.Api.Domain;

/// <summary>A portfolio groups many <see cref="Project"/>s. Money is AED.</summary>
public sealed class Portfolio
{
    public int Id { get; set; }

    /// <summary>Unique business key, e.g. <c>PF-01</c>.</summary>
    public required string Code { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public required string Owner { get; set; }
}
