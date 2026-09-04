using LedgerAndField.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Data;

public static class DemoSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var hasher = new PasswordHasher<User>();
        const string primaryEmail = "devwork.kunalp@gmail.com";

        // 1. Purge all dummy/unnecessary users from the database except devwork.kunalp@gmail.com
        var otherUsers = await db.Users.Where(u => u.Email.ToLower() != primaryEmail).ToListAsync();
        if (otherUsers.Count > 0)
        {
            var otherUserWsIds = otherUsers.Select(u => u.WorkspaceId).Distinct().ToList();

            // Find all projects belonging to other workspaces
            var otherProjects = await db.Projects
                .Include(p => p.Documents)
                .Include(p => p.Opportunities).ThenInclude(o => o.Evidence)
                .Include(p => p.Opportunities).ThenInclude(o => o.Timeline)
                .Include(p => p.Opportunities).ThenInclude(o => o.ChangeRequest)
                .Include(p => p.Invoices)
                .Include(p => p.Contract)
                .Where(p => otherUserWsIds.Contains(p.WorkspaceId))
                .ToListAsync();

            // Delete project children
            foreach (var p in otherProjects)
            {
                if (p.Documents.Count > 0) db.Documents.RemoveRange(p.Documents);
                if (p.Invoices.Count > 0) db.Invoices.RemoveRange(p.Invoices);
                if (p.Contract != null) db.Contracts.Remove(p.Contract);
                foreach (var opp in p.Opportunities)
                {
                    if (opp.Evidence.Count > 0) db.Set<OpportunityEvidence>().RemoveRange(opp.Evidence);
                    if (opp.Timeline.Count > 0) db.Set<OpportunityTimelineItem>().RemoveRange(opp.Timeline);
                    if (opp.ChangeRequest != null) db.ChangeRequests.Remove(opp.ChangeRequest);
                }
                if (p.Opportunities.Count > 0) db.Opportunities.RemoveRange(p.Opportunities);
            }

            db.Projects.RemoveRange(otherProjects);
            db.Users.RemoveRange(otherUsers);

            var otherWorkspaces = await db.Workspaces.Where(w => otherUserWsIds.Contains(w.Id)).ToListAsync();
            db.Workspaces.RemoveRange(otherWorkspaces);

            await db.SaveChangesAsync();
            Console.WriteLine($"[DB CLEANUP] Purged {otherUsers.Count} extraneous users and associated workspaces/projects.");
        }

        // 2. Ensure primary user devwork.kunalp@gmail.com exists and has clean setup
        var primaryUser = await db.Users.Include(u => u.Workspace).FirstOrDefaultAsync(u => u.Email.ToLower() == primaryEmail);
        if (primaryUser == null)
        {
            var workspaceId = Guid.NewGuid();
            var workspace = new Workspace
            {
                Id = workspaceId,
                Name = "Nimbus Digital",
                Plan = "Team Plan · 30-Day Free Trial",
                Perspective = "vendor",
                CreatedAt = DateTimeOffset.UtcNow,
                TrialEndsAt = DateTimeOffset.UtcNow.AddDays(30)
            };

            primaryUser = new User
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspaceId,
                Email = primaryEmail,
                DisplayName = "Kunal Patil",
                Role = "founder",
                Onboarded = true,
                OnboardingStep = 4,
                CreatedAt = DateTimeOffset.UtcNow
            };
            primaryUser.PasswordHash = hasher.HashPassword(primaryUser, "Demo123!");

            db.Workspaces.Add(workspace);
            db.Users.Add(primaryUser);
            await db.SaveChangesAsync();
        }

        // 3. Ensure primary user has standard benchmark project if empty
        var userProjects = await db.Projects.Where(p => p.WorkspaceId == primaryUser.WorkspaceId).ToListAsync();
        if (userProjects.Count == 0)
        {
            var p1 = Guid.NewGuid();
            var northwind = new Project
            {
                Id = p1,
                WorkspaceId = primaryUser.WorkspaceId,
                Name = "Northwind Retail — Platform Modernization",
                ClientName = "Northwind Retail Corp",
                ScopeValue = 185000,
                Currency = "USD",
                StartDate = new DateOnly(2025, 6, 1),
                EndDate = new DateOnly(2026, 1, 31),
                Status = "Active",
                CreatedAt = DateTimeOffset.UtcNow,
                Contract = new ContractRecord
                {
                    Id = Guid.NewGuid(),
                    ProjectId = p1,
                    FileName = "Northwind_SOW_v3_Signed.pdf",
                    Uploaded = true,
                    OriginalScope = "Migration of the legacy storefront to a headless commerce platform, covering 12 core modules per SOW Appendix A.",
                    ContractValueText = "$185,000 (Fixed Price)",
                    ExclusionsAllowances = "Third-party payment gateway fees; content migration beyond 500 SKUs; post-launch training beyond 2 sessions.",
                    PaymentTerms = "Net 15, milestone-based billing across 4 milestones.",
                    ChangeVariationRules = "§5 — Any request altering scope, timeline, or cost by more than $2,000 requires a written Change Request signed by both parties.",
                    NoticePeriods = "§5.2 — Vendor must submit a Change Request within 5 business days of a scope-affecting ask.",
                    CommercialClauses = "§7 Client-requested acceleration billable at 1.5x; §9 rework from vendor error not billable; §9.1 rework from client-directed change billable at standard rate."
                }
            };

            db.Projects.Add(northwind);
            await db.SaveChangesAsync();
            Console.WriteLine("[DB SEED] Benchmark project initialized for devwork.kunalp@gmail.com.");
        }
    }
}
