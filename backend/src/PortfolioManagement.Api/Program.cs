using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using PortfolioManagement.Api.Api.Middleware;
using PortfolioManagement.Api.Application;
using PortfolioManagement.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// The frontend origin is configuration, not a constant: appsettings holds the
// default and Cors__AllowedOrigins__0 overrides it per environment.
const string FrontendCorsPolicy = "frontend";
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services
    .AddControllers(options =>
    {
        // Without this, the keys in the 400 "errors" dictionary are the CLR property
        // names ("EndDate") while the client sent camelCase ("endDate"), so the
        // frontend could not match a server error to the field that caused it.
        // This makes validation metadata follow the same naming policy as the
        // serialiser, which is what the API contract documents.
        options.ModelMetadataDetailsProviders.Add(
            new SystemTextJsonValidationMetadataProvider(JsonNamingPolicy.CamelCase));
    })
    .AddJsonOptions(options =>
    {
        // Enums travel as their names ("InProgress"), not ordinals, so the contract
        // stays readable and reordering the enum cannot change the wire format.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Required for the 404/409/500 Problem Details written by DomainExceptionHandler.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Portfolio Management API",
        Version = "v1",
        Description = "Portfolios, projects and server-calculated project health."
    }));

// Storage is a singleton because it IS the database for this build.
builder.Services.AddSingleton<InMemoryStore>();

// The health rule: stateless, so a singleton, and injected everywhere it is needed
// rather than called statically, which is what lets tests substitute it.
builder.Services.AddSingleton<IHealthCalculator, HealthCalculator>();
builder.Services.AddSingleton<IClock, SystemClock>();

builder.Services.AddScoped<PortfolioService>();
builder.Services.AddScoped<ProjectService>();

var app = builder.Build();

// Load the Strategic Delivery Office extract once, at startup, without health values.
SeedData.Load(app.Services.GetRequiredService<InMemoryStore>());

app.UseExceptionHandler();

// Swagger UI is served in every environment here: it is part of what gets demoed.
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Portfolio Management API v1");
    options.DocumentTitle = "Portfolio Management API";
});

// No UseHttpsRedirection: the API is served over plain HTTP on one port so the
// Angular dev server can call it without a development certificate.
app.UseCors(FrontendCorsPolicy);

app.MapControllers();

// A browser hitting the root should land somewhere useful rather than on a 404.
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.Run();
