using LedgerAndField.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ContractRecord> Contracts => Set<ContractRecord>();
    public DbSet<ProjectDocument> Documents => Set<ProjectDocument>();
    public DbSet<ProjectEvent> Events => Set<ProjectEvent>();
    public DbSet<Opportunity> Opportunities => Set<Opportunity>();
    public DbSet<OpportunityEvidence> Evidence => Set<OpportunityEvidence>();
    public DbSet<OpportunityTimelineItem> Timeline => Set<OpportunityTimelineItem>();
    public DbSet<ChangeRequest> ChangeRequests => Set<ChangeRequest>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<AsyncJob> AsyncJobs => Set<AsyncJob>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>().HasIndex(u => u.Email).IsUnique();
        model.Entity<Project>()
            .HasOne(p => p.Contract)
            .WithOne(c => c.Project)
            .HasForeignKey<ContractRecord>(c => c.ProjectId);
        model.Entity<Opportunity>()
            .HasOne(o => o.ChangeRequest)
            .WithOne(c => c.Opportunity)
            .HasForeignKey<ChangeRequest>(c => c.OpportunityId);
        model.Entity<Project>().Property(p => p.ScopeValue).HasPrecision(18, 2);
        model.Entity<Opportunity>().Property(o => o.EstimatedCost).HasPrecision(18, 2);
        model.Entity<Opportunity>().Property(o => o.BillableValue).HasPrecision(18, 2);
        model.Entity<Opportunity>().Property(o => o.InvoicedValue).HasPrecision(18, 2);
        model.Entity<Invoice>().Property(i => i.Amount).HasPrecision(18, 2);
        model.Entity<Invoice>().Property(i => i.Collected).HasPrecision(18, 2);
        model.Entity<ProjectEvent>().Property(e => e.Amount).HasPrecision(18, 2);
    }
}
