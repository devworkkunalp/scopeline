using LedgerAndField.Api.Models;

namespace LedgerAndField.Api.Dtos;

public static class Mapper
{
    public static object Workspace(Workspace w) => new { w.Id, w.Name, w.Plan, w.CreatedAt };
    public static object Company(Workspace w) => Workspace(w);

    public static object ProjectList(Project p) => new
    {
        p.Id,
        p.Name,
        client = p.ClientName,
        value = p.ScopeValue,
        p.Currency,
        start = p.StartDate,
        end = p.EndDate,
        p.Status,
        contractUploaded = p.Contract?.Uploaded ?? false,
        oppTotal = p.Opportunities.Sum(o => o.BillableValue),
        openCount = p.Opportunities.Count(o => o.Status is not "paid" and not "rejected"),
        atRisk = p.Opportunities.Where(o => o.Status == "approved").Sum(o => o.BillableValue - o.InvoicedValue)
    };

    public static object ProjectDetail(Project p) => new
    {
        p.Id,
        p.Name,
        client = p.ClientName,
        value = p.ScopeValue,
        p.Currency,
        start = p.StartDate,
        end = p.EndDate,
        p.Status,
        contract = p.Contract is null ? null : Contract(p.Contract),
        docs = p.Documents.OrderByDescending(d => d.UploadedAt).Select(Document),
        events = p.Events.OrderByDescending(e => e.EventDate).Select(e => new { e.Id, e.EventDate, e.Description, e.EventType, e.Amount }),
        opportunities = p.Opportunities.Select(Opportunity),
        invoices = p.Invoices.OrderByDescending(i => i.Date).Select(Invoice)
    };

    public static object Contract(ContractRecord c) => new
    {
        c.Uploaded,
        c.FileName,
        isSignedDocument = !string.IsNullOrWhiteSpace(c.StoragePath),
        sourceType = !string.IsNullOrWhiteSpace(c.StoragePath) ? "signed_document" : "ai_generated",
        originalScope = c.OriginalScope,
        contractValueText = c.ContractValueText,
        exclusionsAllowances = c.ExclusionsAllowances,
        paymentTerms = c.PaymentTerms,
        changeVariationRules = c.ChangeVariationRules,
        noticePeriods = c.NoticePeriods,
        commercialClauses = c.CommercialClauses,
        terms = new Dictionary<string, string?>
        {
            ["originalScope"] = c.OriginalScope,
            ["contractValueText"] = c.ContractValueText,
            ["exclusionsAllowances"] = c.ExclusionsAllowances,
            ["paymentTerms"] = c.PaymentTerms,
            ["changeVariationRules"] = c.ChangeVariationRules,
            ["noticePeriods"] = c.NoticePeriods,
            ["commercialClauses"] = c.CommercialClauses
        },
        extracted = c.Uploaded ? new Dictionary<string, string?>
        {
            ["Original Scope"] = c.OriginalScope,
            ["Contract Value"] = c.ContractValueText,
            ["Exclusions / Out of Scope"] = c.ExclusionsAllowances,
            ["Payment Terms"] = c.PaymentTerms,
            ["Change Request Process"] = c.ChangeVariationRules,
            ["Notice Period"] = c.NoticePeriods,
            ["Relevant Terms"] = c.CommercialClauses
        } : null
    };

    public static object Document(ProjectDocument d) => new
    {
        d.Id,
        name = d.FileName,
        type = d.DocKind,
        date = d.UploadedAt.ToString("yyyy-MM-dd"),
        size = FormatSize(d.SizeBytes),
        hasText = !string.IsNullOrWhiteSpace(d.ExtractedText)
    };

    public static object Opportunity(Opportunity o)
    {
        var cr = o.ChangeRequest;
        var crObj = cr is null ? null : new
        {
            cr.Id,
            cr.Number,
            cr.Status,
            submitted = cr.Submitted,
            approved = cr.Approved,
            cr.Reason,
            cr.ChangedScope,
            cr.CostBreakdown
        };

        return new
        {
            o.Id,
            o.ProjectId,
            projectName = o.Project?.Name,
            o.Type,
            o.Title,
            desc = o.Description,
            estCost = o.EstimatedCost,
            billable = o.BillableValue,
            invoiced = o.InvoicedValue,
            o.Confidence,
            o.Status,
            o.Clause,
            o.Notes,
            o.RejectionReason,
            evidence = o.Evidence.Select(e => new { e.Text, src = e.Source }),
            timeline = o.Timeline.OrderBy(t => t.SortOrder).Select(t => new { date = t.DateLabel, desc = t.Description }),
            changeRequest = crObj,
            changeOrder = crObj // alias for UI compatibility
        };
    }

    public static object Invoice(Invoice i) => new
    {
        i.Id,
        i.ProjectId,
        i.Number,
        date = i.Date,
        i.Amount,
        i.Collected,
        related = i.RelatedChangeOrder
    };

    public static object AsyncJob(AsyncJob j) => new
    {
        j.Id,
        j.ProjectId,
        j.JobType,
        j.Status,
        j.Progress,
        j.ResultJson,
        j.Error,
        j.CreatedAt,
        j.CompletedAt
    };

    private static string FormatSize(long bytes)
    {
        if (bytes <= 0) return "—";
        if (bytes < 1024) return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024} KB";
        return $"{bytes / (1024.0 * 1024):0.0} MB";
    }
}
