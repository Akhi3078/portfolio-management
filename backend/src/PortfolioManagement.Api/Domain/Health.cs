namespace PortfolioManagement.Api.Domain;

/// <summary>
/// Delivery health of a project. Never stored and never accepted from a client:
/// it is derived on every read by <see cref="Application.HealthCalculator"/>.
/// </summary>
public enum Health
{
    Green,
    Amber,
    Red
}
