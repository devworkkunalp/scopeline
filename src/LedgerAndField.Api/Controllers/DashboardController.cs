using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpGet("dashboard/summary")]
    [HttpGet("api/dashboard")]
    public async Task<IActionResult> Summary()
    {
        var projects = await db.Projects
            .Where(p => p.WorkspaceId == WorkspaceId)
            .Include(p => p.Opportunities).ThenInclude(o => o.ChangeRequest)
            .Include(p => p.Opportunities).ThenInclude(o => o.Evidence)
            .Include(p => p.Invoices)
            .ToListAsync();
            
        var opps = projects.SelectMany(p => p.Opportunities).ToList();
        var invoices = projects.SelectMany(p => p.Invoices).ToList();

        var nonRejected = opps.Where(o => o.Status != "rejected").ToList();
        var totalPotential = nonRejected.Sum(o => o.BillableValue);
        var underReview = opps.Where(o => o.Status is "detected" or "review").Sum(o => o.BillableValue);
        var confirmed = opps.Where(o => o.Status == "confirmed").Sum(o => o.BillableValue);
        
        var invoicedValue = opps.Sum(o => o.InvoicedValue);
        var collectedValue = invoices.Sum(i => i.Collected);
        if (collectedValue < invoicedValue) collectedValue = invoicedValue;

        var approvedOrCo = opps.Where(o => o.Status is "approved" or "change-order" or "invoiced").ToList();
        var atRisk = approvedOrCo.Sum(o => Math.Max(0, o.BillableValue - o.InvoicedValue));

        var unbilledCO = opps.Where(o => o.Status == "change-order").Sum(o => Math.Max(0, o.BillableValue - o.InvoicedValue));
        var unbilledApproved = opps.Where(o => o.Status == "approved").Sum(o => Math.Max(0, o.BillableValue - o.InvoicedValue));
        var rejectedList = opps.Where(o => o.Status == "rejected").ToList();

        return Ok(new
        {
            potential = totalPotential,
            underReview,
            confirmed,
            changeOrder = unbilledCO,
            changeRequest = unbilledCO,
            approved = unbilledApproved,
            invoiced = invoicedValue,
            paid = collectedValue,
            atRisk,
            rejected = rejectedList.Sum(o => o.BillableValue),
            opportunityCount = nonRejected.Count,
            projects = projects.Select(Mapper.ProjectList),
            rejectedOpportunities = rejectedList.Select(Mapper.Opportunity)
        });
    }

    [HttpGet("dashboard/projects")]
    [HttpGet("api/dashboard/projects")]
    public async Task<IActionResult> ProjectsRollup()
    {
        var projects = await db.Projects
            .Where(p => p.WorkspaceId == WorkspaceId)
            .Include(p => p.Opportunities)
            .ToListAsync();

        return Ok(projects.Select(p =>
        {
            var oppTotal = p.Opportunities.Sum(o => o.BillableValue);
            var risk = p.Opportunities.Where(o => o.Status == "approved").Sum(o => o.BillableValue - o.InvoicedValue);
            var openCount = p.Opportunities.Count(o => o.Status is not "paid" and not "rejected");
            return new
            {
                p.Id,
                p.Name,
                client = p.ClientName,
                value = p.ScopeValue,
                p.Currency,
                p.Status,
                oppTotal,
                risk,
                openCount
            };
        }));
    }
}
