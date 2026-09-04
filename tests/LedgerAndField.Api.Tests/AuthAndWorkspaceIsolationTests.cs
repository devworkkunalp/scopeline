using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class AuthAndWorkspaceIsolationTests
{
    private TokenService CreateTokenService()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Jwt:Key", "super_secret_test_key_for_jwt_signing_which_is_at_least_32_bytes_long_12345!"},
            {"Jwt:Issuer", "LedgerAndField.Api.Tests"},
            {"Jwt:Audience", "LedgerAndField.Clients"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
        return new TokenService(config);
    }

    [Fact]
    public void Create_IncludesRoleAndWorkspaceClaims_InJwt()
    {
        // Arrange
        var tokenService = CreateTokenService();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "founder@buyerdefense.com",
            DisplayName = "Alex Founder",
            Role = "founder"
        };
        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Buyer Defense Workspace",
            Perspective = "client"
        };

        // Act
        var tokenString = tokenService.Create(user, workspace);

        // Assert
        tokenString.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "founder");
        jwt.Claims.Should().Contain(c => c.Type == "workspaceId" && c.Value == workspace.Id.ToString());
    }
}
