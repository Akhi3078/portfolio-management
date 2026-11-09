namespace PortfolioManagement.Api.Domain;

/// <summary>Lifecycle state of a project. Serialised as its name, not its ordinal.</summary>
public enum ProjectStatus
{
    NotStarted,
    InProgress,
    OnHold,
    Completed,
    Cancelled
}
