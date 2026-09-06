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
public class AuthController(AppDbContext db, TokenService tokens, NotificationService notifier) : ControllerBase
{
    private readonly PasswordHasher<User> _hasher = new();
    private static readonly System.Text.RegularExpressions.Regex EmailRegex = 
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    [HttpPost("auth/signup")]
    [HttpPost("api/auth/register")]
    public async Task<ActionResult<AuthResponse>> Signup(SignupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Work email and password are required.");

        var email = req.Email.Trim().ToLowerInvariant();
        if (!EmailRegex.IsMatch(email))
            return BadRequest("Please provide a valid business email address (e.g. name@company.com).");

        if (req.Password.Length < 8)
            return BadRequest("Password must be at least 8 characters long.");

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("An account with that email address already exists. Please sign in instead.");

        var workspaceName = string.IsNullOrWhiteSpace(req.CompanyName) ? "My Company" : req.CompanyName.Trim();
        var perspective = string.IsNullOrWhiteSpace(req.Perspective) ? "vendor" : req.Perspective.Trim().ToLowerInvariant();
        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = workspaceName,
            Plan = "Team Plan · 30-Day Free Trial",
            Perspective = perspective,
            CreatedAt = DateTimeOffset.UtcNow,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(30)
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspace.Id,
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? req.Email.Split('@')[0] : req.DisplayName.Trim(),
            PhoneNumber = req.PhoneNumber?.Trim() ?? "",
            Role = perspective == "client" ? "founder" : "pm",
            Onboarded = false,
            OnboardingStep = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        db.Workspaces.Add(workspace);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Reliable notification dispatch (with 3-second safety timeout)
        try
        {
            await Task.WhenAny(
                notifier.NotifyNewSignupAsync(user.Email, user.DisplayName, workspace.Name, user.PhoneNumber, user.Role, workspace.Perspective),
                Task.Delay(3000)
            );
        }
        catch { /* Never block user registration on notification failure */ }

        var token = tokens.Create(user, workspace);
        return Ok(new AuthResponse(token, user.Email, workspace.Name, workspace.Id, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep, user.PhoneNumber, 30, workspace.Perspective));
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

        var trialDays = Math.Max(0, (int)Math.Ceiling((user.Workspace.TrialEndsAt - DateTimeOffset.UtcNow).TotalDays));
        var token = tokens.Create(user, user.Workspace);
        return Ok(new AuthResponse(token, user.Email, user.Workspace.Name, user.WorkspaceId, user.DisplayName, user.Role, user.Onboarded, user.OnboardingStep, user.PhoneNumber, trialDays, user.Workspace.Perspective ?? "vendor"));
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
