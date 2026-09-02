using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[ApiController]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    private readonly PasswordHasher<User> _hasher = new();

    [HttpPost("auth/signup")]
    [HttpPost("api/auth/register")]
    public async Task<ActionResult<AuthResponse>> Signup(SignupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");
            
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("An account with that email already exists.");

        var workspaceName = string.IsNullOrWhiteSpace(req.CompanyName) ? "My Workspace" : req.CompanyName.Trim();
        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = workspaceName,
            Plan = "Team Plan · Trial",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspace.Id,
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? req.Email.Split('@')[0] : req.DisplayName.Trim(),
            Role = "pm",
            Onboarded = false,
            OnboardingStep = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        db.Workspaces.Add(workspace);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = tokens.Create(user, workspace);
        return Ok(new AuthResponse(token, user.Email, workspace.Name, workspace.Id, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep));
    }

    [HttpPost("auth/login")]
    [HttpPost("api/auth/login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");

        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.Workspace).FirstOrDefaultAsync(u => u.Email == email);
        if (user is null) return Unauthorized("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed) return Unauthorized("Invalid email or password.");

        var token = tokens.Create(user, user.Workspace);
        return Ok(new AuthResponse(token, user.Email, user.Workspace.Name, user.WorkspaceId, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep));
    }

    [Authorize]
    [HttpPost("auth/logout")]
    [HttpPost("api/auth/logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logged out successfully" });
    }

    [Authorize]
    [HttpGet("auth/me")]
    [HttpGet("api/auth/me")]
    public async Task<ActionResult<object>> Me()
    {
        var userId = TokenService.UserId(User);
        var user = await db.Users.Include(u => u.Workspace).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound("User not found");

        return Ok(new
        {
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role,
                user.Onboarded,
                user.OnboardingStep
            },
            workspace = Mapper.Workspace(user.Workspace),
            company = Mapper.Workspace(user.Workspace) // alias
        });
    }
}
