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

var postgresConn = builder.Configuration.GetConnectionString("Postgres") ?? builder.Configuration.GetConnectionString("DefaultConnection");
var hasRealPostgres = !string.IsNullOrWhiteSpace(postgresConn) && !postgresConn.Contains("[YOUR-PASSWORD]");

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (hasRealPostgres)
    {
        opt.UseNpgsql(postgresConn);
    }
    else
    {
        var sqliteConn = builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=scopeline.db";
        opt.UseSqlite(sqliteConn);
    }
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "scopeline-secret-dev-key-change-before-production-deploy-2026";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Scopeline",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "Scopeline",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = "sub"
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
        await DemoSeeder.SeedAsync(db);
        Console.WriteLine("[DB INIT] Demo seed verified successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB INIT] Demo seed notice: {ex.Message}");
    }

    try
    {
        var sampleDir = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "App_Data", "samples"));
        SampleFilesGenerator.GenerateSamples(sampleDir);
    }
    catch { }
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("app");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
