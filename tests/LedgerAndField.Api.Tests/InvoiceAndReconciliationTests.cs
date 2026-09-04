using FluentAssertions;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LedgerAndField.Api.Tests;

public class InvoiceAndReconciliationTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task AddInvoice_PersistsInvoiceRecord_Successfully()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var workspaceId = Guid.NewGuid();
        var project = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            Name = "Enterprise Portal",
            ClientName = "Acme Corp",
            ScopeValue = 100000m
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Number = "INV-2026-001",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Amount = 25000m,
            Collected = 25000m,
            RelatedChangeOrder = "Milestone 1 Deliverables"
        };

        // Act
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        // Assert
        var saved = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoice.Id);
        saved.Should().NotBeNull();
        saved!.Amount.Should().Be(25000m);
        saved.Collected.Should().Be(25000m);
        saved.Number.Should().Be("INV-2026-001");
    }

    [Fact]
    public async Task FullReconciliation_MarksOpportunityAsPaid_AndCreatesInvoiceReceipt()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var project = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Name = "Fintech App",
            ClientName = "BankCorp",
            ScopeValue = 150000m
        };
        var cr = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            Number = "CR-001",
            Status = "approved"
        };
        var opp = new Opportunity
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Title = "Stripe Custom Terminal Integration",
            BillableValue = 5000m,
            InvoicedValue = 0m,
            Status = "approved",
            ChangeRequest = cr
        };

        db.Projects.Add(project);
        db.ChangeRequests.Add(cr);
        db.Opportunities.Add(opp);
        await db.SaveChangesAsync();

        // Act: Full reconciliation
        opp.InvoicedValue = opp.BillableValue;
        opp.Status = "paid";
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Number = $"Payment for {cr.Number}",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Amount = opp.BillableValue,
            Collected = opp.BillableValue,
            RelatedChangeOrder = cr.Number
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        // Assert
        var updatedOpp = await db.Opportunities.FindAsync(opp.Id);
        updatedOpp!.Status.Should().Be("paid");
        updatedOpp.InvoicedValue.Should().Be(5000m);

        var invoices = await db.Invoices.Where(i => i.ProjectId == project.Id).ToListAsync();
        invoices.Should().HaveCount(1);
        invoices.First().Amount.Should().Be(5000m);
    }

    [Fact]
    public async Task DeleteInvoice_RemovesInvoiceRecord()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var project = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Name = "Mobile App",
            ClientName = "Startup Inc"
        };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Number = "INV-TEMP",
            Amount = 1000m
        };
        db.Projects.Add(project);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        // Act
        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync();

        // Assert
        var count = await db.Invoices.CountAsync();
        count.Should().Be(0);
    }
}
