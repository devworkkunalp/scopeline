using FluentAssertions;
using LedgerAndField.Api.Controllers;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class PublicClientReviewTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetPublicReview_ReturnsComplete3WayProof_ForValidToken()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var oppId = Guid.NewGuid();
        var token = "magic-token-abc-123";

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Enterprise Portal",
            ClientName = "Acme Corp",
            ScopeValue = 50000,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                OriginalScope = "Base web portal delivery",
                ExclusionsAllowances = "Mobile app setup excluded",
                ChangeVariationRules = "§4 — Written change orders required"
            }
        };

        var opp = new Opportunity
        {
            Id = oppId,
            ProjectId = projectId,
            Type = "Out of Scope",
            Title = "iOS Native App Integration",
            Description = "Client asked for custom iOS Swift client integration",
            EstimatedCost = 4000,
            BillableValue = 8500,
            Confidence = 0.95,
            Status = "change-order",
            Clause = "§4 — Written change orders required",
            Evidence = new List<OpportunityEvidence>
            {
                new() { Id = Guid.NewGuid(), OpportunityId = oppId, Text = "Please build native iOS companion", Source = "email_thread.eml" }
            }
        };

        var cr = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = oppId,
            ApprovalToken = token,
            Number = "CR-001",
            Status = "draft",
            Submitted = DateOnly.FromDateTime(DateTime.UtcNow),
            Reason = opp.Type,
            ChangedScope = opp.Description,
            CostBreakdown = "40 hrs iOS Dev @ $150/hr + 10 hrs QA"
        };

        db.Projects.Add(project);
        db.Opportunities.Add(opp);
        db.ChangeRequests.Add(cr);
        await db.SaveChangesAsync();

        var controller = new ChangeRequestsController(db, null!);

        // Act
        var result = await controller.GetPublicReview(token);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();

        var crInDb = await db.ChangeRequests.FirstAsync(c => c.ApprovalToken == token);
        crInDb.Number.Should().Be("CR-001");
        crInDb.Status.Should().Be("draft");
    }

    [Fact]
    public async Task ApprovePublicReview_StampsSignerAudit_AndUpdatesStatusToApproved()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var oppId = Guid.NewGuid();
        var token = "approval-token-xyz-789";

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Enterprise Portal",
            ClientName = "Acme Corp"
        };

        var opp = new Opportunity
        {
            Id = oppId,
            ProjectId = projectId,
            Type = "Scope Expansion",
            Title = "Single Sign-On Integration",
            Description = "Okta SSO integration",
            BillableValue = 6000,
            Status = "change-order"
        };

        var cr = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = oppId,
            ApprovalToken = token,
            Number = "CR-002",
            Status = "draft",
            Submitted = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        db.Projects.Add(project);
        db.Opportunities.Add(opp);
        db.ChangeRequests.Add(cr);
        await db.SaveChangesAsync();

        var controller = new ChangeRequestsController(db, null!);
        var approveReq = new PublicApproveRequest(
            SignerName: "Jane Doe (VP Tech)",
            SignerEmail: "jdoe@acmeweb.com",
            SignatureData: "data:image/png;base64,sampleSignatureBytes",
            Notes: "PO-778812 approved for release"
        );

        // Act
        var result = await controller.PublicApprove(token, approveReq);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();

        // Verify Database Persistence
        var dbCr = await db.ChangeRequests.FirstAsync(c => c.ApprovalToken == token);
        dbCr.Status.Should().Be("approved");
        dbCr.Approved.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow));
        dbCr.SignedBy.Should().Be("Jane Doe (VP Tech)");
        dbCr.SignedEmail.Should().Be("jdoe@acmeweb.com");
        dbCr.SignatureData.Should().Be("data:image/png;base64,sampleSignatureBytes");
        dbCr.ClientNotes.Should().Be("PO-778812 approved for release");

        var dbOpp = await db.Opportunities.FirstAsync(o => o.Id == oppId);
        dbOpp.Status.Should().Be("approved");
    }

    [Fact]
    public async Task DeclinePublicReview_UpdatesStatusToDeclined_AndStoresFeedback()
    {
        // Arrange
        using var db = CreateDbContext();
        var workspaceId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var oppId = Guid.NewGuid();
        var token = "decline-token-456";

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = workspaceId,
            Name = "Enterprise Portal",
            ClientName = "Acme Corp"
        };

        var opp = new Opportunity
        {
            Id = oppId,
            ProjectId = projectId,
            Type = "Scope Expansion",
            Title = "Custom Reports Module",
            BillableValue = 4500,
            Status = "change-order"
        };

        var cr = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = oppId,
            ApprovalToken = token,
            Number = "CR-003",
            Status = "draft",
            Submitted = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        db.Projects.Add(project);
        db.Opportunities.Add(opp);
        db.ChangeRequests.Add(cr);
        await db.SaveChangesAsync();

        var controller = new ChangeRequestsController(db, null!);
        var declineReq = new PublicDeclineRequest(
            Reason: "Believed to be in original SOW scope",
            Notes: "Please refer to Section 2.1 of initial SOW."
        );

        // Act
        var result = await controller.PublicDecline(token, declineReq);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();

        var dbCr = await db.ChangeRequests.FirstAsync(c => c.ApprovalToken == token);
        dbCr.Status.Should().Be("declined");
        dbCr.ClientNotes.Should().Contain("Please refer to Section 2.1");

        var dbOpp = await db.Opportunities.FirstAsync(o => o.Id == oppId);
        dbOpp.Status.Should().Be("rejected");
        dbOpp.RejectionReason.Should().Contain("Believed to be in original SOW scope");
    }
}
