using System.ComponentModel.DataAnnotations;
using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Api.Dtos;

/// <summary>
/// The create payload. Two deliberate omissions:
///
///   * no health - it cannot physically arrive, so "a health value sent by the
///     client is ignored" holds by construction rather than by a stripping step;
///   * no portfolioId - it comes from the route, so the body cannot disagree
///     with the URL.
///
/// Value types are nullable so that a missing field fails [Required] and lands in
/// the per-field errors dictionary, instead of silently binding to 0.
/// </summary>
public sealed class CreateProjectRequest : IValidatableObject
{
    [Required(ErrorMessage = "Code is required.")]
    [RegularExpression(@"^PRJ-\d{3}$",
        ErrorMessage = "Code must be PRJ- followed by exactly 3 digits, for example PRJ-123.")]
    public string? Code { get; set; }

    [Required(ErrorMessage = "Name is required.")]
    [StringLength(150, MinimumLength = 3,
        ErrorMessage = "Name must be between 3 and 150 characters.")]
    public string? Name { get; set; }

    [Required(ErrorMessage = "Owner is required.")]
    public string? Owner { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [EnumDataType(typeof(ProjectStatus), ErrorMessage = "Status is not a valid project status.")]
    public ProjectStatus? Status { get; set; }

    [Required(ErrorMessage = "Start date is required.")]
    public DateOnly? StartDate { get; set; }

    [Required(ErrorMessage = "End date is required.")]
    public DateOnly? EndDate { get; set; }

    [Required(ErrorMessage = "Budget is required.")]
    [Range(typeof(decimal), "0.0000000001", "79228162514264337593543950335",
        ErrorMessage = "Budget must be greater than 0.")]
    public decimal? Budget { get; set; }

    /// <summary>Optional; defaults to 0.</summary>
    [Range(typeof(decimal), "0", "79228162514264337593543950335",
        ErrorMessage = "Actual cost must be 0 or more.")]
    public decimal? ActualCost { get; set; }

    /// <summary>Optional; defaults to 0.</summary>
    [Range(0, 100, ErrorMessage = "Progress must be between 0 and 100.")]
    public int? Progress { get; set; }

    /// <summary>
    /// The cross-field rules. Member names are the camelCase JSON names so the
    /// errors dictionary keys match the field names the client sent.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        => ProjectRules.CrossFieldRules(StartDate, EndDate, Status, Progress);
}

/// <summary>Cross-field rules shared by create and update, so they cannot drift apart.</summary>
internal static class ProjectRules
{
    public static IEnumerable<ValidationResult> CrossFieldRules(
        DateOnly? startDate, DateOnly? endDate, ProjectStatus? status, int? progress)
    {
        if (startDate is not null && endDate is not null && endDate < startDate)
        {
            yield return new ValidationResult(
                "End date must be on or after start date.", ["endDate"]);
        }

        if (status == ProjectStatus.Completed && (progress ?? 0) != 100)
        {
            yield return new ValidationResult(
                "Progress must be 100 when status is Completed.", ["progress"]);
        }
    }
}
