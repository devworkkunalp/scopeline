using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class ChangeRequestsController(AppDbContext db, ChangeOrderPdfService pdfs) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpPatch("change-requests/{id:guid}")]
    [HttpPatch("api/change-orders/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ChangeRequestUpdateRequest req)
    {
        var cr = await db.ChangeRequests.Include(c => c.Opportunity).ThenInclude(o => o.Project)
            .FirstOrDefaultAsync(c => c.Id == id && c.Opportunity.Project.WorkspaceId == WorkspaceId);
        if (cr is null) return NotFound();

        if (req.Reason != null) cr.Reason = req.Reason;
        if (req.ChangedScope != null) cr.ChangedScope = req.ChangedScope;
        if (req.CostBreakdown != null) cr.CostBreakdown = req.CostBreakdown;
        if (req.Status != null)
        {
            cr.Status = req.Status;
            if (req.Status == "approved")
            {
                cr.Approved = DateOnly.FromDateTime(DateTime.UtcNow);
                cr.Opportunity.Status = "approved";
            }
        }
        if (req.BillableValue != null) cr.Opportunity.BillableValue = req.BillableValue.Value;

        await db.SaveChangesAsync();
        return Ok(Mapper.Opportunity(cr.Opportunity));
    }

    [HttpGet("change-requests/{id:guid}/export")]
    [HttpGet("api/change-orders/{id:guid}/pdf")]
    public async Task<IActionResult> Export(Guid id)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project)
            .FirstOrDefaultAsync(c => c.Id == id && c.Opportunity.Project.WorkspaceId == WorkspaceId);
        if (cr is null) return NotFound();

        var bytes = pdfs.Build(cr.Opportunity.Project, cr.Opportunity, cr);
        return File(bytes, "application/pdf", $"{cr.Number}.pdf");
    }

    [HttpGet("change-requests/{id:guid}/share-link")]
    public async Task<IActionResult> GetShareLink(Guid id)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Project)
            .FirstOrDefaultAsync(c => c.Id == id && c.Opportunity.Project.WorkspaceId == WorkspaceId);
        if (cr is null) return NotFound();

        if (string.IsNullOrWhiteSpace(cr.ApprovalToken))
        {
            cr.ApprovalToken = Guid.NewGuid().ToString("N");
            await db.SaveChangesAsync();
        }

        return Ok(new
        {
            approvalToken = cr.ApprovalToken,
            shareUrl = $"/review?token={cr.ApprovalToken}",
            status = cr.Status,
            signedBy = cr.SignedBy,
            signedAt = cr.SignedAt
        });
    }

    [AllowAnonymous]
    [HttpGet("public/change-requests/{token}")]
    public async Task<IActionResult> GetPublicReview(string token)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project).ThenInclude(p => p.Contract)
            .FirstOrDefaultAsync(c => c.ApprovalToken == token);
        if (cr is null) return NotFound(new { error = "Invalid or expired review link." });

        return Ok(Mapper.PublicChangeRequest(cr));
    }

    [AllowAnonymous]
    [HttpPost("public/change-requests/{token}/approve")]
    public async Task<IActionResult> PublicApprove(string token, PublicApproveRequest req)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project).ThenInclude(p => p.Contract)
            .FirstOrDefaultAsync(c => c.ApprovalToken == token);
        if (cr is null) return NotFound(new { error = "Invalid or expired review link." });

        cr.Status = "approved";
        cr.Approved = DateOnly.FromDateTime(DateTime.UtcNow);
        cr.SignedBy = req.SignerName?.Trim();
        cr.SignedEmail = req.SignerEmail?.Trim();
        cr.SignedAt = DateTimeOffset.UtcNow;
        cr.SignatureData = req.SignatureData;
        if (!string.IsNullOrWhiteSpace(req.Notes))
        {
            cr.ClientNotes = req.Notes.Trim();
        }

        cr.Opportunity.Status = "approved";

        await db.SaveChangesAsync();
        return Ok(Mapper.PublicChangeRequest(cr));
    }

    [AllowAnonymous]
    [HttpPost("public/change-requests/{token}/decline")]
    public async Task<IActionResult> PublicDecline(string token, PublicDeclineRequest req)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project).ThenInclude(p => p.Contract)
            .FirstOrDefaultAsync(c => c.ApprovalToken == token);
        if (cr is null) return NotFound(new { error = "Invalid or expired review link." });

        cr.Status = "declined";
        var feedback = req.Reason?.Trim() ?? "";
        if (!string.IsNullOrWhiteSpace(req.Notes))
        {
            feedback = string.IsNullOrWhiteSpace(feedback) ? req.Notes.Trim() : $"{feedback} - {req.Notes.Trim()}";
        }

        if (!string.IsNullOrWhiteSpace(feedback))
        {
            cr.ClientNotes = $"Dispute/Feedback: {feedback}";
            cr.Opportunity.Status = "rejected";
            cr.Opportunity.RejectionReason = feedback;
        }

        await db.SaveChangesAsync();
        return Ok(Mapper.PublicChangeRequest(cr));
    }

    [AllowAnonymous]
    [HttpGet("public/change-requests/{token}/export")]
    public async Task<IActionResult> PublicExport(string token)
    {
        var cr = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project)
            .FirstOrDefaultAsync(c => c.ApprovalToken == token);
        if (cr is null) return NotFound();

        var bytes = pdfs.Build(cr.Opportunity.Project, cr.Opportunity, cr);
        return File(bytes, "application/pdf", $"{cr.Number}.pdf");
    }
}
