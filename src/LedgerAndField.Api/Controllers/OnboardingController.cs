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
public class OnboardingController(AppDbContext db) : ControllerBase
{
    private Guid UserId => TokenService.UserId(User);
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpPost("onboarding/workspace")]
    [HttpPost("api/onboarding/workspace")]
    public async Task<IActionResult> UpdateWorkspace(OnboardingWorkspaceRequest req)
    {
        var user = await db.Users.Include(u => u.Workspace).FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.CompanyName))
            user.Workspace.Name = req.CompanyName.Trim();
        if (!string.IsNullOrWhiteSpace(req.Name))
            user.DisplayName = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.PhoneNumber))
            user.PhoneNumber = req.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(req.Role))
            user.Role = req.Role.Trim().ToLowerInvariant();

        user.OnboardingStep = 1;
        await db.SaveChangesAsync();

        return Ok(new
        {
            user = new { user.Id, user.Email, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep },
            workspace = Mapper.Workspace(user.Workspace)
        });
    }

    [HttpPost("onboarding/project")]
    [HttpPost("api/onboarding/project")]
    public async Task<IActionResult> CreateFirstProject(OnboardingProjectRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return NotFound();

        var p = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = WorkspaceId,
            Name = string.IsNullOrWhiteSpace(req.ProjectName) ? "My First Project" : req.ProjectName.Trim(),
            ClientName = string.IsNullOrWhiteSpace(req.ClientName) ? "Client" : req.ClientName.Trim(),
            ScopeValue = req.ScopeValue ?? 0,
            Currency = string.IsNullOrWhiteSpace(req.Currency) ? "USD" : req.Currency,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = "Active",
            CreatedAt = DateTimeOffset.UtcNow,
            Contract = new ContractRecord { Id = Guid.NewGuid(), Uploaded = false }
        };
        p.Contract.ProjectId = p.Id;

        db.Projects.Add(p);
        user.OnboardingStep = 2;
        await db.SaveChangesAsync();

        return Ok(Mapper.ProjectList(p));
    }

    [HttpPost("onboarding/complete")]
    [HttpPost("api/onboarding/complete")]
    public async Task<IActionResult> Complete()
    {
        var user = await db.Users.Include(u => u.Workspace).FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return NotFound();

        user.Onboarded = true;
        user.OnboardingStep = 4;
        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            user = new { user.Id, user.Email, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep },
            workspace = Mapper.Workspace(user.Workspace)
        });
    }
}
