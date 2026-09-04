namespace LedgerAndField.Api.Models;

public class UserFeedback
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? WorkspaceId { get; set; }
    public string UserEmail { get; set; } = "";
    public string Category { get; set; } = "general"; // 'feature', 'market-fit', 'pricing', 'bug', 'general'
    public int Rating { get; set; } = 5; // 1 to 5
    public string FeedbackText { get; set; } = "";
    public string MarketFitNotes { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
