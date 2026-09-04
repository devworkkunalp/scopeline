namespace LedgerAndField.Api.Dtos;

public record SignupRequest(string Email, string Password, string? CompanyName, string? DisplayName, string? PhoneNumber, string? Perspective);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string WorkspaceName, Guid WorkspaceId, string DisplayName, string Role, bool Onboarded, int OnboardingStep, string? PhoneNumber, int TrialDaysRemaining, string? Perspective);

public record OnboardingWorkspaceRequest(string? Name, string? CompanyName, string? Role, string? PhoneNumber, string? Perspective);
public record OnboardingProjectRequest(string? ProjectName, string? ClientName, decimal? ScopeValue, string? Currency);

public record WorkspaceUpdateRequest(string Name, string? Perspective);
public record ProjectCreateRequest(string Name, string ClientName, decimal ScopeValue, string? Currency, DateOnly? StartDate, DateOnly? EndDate, string? Perspective);
public record ProjectPatchRequest(string? Name, string? ClientName, decimal? ScopeValue, string? Currency, DateOnly? StartDate, DateOnly? EndDate, string? Status, string? Perspective);

public record OpportunityUpdateRequest(string? Title, string? Description, decimal? EstimatedCost, decimal? BillableValue, decimal? InvoicedValue, string? Clause, string? Notes, string? Status, string? RejectionReason);
public record StatusRequest(string Status, string? Reason);
public record InvoiceCreateRequest(string Number, DateOnly Date, decimal Amount, decimal Collected, string? RelatedChangeOrder);
public record ChangeRequestUpdateRequest(string? Reason, string? ChangedScope, string? CostBreakdown, decimal? BillableValue, string? Status);
public record AssistantRequest(string? Question, string? Query);
public record RoleEstimateItem(string Role, decimal Hours, decimal HourlyRate, decimal? DirectCostRate);
public record CheckScopeRequest(string Title, string Description, string? Source, string? DateLabel, decimal? EstimatedHours, decimal? HourlyRate, List<RoleEstimateItem>? RoleEstimates = null, decimal? TargetMarginPct = null);
public record ManualOpportunityRequest(string Title, string Description, string? Type, decimal EstimatedCost, decimal BillableValue, string? Clause, string? Source, string? DateLabel, bool CreateChangeRequest, List<RoleEstimateItem>? RoleEstimates = null, decimal? TargetMarginPct = null, string? CostBreakdown = null);
public record GenerateBaselineRequest(string RequirementsText, decimal? ContractValue, decimal? HourlyRate, string? IndustryPreset, int? TimelineWeeks, int? RevisionLimit);
public record DefenseLetterRequest(
    string? VendorName,
    string? VendorContact,
    string? RecipientName,
    string? RecipientTitle,
    string? RecipientEmail,
    string? Tone,
    string? Perspective,
    string? CustomNotes
);

public record DefenseLetterResponse(
    string Subject,
    string Body,
    string SowReference,
    string ChallengeVerdict,
    decimal DefendedAmount,
    string Tone,
    string Perspective,
    string[] EvidenceCitations,
    string SuggestedNextSteps
);
public record PublicApproveRequest(string SignerName, string? SignerEmail, string? SignatureData, string? Notes);
public record PublicDeclineRequest(string? Reason, string? Notes);


