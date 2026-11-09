using Microsoft.AspNetCore.Mvc;
using PortfolioManagement.Api.Api.Dtos;
using PortfolioManagement.Api.Application;

namespace PortfolioManagement.Api.Api.Controllers;

/// <summary>
/// Portfolios, and the projects that belong to one.
///
/// Thin by design: bind, delegate, choose a status code. Validation is declarative
/// on the request DTOs and [ApiController] turns a failure into a 400 Problem
/// Details before any of these methods runs, so there are no guard clauses here.
/// </summary>
[ApiController]
[Route("api/portfolios")]
[Produces("application/json")]
public sealed class PortfoliosController(
    PortfolioService portfolioService,
    ProjectService projectService) : ControllerBase
{
    /// <summary>Every portfolio with its project count, budget roll-up and health counts.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<PortfolioResponse>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<PortfolioResponse>> GetAll()
        => Ok(portfolioService.GetAll());

    /// <summary>One portfolio with the same summary.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<PortfolioResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public ActionResult<PortfolioResponse> GetById(int id)
        => Ok(portfolioService.GetById(id));

    /// <summary>
    /// Projects in a portfolio, filtered, sorted and paged on the server.
    /// Query: search, status, health, sortBy, sortDir, page, pageSize.
    /// </summary>
    [HttpGet("{id:int}/projects")]
    [ProducesResponseType<PagedResult<ProjectResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public ActionResult<PagedResult<ProjectResponse>> GetProjects(
        int id, [FromQuery] ProjectQuery query)
        => Ok(projectService.GetForPortfolio(id, query));

    /// <summary>Creates a project in this portfolio. Health is never read from the body.</summary>
    [HttpPost("{id:int}/projects")]
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public ActionResult<ProjectResponse> CreateProject(
        int id, [FromBody] CreateProjectRequest request)
    {
        var created = projectService.Create(id, request);

        return CreatedAtAction(
            actionName: nameof(ProjectsController.GetById),
            controllerName: "Projects",
            routeValues: new { id = created.Id },
            value: created);
    }
}
