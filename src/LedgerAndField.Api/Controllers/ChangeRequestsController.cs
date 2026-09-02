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
}
