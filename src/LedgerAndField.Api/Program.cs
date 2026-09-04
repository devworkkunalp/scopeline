using System.Text;
using LedgerAndField.Api;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "1");
var builder = WebApplication.CreateBuilder(args);

QuestPDF.Settings.License = LicenseType.Community;

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient<OpenAiCompatibleClient>();
builder.Services.AddSingleton<DocumentTextExtractor>();
builder.Services.AddSingleton<HeuristicAnalyzer>();
builder.Services.AddSingleton<ChangeOrderPdfService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<AnalysisService>();

var postgresConn = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(postgresConn))
    postgresConn = builder.Configuration.GetConnectionString("Postgres");

var hasRealPostgres = !string.IsNullOrWhiteSpace(postgresConn)
    && !postgresConn.Contains("YOUR_POSTGRES_PASSWORD_HERE")
    && !postgresConn.Contains("[YOUR-PASSWORD]");

Console.WriteLine($"[CONFIG] Database: {(hasRealPostgres ? "PostgreSQL (Configured)" : "SQLite (Fallback)")}");

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (hasRealPostgres)
    {
        opt.UseNpgsql(postgresConn);
    }
    else
    {
        var appData = Path.Combine(AppContext.BaseDirectory, "App_Data");
        Directory.CreateDirectory(appData);
        var sqliteConn = $"Data Source={Path.Combine(appData, "scopeline.db")}";
        opt.UseSqlite(sqliteConn);
    }
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "scopeline-secret-dev-key-change-before-production-deploy-2026";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddPolicy("app", p => p
    .SetIsOriginAllowed(_ => true)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        var script = db.Database.GenerateCreateScript();
        await db.Database.ExecuteSqlRawAsync(script);
        Console.WriteLine("[DB INIT] Database schema verified successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB INIT] Table creation notice: {ex.Message}");
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"PhoneNumber\" text DEFAULT '';");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Workspaces\" ADD COLUMN IF NOT EXISTS \"TrialEndsAt\" timestamp with time zone DEFAULT NOW() + interval '30 days';");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Workspaces\" ADD COLUMN IF NOT EXISTS \"Perspective\" text DEFAULT 'vendor';");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Projects\" ADD COLUMN IF NOT EXISTS \"Perspective\" text DEFAULT 'vendor';");
        Console.WriteLine("[DB INIT] Column migrations (PhoneNumber, TrialEndsAt, Perspective) verified successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB INIT] Column migration notice: {ex.Message}");
    }

    try
    {
        await DemoSeeder.SeedAsync(db);
        Console.WriteLine("[DB INIT] Demo seed verified successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB INIT] Demo seed notice: {ex.Message}");
    }

    try
    {
        var sampleDir = Path.Combine(AppContext.BaseDirectory, "App_Data", "samples");
        Directory.CreateDirectory(sampleDir);
        SampleFilesGenerator.GenerateSamples(sampleDir);
    }
    catch { }
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("app");

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[GLOBAL EXCEPTION] {context.Request.Method} {context.Request.Path}: {ex.Message}");
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
