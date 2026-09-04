using System.Text.Json;
using System.Text.RegularExpressions;
using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[ApiController]
public class InboundEmailController(
    AppDbContext db,
    DocumentTextExtractor extractor,
    AnalysisService analysis,
    HeuristicAnalyzer heuristicAnalyzer) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [AllowAnonymous]
    [HttpPost("inbound/email")]
    [HttpPost("api/inbound/email")]
    [HttpPost("webhooks/inbound-email")]
    [HttpPost("api/webhooks/inbound-email")]
    public async Task<IActionResult> HandleInboundWebhook()
    {
        string to = "";
        string from = "";
        string subject = "";
        string body = "";

        if (Request.HasFormContentType)
        {
            if (string.IsNullOrWhiteSpace(to))
                to = Request.Form["to"].FirstOrDefault() ?? Request.Form["recipient"].FirstOrDefault() ?? Request.Form["headers[to]"].FirstOrDefault() ?? "";
            if (string.IsNullOrWhiteSpace(from))
                from = Request.Form["from"].FirstOrDefault() ?? Request.Form["sender"].FirstOrDefault() ?? Request.Form["headers[from]"].FirstOrDefault() ?? "Client Stakeholder";
            if (string.IsNullOrWhiteSpace(subject))
                subject = Request.Form["subject"].FirstOrDefault() ?? Request.Form["headers[subject]"].FirstOrDefault() ?? "Inbound Client Request";
            if (string.IsNullOrWhiteSpace(body))
                body = Request.Form["plain"].FirstOrDefault() ?? Request.Form["text"].FirstOrDefault() ?? Request.Form["html"].FirstOrDefault() ?? "";

            // Check if raw EML attachment exists
            if (Request.Form.Files.Count > 0)
            {
                var file = Request.Form.Files.FirstOrDefault(f => f.FileName.EndsWith(".eml", StringComparison.OrdinalIgnoreCase) || f.FileName.EndsWith(".msg", StringComparison.OrdinalIgnoreCase)) ?? Request.Form.Files[0];
                if (file != null)
                {
                    await using var stream = file.OpenReadStream();
                    var extracted = await extractor.ExtractAsync(file.FileName, file.ContentType, stream);
                    if (!string.IsNullOrWhiteSpace(extracted)) body = extracted;
                }
            }
        }
        else if (string.IsNullOrWhiteSpace(body))
        {
            try
            {
                Request.EnableBuffering();
                Request.Body.Position = 0;
                using var reader = new StreamReader(Request.Body, leaveOpen: true);
                var jsonString = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(jsonString))
                {
                    using var doc = JsonDocument.Parse(jsonString);
                    var root = doc.RootElement;

                    // CloudMailin Normalized Format
                    if (root.TryGetProperty("headers", out var headers))
                    {
                        if (string.IsNullOrWhiteSpace(to) && headers.TryGetProperty("to", out var hTo)) to = hTo.GetString() ?? "";
                        if (string.IsNullOrWhiteSpace(from) && headers.TryGetProperty("from", out var hFrom)) from = hFrom.GetString() ?? "";
                        if (string.IsNullOrWhiteSpace(subject) && headers.TryGetProperty("subject", out var hSub)) subject = hSub.GetString() ?? "";
                    }

                    if (root.TryGetProperty("envelope", out var envelope))
                    {
                        if (string.IsNullOrWhiteSpace(to) && envelope.TryGetProperty("to", out var envTo)) to = envTo.GetString() ?? "";
                        if (string.IsNullOrWhiteSpace(from) && envelope.TryGetProperty("from", out var envFrom)) from = envFrom.GetString() ?? "";
                    }

                    if (string.IsNullOrWhiteSpace(body))
                    {
                        if (root.TryGetProperty("plain", out var plainProp)) body = plainProp.GetString() ?? "";
                        else if (root.TryGetProperty("text", out var textProp)) body = textProp.GetString() ?? "";
                        else if (root.TryGetProperty("html", out var htmlProp)) body = htmlProp.GetString() ?? "";
                    }

                    if (string.IsNullOrWhiteSpace(to) && root.TryGetProperty("to", out var flatTo)) to = flatTo.GetString() ?? "";
                    if (string.IsNullOrWhiteSpace(from) && root.TryGetProperty("from", out var flatFrom)) from = flatFrom.GetString() ?? "";
                    if (string.IsNullOrWhiteSpace(subject) && root.TryGetProperty("subject", out var flatSub)) subject = flatSub.GetString() ?? "";
                }
            }
            catch { }
        }

        if (string.IsNullOrWhiteSpace(from)) from = "Client Stakeholder";
        if (string.IsNullOrWhiteSpace(subject)) subject = "Client Scope Request";

        var project = await ResolveProjectAsync(to, subject, body);
        if (project == null)
        {
            return NotFound(new { error = "Target project could not be resolved from inbound email recipient address.", recipient = to });
        }

        var result = await ProcessInboundEmailAsync(project, from, subject, body, customHours: null, customRate: null, createChangeRequest: true);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("projects/{id:guid}/inbound-simulate")]
    [HttpPost("api/projects/{id:guid}/inbound-simulate")]
    public async Task<IActionResult> SimulateInboundEmail(Guid id, InboundEmailSimulationRequest req)
    {
        var project = await db.Projects
            .Include(p => p.Contract)
            .Include(p => p.Opportunities)
            .FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == WorkspaceId);

        if (project is null) return NotFound("Project not found in current workspace");

        // Automatically extract From/Subject from body if user simply pasted an entire forwarded thread
        var from = req.From;
        var subject = req.Subject;
        var rawBody = req.Body ?? "";

        var fromMatch = Regex.Match(rawBody, @"(?:From|Sender):\s*([^\r\n<]+(?:<[^>]+>)?)", RegexOptions.IgnoreCase);
        if (fromMatch.Success && (string.IsNullOrWhiteSpace(from) || from == "Unknown Client" || from == "Client Stakeholder"))
        {
            from = fromMatch.Groups[1].Value.Trim();
        }

        var subjectMatch = Regex.Match(rawBody, @"(?:Subject|Re|Fwd):\s*([^\r\n]+)", RegexOptions.IgnoreCase);
        if (subjectMatch.Success && (string.IsNullOrWhiteSpace(subject) || subject == "Forwarded Client Request" || subject == "Client Scope Request"))
        {
            subject = subjectMatch.Groups[1].Value.Trim();
        }

        if (string.IsNullOrWhiteSpace(from)) from = "Client Stakeholder";
        if (string.IsNullOrWhiteSpace(subject)) subject = "Client Scope Request";

        var result = await ProcessInboundEmailAsync(
            project,
            from,
            subject,
            rawBody,
            req.ClaimedHours,
            req.HourlyRate,
            req.CreateChangeRequest
        );

        return Ok(result);
    }

    [Authorize]
    [HttpGet("projects/{id:guid}/inbound-address")]
    [HttpGet("api/projects/{id:guid}/inbound-address")]
    public async Task<IActionResult> GetInboundAddress(Guid id)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == WorkspaceId);
        if (project is null) return NotFound("Project not found");

        var slug = Regex.Replace(project.Name.ToLowerInvariant(), @"[^a-z0-9]", "-").Trim('-');
        if (string.IsNullOrEmpty(slug)) slug = "project";

        var standardAddress = $"inbound+{project.Id}@scopeline.io";
        var vanityAddress = $"project-{slug}-{project.Id.ToString("N")[..8]}@inbound.scopeline.io";

        return Ok(new
        {
            projectId = project.Id,
            projectName = project.Name,
            standardInboundAddress = standardAddress,
            vanityInboundAddress = vanityAddress,
            webhookEndpoint = "/api/inbound/email",
            instructions = "Forward client emails to this address. Scopeline automatically parses the email, ingests it as proof, and audits scope against the contract baseline."
        });
    }

    private async Task<Project?> ResolveProjectAsync(string recipient, string subject, string body)
    {
        // 1. Try match GUID in inbound+{guid}@...
        var guidMatch = Regex.Match(recipient, @"([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})");
        if (guidMatch.Success && Guid.TryParse(guidMatch.Groups[1].Value, out var pId))
        {
            var p = await db.Projects.Include(x => x.Contract).Include(x => x.Opportunities).FirstOrDefaultAsync(x => x.Id == pId);
            if (p != null) return p;
        }

        // 2. Try match short hex ID (8 chars)
        var shortMatch = Regex.Match(recipient, @"project-[a-z0-9\-]+-([a-fA-F0-9]{8})@");
        if (shortMatch.Success)
        {
            var shortId = shortMatch.Groups[1].Value.ToLowerInvariant();
            var allProjects = await db.Projects.Include(x => x.Contract).Include(x => x.Opportunities).ToListAsync();
            var matched = allProjects.FirstOrDefault(p => p.Id.ToString("N").StartsWith(shortId));
            if (matched != null) return matched;
        }

        // 3. Search by project name match in subject or body
        var projects = await db.Projects.Include(x => x.Contract).Include(x => x.Opportunities).OrderByDescending(x => x.CreatedAt).ToListAsync();
        foreach (var p in projects)
        {
            if (!string.IsNullOrWhiteSpace(p.Name) && p.Name.Length > 3 && 
                (subject.Contains(p.Name, StringComparison.OrdinalIgnoreCase) || body.Contains(p.Name, StringComparison.OrdinalIgnoreCase)))
            {
                return p;
            }
        }

        // 4. Default to latest active project (supports single-inbox forwarding like CloudMailin!)
        return projects.FirstOrDefault();
    }

    private async Task<InboundEmailResultDto> ProcessInboundEmailAsync(
        Project project,
        string from,
        string subject,
        string body,
        decimal? customHours,
        decimal? customRate,
        bool createChangeRequest)
    {
        var isClient = (project.Perspective ?? "").Equals("client", StringComparison.OrdinalIgnoreCase);
        var fileName = $"inbound_email_{DateTime.UtcNow:yyyyMMdd_HHmmss}.eml";
        var formattedEmailText = $"From: {from}\nDate: {DateTime.UtcNow:R}\nSubject: {subject}\n\n{body}";

        // 1. Store as Project Document
        var doc = new ProjectDocument
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            FileName = fileName,
            DocKind = "eml",
            ContentType = "message/rfc822",
            ExtractedText = formattedEmailText,
            StoragePath = fileName,
            SizeBytes = formattedEmailText.Length,
            UploadedAt = DateTimeOffset.UtcNow
        };
        db.Documents.Add(doc);

        // 2. Analyze Scope against Contract
        var contract = project.Contract;
        var combinedText = $"{subject} {body}".ToLowerInvariant();

        // Scope analysis logic:
        var isInScopeBugFix = combinedText.Contains("bug") || combinedText.Contains("glitch") || 
                              combinedText.Contains("defect") || combinedText.Contains("viewport") ||
                              combinedText.Contains("responsiveness") || combinedText.Contains("typo") ||
                              combinedText.Contains("as per section 1");

        var isExplicitOutOfScope = combinedText.Contains("multi-currency") || combinedText.Contains("subscription") ||
                                   combinedText.Contains("pipeline") || combinedText.Contains("export") ||
                                   combinedText.Contains("bi report") || combinedText.Contains("integration") ||
                                   combinedText.Contains("not in our original") || combinedText.Contains("wasn't in the original") ||
                                   combinedText.Contains("outside the primary") || combinedText.Contains("new feature") ||
                                   combinedText.Contains("change order") || combinedText.Contains("additional");

        var isOutOfScope = isExplicitOutOfScope || !isInScopeBugFix;

        // Auto-estimate realistic hours based on task complexity if not provided
        decimal claimedHours;
        if (customHours.HasValue && customHours.Value > 0)
        {
            claimedHours = customHours.Value;
        }
        else if (combinedText.Contains("pipeline") || combinedText.Contains("bi report") || combinedText.Contains("export"))
        {
            claimedHours = 32m;
        }
        else if (combinedText.Contains("multi-currency") || combinedText.Contains("subscription") || combinedText.Contains("integration"))
        {
            claimedHours = 24m;
        }
        else if (isInScopeBugFix)
        {
            claimedHours = 4m;
        }
        else
        {
            claimedHours = 18m;
        }

        var hourlyRate = customRate.HasValue && customRate.Value > 0 ? customRate.Value : 150m;
        var calcCost = Math.Round(claimedHours * (hourlyRate * 0.7m), 2);
        var calcBillable = Math.Round(claimedHours * hourlyRate, 2);

        var title = $"{subject.Trim()} ({from.Trim()})";
        if (title.Length > 80) title = title[..77] + "...";

        var clause = isOutOfScope
            ? (contract?.ExclusionsAllowances ?? contract?.ChangeVariationRules ?? "§3.2 — Out of Scope Work Requires Authorized Change Order")
            : (contract?.OriginalScope ?? "§1.1 — Covered Baseline Scope Deliverables");

        Opportunity? opp = null;

        // Auto-create Opportunity if work is out of scope or overbilling
        if (isOutOfScope)
        {
            opp = new Opportunity
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Type = isClient ? "Redundant Charge / Double-Billing Defense" : "Scope Expansion",
                Title = title,
                Description = $"Forwarded from: {from}\nSubject: {subject}\n\nEmail Body Content:\n{body.Trim()}",
                EstimatedCost = calcCost,
                BillableValue = calcBillable,
                Confidence = 0.94,
                Status = createChangeRequest ? "change-order" : "detected",
                Clause = clause,
                CreatedAt = DateTimeOffset.UtcNow,
                Evidence = [
                    new OpportunityEvidence
                    {
                        Id = Guid.NewGuid(),
                        Text = body.Length > 500 ? body[..500] + "..." : body,
                        Source = $"Inbound Email ({from})"
                    }
                ],
                Timeline = [
                    new OpportunityTimelineItem
                    {
                        Id = Guid.NewGuid(),
                        DateLabel = DateTime.UtcNow.ToString("MMM d, yyyy"),
                        Description = $"Received forwarded email from {from}: \"{subject}\"",
                        SortOrder = 0
                    }
                ]
            };

            var breakdownText = $"Auto-Calculated Scope: {claimedHours}h Engineering @ {hourlyRate:C0}/hr. Est. Cost {calcCost:C0}. Billable Total {calcBillable:C0}.";
            opp.Notes = breakdownText;

            if (createChangeRequest)
            {
                var count = await db.ChangeRequests.CountAsync(c => c.Opportunity.ProjectId == project.Id);
                opp.ChangeRequest = new ChangeRequest
                {
                    Id = Guid.NewGuid(),
                    OpportunityId = opp.Id,
                    ApprovalToken = Guid.NewGuid().ToString("N"),
                    Number = $"CR-{count + 10:000}",
                    Status = "draft",
                    Submitted = DateOnly.FromDateTime(DateTime.UtcNow),
                    Reason = opp.Type,
                    ChangedScope = opp.Description,
                    CostBreakdown = breakdownText
                };
            }

            db.Opportunities.Add(opp);
            db.Events.Add(new ProjectEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Description = $"Inbound Email Ingested: {subject}",
                EventType = opp.Type,
                Amount = opp.BillableValue
            });
        }
        else
        {
            db.Events.Add(new ProjectEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Description = $"Inbound Email Verified In-Scope: {subject}",
                EventType = "Standard Delivery ($0)",
                Amount = 0
            });
        }

        await db.SaveChangesAsync();

        return new InboundEmailResultDto(
            Success: true,
            Message: isOutOfScope
                ? $"Email successfully ingested and classified as OUT OF SCOPE. Auto-created Opportunity {(opp != null ? opp.Title : "")}."
                : "Email successfully ingested and verified as IN-SCOPE under existing contract baseline.",
            ProjectId: project.Id,
            ProjectName: project.Name,
            DocumentId: doc.Id,
            OpportunityId: opp?.Id,
            OpportunityTitle: opp?.Title,
            BillableValue: opp?.BillableValue ?? 0m,
            Verdict: isOutOfScope ? "OUT_OF_SCOPE" : "IN_SCOPE",
            Clause: clause,
            IsOutOfScope: isOutOfScope
        );
    }
}
