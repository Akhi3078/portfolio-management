using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Application;

/// <summary>
/// The single source of truth for project health.
///
/// Pure and stateless: the only inputs are the project and the date to judge it
/// against. "Today" is a parameter, never <c>DateTime.Today</c>, so every branch
/// — especially the overdue one — can be tested at a fixed date.
///
/// The five conditions are evaluated top to bottom and the FIRST match wins.
/// Order is part of the rule: a project that is both over budget and overdue is
/// Red for being over budget, and the 90% branch must not pre-empt either Red.
/// </summary>
public sealed class HealthCalculator : IHealthCalculator
{
    /// <summary>Fraction of budget above which a project is "budget at risk".</summary>
    private const decimal BudgetAtRiskFraction = 0.90m;

    /// <summary>Percentage points a project may fall behind plan before it is Amber.</summary>
    private const decimal BehindScheduleTolerance = 20m;

    public Health Calculate(Project project, DateOnly today)
    {
        ArgumentNullException.ThrowIfNull(project);

        // 1. Over budget. Strictly greater: spending the budget exactly is not Red.
        if (project.ActualCost > project.Budget)
        {
            return Health.Red;
        }

        // 2. Overdue. Completed and Cancelled projects are exempt — a finished
        //    project with a past end date is finished, not late.
        if (project.EndDate < today
            && project.Status is not (ProjectStatus.Completed or ProjectStatus.Cancelled))
        {
            return Health.Red;
        }

        // 3. Budget at risk. Strictly greater than 90%, so exactly 90.0% is still
        //    Green. This boundary is covered by a unit test.
        if (project.ActualCost > BudgetAtRiskFraction * project.Budget)
        {
            return Health.Amber;
        }

        // 4. Behind schedule. Only meaningful while work is actually in flight.
        if (project.Status == ProjectStatus.InProgress)
        {
            var expected = ExpectedProgress(project.StartDate, project.EndDate, today);
            if (expected - project.Progress > BehindScheduleTolerance)
            {
                return Health.Amber;
            }
        }

        // 5. Nothing is wrong.
        return Health.Green;
    }

    /// <summary>
    /// The share of the planned duration that has elapsed, in days, clamped to 0-100.
    ///
    /// Exposed as a static so it can be tested and reused (the Overview tab shows it)
    /// without constructing the calculator.
    /// </summary>
    public static decimal ExpectedProgress(DateOnly startDate, DateOnly endDate, DateOnly today)
    {
        var plannedDays = endDate.DayNumber - startDate.DayNumber;

        // A zero- or negative-length plan has no meaningful ratio, so fall back to
        // the clamp bounds instead of dividing by zero.
        if (plannedDays <= 0)
        {
            return today < endDate ? 0m : 100m;
        }

        var elapsedDays = today.DayNumber - startDate.DayNumber;
        var ratio = (decimal)elapsedDays / plannedDays * 100m;

        return Math.Clamp(ratio, 0m, 100m);
    }
}
