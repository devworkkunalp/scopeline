using System.Globalization;
using System.Text.RegularExpressions;
using LedgerAndField.Api.Models;

namespace LedgerAndField.Api.Services;

public class HeuristicAnalyzer
{
    private static readonly Regex Money = new(@"\$?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?", RegexOptions.Compiled);
    private static readonly Regex Date = new(@"\b(?:\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public ContractRecord ExtractContract(string text, decimal projectValue)
    {
        var lower = text.ToLowerInvariant();
        return new ContractRecord
        {
            Uploaded = true,
            ExtractedRawText = Truncate(text, 50000),
            OriginalScope = FirstParagraph(text, "scope of work", "original scope", "work includes") ?? Truncate(text, 400),
            ContractValueText = FindMoneyLine(text) ?? $"{projectValue:C} (from project record)",
            ExclusionsAllowances = FindSection(text, "exclusion", "allowance", "not included"),
            PaymentTerms = FindSection(text, "payment", "net 30", "pay application", "invoice"),
            ChangeVariationRules = FindSection(text, "change order", "variation", "written change"),
            NoticePeriods = FindSection(text, "notice", "claim", "days of the event", "deadline"),
            CommercialClauses = FindSection(text, "differing site", "acceleration", "rework", "force majeure", "§")
        };
    }

    public List<OpportunityDraft> Detect(ContractRecord? contract, IReadOnlyList<(string fileName, string text)> docs)
    {
        var results = new List<OpportunityDraft>();
        foreach (var (fileName, text) in docs)
        {
            if (string.IsNullOrWhiteSpace(text)) continue;
            foreach (var sentence in SplitSentences(text))
            {
                var hit = Classify(sentence);
                if (hit is null) continue;
                var amount = ParseAmount(sentence);
                var clause = PickClause(contract, hit.Value.type);
                results.Add(new OpportunityDraft(
                    hit.Value.type,
                    Truncate(sentence, 90),
                    sentence.Trim(),
                    amount * 0.7m,
                    amount,
                    hit.Value.confidence,
                    clause,
                    sentence.Trim(),
                    fileName,
                    Date.Match(sentence).Value
                ));
            }
        }

        return results
            .GroupBy(r => Normalize(r.Title))
            .Select(g => g.OrderByDescending(x => x.Confidence).First())
            .Take(12)
            .ToList();
    }

    public string Answer(string question, Project project)
    {
        var q = question.ToLowerInvariant();
        var opps = project.Opportunities.ToList();
        if (q.Contains("unbilled") || (q.Contains("approved") && q.Contains("invoice")))
        {
            var rows = opps.Where(o => o.Status is "approved" or "change-order" && o.BillableValue - o.InvoicedValue > 0).ToList();
            if (rows.Count == 0) return "No approved opportunities currently show a gap between approved and invoiced value on this project.";
            return $"Found {rows.Count} item(s) with value not fully invoiced, totaling {rows.Sum(o => o.BillableValue - o.InvoicedValue):C0}:\n"
                   + string.Join("\n", rows.Select(o => $"• {o.Title} — {(o.BillableValue - o.InvoicedValue):C0} outstanding"));
        }
        if (q.Contains("at risk"))
        {
            var risk = opps.Where(o => o.Status == "approved").Sum(o => o.BillableValue - o.InvoicedValue);
            return risk > 0
                ? $"{project.Name}: {risk:C0} at risk (approved but not invoiced)."
                : "This project does not currently show approved-but-unbilled exposure.";
        }
        if (q.Contains("why") && q.Contains("detect"))
        {
            var o = opps.FirstOrDefault(x => x.Status != "rejected") ?? opps.FirstOrDefault();
            if (o is null) return "No opportunities have been detected yet. Upload a contract and project data, then run analysis.";
            var src = string.Join(", ", o.Evidence.Select(e => e.Source));
            return $"Take \"{o.Title}\" as an example: it was flagged because field and correspondence records describe work outside original scope, tied to {o.Clause}. Confidence {o.Confidence:P0}. Sources: {src}";
        }
        if (q.Contains("clause"))
        {
            var o = opps.FirstOrDefault(x => x.Status != "rejected") ?? opps.FirstOrDefault();
            return o is null ? "No opportunity is available to map a clause." : $"\"{o.Title}\" maps to {o.Clause}.";
        }
        var snippets = project.Documents
            .Where(d => !string.IsNullOrWhiteSpace(d.ExtractedText))
            .SelectMany(d => SplitSentences(d.ExtractedText!).Select(s => (d.FileName, s)))
            .Where(x => x.s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Any(w => q.Contains(w.ToLowerInvariant()) && w.Length > 4))
            .Take(5)
            .ToList();
        if (snippets.Count > 0)
            return "From uploaded project data:\n" + string.Join("\n", snippets.Select(s => $"• {Truncate(s.s, 180)} (SOURCE: {s.FileName})"));
        return $"Based on uploaded contract and project data for {project.Name}, I don't have a direct match. Try asking about unbilled work, revenue at risk, evidence, or applicable contract clauses.";
    }

    private static (string type, double confidence)? Classify(string sentence)
    {
        var s = sentence.ToLowerInvariant();
        if (s.Contains("accelerat") || s.Contains("weekend crew") || s.Contains("overtime")) return ("Acceleration", 0.8);
        if (s.Contains("rework") || s.Contains("tear out") || s.Contains("reinstall")) return ("Rework", 0.75);
        if (s.Contains("rfi") || s.Contains("drawing") && s.Contains("conflict") || s.Contains("design change") || s.Contains("rev.")) return ("Design Change", 0.82);
        if (s.Contains("direct") && (s.Contains("owner") || s.Contains("client") || s.Contains("engineer"))) return ("Client Instruction", 0.84);
        if (s.Contains("additional") || s.Contains("extra work") || s.Contains("out of scope") || s.Contains("not in the original")) return ("Scope Change", 0.8);
        if (s.Contains("differing site") || s.Contains("unforeseen") || s.Contains("unsuitable soil")) return ("Completed, Unbilled", 0.78);
        if (s.Contains("delay") || s.Contains("permit")) return ("Delay", 0.7);
        return null;
    }

    private static string PickClause(ContractRecord? c, string type)
    {
        var blob = string.Join(" ", new[] { c?.ChangeVariationRules, c?.CommercialClauses, c?.NoticePeriods }.Where(x => !string.IsNullOrWhiteSpace(x)));
        if (type == "Acceleration" && blob.Contains("Acceler", StringComparison.OrdinalIgnoreCase)) return FirstSentence(blob, "acceler");
        if (type is "Rework" or "Design Change" && blob.Contains("Rework", StringComparison.OrdinalIgnoreCase)) return FirstSentence(blob, "rework");
        if (blob.Contains("Differing", StringComparison.OrdinalIgnoreCase)) return FirstSentence(blob, "differing");
        if (!string.IsNullOrWhiteSpace(c?.ChangeVariationRules)) return Truncate(c!.ChangeVariationRules!, 180);
        return "Change order / variation rules from the executed contract (review extraction).";
    }

    private static string FirstSentence(string blob, string key)
    {
        foreach (var part in blob.Split(new[] { ';', '.' }, StringSplitOptions.RemoveEmptyEntries))
            if (part.Contains(key, StringComparison.OrdinalIgnoreCase)) return part.Trim();
        return Truncate(blob, 180);
    }

    private static decimal ParseAmount(string sentence)
    {
        var m = Money.Match(sentence);
        if (!m.Success) return 7500;
        var raw = m.Groups[1].Success ? m.Value : m.Value;
        raw = raw.Replace("$", "").Replace(",", "").Trim();
        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) ? Math.Max(n, 500) : 7500;
    }

