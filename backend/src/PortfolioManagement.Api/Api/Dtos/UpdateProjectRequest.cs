using System.ComponentModel.DataAnnotations;
using PortfolioManagement.Api.Domain;

namespace PortfolioManagement.Api.Api.Dtos;

/// <summary>
/// A full replacement of the editable state. Same shape and same rules as create -
/// including no health - so the boundary behaves identically on both verbs.
/// </summary>
public sealed class UpdateProjectRequest : IValidatableObject
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

    [Range(typeof(decimal), "0", "79228162514264337593543950335",
        ErrorMessage = "Actual cost must be 0 or more.")]
    public decimal? ActualCost { get; set; }

    [Range(0, 100, ErrorMessage = "Progress must be between 0 and 100.")]
    public int? Progress { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        => ProjectRules.CrossFieldRules(StartDate, EndDate, Status, Progress);
}
