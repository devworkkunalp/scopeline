using FluentAssertions;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class HeuristicAnalyzerTests
{
    private readonly HeuristicAnalyzer _analyzer = new();

    private Project CreateSampleProject(string perspective = "vendor")
    {
        return new Project
        {
            Id = Guid.NewGuid(),
            Name = "Enterprise Web Application & Portal",
            ClientName = "DevConsulting Global Ltd.",
            ScopeValue = 185000m,
            Perspective = perspective,
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                Uploaded = true,
                FileName = "Enterprise_Web_App_SOW.pdf",
                OriginalScope = "Section 1.0 Baseline Deliverables: Core eCommerce Engine, Product Catalog with Category & Tag Filtering, Stripe Checkout Integration, and User Auth.",
                ExclusionsAllowances = "Section 2.0 Exclusions: Custom ERP Integrations, Multi-language Localization.",
                PaymentTerms = "Section 4.0 Milestone Schedule: Milestone 1 (25%), Milestone 2 (25%), Milestone 3 (25%), Milestone 4 (25%).",
                ChangeVariationRules = "Section 3.0 Change Control: Any work outside Section 1.0 requires a formal signed Change Order prior to commencement at $150/hr.",
                CommercialClauses = "Section 5.0 Warranty: 90-day defect correction SLA at no additional charge for all baseline features."
            }
        };
    }

    [Fact]
    public void ExtractContract_ParsesSowSectionsCorrectly()
    {
        // Arrange
        var sowText = """
            STATEMENT OF WORK (SOW)
            Scope of Work: The project work includes building a multi-tenant client portal and billing reconciliation platform.
            Total Contract Sum: $185,000 lump sum.
            Exclusions: ERP integration and legacy data migration are not included.
            Payment Terms: Net 30 upon milestone completion.
            Change Order Rules: Written variation order required for out of scope items.
            Commercial Clauses: 90 days warranty rework at contractor expense.
            """;

        // Act
        var contract = _analyzer.ExtractContract(sowText, 185000m);

        // Assert
        contract.Should().NotBeNull();
        contract.OriginalScope.Should().Contain("portal");
        contract.ExclusionsAllowances.Should().Contain("not included");
        contract.PaymentTerms.Should().Contain("milestone");
    }

    [Fact]
    public void Detect_IdentifiesOutOfScopeAdditions_FromProjectDocuments()
    {
        // Arrange
        var project = CreateSampleProject(perspective: "vendor");
        var docs = new List<(string fileName, string text)>
        {
            ("Slack_Conversation.txt", "Client requested extra work and additional features for multi-currency payment gateway amounting to $4,500.")
        };

        // Act
        var drafts = _analyzer.Detect(project.Contract, docs);

        // Assert
        drafts.Should().NotBeEmpty();
        var draft = drafts.First();
        draft.Billable.Should().Be(4500m);
        draft.Type.Should().Be("Scope Change");
    }

    [Fact]
    public void GenerateDefenseLetter_ForClientShield_ProducesOfficialWithholdingNotice()
    {
        // Arrange
        var project = CreateSampleProject(perspective: "client");
        var opp = new Opportunity
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Title = "Vendor Change Order #04 - Category Filter Implementation",
            BillableValue = 3500m,
            Clause = "SOW Section 1.2 Baseline Deliverables",
            Status = "detected",
            Evidence = new List<OpportunityEvidence>
            {
                new() { Source = "Vendor_ChangeOrder_Claim.txt", Text = "We require $3,500 surcharge for category filtering." }
            }
        };

        // Act
        var (subject, body, sowRef, verdict, amt) = _analyzer.GenerateDefenseLetter(
            project, opp, "Apex Software Agency", "Included in base SOW Section 1.2");

        // Assert
        subject.Should().Contain("Scope Boundary & SOW Review");
        body.Should().Contain("Apex Software Agency");
        body.Should().Contain("$3,500");
        body.Should().Contain("SOW Section 1.2");
        body.Should().Contain("baseline obligations");
        amt.Should().Be(3500m);
        verdict.Should().Be("CHALLENGE_OVERBILLING");
    }

    [Fact]
    public void AssistantAnswer_RespondsAccuratelyToUnbilledAndRiskQueries()
    {
        // Arrange
        var project = CreateSampleProject(perspective: "vendor");
        project.Opportunities = new List<Opportunity>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Title = "Stripe Custom Elements",
                BillableValue = 6000m,
                InvoicedValue = 2000m,
                Status = "approved",
                Evidence = new List<OpportunityEvidence>()
            }
        };

        // Act
        var answer = _analyzer.Answer("What is our unbilled revenue leakage?", project);

        // Assert
        answer.Should().Contain("unbilled items");
        answer.Should().Contain("$4,000");
    }

    [Fact]
    public void ChangeOrderPdfService_Build_GeneratesValidPdfBytes()
    {
        // Arrange
        var pdfService = new ChangeOrderPdfService();
        var project = CreateSampleProject(perspective: "vendor");
        var opp = new Opportunity
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Title = "Multi-Currency Checkout & Subscriptions",
            BillableValue = 11250m,
            EstimatedCost = 7500m,
            Type = "Scope Change",
            Clause = "SOW §2.3 Excluded Scope",
            Description = "Client requested multi-currency support.",
            Status = "approved",
            Evidence = new List<OpportunityEvidence>
            {
                new() { Source = "Meeting_MOM.txt", Text = "Client requested multi-currency and subscriptions." }
            }
        };
        var cr = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = opp.Id,
            Number = "CR-017",
            Status = "approved",
            ChangedScope = "Multi-Currency Checkout Engine",
            CostBreakdown = "75 Engineering Hours @ $150/hr = $11,250",
            Reason = "Scope Change"
        };

        // Act
        var bytes = pdfService.Build(project, opp, cr);

        // Assert
        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(100);
        // PDF magic header %PDF-
        bytes[0].Should().Be(0x25); // %
        bytes[1].Should().Be(0x50); // P
        bytes[2].Should().Be(0x44); // D
        bytes[3].Should().Be(0x46); // F
    }
}
