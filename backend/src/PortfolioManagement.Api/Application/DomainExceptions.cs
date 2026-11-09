namespace PortfolioManagement.Api.Application;

/// <summary>Raised when a requested entity does not exist. Surfaces as 404.</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>Raised when a uniqueness rule is violated. Surfaces as 409.</summary>
public sealed class ConflictException(string message) : Exception(message);
