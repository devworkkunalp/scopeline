using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class OpportunitiesController(AppDbContext db) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpGet("opportunities/{id:guid}")]
    [HttpGet("api/opportunities/{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var o = await Find(id);
        return o is null ? NotFound() : Ok(Mapper.Opportunity(o));
    }

    [HttpPatch("opportunities/{id:guid}")]
    [HttpPatch("api/opportunities/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, OpportunityUpdateRequest req)
    {
        var o = await Find(id);
        if (o is null) return NotFound();
        if (req.Title is not null) o.Title = req.Title;
        if (req.Description is not null) o.Description = req.Description;
        if (req.EstimatedCost is not null) o.EstimatedCost = req.EstimatedCost.Value;
        if (req.BillableValue is not null) o.BillableValue = req.BillableValue.Value;
        if (req.InvoicedValue is not null) o.InvoicedValue = req.InvoicedValue.Value;
        if (req.Clause is not null) o.Clause = req.Clause;
        if (req.Notes is not null) o.Notes = req.Notes;
        if (req.Status is not null) o.Status = req.Status;
        if (req.RejectionReason is not null) o.RejectionReason = req.RejectionReason;
        await db.SaveChangesAsync();
        return Ok(Mapper.Opportunity(o));
    }

    [HttpPatch("opportunities/{id:guid}/status")]
    [HttpPost("opportunities/{id:guid}/status")]
    [HttpPost("api/opportunities/{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, StatusRequest req)
    {
        var o = await Find(id);
        if (o is null) return NotFound();
        o.Status = req.Status;
        if (req.Status == "rejected") o.RejectionReason = req.Reason ?? o.RejectionReason ?? "Determined vendor-side error, not billable";
        if (req.Status == "review" && o.Status == "detected") o.Status = "review";
        await db.SaveChangesAsync();
        return Ok(Mapper.Opportunity(o));
    }

    [HttpPost("opportunities/{id:guid}/change-request")]
    [HttpPost("api/opportunities/{id:guid}/change-request")]
    [HttpPost("api/opportunities/{id:guid}/change-order")]
    public async Task<IActionResult> GenerateChangeRequest(Guid id)
    {
        var o = await Find(id);
        if (o is null) return NotFound();

        var existingCr = await db.ChangeRequests.FirstOrDefaultAsync(c => c.OpportunityId == o.Id);
        if (existingCr is null)
        {
            var count = await db.ChangeRequests.CountAsync(c => c.Opportunity.ProjectId == o.ProjectId);
            var cr = new ChangeRequest
            {
                Id = Guid.NewGuid(),
                OpportunityId = o.Id,
                Number = $"CR-{count + 10:000}",
                Status = "draft",
                Submitted = DateOnly.FromDateTime(DateTime.UtcNow),
                Reason = o.Type,
                ChangedScope = o.Description,
                CostBreakdown = $"Estimated cost {o.EstimatedCost:C0}. Proposed billable value {o.BillableValue:C0}."
            };
            db.ChangeRequests.Add(cr);
            o.ChangeRequest = cr;
        }
        else
        {
            o.ChangeRequest = existingCr;
        }

        o.Status = "change-order";
        await db.SaveChangesAsync();
        return Ok(Mapper.Opportunity(o));
    }

    public record ReconcileRequest(decimal? Amount, DateOnly? Date, bool IsFull);

    [HttpPost("opportunities/{id:guid}/reconcile")]
    [HttpPost("api/opportunities/{id:guid}/reconcile")]
    public async Task<IActionResult> Reconcile(Guid id, [FromBody] ReconcileRequest req)
    {
        var o = await Find(id);
        if (o is null) return NotFound();

        var crNum = o.ChangeRequest?.Number ?? "CR";
        var remainingGap = Math.Max(0, o.BillableValue - o.InvoicedValue);
        var paymentAmt = req.IsFull ? remainingGap : Math.Min(remainingGap, req.Amount ?? remainingGap);
        var paymentDate = req.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        if (paymentAmt > 0)
        {
            o.InvoicedValue += paymentAmt;
            if (o.InvoicedValue >= o.BillableValue)
            {
                o.Status = "paid";
            }

            var inv = new Invoice
            {
                Id = Guid.NewGuid(),
                ProjectId = o.ProjectId,
                Number = req.IsFull ? $"Payment for {crNum}" : $"Partial Payment ({paymentAmt:C0}) for {crNum}",
                Date = paymentDate,
                Amount = paymentAmt,
                Collected = paymentAmt,
                RelatedChangeOrder = crNum
            };
            db.Invoices.Add(inv);

            db.Events.Add(new ProjectEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = o.ProjectId,
                Description = $"Payment of {paymentAmt:C0} reconciled for {crNum} ({o.Title})",
                EventType = "payment",
                Amount = paymentAmt
            });

            await db.SaveChangesAsync();
        }

        return Ok(Mapper.Opportunity(o));
    }

    private Task<Opportunity?> Find(Guid id) =>
        db.Opportunities
            .Include(o => o.Evidence).Include(o => o.Timeline).Include(o => o.ChangeRequest).Include(o => o.Project)
            .FirstOrDefaultAsync(o => o.Id == id && o.Project.WorkspaceId == WorkspaceId);
}
