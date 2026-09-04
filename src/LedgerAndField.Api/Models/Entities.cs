namespace LedgerAndField.Api.Models;

public class Workspace
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "Nimbus Digital";
    public string Plan { get; set; } = "Team Plan · 30-Day Free Trial";
    public string Perspective { get; set; } = "vendor"; // "vendor" (Agency/Dev Shop) or "client" (Founder/Buyer)
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset TrialEndsAt { get; set; } = DateTimeOffset.UtcNow.AddDays(30);
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}

public class User
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string Role { get; set; } = "pm"; // "pm" or "founder"
    public bool Onboarded { get; set; } = false;
    public int OnboardingStep { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Project
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;
    public string Name { get; set; } = "";
    public string ClientName { get; set; } = "";
    public decimal ScopeValue { get; set; }
    public string Currency { get; set; } = "USD";
    public string Perspective { get; set; } = "vendor"; // "vendor" or "client"
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Closing Out, Completed, On Hold
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public ContractRecord? Contract { get; set; }
    public ICollection<ProjectDocument> Documents { get; set; } = new List<ProjectDocument>();
    public ICollection<ProjectEvent> Events { get; set; } = new List<ProjectEvent>();
    public ICollection<Opportunity> Opportunities { get; set; } = new List<Opportunity>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<AsyncJob> Jobs { get; set; } = new List<AsyncJob>();
}

public class ContractRecord
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string? FileName { get; set; }
    public string? StoragePath { get; set; }
    public bool Uploaded { get; set; }
    public string? OriginalScope { get; set; }
    public string? ContractValueText { get; set; }
    public string? ExclusionsAllowances { get; set; }
    public string? PaymentTerms { get; set; }
    public string? ChangeVariationRules { get; set; }
    public string? NoticePeriods { get; set; }
    public string? CommercialClauses { get; set; }
    public string? ExtractedRawText { get; set; }
}

public class ProjectDocument
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    public string DocKind { get; set; } = "doc"; // pdf, doc, xls, eml, chat, tkt, img
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = "";
    public string? ExtractedText { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class ProjectEvent
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? DocumentId { get; set; }
    public DateTime? EventDate { get; set; }
    public string Description { get; set; } = "";
    public string? EventType { get; set; }
    public decimal? Amount { get; set; }
}

public class Opportunity
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Type { get; set; } = "Scope Change";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal EstimatedCost { get; set; }
    public decimal BillableValue { get; set; }
    public decimal InvoicedValue { get; set; }
    public double Confidence { get; set; }
    public string Status { get; set; } = "detected"; // detected, review, confirmed, change-order, approved, invoiced, paid, rejected
    public string? Clause { get; set; }
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public ICollection<OpportunityEvidence> Evidence { get; set; } = new List<OpportunityEvidence>();
    public ICollection<OpportunityTimelineItem> Timeline { get; set; } = new List<OpportunityTimelineItem>();
    public ChangeRequest? ChangeRequest { get; set; }
}

public class OpportunityEvidence
{
    public Guid Id { get; set; }
    public Guid OpportunityId { get; set; }
    public Opportunity Opportunity { get; set; } = null!;
    public string Text { get; set; } = "";
    public string Source { get; set; } = "";
    public Guid? DocumentId { get; set; }
}

public class OpportunityTimelineItem
{
    public Guid Id { get; set; }
    public Guid OpportunityId { get; set; }
    public Opportunity Opportunity { get; set; } = null!;
    public string DateLabel { get; set; } = "";
    public string Description { get; set; } = "";
    public int SortOrder { get; set; }
}

public class ChangeRequest
{
    public Guid Id { get; set; }
    public Guid OpportunityId { get; set; }
    public Opportunity Opportunity { get; set; } = null!;
    public string Number { get; set; } = ""; // e.g. CR-011
    public string Status { get; set; } = "draft"; // draft, submitted, approved, declined
    public DateOnly? Submitted { get; set; }
    public DateOnly? Approved { get; set; }
    public string? Reason { get; set; }
    public string? ChangedScope { get; set; }
    public string? CostBreakdown { get; set; }
    public string? ApprovalToken { get; set; } // Secure token for public client review
    public string? SignedBy { get; set; } // Name of client approver
    public string? SignedEmail { get; set; } // Email of client approver
    public DateTimeOffset? SignedAt { get; set; } // Timestamp of electronic signature
    public string? SignatureData { get; set; } // Typed/drawn signature representation
    public string? ClientNotes { get; set; } // Notes or feedback left by the client
}

public class Invoice
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Number { get; set; } = ""; // e.g. "Milestone 1"
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public decimal Collected { get; set; }
    public string? RelatedChangeOrder { get; set; } // e.g. "CR-011 (partial)"
}

public class AsyncJob
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string JobType { get; set; } = "activity_analyze"; // contract_extract, activity_analyze
    public string Status { get; set; } = "pending"; // pending, processing, completed, failed
    public int Progress { get; set; } = 0; // 0 to 100
    public string? ResultJson { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}

public static class OpportunityStatuses
{
    public static readonly string[] Order =
        ["detected", "review", "confirmed", "change-order", "approved", "invoiced", "paid"];
}
