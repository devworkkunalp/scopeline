using LedgerAndField.Api.Data;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[ApiController]
public class FeedbackController(AppDbContext db) : ControllerBase
{
    public record FeedbackSubmitRequest(
        string? Category,
        int? Rating,
        string? FeedbackText,
        string? MarketFitNotes,
        string? Email
    );

    [AllowAnonymous]
    [HttpPost("feedback")]
    [HttpPost("api/feedback")]
    public async Task<IActionResult> SubmitFeedback([FromBody] FeedbackSubmitRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FeedbackText) && string.IsNullOrWhiteSpace(req.MarketFitNotes))
        {
            return BadRequest(new { error = "Please provide feedback or suggestions before submitting." });
        }

        Guid? wsId = null;
        string userEmail = req.Email?.Trim() ?? "";

        if (User.Identity?.IsAuthenticated == true)
        {
            try
            {
                wsId = TokenService.WorkspaceId(User);
                if (string.IsNullOrWhiteSpace(userEmail))
                {
                    userEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email || c.Type == "email")?.Value ?? "";
                }
            }
            catch { }
        }

        var feedback = new UserFeedback
        {
            Id = Guid.NewGuid(),
            WorkspaceId = wsId,
            UserEmail = userEmail,
            Category = string.IsNullOrWhiteSpace(req.Category) ? "market-fit" : req.Category.Trim(),
            Rating = Math.Clamp(req.Rating ?? 5, 1, 5),
            FeedbackText = req.FeedbackText?.Trim() ?? "",
            MarketFitNotes = req.MarketFitNotes?.Trim() ?? "",
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Thank you for your feedback! Your thoughts help directly shape the Scopeline roadmap.",
            feedbackId = feedback.Id
        });
    }

    [Authorize]
    [HttpGet("feedback")]
    [HttpGet("api/feedback")]
    public async Task<IActionResult> ListFeedback()
    {
        var list = await db.Feedbacks.OrderByDescending(f => f.CreatedAt).Take(100).ToListAsync();
        return Ok(list);
    }
}
