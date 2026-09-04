using FluentAssertions;
using LedgerAndField.Api.Controllers;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class RateRealismEstimatorTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task AddManualOpportunity_WithRoleEstimates_CreatesDetailedCostBreakdownAndChangeRequest()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "E-Commerce Cloud Replatforming",
            ClientName = "Nordic Retail Group",
            ScopeValue = 95000,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                OriginalScope = "Standard Shopify store migration",
                ExclusionsAllowances = "Custom ERP warehouse syncing excluded",
                ChangeVariationRules = "§4.0 — Change order required"
            }
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = new ProjectsController(db, null!, null!, null!)
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

        var roles = new List<RoleEstimateItem>
        {
            new("Lead Architect", 10, 200, 95),
            new("Senior Fullstack Dev", 20, 160, 75),
            new("QA Engineer", 8, 100, 45)
        };

        var req = new ManualOpportunityRequest(
            Title: "Custom ERP Warehouse Syncing Engine",
            Description: "Real-time bi-directional stock level synchronization with SAP ERP.",
            Type: "Scope Expansion",
            EstimatedCost: 2810, // (10*95 + 20*75 + 8*45) = 950 + 1500 + 360 = 2810
            BillableValue: 6000, // (10*200 + 20*160 + 8*100) = 2000 + 3200 + 800 = 6000
            Clause: "§4.0 — Change order required",
            Source: "Steering Committee Meeting",
            DateLabel: "Sep 4, 2026",
            CreateChangeRequest: true,
            RoleEstimates: roles,
            TargetMarginPct: 53.2m
        );

        // Act
        var result = await controller.AddManualOpportunity(projectId, req);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();

        var oppInDb = await db.Opportunities
            .Include(o => o.ChangeRequest)
            .FirstAsync(o => o.ProjectId == projectId);

        oppInDb.Title.Should().Be("Custom ERP Warehouse Syncing Engine");
        oppInDb.BillableValue.Should().Be(6000);
        oppInDb.EstimatedCost.Should().Be(2810);
        oppInDb.Notes.Should().Contain("Role Breakdown");
        oppInDb.Notes.Should().Contain("10h Lead Architect");
        oppInDb.Notes.Should().Contain("20h Senior Fullstack Dev");

        oppInDb.ChangeRequest.Should().NotBeNull();
        oppInDb.ChangeRequest!.CostBreakdown.Should().Contain("10h Lead Architect");
        oppInDb.ChangeRequest.CostBreakdown.Should().Contain("Billable Total $6,000");
    }
}
