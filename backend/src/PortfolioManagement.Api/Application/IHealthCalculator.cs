using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Application;

public interface IHealthCalculator
{
    /// <param name="today">
    /// Injected rather than read from the clock so the overdue branch is testable.
    /// </param>
    Health Calculate(Project project, DateOnly today);
}
