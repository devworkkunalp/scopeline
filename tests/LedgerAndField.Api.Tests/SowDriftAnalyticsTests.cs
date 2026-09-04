using FluentAssertions;
using LedgerAndField.Api.Controllers;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class SowDriftAnalyticsTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private ProjectsController CreateController(AppDbContext db, Guid workspaceId)
    {
        return new ProjectsController(db, null!, null!, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
                {
                    User = new System.Security.Claims.ClaimsPrincipal(
                        new System.Security.Claims.ClaimsIdentity([
                            new System.Security.Claims.Claim("workspaceId", workspaceId.ToString())
                        ], "TestAuth")
                    )
                }
            }
        };
    }

    [Fact]
    public async Task GetSowDrift_CalculatesBaselineDriftAndBurnPercentages_Accurately()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Cloud Infrastructure Migration",
            ClientName = "Global Logistics Corp",
            ScopeValue = 100000m,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
            EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            Opportunities = [
                new Opportunity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Title = "Custom Disaster Recovery Hot-Standby",
                    BillableValue = 12000m,
                    Status = "approved",
                    ChangeRequest = new ChangeRequest
                    {
                        Id = Guid.NewGuid(),
                        Status = "approved"
                    }
                },
                new Opportunity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Title = "Multi-Region Latency Acceleration",
                    BillableValue = 8000m,
                    Status = "detected"
                }
            ],
            Invoices = [
                new Invoice
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Number = "INV-001",
                    Amount = 40000m,
                    Collected = 30000m
                }
            ]
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        // Act
        var result = await controller.GetSowDrift(projectId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value.Should().BeOfType<SowDriftAnalysisDto>().Subject;

        dto.ProjectId.Should().Be(projectId);
        dto.ProjectName.Should().Be("Cloud Infrastructure Migration");
        dto.BaselineScopeValue.Should().Be(100000m);
        dto.DetectedScopeExpansion.Should().Be(20000m); // 12k + 8k
        dto.ApprovedChangeOrdersValue.Should().Be(12000m);
        dto.ProjectedFinalValue.Should().Be(120000m);
        dto.ScopeDriftPct.Should().Be(20.0m); // 20k / 100k = 20%
        dto.InvoicedToDate.Should().Be(40000m);
        dto.CollectedToDate.Should().Be(30000m);
        dto.BudgetBurnPct.Should().Be(40.0m); // 40k / 100k = 40%
        dto.DriftRiskLevel.Should().Be("critical"); // >= 15% drift

        dto.Alerts.Should().Contain(a => a.Code == "UNAPPROVED_SCOPE_EXPANSION");
        var unapprovedAlert = dto.Alerts.First(a => a.Code == "UNAPPROVED_SCOPE_EXPANSION");
        unapprovedAlert.Message.Should().Contain("8,000"); // 20k - 12k
    }

    [Fact]
    public async Task GetSowDrift_LowDriftProject_ReturnsLowRiskLevel()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Mobile Banking App",
            ClientName = "Apex Bank",
            ScopeValue = 200000m,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
            EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(90)),
            Opportunities = [
                new Opportunity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Title = "Minor Biometric Icon Update",
                    BillableValue = 4000m,
                    Status = "detected"
                }
            ],
            Invoices = [
                new Invoice
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Number = "INV-101",
                    Amount = 20000m,
                    Collected = 20000m
                }
            ]
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        // Act
        var result = await controller.GetSowDrift(projectId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value.Should().BeOfType<SowDriftAnalysisDto>().Subject;

        dto.ScopeDriftPct.Should().Be(2.0m); // 4k / 200k = 2%
        dto.BudgetBurnPct.Should().Be(10.0m); // 20k / 200k = 10%
        dto.DriftRiskLevel.Should().Be("low");
    }

    [Fact]
    public async Task GetSowDrift_BudgetVelocityOverrun_GeneratesVelocityAlert()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // 10% timeline elapsed (day 10 out of 100)
        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "AI Analytics Engine",
            ClientName = "DeepInsight Inc",
            ScopeValue = 100000m,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
            EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(90)),
            Invoices = [
                new Invoice
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    Number = "INV-201",
                    Amount = 60000m, // 60% burn vs ~10% timeline
                    Collected = 60000m
                }
            ]
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        // Act
        var result = await controller.GetSowDrift(projectId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value.Should().BeOfType<SowDriftAnalysisDto>().Subject;

        dto.BudgetBurnPct.Should().Be(60.0m);
        dto.Alerts.Should().Contain(a => a.Code == "BUDGET_VELOCITY_OVERRUN");
    }
}
