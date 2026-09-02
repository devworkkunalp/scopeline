using System.Text.Json;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Services;

public class AnalysisService(AppDbContext db, OpenAiCompatibleClient ai, HeuristicAnalyzer heuristic, ILogger<AnalysisService> log)
{
    public async Task<AsyncJob> StartContractExtractionJobAsync(Guid projectId, CancellationToken ct)
    {
        var job = new AsyncJob
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            JobType = "contract_extract",
            Status = "processing",
            Progress = 10,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.AsyncJobs.Add(job);
        await db.SaveChangesAsync(ct);

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = db.Database.ProviderName != null ? db : null; // capture state
                var p = await db.Projects.Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == projectId, ct);
                if (p?.Contract != null && !string.IsNullOrWhiteSpace(p.Contract.ExtractedRawText))
                {
                    job.Progress = 40;
                    await db.SaveChangesAsync(ct);

                    await ApplyContractExtractionAsync(p.Contract, p.Contract.ExtractedRawText, p.ScopeValue, ct);
                    
                    job.Progress = 100;
                    job.Status = "completed";
                    job.CompletedAt = DateTimeOffset.UtcNow;
                    job.ResultJson = JsonSerializer.Serialize(new { p.Contract.OriginalScope, p.Contract.ContractValueText });
                    await db.SaveChangesAsync(ct);
                }
                else
                {
                    job.Status = "completed";
                    job.Progress = 100;
                    await db.SaveChangesAsync(ct);
                }
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Failed to run contract extraction job");
                job.Status = "failed";
                job.Error = ex.Message;
                job.CompletedAt = DateTimeOffset.UtcNow;
                try { await db.SaveChangesAsync(CancellationToken.None); } catch { }
            }
        }, ct);

        return job;
    }

    public async Task ApplyContractExtractionAsync(ContractRecord contract, string text, decimal projectValue, CancellationToken ct)
    {
        var fallback = heuristic.ExtractContract(text, projectValue);
        CopyTerms(fallback, contract);
        contract.ExtractedRawText = Truncate(text, 80000);
        contract.Uploaded = true;

        if (!ai.IsConfigured) return;

        var prompt = $$"""
            Extract commercial terms and scope boundaries from this project Statement of Work (SOW) / Contract. Return JSON only:
            {
              "originalScope": "",
              "contractValueText": "",
              "exclusionsAllowances": "",
              "paymentTerms": "",
              "changeVariationRules": "",
              "noticePeriods": "",
              "commercialClauses": ""
            }
            Contract text:
            {{Truncate(text, 24000)}}
            """;
        var raw = await ai.CompleteJsonAsync(
            "You extract SOW and contract commercial terms. Cite clause numbers or section headings when present. JSON only.",
            prompt, ct);
        var json = OpenAiCompatibleClient.ExtractJsonObject(raw);
        if (json is null) return;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var r = doc.RootElement;
            contract.OriginalScope = Get(r, "originalScope") ?? contract.OriginalScope;
            contract.ContractValueText = Get(r, "contractValueText") ?? contract.ContractValueText;
            contract.ExclusionsAllowances = Get(r, "exclusionsAllowances") ?? contract.ExclusionsAllowances;
            contract.PaymentTerms = Get(r, "paymentTerms") ?? contract.PaymentTerms;
            contract.ChangeVariationRules = Get(r, "changeVariationRules") ?? contract.ChangeVariationRules;
            contract.NoticePeriods = Get(r, "noticePeriods") ?? contract.NoticePeriods;
            contract.CommercialClauses = Get(r, "commercialClauses") ?? contract.CommercialClauses;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to parse contract AI JSON");
        }
    }

    public async Task<AsyncJob> StartProjectAnalysisJobAsync(Guid projectId, CancellationToken ct)
    {
        var job = new AsyncJob
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            JobType = "activity_analyze",
            Status = "processing",
            Progress = 15,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.AsyncJobs.Add(job);
        await db.SaveChangesAsync(ct);

        // Run analysis
        try
        {
            var added = await AnalyzeProjectAsync(projectId, ct);
            job.Progress = 100;
            job.Status = "completed";
            job.CompletedAt = DateTimeOffset.UtcNow;
            job.ResultJson = JsonSerializer.Serialize(new { added });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Analysis job failed");
            job.Status = "failed";
            job.Error = ex.Message;
            job.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None);
        }

        return job;
    }

    public async Task<int> AnalyzeProjectAsync(Guid projectId, CancellationToken ct)
    {
        var project = await db.Projects
            .Include(p => p.Contract)
            .Include(p => p.Documents)
            .Include(p => p.Opportunities)
            .FirstAsync(p => p.Id == projectId, ct);

        var docs = project.Documents
            .Where(d => !string.IsNullOrWhiteSpace(d.ExtractedText))
            .Select(d => (d.FileName, d.ExtractedText!))
            .ToList();

        var drafts = heuristic.Detect(project.Contract, docs);

        if (ai.IsConfigured && docs.Count > 0)
        {
            var aiDrafts = await TryAiDetect(project, docs, ct);
            if (aiDrafts.Count > 0) drafts = aiDrafts;
        }

        var existingTitles = project.Opportunities.Select(o => o.Title.ToLowerInvariant()).ToHashSet();
        var added = 0;
        foreach (var d in drafts)
        {
            if (existingTitles.Contains(d.Title.ToLowerInvariant())) continue;
            var opp = new Opportunity
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                Type = d.Type,
                Title = d.Title,
                Description = d.Description,
                EstimatedCost = Math.Round(d.EstimatedCost, 2),
                BillableValue = Math.Round(d.Billable, 2),
                Confidence = d.Confidence,
                Status = "detected",
                Clause = d.Clause,
                CreatedAt = DateTimeOffset.UtcNow,
                Evidence = [new OpportunityEvidence { Id = Guid.NewGuid(), Text = d.EvidenceText, Source = d.EvidenceSource }],
                Timeline =
                [
                    new OpportunityTimelineItem
                    {
                        Id = Guid.NewGuid(),
                        DateLabel = string.IsNullOrWhiteSpace(d.DateLabel) ? DateTime.UtcNow.ToString("MMM d, yyyy") : d.DateLabel,
                        Description = d.Description,
                        SortOrder = 0
                    }
                ]
            };
            db.Opportunities.Add(opp);

            db.Events.Add(new ProjectEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                Description = d.Description,
                EventType = d.Type,
                Amount = d.Billable
            });
            added++;
        }

        await db.SaveChangesAsync(ct);
        return added;
    }

    private async Task<List<OpportunityDraft>> TryAiDetect(Project project, List<(string FileName, string ExtractedText)> docs, CancellationToken ct)
    {
        var contract = project.Contract;
        var corpus = string.Join("\n\n", docs.Select(d => $"FILE: {d.FileName}\n{Truncate(d.ExtractedText, 4000)}"));
        var prompt = $$"""
            Compare project activity (emails, Slack/Teams chats, Jira/Linear tickets, meeting notes, change logs) against the agreed Statement of Work (SOW).
            Identify scope and revenue leakage: out-of-scope work, client instructions, extra modules, rework from client changes, delays/acceleration, completed unbilled work, approved uninvoiced items.
            Every item MUST include supporting evidence quoting the exact source file name.
            Return JSON: { "opportunities": [ { "type": "", "title": "", "description": "", "estimatedCost": 0, "billableValue": 0, "confidence": 0.0, "clause": "", "evidenceText": "", "evidenceSource": "", "dateLabel": "" } ] }

            SOW / CONTRACT:
            Scope: {{contract?.OriginalScope}}
            Value: {{contract?.ContractValueText}}
            Exclusions: {{contract?.ExclusionsAllowances}}
            Change rules: {{contract?.ChangeVariationRules}}
            Notice: {{contract?.NoticePeriods}}
            Clauses: {{contract?.CommercialClauses}}

            PROJECT ACTIVITY:
            {{Truncate(corpus, 18000)}}
            """;
        var raw = await ai.CompleteJsonAsync(
            "You are a commercial delivery lead & revenue recovery analyst. Never invent documents. JSON only. Grounded evidence is mandatory.",
            prompt, ct);
        var json = OpenAiCompatibleClient.ExtractJsonObject(raw);
        if (json is null) return [];
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("opportunities", out var arr)) return [];
            var list = new List<OpportunityDraft>();
            foreach (var item in arr.EnumerateArray())
            {
                list.Add(new OpportunityDraft(
                    Get(item, "type") ?? "Scope Change",
                    Get(item, "title") ?? "Potential extra work",
                    Get(item, "description") ?? "",
                    item.TryGetProperty("estimatedCost", out var c) && c.TryGetDecimal(out var cd) ? cd : 0,
                    item.TryGetProperty("billableValue", out var b) && b.TryGetDecimal(out var bd) ? bd : 0,
                    item.TryGetProperty("confidence", out var cf) && cf.TryGetDouble(out var cfd) ? cfd : 0.75,
                    Get(item, "clause") ?? contract?.ChangeVariationRules ?? "§5 — Change Request Process",
                    Get(item, "evidenceText") ?? "",
                    Get(item, "evidenceSource") ?? "uploaded project data",
                    Get(item, "dateLabel") ?? ""
                ));
            }
            return list.Where(x => !string.IsNullOrWhiteSpace(x.EvidenceText)).ToList();
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to parse analysis JSON");
            return [];
        }
    }

    private static void CopyTerms(ContractRecord from, ContractRecord to)
    {
        to.OriginalScope = from.OriginalScope;
        to.ContractValueText = from.ContractValueText;
        to.ExclusionsAllowances = from.ExclusionsAllowances;
        to.PaymentTerms = from.PaymentTerms;
        to.ChangeVariationRules = from.ChangeVariationRules;
        to.NoticePeriods = from.NoticePeriods;
        to.CommercialClauses = from.CommercialClauses;
    }

    private static string? Get(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static string Truncate(string s, int n) => s.Length <= n ? s : s[..n] + "…";
}
