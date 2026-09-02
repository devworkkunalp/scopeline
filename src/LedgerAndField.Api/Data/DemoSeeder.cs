using LedgerAndField.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Data;

public static class DemoSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        var hasher = new PasswordHasher<User>();
        var workspaceId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var workspace = new Workspace
        {
            Id = workspaceId,
            Name = "Nimbus Digital",
            Plan = "Team Plan · Trial"
        };
        
        var user = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            WorkspaceId = workspaceId,
            Email = "demo@scopeline.local",
            DisplayName = "Jamie Rivera",
            Role = "pm",
            Onboarded = true,
            OnboardingStep = 4
        };
        user.PasswordHash = hasher.HashPassword(user, "Demo123!");

        // Also add secondary demo alias for existing test runners
        var userLegacy = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222223"),
            WorkspaceId = workspaceId,
            Email = "demo@ledgerandfield.local",
            DisplayName = "Jamie Rivera",
            Role = "pm",
            Onboarded = true,
            OnboardingStep = 4
        };
        userLegacy.PasswordHash = hasher.HashPassword(userLegacy, "Demo123!");

        var p1 = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var p2 = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var p3 = Guid.Parse("55555555-5555-5555-5555-555555555555");

        var northwind = new Project
        {
            Id = p1,
            WorkspaceId = workspaceId,
            Name = "Northwind Retail — Platform Modernization",
            ClientName = "Northwind Retail Corp",
            ScopeValue = 185000,
            Currency = "USD",
            StartDate = new DateOnly(2025, 6, 1),
            EndDate = new DateOnly(2026, 1, 31),
            Status = "Active",
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = p1,
                FileName = "Northwind_SOW_v3_Signed.pdf",
                Uploaded = true,
                OriginalScope = "Migration of the legacy storefront to a headless commerce platform, covering 12 core modules per SOW Appendix A.",
                ContractValueText = "$185,000 (Fixed Price)",
                ExclusionsAllowances = "Third-party payment gateway fees; content migration beyond 500 SKUs; post-launch training beyond 2 sessions.",
                PaymentTerms = "Net 15, milestone-based billing across 4 milestones.",
                ChangeVariationRules = "§5 — Any request altering scope, timeline, or cost by more than $2,000 requires a written Change Request signed by both parties.",
                NoticePeriods = "§5.2 — Vendor must submit a Change Request within 5 business days of a scope-affecting ask.",
                CommercialClauses = "§7 Client-requested acceleration billable at 1.5x; §9 rework from vendor error not billable; §9.1 rework from client-directed change billable at standard rate."
            }
        };

        northwind.Documents = new List<ProjectDocument>
        {
            Doc(p1, "Slack_Export_Nov_2025.json", "chat", 310_000, "2025-11-04"),
            Doc(p1, "JIRA-882_SSO_Integration_Request.pdf", "tkt", 48_000, "2025-11-06"),
            Doc(p1, "Email_Thread_Client_Ask.eml", "eml", 12_000, "2025-11-07"),
            Doc(p1, "Sprint_Review_Notes_Nov18.docx", "doc", 38_000, "2025-11-18"),
            Doc(p1, "Change_Log_Nov.xlsx", "xls", 64_000, "2025-11-15"),
            Doc(p1, "Invoice_Milestone_3.pdf", "pdf", 210_000, "2025-11-30"),
        };

        northwind.Opportunities = new List<Opportunity>
        {
            Opp(p1, "Scope Change", "SSO Integration — Not in Original SOW",
                "Client requested enterprise SSO (Okta) support mid-sprint; not listed among the 12 modules in Appendix A.",
                4200, 9800, 0.92, "review",
                "§5 — Change Request required for scope changes over $2,000",
                [("Jira ticket JIRA-882 requests SSO integration outside the original module list.", "JIRA-882_SSO_Integration_Request.pdf"),
                 ("Slack thread shows the client explicitly asking for Okta support.", "Slack_Export_Nov_2025.json")],
                [("Nov 4, 2025", "Client raises SSO requirement in Slack."),
                 ("Nov 6, 2025", "Jira ticket JIRA-882 filed by the delivery team.")]),

            Opp(p1, "Completed, Unbilled", "Custom Reporting Dashboard — Built, Not Invoiced",
                "Team built a custom analytics dashboard requested in a client call; work is complete but absent from any milestone invoice.",
                3100, 7400, 0.85, "confirmed",
                "§5 — Change Request Process",
                [("Change log lists the dashboard build with no linked invoice.", "Change_Log_Nov.xlsx"),
                 ("Sprint review notes confirm the dashboard was demoed and accepted.", "Sprint_Review_Notes_Nov18.docx")],
                [("Oct 20, 2025", "Client requests reporting dashboard on a call."),
                 ("Nov 10, 2025", "Dashboard completed and demoed."),
                 ("Nov 18, 2025", "Logged internally — no change request issued.")]),

            Opp(p1, "Client Instruction", "Additional Admin Role — Multi-Warehouse Permissions",
                "Sprint review notes record the client asking for a new admin role not in the original permissions spec.",
                1600, 3200, 0.74, "detected",
                "§5 — Change Request required for scope changes over $2,000",
                [("Sprint review notes record the client's request for a new admin role.", "Sprint_Review_Notes_Nov18.docx")],
                [("Nov 18, 2025", "Client requests multi-warehouse admin role in sprint review.")]),

            AccelOpp(p1),
            LoyaltyOpp(p1),

            Opp(p1, "Rework", "Checkout Flow Rework — Internal Design Miss",
                "Checkout redesign had to be redone after a missed responsive breakpoint — determined to be a vendor-side error, not billable.",
                2400, 4100, 0.61, "rejected",
                "§9 — Rework due to vendor error not billable",
                [("Sprint notes attribute the rework to a missed breakpoint on the team's side.", "Sprint_Review_Notes_Nov18.docx")],
                [("Nov 18, 2025", "Rework identified as internal QA miss, not client-directed.")],
                "Determined vendor-side error, not billable")
        };

        northwind.Invoices = new List<Invoice>
        {
            new() { Id = Guid.NewGuid(), ProjectId = p1, Number = "Milestone 1", Date = new DateOnly(2025, 8, 1), Amount = 46250, Collected = 46250, RelatedChangeOrder = "—" },
            new() { Id = Guid.NewGuid(), ProjectId = p1, Number = "Milestone 2", Date = new DateOnly(2025, 10, 1), Amount = 46250, Collected = 46250, RelatedChangeOrder = "CR-006 (missing)" },
            new() { Id = Guid.NewGuid(), ProjectId = p1, Number = "Milestone 3", Date = new DateOnly(2025, 11, 30), Amount = 46250, Collected = 0, RelatedChangeOrder = "CR-011 (partial)" },
        };

        var vertex = new Project
        {
            Id = p2,
            WorkspaceId = workspaceId,
            Name = "Vertex Logistics — Internal Tools Suite",
            ClientName = "Vertex Logistics Inc.",
            ScopeValue = 92000,
            Currency = "USD",
            StartDate = new DateOnly(2025, 8, 15),
            EndDate = new DateOnly(2026, 2, 1),
            Status = "Active",
            Contract = new ContractRecord { Id = Guid.NewGuid(), ProjectId = p2, Uploaded = false }
        };

        var brightpath = new Project
        {
            Id = p3,
            WorkspaceId = workspaceId,
            Name = "Bright Path Nonprofit — Website Rebuild",
            ClientName = "Bright Path Foundation",
            ScopeValue = 34000,
            Currency = "USD",
            StartDate = new DateOnly(2025, 9, 1),
            EndDate = new DateOnly(2025, 12, 15),
            Status = "Closing Out",
            Contract = new ContractRecord
            {
                Id = Guid.NewGuid(),
                ProjectId = p3,
                FileName = "BrightPath_SOW.pdf",
                Uploaded = true,
                OriginalScope = "Rebuild of public website and donation portal, 8 pages plus CMS.",
                ContractValueText = "$34,000 (Fixed Price)",
                ExclusionsAllowances = "Email marketing platform setup excluded.",
                PaymentTerms = "Net 15, 3 milestones.",
                ChangeVariationRules = "§4 — Change Request required over $1,000.",
                NoticePeriods = "§4.1 — 5-day notice of scope change.",
                CommercialClauses = "§6 Client-directed rework billable at standard rate."
            },
            Documents = new List<ProjectDocument> { Doc(p3, "Final_QA_Notes.docx", "doc", 30_000, "2025-12-01") },
            Opportunities = new List<Opportunity>
            {
                Opp(p3, "Completed, Unbilled", "Extra Landing Page — Donor Campaign",
                    "An extra campaign landing page was added late in the project at the client's request.",
                    900, 2100, 0.70, "detected",
                    "§4 — Change Request required over $1,000",
                    [("QA notes reference the added campaign landing page.", "Final_QA_Notes.docx")],
                    [("Nov 28, 2025", "Extra landing page logged during final QA.")])
            },
            Invoices = new List<Invoice>
            {
                new() { Id = Guid.NewGuid(), ProjectId = p3, Number = "Milestone 2", Date = new DateOnly(2025, 11, 15), Amount = 11333, Collected = 11333, RelatedChangeOrder = "—" }
            }
        };

        db.Workspaces.Add(workspace);
        db.Users.AddRange(user, userLegacy);
        db.Projects.AddRange(northwind, vertex, brightpath);
        await db.SaveChangesAsync();
    }

    private static ProjectDocument Doc(Guid projectId, string name, string kind, long size, string date) => new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectId,
        FileName = name,
        DocKind = kind,
        SizeBytes = size,
        StoragePath = "",
        UploadedAt = DateTimeOffset.Parse(date + "T12:00:00Z"),
        ContentType = kind switch
        {
            "pdf" => "application/pdf",
            "doc" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "eml" => "message/rfc822",
            "chat" => "application/json",
            "tkt" => "application/pdf",
            _ => "application/octet-stream"
        }
    };

    private static Opportunity Opp(
        Guid projectId, string type, string title, string desc,
        decimal cost, decimal billable, double conf, string status, string clause,
        (string text, string src)[] evidence, (string date, string desc)[] timeline,
        string? reject = null)
    {
        var id = Guid.NewGuid();
        return new Opportunity
        {
            Id = id,
            ProjectId = projectId,
            Type = type,
            Title = title,
            Description = desc,
            EstimatedCost = cost,
            BillableValue = billable,
            Confidence = conf,
            Status = status,
            Clause = clause,
            RejectionReason = reject,
            Evidence = evidence.Select(e => new OpportunityEvidence { Id = Guid.NewGuid(), OpportunityId = id, Text = e.text, Source = e.src }).ToList(),
            Timeline = timeline.Select((t, i) => new OpportunityTimelineItem { Id = Guid.NewGuid(), OpportunityId = id, DateLabel = t.date, Description = t.desc, SortOrder = i }).ToList()
        };
    }

    private static Opportunity AccelOpp(Guid projectId)
    {
        var o = Opp(projectId, "Acceleration", "Weekend Sprint — Client-Moved Launch Date",
            "Client moved the launch date up by two weeks; team ran two weekend sprints to compensate at the client's request.",
            6800, 11200, 0.88, "change-order",
            "§7 — Client-requested acceleration billable at 1.5x",
            [("Email thread shows the client requesting the earlier launch date.", "Email_Thread_Client_Ask.eml"),
             ("Change log records the weekend hours logged by the team.", "Change_Log_Nov.xlsx")],
            [("Oct 28, 2025", "Client requests launch two weeks earlier."),
             ("Nov 1–Nov 16", "Two weekend sprints logged.")]);
        o.ChangeRequest = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = o.Id,
            Number = "CR-011",
            Status = "approved",
            Submitted = new DateOnly(2025, 11, 20),
            Approved = new DateOnly(2025, 11, 24),
            Reason = o.Type,
            ChangedScope = o.Description,
            CostBreakdown = "Two weekend engineering sprints and senior dev overtime."
        };
        return o;
    }

    private static Opportunity LoyaltyOpp(Guid projectId)
    {
        var o = Opp(projectId, "Approved / Uninvoiced", "Loyalty Points Module — Approved Change, Not Billed",
            "Approved change request for a loyalty points module; work is complete but the value hasn't appeared on any milestone invoice.",
            5200, 12500, 0.95, "approved",
            "§5 — Change Request Process",
            [("Executed change request confirms client approval of the loyalty module.", "Change_Log_Nov.xlsx")],
            [("Sep 15, 2025", "Change request CR-006 signed by client."),
             ("Oct 28, 2025", "Loyalty module completed."),
             ("Nov 30, 2025", "Milestone 3 invoiced — CR-006 value absent.")]);
        o.InvoicedValue = 0;
        o.ChangeRequest = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            OpportunityId = o.Id,
            Number = "CR-006",
            Status = "approved",
            Submitted = new DateOnly(2025, 9, 10),
            Approved = new DateOnly(2025, 9, 15),
            Reason = o.Type,
            ChangedScope = o.Description,
            CostBreakdown = "Loyalty points calculation engine & frontend reward component."
        };
        return o;
    }
}
