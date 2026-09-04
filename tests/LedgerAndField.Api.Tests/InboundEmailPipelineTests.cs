using FluentAssertions;
using LedgerAndField.Api.Controllers;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class InboundEmailPipelineTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private InboundEmailController CreateController(AppDbContext db, Guid workspaceId)
    {
        var extractor = new DocumentTextExtractor();
        return new InboundEmailController(db, extractor, null!, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
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
    public async Task HandleInboundWebhook_WithRecipientMatchingProject_IngestsEmlAndDetectsOutOfScope()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Enterprise Portal",
            ClientName = "Acme Global",
            ScopeValue = 100000m,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                OriginalScope = "Single currency USD checkout flow",
                ExclusionsAllowances = "Multi-currency FX settlement and subscriptions excluded",
                ChangeVariationRules = "§3.2 — Written change request required"
            }
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        var req = new InboundEmailWebhookRequest(
            From: "sara.jenkins@acmeglobal.com",
            To: $"inbound+{projectId}@scopeline.io",
            Subject: "Urgent request: Add Stripe Multi-Currency Subscriptions",
            Text: "We need your team to implement EUR and GBP billing with Stripe recurring subscriptions for international buyers before Q4 launch.",
            Html: null,
            Eml: null,
            MessageId: "msg-12345"
        );

        // Act
        var result = await controller.HandleInboundWebhook(null, req);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value.Should().BeOfType<InboundEmailResultDto>().Subject;

        dto.Success.Should().BeTrue();
        dto.ProjectId.Should().Be(projectId);
        dto.IsOutOfScope.Should().BeTrue();
        dto.BillableValue.Should().BeGreaterThan(0);
        dto.OpportunityTitle.Should().Contain("Urgent request: Add Stripe Multi-Currency Subscriptions");

        // Verify document saved in DB
        var savedDoc = await db.Documents.FirstOrDefaultAsync(d => d.ProjectId == projectId);
        savedDoc.Should().NotBeNull();
        savedDoc!.DocKind.Should().Be("eml");
        savedDoc.ExtractedText.Should().Contain("sara.jenkins@acmeglobal.com");

        // Verify opportunity auto-created
        var savedOpp = await db.Opportunities
            .Include(o => o.Evidence)
            .Include(o => o.ChangeRequest)
            .FirstOrDefaultAsync(o => o.ProjectId == projectId);

        savedOpp.Should().NotBeNull();
        savedOpp!.Evidence.Should().HaveCount(1);
        savedOpp.ChangeRequest.Should().NotBeNull();
    }

    [Fact]
    public async Task SimulateInboundEmail_CreatesOpportunityAndChangeRequest_Successfully()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Fintech Platform",
            ClientName = "Apex Financial",
            ScopeValue = 150000m,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                OriginalScope = "Web dashboard MVP",
                ExclusionsAllowances = "Executive automated email reports excluded",
                ChangeVariationRules = "§4 — Change orders"
            }
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        var simReq = new InboundEmailSimulationRequest(
            From: "director@apexfinancial.com",
            Subject: "Automated Daily Executive Analytics Email",
            Body: "Can you configure automated nightly PDF reports delivered to senior executives?",
            ClaimedHours: 16m,
            HourlyRate: 175m,
            CreateChangeRequest: true
        );

        // Act
        var result = await controller.SimulateInboundEmail(projectId, simReq);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value.Should().BeOfType<InboundEmailResultDto>().Subject;

        dto.Success.Should().BeTrue();
        dto.IsOutOfScope.Should().BeTrue();
        dto.BillableValue.Should().Be(2800m); // 16 * 175 = 2800

        var opp = await db.Opportunities.Include(o => o.ChangeRequest).FirstOrDefaultAsync(o => o.ProjectId == projectId);
        opp.Should().NotBeNull();
        opp!.BillableValue.Should().Be(2800m);
        opp.EstimatedCost.Should().Be(1960m); // 16 * 175 * 0.7 = 1960
        opp.ChangeRequest.Should().NotBeNull();
    }

    [Fact]
    public async Task GetInboundAddress_ReturnsCorrectStandardAndVanityAddress()
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
            ClientName = "Retailer Inc",
            ScopeValue = 80000m
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var controller = CreateController(db, workspaceId);

        // Act
        var result = await controller.GetInboundAddress(projectId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var val = okResult.Value;
        val.Should().NotBeNull();

        var json = System.Text.Json.JsonSerializer.Serialize(val);
        json.Should().Contain(projectId.ToString());
        json.Should().Contain("project-e-commerce-cloud-replatforming-");
    }
}
