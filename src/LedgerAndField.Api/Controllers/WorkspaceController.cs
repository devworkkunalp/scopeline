using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class WorkspaceController(AppDbContext db) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpGet("workspace")]
    [HttpGet("api/workspace")]
    [HttpGet("api/company")]
    public async Task<IActionResult> Get()
    {
        var w = await db.Workspaces.FindAsync(WorkspaceId);
        return w is null ? NotFound() : Ok(Mapper.Workspace(w));
    }

    public record PaymentMethodRequest(string? CardholderName, string? CardNumber, string? ExpDate, string? Cvc, string? PostalCode, string? Country);

    [HttpPost("workspace/payment-method")]
    [HttpPost("api/workspace/payment-method")]
    [HttpPost("api/onboarding/payment-method")]
    public async Task<IActionResult> SavePaymentMethod(PaymentMethodRequest req)
    {
        var w = await db.Workspaces.FindAsync(WorkspaceId);
        if (w is null) return NotFound();
        w.Plan = "Team Plan (14-Day Free Trial)";
        await db.SaveChangesAsync();
        var last4 = !string.IsNullOrWhiteSpace(req.CardNumber) && req.CardNumber.Length >= 4 ? req.CardNumber[^4..] : "4242";
        return Ok(new { success = true, plan = w.Plan, trialDays = 14, cardLast4 = last4 });
    }
}
