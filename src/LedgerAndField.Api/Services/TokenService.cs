using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LedgerAndField.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace LedgerAndField.Api.Services;

public class TokenService(IConfiguration config)
{
    public string Create(User user, Workspace workspace)
    {
        var key = config["Jwt:Key"] ?? "scopeline-secret-dev-key-change-before-production-deploy-2026";
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("workspaceId", workspace.Id.ToString()),
            new Claim("companyId", workspace.Id.ToString()), // backwards compat
            new Claim("name", user.DisplayName),
            new Claim("role", user.Role)
        };
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"] ?? "Scopeline",
            audience: config["Jwt:Audience"] ?? "Scopeline",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static Guid UserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    public static Guid WorkspaceId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("workspaceId") ?? user.FindFirstValue("companyId")!);

    public static Guid CompanyId(ClaimsPrincipal user) => WorkspaceId(user);
}
