using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Infrastructure;

/// <summary>
/// Loads the Strategic Delivery Office's spreadsheet extract at startup.
/// Deliberately stores no health values: health comes from the rule on every read.
/// </summary>
public static class SeedData
{
    public static void Load(InMemoryStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        if (store.Portfolios.Count > 0)
        {
            return;
        }

        foreach (var (code, name, description, owner) in PortfolioRows)
        {
            store.AddPortfolio(new Portfolio
            {
                Code = code,
                Name = name,
                Description = description,
                Owner = owner
            });
        }

        foreach (var row in ProjectRows)
        {
            var portfolio = store.FindPortfolioByCode(row.PortfolioCode)
                ?? throw new InvalidOperationException(
                    $"Seed project {row.Code} references unknown portfolio {row.PortfolioCode}.");

            store.AddProject(new Project
            {
                PortfolioId = portfolio.Id,
                Code = row.Code,
                Name = row.Name,
                Owner = row.Owner,
                Status = row.Status,
                StartDate = DateOnly.Parse(row.StartDate),
                EndDate = DateOnly.Parse(row.EndDate),
                Budget = row.Budget,
                ActualCost = row.ActualCost,
                Progress = row.Progress
            });
        }
    }

    private static readonly (string Code, string Name, string Description, string Owner)[] PortfolioRows =
    [
        ("PF-01", "Digital Transformation",
            "Customer-facing and internal digital products", "Digital & Transformation Office"),
        ("PF-02", "Port Infrastructure",
            "Berths, cranes and terminal facilities", "Ports Cluster"),
        ("PF-03", "Logistics & Economic Zones",
            "Free zone services and warehousing", "Logistics Cluster")
    ];

    private sealed record ProjectRow(
        string Code,
        string PortfolioCode,
        string Name,
        string Owner,
        ProjectStatus Status,
        string StartDate,
        string EndDate,
        decimal Budget,
        decimal ActualCost,
        int Progress);

    private static readonly ProjectRow[] ProjectRows =
    [
        new("PRJ-001", "PF-01", "Customer Portal Revamp", "Aisha Khan",
            ProjectStatus.InProgress, "2026-06-01", "2027-06-30", 1_200_000m, 500_000m, 50),
        new("PRJ-002", "PF-01", "Data Platform Migration", "Rahul Menon",
            ProjectStatus.InProgress, "2026-01-01", "2027-12-31", 2_000_000m, 900_000m, 5),
        new("PRJ-003", "PF-01", "Mobile Gate Pass App", "Fatima Saeed",
            ProjectStatus.InProgress, "2026-03-01", "2027-03-31", 600_000m, 650_000m, 70),
        new("PRJ-004", "PF-02", "Berth 7 Expansion", "Karim Haddad",
            ProjectStatus.OnHold, "2025-09-01", "2026-08-31", 5_000_000m, 3_000_000m, 40),
        new("PRJ-005", "PF-02", "Crane Telemetry Upgrade", "Li Wei",
            ProjectStatus.InProgress, "2026-04-01", "2027-04-30", 800_000m, 760_000m, 60),
        new("PRJ-006", "PF-02", "Yard Lighting Retrofit", "Sara Ahmed",
            ProjectStatus.Completed, "2025-10-01", "2026-05-31", 300_000m, 250_000m, 100),
        new("PRJ-007", "PF-03", "Free Zone Licensing Portal", "Daniel Costa",
            ProjectStatus.NotStarted, "2027-01-15", "2027-09-30", 900_000m, 0m, 0),
        new("PRJ-008", "PF-03", "Warehouse IoT Pilot", "Meera Nair",
            ProjectStatus.InProgress, "2026-05-01", "2027-05-31", 500_000m, 450_000m, 60)
    ];
}
