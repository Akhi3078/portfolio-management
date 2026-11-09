namespace PortfolioManagement.Api.Application;

/// <summary>
/// Reading "today" through an abstraction keeps <see cref="HealthCalculator"/> pure
/// and lets tests and demos pin the date without touching the rule itself.
/// </summary>
public interface IClock
{
    DateOnly Today { get; }
}

public sealed class SystemClock : IClock
{
    public DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}
