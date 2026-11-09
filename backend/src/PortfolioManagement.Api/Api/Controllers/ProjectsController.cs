using Microsoft.AspNetCore.Mvc;
using PortfolioManagement.Api.Api.Dtos;
using PortfolioManagement.Api.Application;

namespace PortfolioManagement.Api.Api.Controllers;

/// <summary>Operations on a single project, addressed by its own id.</summary>
[ApiController]
[Route("api/projects")]
[Produces("application/json")]
public sealed class ProjectsController(ProjectService projectService) : ControllerBase
{
    /// <summary>One project, including its server-calculated health.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public ActionResult<ProjectResponse> GetById(int id)
        => Ok(projectService.GetById(id));

    /// <summary>Replaces the editable state of a project. Health is never read from the body.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ProjectResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public ActionResult<ProjectResponse> Update(int id, [FromBody] UpdateProjectRequest request)
        => Ok(projectService.Update(id, request));

    /// <summary>Deletes a project.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public IActionResult Delete(int id)
    {
        projectService.Delete(id);
        return NoContent();
    }
}