    private static IEnumerable<string> SplitSentences(string text) =>
        Regex.Split(text, @"(?<=[\.!\?])\s+").Where(s => s.Length is > 40 and < 600);

    private static string? FindSection(string text, params string[] keys)
    {
        var lines = text.Split('\n');
        var hits = lines.Where(l => keys.Any(k => l.Contains(k, StringComparison.OrdinalIgnoreCase))).Take(4);
        var joined = string.Join(" ", hits).Trim();
        return string.IsNullOrWhiteSpace(joined) ? null : Truncate(joined, 500);
    }

    private static string? FindMoneyLine(string text) =>
        text.Split('\n').FirstOrDefault(l => l.Contains('$') && (l.Contains("contract", StringComparison.OrdinalIgnoreCase) || l.Contains("lump", StringComparison.OrdinalIgnoreCase) || l.Contains("sum", StringComparison.OrdinalIgnoreCase)));

    private static string? FirstParagraph(string text, params string[] keys)
    {
        var idx = keys.Select(k => text.IndexOf(k, StringComparison.OrdinalIgnoreCase)).Where(i => i >= 0).DefaultIfEmpty(-1).Min();
        if (idx < 0) return null;
        return Truncate(text[idx..], 500);
    }

    private static string Truncate(string s, int n) => s.Length <= n ? s : s[..n] + "…";
    private static string Normalize(string s) => Regex.Replace(s.ToLowerInvariant(), @"\s+", " ").Trim();
}

public record OpportunityDraft(
    string Type, string Title, string Description, decimal EstimatedCost, decimal Billable,
    double Confidence, string Clause, string EvidenceText, string EvidenceSource, string DateLabel);
