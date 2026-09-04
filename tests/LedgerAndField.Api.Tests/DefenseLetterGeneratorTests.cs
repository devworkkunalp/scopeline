using FluentAssertions;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class DefenseLetterGeneratorTests
{
    private (Project project, Opportunity opp) CreateTestEntities(string perspective = "vendor")
    {
        var projectId = Guid.NewGuid();
        var oppId = Guid.NewGuid();

        var project = new Project
        {
            Id = projectId,
            WorkspaceId = Guid.NewGuid(),
            Name = "Fintech Portal Modernization",
            ClientName = "Global Horizon Financial",
            ScopeValue = 120000,
            Perspective = perspective,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                OriginalScope = "Development of core web payment portal with standard checkout",
                ExclusionsAllowances = "Custom multi-currency ledger engines and biometric authentication are excluded",
                ChangeVariationRules = "§4.2 — All out-of-scope requests require a written change order prior to delivery"
            }
        };

        var opp = new Opportunity
        {
            Id = oppId,
            ProjectId = projectId,
            Type = "Scope Expansion",
            Title = "Real-Time Multi-Currency Ledger",
            Description = "Client requested real-time FX settlement engine for European transactions",
            EstimatedCost = 4500,
            BillableValue = 9800,
            Confidence = 0.95,
            Status = "change-order",
            Clause = "§4.2 — All out-of-scope requests require a written change order",
            Evidence = new List<OpportunityEvidence>
            {
                new() { Id = Guid.NewGuid(), OpportunityId = oppId, Text = "Please include live FX multi-currency settlement", Source = "email_from_sponsor.eml" }
            },
            ChangeRequest = new ChangeRequest
            {
                Id = Guid.NewGuid(),
                OpportunityId = oppId,
                Number = "CR-015",
                Status = "draft"
            }
        };

        return (project, opp);
    }

    [Theory]
    [InlineData("diplomatic")]
    [InlineData("firm_contractual")]
    [InlineData("collaborative")]
    public void GenerateDefenseLetter_VendorPerspective_GeneratesCorrectToneAndCitations(string tone)
    {
        // Arrange
        var analyzer = new HeuristicAnalyzer();
        var (project, opp) = CreateTestEntities("vendor");
        var req = new DefenseLetterRequest(
            VendorName: null,
            VendorContact: null,
            RecipientName: "Alex Vance (VP Technology)",
            RecipientTitle: "Executive Sponsor",
            RecipientEmail: "avance@globalhorizon.com",
            Tone: tone,
            Perspective: "vendor",
            CustomNotes: "Discussed during Tuesday steering committee."
        );

        // Act
        var res = analyzer.GenerateDefenseLetter(project, opp, req);

        // Assert
        res.Should().NotBeNull();
        res.DefendedAmount.Should().Be(9800);
        res.Tone.Should().Be(tone);
        res.Perspective.Should().Be("vendor");
        res.Subject.Should().Contain(opp.Title);
        res.Body.Should().Contain("Alex Vance");
        res.Body.Should().Contain("CR-015");
        res.Body.Should().Contain("Discussed during Tuesday steering committee.");
        res.Body.Should().Contain("FX multi-currency settlement");
        res.EvidenceCitations.Should().HaveCount(1);

        if (tone == "firm_contractual")
        {
            res.Subject.Should().Contain("FORMAL NOTICE");
            res.Body.Should().Contain("FORMAL SOW SCOPE DEFENSE");
        }
        else if (tone == "collaborative")
        {
            res.Body.Should().Contain("Options moving forward");
        }
    }

    [Theory]
    [InlineData("diplomatic")]
    [InlineData("firm_contractual")]
    [InlineData("collaborative")]
    public void GenerateDefenseLetter_BuyerShieldPerspective_GeneratesRejectionAndBaselineGrounding(string tone)
    {
        // Arrange
        var analyzer = new HeuristicAnalyzer();
        var (project, opp) = CreateTestEntities("client");
        opp.Clause = "§1.0 Baseline Scope of Deliverables";

        var req = new DefenseLetterRequest(
            VendorName: "DevAgency Solutions",
            VendorContact: "contact@devagency.io",
            RecipientName: "Mark Lead (Delivery Director)",
            RecipientTitle: "Vendor Account Manager",
            RecipientEmail: "mlead@devagency.io",
            Tone: tone,
            Perspective: "client",
            CustomNotes: "Covered under Milestone 2 deliverables."
        );

        // Act
        var res = analyzer.GenerateDefenseLetter(project, opp, req);

        // Assert
        res.Should().NotBeNull();
        res.DefendedAmount.Should().Be(9800);
        res.Tone.Should().Be(tone);
        res.Perspective.Should().Be("client");
        res.ChallengeVerdict.Should().Be("CHALLENGE_OVERBILLING");
        res.Body.Should().Contain("Mark Lead");
        res.Body.Should().Contain("Covered under Milestone 2 deliverables.");

        if (tone == "firm_contractual")
        {
            res.Subject.Should().Contain("Rejection of Unauthorized Surcharge");
            res.Body.Should().Contain("REJECTED");
        }
    }
}
