using PortfolioManagement.Api.Application;
using PortfolioManagement.Api.Domain;
using PortfolioManagement.Api.Infrastructure;

namespace PortfolioManagement.Tests;

/// <summary>
/// The seed set is engineered so that every Amber and Red fires a DIFFERENT branch
/// of the rule. Pinning the whole expected table at a fixed date turns it into an
/// oracle: if a comparison is ever written the wrong way round, one named row fails
/// and says which branch broke.
///
/// Note PRJ-004 is only Red because today is past its end date. That is exactly why
/// the date is injected rather than read from the clock - otherwise this test would
/// quietly change meaning over time.
/// </summary>
public class SeedDataHealthTests
{
    private static readonly DateOnly Today = new(2026, 11, 09);

    private static (InMemoryStore Store, HealthCalculator Calculator) Arrange()
    {
        var store = new InMemoryStore();
        SeedData.Load(store);
        return (store, new HealthCalculator());
    }

    [Theory]
    [InlineData("PRJ-001", Health.Green)] // nothing wrong
    [InlineData("PRJ-002", Health.Amber)] // branch 4 - behind schedule
    [InlineData("PRJ-003", Health.Red)]   // branch 1 - over budget
    [InlineData("PRJ-004", Health.Red)]   // branch 2 - overdue
    [InlineData("PRJ-005", Health.Amber)] // branch 3 - budget at risk
    [InlineData("PRJ-006", Health.Green)] // completed, so exempt from branch 2
    [InlineData("PRJ-007", Health.Green)] // not started
    [InlineData("PRJ-008", Health.Green)] // exactly 90% of budget - the boundary
    public void SeedProject_HasExpectedHealth(string code, Health expected)
    {
        var (store, calculator) = Arrange();

        var project = store.Projects.Single(p => p.Code == code);

        Assert.Equal(expected, calculator.Calculate(project, Today));
    }

    [Fact]
    public void Prj008_IsExactly90PercentOfBudget_AndThereforeGreen()
    {
        var (store, calculator) = Arrange();

        var project = store.Projects.Single(p => p.Code == "PRJ-008");

        // Guards the fixture itself: if the seed figures are ever edited, this says
        // so rather than letting the boundary test pass for the wrong reason.
        Assert.Equal(0.90m, project.ActualCost / project.Budget);
        Assert.Equal(Health.Green, calculator.Calculate(project, Today));
    }

    [Theory]
    [InlineData("PF-01", 1, 1, 1)]
    [InlineData("PF-02", 1, 1, 1)]
    [InlineData("PF-03", 2, 0, 0)]
    public void PortfolioHealthCounts_MatchTheOracle(
        string portfolioCode, int green, int amber, int red)
    {
        var (store, calculator) = Arrange();

        var portfolio = store.FindPortfolioByCode(portfolioCode)!;

        var healths = store
            .ProjectsInPortfolio(portfolio.Id)
            .Select(p => calculator.Calculate(p, Today))
            .ToList();

        Assert.Equal(green, healths.Count(h => h == Health.Green));
        Assert.Equal(amber, healths.Count(h => h == Health.Amber));
        Assert.Equal(red, healths.Count(h => h == Health.Red));
    }

    [Fact]
    public void SeedLoad_IsIdempotent()
    {
        var (store, _) = Arrange();

        SeedData.Load(store);

        Assert.Equal(3, store.Portfolios.Count);
        Assert.Equal(8, store.Projects.Count);
    }

    [Fact]
    public void TwoOfEightProjectsAreAtRisk()
    {
        var (store, calculator) = Arrange();

        var red = store.Projects.Count(p => calculator.Calculate(p, Today) == Health.Red);

        Assert.Equal(2, red);
    }
}
