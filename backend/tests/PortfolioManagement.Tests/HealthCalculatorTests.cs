using PortfolioManagement.Api.Application;
using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Tests;

/// <summary>
/// The health rule is the one piece of logic the business reads off the screen and
/// trusts, so each of its five branches gets a test, and so does every boundary
/// where a comparison could be written one character wrong.
///
/// Every test pins "today" explicitly. That is only possible because the rule takes
/// the date as a parameter instead of reading the clock.
/// </summary>
public class HealthCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 11, 09);

    private readonly HealthCalculator _calculator = new();

    private static Project Project(
        ProjectStatus status = ProjectStatus.InProgress,
        string startDate = "2026-01-01",
        string endDate = "2027-12-31",
        decimal budget = 1_000_000m,
        decimal actualCost = 0m,
        int progress = 50)
        => new()
        {
            Code = "PRJ-999",
            Name = "Test project",
            Owner = "Test owner",
            PortfolioId = 1,
            Status = status,
            StartDate = DateOnly.Parse(startDate),
            EndDate = DateOnly.Parse(endDate),
            Budget = budget,
            ActualCost = actualCost,
            Progress = progress
        };

    // ---- Branch 1: over budget -------------------------------------------------

    [Fact]
    public void ActualCostAboveBudget_IsRed()
    {
        var project = Project(budget: 100_000m, actualCost: 100_001m);

        Assert.Equal(Health.Red, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void ActualCostExactlyBudget_IsNotRed()
    {
        // The comparison is strictly greater than, so spending the budget exactly
        // is at risk (branch 3) but not over budget.
        var project = Project(budget: 100_000m, actualCost: 100_000m);

        Assert.Equal(Health.Amber, _calculator.Calculate(project, Today));
    }

    // ---- Branch 2: overdue -----------------------------------------------------

    [Fact]
    public void EndDateInThePast_IsRed()
    {
        var project = Project(endDate: "2026-11-08", progress: 50);

        Assert.Equal(Health.Red, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void EndDateToday_IsNotOverdue()
    {
        // "before today", not "on or before today".
        var project = Project(startDate: "2026-11-01", endDate: "2026-11-09", progress: 100);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    [Theory]
    [InlineData(ProjectStatus.Completed)]
    [InlineData(ProjectStatus.Cancelled)]
    public void EndDateInThePast_ButFinished_IsNotOverdue(ProjectStatus status)
    {
        var project = Project(
            status: status, startDate: "2025-01-01", endDate: "2026-01-01", progress: 100);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    [Theory]
    [InlineData(ProjectStatus.NotStarted)]
    [InlineData(ProjectStatus.InProgress)]
    [InlineData(ProjectStatus.OnHold)]
    public void EndDateInThePast_AndUnfinished_IsRed(ProjectStatus status)
    {
        var project = Project(status: status, startDate: "2025-01-01", endDate: "2026-01-01");

        Assert.Equal(Health.Red, _calculator.Calculate(project, Today));
    }

    // ---- Branch 3: budget at risk, and the 90% boundary ------------------------

    [Fact]
    public void ActualCostAbove90PercentOfBudget_IsAmber()
    {
        var project = Project(budget: 500_000m, actualCost: 450_001m, progress: 100);

        Assert.Equal(Health.Amber, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void ActualCostExactly90PercentOfBudget_IsGreen()
    {
        // The 90% budget boundary. The rule says GREATER than 90%, so exactly 90.0%
        // is still Green. Writing branch 3 as >= would turn this Amber, and would
        // also turn PRJ-008 in the seed data Amber.
        var project = Project(budget: 500_000m, actualCost: 450_000m, progress: 100);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void ActualCostJustBelow90PercentOfBudget_IsGreen()
    {
        var project = Project(budget: 500_000m, actualCost: 449_999m, progress: 100);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    // ---- Branch 4: behind schedule --------------------------------------------

    // These three share a plan whose midpoint is exactly today (2026-10-10 to
    // 2026-12-09 is 60 days, and 30 of them have passed), so expected progress is
    // exactly 50 and the 20-point tolerance can be probed on the nose.
    private const string MidpointStart = "2026-10-10";
    private const string MidpointEnd = "2026-12-09";

    [Fact]
    public void InProgressAndMoreThan20PointsBehind_IsAmber()
    {
        // Expected progress is 50; reporting 29 is 21 points behind.
        var project = Project(
            startDate: MidpointStart, endDate: MidpointEnd, progress: 29);

        Assert.Equal(Health.Amber, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void InProgressAndExactly20PointsBehind_IsGreen()
    {
        // "more than 20 points", so a gap of exactly 20 (50 expected, 30 reported)
        // is still Green.
        var project = Project(
            startDate: MidpointStart, endDate: MidpointEnd, progress: 30);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    [Theory]
    [InlineData(ProjectStatus.NotStarted)]
    [InlineData(ProjectStatus.OnHold)]
    public void BehindSchedule_OnlyAppliesWhileInProgress(ProjectStatus status)
    {
        // 50 points behind, but not in flight, so branch 4 does not apply.
        var project = Project(
            status: status, startDate: MidpointStart, endDate: MidpointEnd, progress: 0);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    // ---- Branch 5, and precedence ---------------------------------------------

    [Fact]
    public void NothingWrong_IsGreen()
    {
        var project = Project(
            startDate: "2026-01-01", endDate: "2027-12-31",
            budget: 1_000_000m, actualCost: 100_000m, progress: 60);

        Assert.Equal(Health.Green, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void OverBudgetWinsOverBudgetAtRisk()
    {
        // Both branch 1 and branch 3 match; first match wins, and both are checked
        // before any Amber, so the answer is Red.
        var project = Project(budget: 100_000m, actualCost: 200_000m, progress: 100);

        Assert.Equal(Health.Red, _calculator.Calculate(project, Today));
    }

    [Fact]
    public void OverdueWinsOverBudgetAtRisk()
    {
        var project = Project(
            startDate: "2025-01-01", endDate: "2026-01-01",
            budget: 100_000m, actualCost: 95_000m, progress: 50);

        Assert.Equal(Health.Red, _calculator.Calculate(project, Today));
    }

    // ---- Expected progress -----------------------------------------------------

    [Fact]
    public void ExpectedProgress_BeforeStart_IsZero()
        => Assert.Equal(0m, HealthCalculator.ExpectedProgress(
            new DateOnly(2027, 01, 01), new DateOnly(2027, 12, 31), Today));

    [Fact]
    public void ExpectedProgress_AfterEnd_IsOneHundred()
        => Assert.Equal(100m, HealthCalculator.ExpectedProgress(
            new DateOnly(2025, 01, 01), new DateOnly(2026, 01, 01), Today));

    [Fact]
    public void ExpectedProgress_HalfwayThrough_IsExactlyFifty()
    {
        var actual = HealthCalculator.ExpectedProgress(
            DateOnly.Parse(MidpointStart), DateOnly.Parse(MidpointEnd), Today);

        Assert.Equal(50m, actual);
    }

    [Fact]
    public void ExpectedProgress_ZeroLengthPlan_DoesNotDivideByZero()
    {
        var sameDay = new DateOnly(2026, 11, 09);

        Assert.Equal(100m, HealthCalculator.ExpectedProgress(sameDay, sameDay, Today));
        Assert.Equal(0m, HealthCalculator.ExpectedProgress(
            sameDay, sameDay, new DateOnly(2026, 11, 08)));
    }

    [Fact]
    public void NullProject_Throws()
        => Assert.Throws<ArgumentNullException>(() => _calculator.Calculate(null!, Today));
}
