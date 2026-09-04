using System.Globalization;
using System.Text.RegularExpressions;
using LedgerAndField.Api.Dtos;
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
        var opps = project.Opportunities.Where(o => o.Status != "rejected").ToList();
        var contract = project.Contract;

        // 1. Unbilled Work / Potential Revenue Gap
        if (q.Contains("unbilled") || q.Contains("potential") || q.Contains("leakage"))
        {
            var unbilledOpps = opps.Where(o => (o.BillableValue - o.InvoicedValue) > 0).ToList();
            if (unbilledOpps.Count == 0)
                return $"All identified scope additions on {project.Name} have been invoiced in full.";

            var totalUnbilled = unbilledOpps.Sum(o => o.BillableValue - o.InvoicedValue);
            var breakdown = string.Join("\n", unbilledOpps.Select(o =>
            {
                var gap = o.BillableValue - o.InvoicedValue;
                var cr = o.ChangeRequest != null ? $"[{o.ChangeRequest.Number}] " : "";
                return $"• {cr}{o.Title}: {gap:C0} unbilled ({o.Type} · Status: {o.Status.ToUpper()})";
            }));

            return $"Found {unbilledOpps.Count} unbilled items on {project.Name} totaling {totalUnbilled:C0} in recoverable revenue:\n{breakdown}\n\nRecommended Action: Export Change Order PDFs or reconcile invoices under Invoice Tracking.";
        }

        // 2. Revenue at Risk / Exposure
        if (q.Contains("risk") || q.Contains("exposure") || q.Contains("overrun"))
        {
            var activeOpps = opps.Where(o => o.Status is "detected" or "review" or "confirmed" or "change-order").ToList();
            var totalRisk = activeOpps.Sum(o => o.BillableValue - o.InvoicedValue);

            var items = string.Join("\n", activeOpps.Take(4).Select(o =>
                $"• {o.Title} — {o.BillableValue:C0} billable ({o.Confidence:P0} confidence, Clause: {o.Clause})"));

            return $"{project.Name} has {totalRisk:C0} in potential revenue at risk across {activeOpps.Count} scope items:\n{items}\n\nClient: {project.ClientName} · Base SOW: {project.ScopeValue:C0}.";
        }

        // 3. Why was this change detected?
        if (q.Contains("why") || q.Contains("detect") || q.Contains("flag") || q.Contains("reason"))
        {
            var reasons = opps.Take(3).Select(o =>
            {
                var src = string.Join(", ", o.Evidence.Select(e => e.Source));
                return $"• \"{o.Title}\" ({o.Type}):\n  Flagged with {o.Confidence:P0} confidence because client requests expand beyond base scope.\n  Governing SOW Clause: {o.Clause}\n  Evidence Sources: {src}";
            });

            return $"Scope additions on {project.Name} were detected by matching project activity (emails, meeting notes, Slack) against contract boundary clauses:\n\n{string.Join("\n\n", reasons)}";
        }

        // 4. Approved changes not invoiced
        if (q.Contains("approved") || q.Contains("change request") || q.Contains("invoice"))
        {
            var crItems = opps.Where(o => o.ChangeRequest != null || o.Status is "change-order" or "confirmed" or "approved").ToList();
            if (crItems.Count == 0)
                return $"No approved change requests currently pending invoice reconciliation on {project.Name}.";

            var totalApproved = crItems.Sum(o => o.BillableValue);
            var totalInvoiced = crItems.Sum(o => o.InvoicedValue);
            var list = string.Join("\n", crItems.Select(o =>
            {
                var cr = o.ChangeRequest != null ? o.ChangeRequest.Number : "CR-Draft";
                return $"• [{cr}] {o.Title}: Approved {o.BillableValue:C0} | Invoiced {o.InvoicedValue:C0} | Remaining Gap: {(o.BillableValue - o.InvoicedValue):C0}";
            }));

            return $"Approved Change Requests on {project.Name} ({totalApproved:C0} Total Value, {totalInvoiced:C0} Invoiced):\n{list}";
        }

        // 5. Clauses & Contract rules
        if (q.Contains("clause") || q.Contains("sow") || q.Contains("contract") || q.Contains("variation"))
        {
            var clauses = new List<string>();
            if (!string.IsNullOrWhiteSpace(contract?.OriginalScope))
                clauses.Add($"§1.0 BASE SCOPE: {Truncate(contract.OriginalScope, 140)}");
            if (!string.IsNullOrWhiteSpace(contract?.ExclusionsAllowances))
                clauses.Add($"§2.0 EXCLUSIONS: {Truncate(contract.ExclusionsAllowances, 140)}");
            if (!string.IsNullOrWhiteSpace(contract?.ChangeVariationRules))
                clauses.Add($"§3.0 VARIATION RATE: {Truncate(contract.ChangeVariationRules, 140)}");
            if (!string.IsNullOrWhiteSpace(contract?.PaymentTerms))
                clauses.Add($"§4.0 PAYMENT TERMS: {Truncate(contract.PaymentTerms, 140)}");

            return $"Applicable Statement of Work (SOW) terms for {project.Name}:\n\n" + string.Join("\n\n", clauses);
        }

        // 6. Direct document search fallback
        var keywords = q.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 3).Select(w => w.ToLowerInvariant()).ToList();
        var matches = project.Documents
            .Where(d => !string.IsNullOrWhiteSpace(d.ExtractedText))
            .SelectMany(d => SplitSentences(d.ExtractedText!).Select(s => (d.FileName, s)))
            .Where(x => keywords.Any(k => x.s.ToLowerInvariant().Contains(k)))
            .Take(4)
            .ToList();

        if (matches.Count > 0)
            return $"Relevant evidence extracted from {project.Name} documents:\n" + string.Join("\n", matches.Select(m => $"• \"{Truncate(m.s, 160)}\" (Source: {m.FileName})"));

        return $"Based on the SOW and {opps.Count} detected opportunities for {project.Name} (Client: {project.ClientName}):\n• Total Project Value: {project.ScopeValue:C0}\n• Recoverable Unbilled Exposure: {opps.Sum(o => o.BillableValue - o.InvoicedValue):C0}\n\nTry asking about unbilled work, change requests, evidence sources, or SOW exclusions.";
    }

    public DefenseLetterResponse GenerateDefenseLetter(Project project, Opportunity opp, DefenseLetterRequest? req)
    {
        var perspective = (req?.Perspective ?? project.Perspective ?? "vendor").ToLowerInvariant();
        var isClient = perspective == "client";
        var tone = (req?.Tone ?? "diplomatic").ToLowerInvariant();
        var contract = project.Contract;
        var amount = opp.BillableValue;
        var crNum = opp.ChangeRequest?.Number ?? "CR-Draft";

        var recipient = !string.IsNullOrWhiteSpace(req?.RecipientName)
            ? req.RecipientName.Trim()
            : (!string.IsNullOrWhiteSpace(req?.VendorName)
                ? req.VendorName.Trim()
                : (isClient ? "Vendor Project Lead" : (project.ClientName ?? "Client Representative")));

        var recipientTitle = !string.IsNullOrWhiteSpace(req?.RecipientTitle)
            ? req.RecipientTitle.Trim()
            : (isClient ? "Vendor Account Manager" : "Project Sponsor / Procurement Lead");

        var sowRef = !string.IsNullOrWhiteSpace(opp.Clause)
            ? opp.Clause
            : (isClient ? (contract?.OriginalScope != null ? "§1.0 Baseline Scope of Deliverables" : "Executed Contract Agreement")
                        : (contract?.ChangeVariationRules ?? "§4.0 Scope Variation & Change Request Terms"));

        var evidenceCitations = opp.Evidence != null && opp.Evidence.Count > 0
            ? opp.Evidence.Select(e => $"\"{e.Text}\" (Source: {e.Source})").ToArray()
            : [$"\"{opp.Description}\" (Logged Milestone Item)"];

        var evidenceText = string.Join("\n", evidenceCitations.Select(c => $"• {c}"));
        var customNotesBlock = string.IsNullOrWhiteSpace(req?.CustomNotes)
            ? ""
            : $"\n\nAdditional Commercial Context:\n{req.CustomNotes.Trim()}";

        string subject;
        string body;
        string verdict;
        string nextSteps;

        if (isClient)
        {
            // Buyer Shield / Client Perspective (Disputing an unjustified vendor surcharge or confirming baseline)
            var isExclusion = (opp.Clause ?? "").Contains("Exclusion", StringComparison.OrdinalIgnoreCase) || (opp.Clause ?? "").Contains("§2", StringComparison.OrdinalIgnoreCase);
            verdict = isExclusion ? "VALIDATED_VARIATION" : "CHALLENGE_OVERBILLING";

            if (verdict == "CHALLENGE_OVERBILLING")
            {
                if (tone == "firm_contractual")
                {
                    subject = $"FORMAL CONTRACTUAL NOTICE: Rejection of Unauthorized Surcharge — {opp.Title} [{project.Name}]";
                    body = $"""
                        Dear {recipient} ({recipientTitle}),

                        RE: FORMAL SCOPE DISPUTE & CHARGE REJECTION — {opp.Title} ({amount:C0})
                        PROJECT: {project.Name} | CONTRACT SUM: {project.ScopeValue:C0}

                        Please be formally advised that the proposed supplementary charge of {amount:C0} for "{opp.Title}" is hereby REJECTED under the terms of our executed Statement of Work.

                        1. CONTRACTUAL GROUNDING & BASELINE OBLIGATIONS
                        Pursuant to {sowRef}, the activities described constitute core baseline deliverables rather than an out-of-scope variation:
                        "{(contract?.OriginalScope != null ? Truncate(contract.OriginalScope, 280) : opp.Description)}"

                        2. AUDIT TRAIL & EVIDENTIARY RECORD
                        {evidenceText}

                        3. FORMAL DIRECTIVE
                        No supplementary invoicing or change order billings will be authorized for this deliverable. The vendor team is instructed to proceed with completion in accordance with the established milestone schedule and fixed-fee commercial terms.{customNotesBlock}

                        Sincerely,
                        {project.ClientName} Commercial & Procurement Operations
                        """;
                    nextSteps = "Do not authorize payment for this item. Request vendor confirmation that deliverable will proceed under the baseline fixed contract.";
                }
                else if (tone == "collaborative")
                {
                    subject = $"Milestone Scope Alignment: {opp.Title} [{project.Name}]";
                    body = $"""
                        Hi {recipient},

                        We appreciate the team's ongoing dedication to {project.Name}.

                        Regarding the recent discussion around "{opp.Title}" ({amount:C0}), we took some time to cross-reference our original Statement of Work to ensure we stay aligned on project scope.

                        Based on our agreed baseline in {sowRef}, this deliverable is already covered under the fixed contract scope:
                        "{(contract?.OriginalScope != null ? Truncate(contract.OriginalScope, 250) : opp.Description)}"

                        {evidenceText}

                        Let's ensure the team focuses effort here without adding supplementary cost friction, keeping us on track for our upcoming milestone delivery.{customNotesBlock}

                        Best regards,
                        {project.ClientName} Project Team
                        """;
                    nextSteps = "Discuss in next sprint sync to ensure vendor acknowledges baseline deliverable obligations.";
                }
                else // Diplomatic (Default)
                {
                    subject = $"Commercial Scope Review: {opp.Title} — {project.Name}";
                    body = $"""
                        Dear {recipient},

                        Thank you for submitting the change request regarding "{opp.Title}" for {amount:C0}.

                        Upon review against our executed Statement of Work for "{project.Name}" (Total Contract Sum: {project.ScopeValue:C0}), we noted that this deliverable falls under our agreed baseline commitments:
                        → Governing Reference: {sowRef}

                        Contract Scope Extract:
                        "{(contract?.OriginalScope != null ? Truncate(contract.OriginalScope, 250) : opp.Description)}"

                        Supporting Artifacts:
                        {evidenceText}

                        Because this functionality is integral to the baseline scope, it does not qualify as a billable variation under contract terms.{customNotesBlock}

                        Please confirm that delivery will proceed under the agreed milestone plan.

                        Best regards,
                        {project.ClientName} Project Management
                        """;
                    nextSteps = "Send notice to vendor lead and request formal confirmation of baseline delivery.";
                }
            }
            else
            {
                subject = $"Scope Variation Approval Notice: {opp.Title} [{project.Name}]";
                body = $"""
                    Dear {recipient},

                    We have completed our commercial review of the change request for "{opp.Title}" ({amount:C0}).

                    Our contract audit confirms that this deliverable constitutes an authorized scope addition under {sowRef}.

                    We approve proceeding with this variation under Change Order #{crNum}. Please ensure itemized invoicing references this change order number upon milestone completion.

                    Best regards,
                    {project.ClientName} Project Team
                    """;
                nextSteps = "Counter-sign the change order and monitor invoice submission for proper change order reference.";
            }
        }
        else
        {
            // Vendor / Contractor Perspective (Defending out-of-scope compensation to the client)
            verdict = "OUT_OF_SCOPE_DEFENDED";

            if (tone == "firm_contractual")
            {
                subject = $"FORMAL NOTICE: Out-of-Scope Variation & Change Authorization — {opp.Title} [{project.Name}]";
                body = $"""
                    Dear {recipient} ({recipientTitle}),

                    RE: FORMAL SOW SCOPE DEFENSE & VARIATION NOTICE — {opp.Title}
                    PROJECT: {project.Name} | PROPOSED VALUE: {amount:C0} | REF: {crNum}

                    Please be advised that the deliverable "{opp.Title}" requested during project delivery falls outside the baseline specifications established in our executed Statement of Work.

                    1. STATEMENT OF WORK BOUNDARY CLAUSE
                    Pursuant to {sowRef}, work not explicitly enumerated in the baseline specifications or falling under contractual exclusions requires written authorization:
                    "{(contract?.ExclusionsAllowances != null ? Truncate(contract.ExclusionsAllowances, 250) : "Third-party integrations, out-of-scope enhancements, and client-directed redesigns require an executed Change Order.")}"

                    2. VERIFIED CLIENT DIRECTIVE & EVIDENCE
                    {evidenceText}

                    3. COMMERCIAL VALUATION & RESOURCE IMPACT
                    • Estimated Delivery Effort: {opp.EstimatedCost:C0} (Direct Engineering & QA)
                    • Total Billable Addition: {amount:C0}
                    • Change Order Reference: {crNum}

                    In accordance with contractual notice procedures, formal authorization is required prior to deployment of these deliverables.{customNotesBlock}

                    Sincerely,
                    Contractor Commercial & Delivery Operations
                    """;
                nextSteps = "Send formal notice along with the 1-click E-Signature magic link for client signature.";
            }
            else if (tone == "collaborative")
            {
                subject = $"Scope & Delivery Options: {opp.Title} — {project.Name}";
                body = $"""
                    Hi {recipient},

                    We're making great progress on {project.Name} and are excited to support your goals with "{opp.Title}".

                    As we mapped out implementation for this feature, our delivery team confirmed that it introduces new functionality beyond our initial baseline Statement of Work ({sowRef}).

                    Here is what we've captured from our discussions:
                    {evidenceText}

                    To ensure total commercial transparency, we have prepared Change Order {crNum} ({amount:C0}).

                    Options moving forward:
                    1. Authorize Change Order {crNum} to proceed with implementation immediately.
                    2. Defer this item to a future enhancement phase to maintain the current baseline budget.{customNotesBlock}

                    Let us know what works best for your team!

                    Best regards,
                    Project Delivery Team
                    """;
                nextSteps = "Share collaborative options with client sponsor to decide between immediate change order or Phase 2 backlog.";
            }
            else // Diplomatic (Default)
            {
                subject = $"Scope Alignment & Change Order Summary: {opp.Title} [{project.Name}]";
                body = $"""
                    Dear {recipient},

                    Thank you for your partnership on {project.Name}.

                    Following up on the requested addition for "{opp.Title}", our team has conducted a commercial review against our signed Statement of Work.

                    Because this requirement adds new functionality beyond our baseline scope ({sowRef}), it is being tracked under our transparent variation process:
                    • Requested Item: {opp.Title}
                    • Contractual Basis: {sowRef}
                    • Verified Request Context:
                    {evidenceText}
                    • Commercial Value: {amount:C0} (Change Order #{crNum})

                    We have prepared a secure 1-click review portal where your team can review the 3-way grounded proof and execute the approval digitally.{customNotesBlock}

                    Please let us know if you have any questions or if you would like us to proceed with execution.

                    Best regards,
                    Project Management & Commercial Lead
                    """;
                nextSteps = "Provide the magic link to the client for digital execution via the ScopeLine Commercial Portal.";
            }
        }

        return new DefenseLetterResponse(
            Subject: subject,
            Body: body,
            SowReference: sowRef,
            ChallengeVerdict: verdict,
            DefendedAmount: amount,
            Tone: tone,
            Perspective: perspective,
            EvidenceCitations: evidenceCitations,
            SuggestedNextSteps: nextSteps
        );
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
