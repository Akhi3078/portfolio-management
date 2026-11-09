using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Infrastructure;

/// <summary>
/// The whole persistence layer. Registered as a singleton, so every method takes
/// the lock: Kestrel serves requests concurrently and a plain List is not thread-safe.
///
/// This is the seam a real repository would replace. Services depend on it directly
/// at this size; behind an interface it would be EF Core without touching them.
/// </summary>
public sealed class InMemoryStore
{
    private readonly object _gate = new();
    private readonly List<Portfolio> _portfolios = [];
    private readonly List<Project> _projects = [];
    private int _nextPortfolioId = 1;
    private int _nextProjectId = 1;

    public IReadOnlyList<Portfolio> Portfolios
    {
        get { lock (_gate) { return _portfolios.ToList(); } }
    }

    public IReadOnlyList<Project> Projects
    {
        get { lock (_gate) { return _projects.ToList(); } }
    }

    public Portfolio? FindPortfolio(int id)
    {
        lock (_gate) { return _portfolios.SingleOrDefault(p => p.Id == id); }
    }

    public Portfolio? FindPortfolioByCode(string code)
    {
        lock (_gate)
        {
            return _portfolios.SingleOrDefault(
                p => string.Equals(p.Code, code, StringComparison.OrdinalIgnoreCase));
        }
    }

    public Project? FindProject(int id)
    {
        lock (_gate) { return _projects.SingleOrDefault(p => p.Id == id); }
    }

    public IReadOnlyList<Project> ProjectsInPortfolio(int portfolioId)
    {
        lock (_gate) { return _projects.Where(p => p.PortfolioId == portfolioId).ToList(); }
    }

    /// <summary>True if any project other than <paramref name="exceptId"/> uses this code.</summary>
    public bool ProjectCodeExists(string code, int? exceptId = null)
    {
        lock (_gate)
        {
            return _projects.Any(p =>
                p.Id != exceptId
                && string.Equals(p.Code, code, StringComparison.OrdinalIgnoreCase));
        }
    }

    public bool PortfolioCodeExists(string code, int? exceptId = null)
    {
        lock (_gate)
        {
            return _portfolios.Any(p =>
                p.Id != exceptId
                && string.Equals(p.Code, code, StringComparison.OrdinalIgnoreCase));
        }
    }

    public Portfolio AddPortfolio(Portfolio portfolio)
    {
        lock (_gate)
        {
            portfolio.Id = _nextPortfolioId++;
            _portfolios.Add(portfolio);
            return portfolio;
        }
    }

    public Project AddProject(Project project)
    {
        lock (_gate)
        {
            project.Id = _nextProjectId++;
            _projects.Add(project);
            return project;
        }
    }

    public bool RemoveProject(int id)
    {
        lock (_gate)
        {
            var existing = _projects.SingleOrDefault(p => p.Id == id);
            return existing is not null && _projects.Remove(existing);
        }
    }
}
