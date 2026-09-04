using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Models;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class ProjectsController(
    AppDbContext db,
    IFileStorage storage,
    DocumentTextExtractor extractor,
    AnalysisService analysis) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    private IQueryable<Project> Mine() =>
        db.Projects.Where(p => p.WorkspaceId == WorkspaceId);

    [HttpGet("projects")]
    [HttpGet("api/projects")]
    public async Task<IActionResult> List()
    {
        var list = await Mine()
            .Include(p => p.Contract)
            .Include(p => p.Opportunities)
            .ToListAsync();
        return Ok(list.OrderByDescending(p => p.CreatedAt).Select(Mapper.ProjectList));
    }

    [HttpPost("projects")]
    [HttpPost("api/projects")]
    public async Task<IActionResult> Create(ProjectCreateRequest req)
    {
        var p = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = WorkspaceId,
            Name = req.Name.Trim(),
            ClientName = req.ClientName.Trim(),
            ScopeValue = req.ScopeValue,
            Currency = string.IsNullOrWhiteSpace(req.Currency) ? "USD" : req.Currency,
            Perspective = string.IsNullOrWhiteSpace(req.Perspective) ? "vendor" : req.Perspective.Trim().ToLowerInvariant(),
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            Status = "Active",
            CreatedAt = DateTimeOffset.UtcNow,
            Contract = new ContractRecord { Id = Guid.NewGuid(), Uploaded = false }
        };
        p.Contract.ProjectId = p.Id;
        db.Projects.Add(p);
        await db.SaveChangesAsync();
        return Ok(Mapper.ProjectList(p));
    }

    [HttpGet("projects/{id:guid}")]
    [HttpGet("api/projects/{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var p = await Load(id);
        return p is null ? NotFound() : Ok(Mapper.ProjectDetail(p));
    }

    [HttpPatch("projects/{id:guid}")]
    [HttpPatch("api/projects/{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, ProjectPatchRequest req)
    {
        var p = await Mine().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        if (req.Name != null) p.Name = req.Name.Trim();
        if (req.ClientName != null) p.ClientName = req.ClientName.Trim();
        if (req.ScopeValue != null) p.ScopeValue = req.ScopeValue.Value;
        if (req.Currency != null) p.Currency = req.Currency;
        if (req.StartDate != null) p.StartDate = req.StartDate;
        if (req.EndDate != null) p.EndDate = req.EndDate;
        if (req.Status != null) p.Status = req.Status;
        if (req.Perspective != null) p.Perspective = req.Perspective.Trim().ToLowerInvariant();

        await db.SaveChangesAsync();
        var full = await Load(id);
        return Ok(Mapper.ProjectDetail(full!));
    }

    [HttpPost("projects/{id:guid}/opportunities/{oppId:guid}/defense-letter")]
    [HttpPost("api/projects/{id:guid}/opportunities/{oppId:guid}/defense-letter")]
    public async Task<IActionResult> GenerateDefenseLetter(Guid id, Guid oppId, DefenseLetterRequest req, [FromServices] HeuristicAnalyzer analyzer)
    {
        var p = await Mine()
            .Include(x => x.Contract)
            .Include(x => x.Opportunities).ThenInclude(o => o.ChangeRequest)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound("Project not found");

        var opp = p.Opportunities.FirstOrDefault(o => o.Id == oppId);
        if (opp is null) return NotFound("Opportunity not found");

        var (subject, body, sowRef, verdict, amt) = analyzer.GenerateDefenseLetter(p, opp, req?.VendorName, req?.CustomNotes);
        return Ok(new DefenseLetterResponse(subject, body, sowRef, verdict, amt));
    }

    [HttpGet("projects/{id:guid}/contract")]
    [HttpGet("api/projects/{id:guid}/contract")]
    public async Task<IActionResult> GetContract(Guid id)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        return p?.Contract is null ? NotFound() : Ok(Mapper.Contract(p.Contract));
    }

    [HttpPost("projects/{id:guid}/contract")]
    [HttpPost("api/projects/{id:guid}/contract")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> UploadContract(Guid id, IFormFile file)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        p.Contract ??= new ContractRecord { Id = Guid.NewGuid(), ProjectId = p.Id };
        
        await using var stream = file.OpenReadStream();
        var path = await storage.SaveAsync(p.Id, file.FileName, stream);
        await using var read = System.IO.File.OpenRead(path);
        var text = await extractor.ExtractAsync(file.FileName, file.ContentType, read);
        p.Contract.FileName = file.FileName;
        p.Contract.StoragePath = path;
        p.Contract.Uploaded = true;
        p.Contract.ExtractedRawText = text;

        await analysis.ApplyContractExtractionAsync(p.Contract, text, p.ScopeValue, HttpContext.RequestAborted);
        await db.SaveChangesAsync();
        return Ok(Mapper.Contract(p.Contract));
    }

    [HttpPost("projects/{id:guid}/contract/extract")]
    [HttpPost("api/projects/{id:guid}/contract/extract")]
    public async Task<IActionResult> ExtractContractAsync(Guid id)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        if (p?.Contract is null || !p.Contract.Uploaded) return BadRequest("Contract not uploaded");

        var job = await analysis.StartContractExtractionJobAsync(id, HttpContext.RequestAborted);
        return Ok(Mapper.AsyncJob(job));
    }

    [HttpPost("projects/{id:guid}/generate-baseline")]
    [HttpPost("api/projects/{id:guid}/generate-baseline")]
    public async Task<IActionResult> GenerateBaseline(Guid id, GenerateBaselineRequest req, [FromServices] OpenAiCompatibleClient ai)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        var val = req.ContractValue ?? p.ScopeValue;
        if (val <= 0) val = 50000m;
        p.ScopeValue = val;

        var hourly = req.HourlyRate ?? 150m;
        var preset = string.IsNullOrWhiteSpace(req.IndustryPreset) ? "Software & Web Development" : req.IndustryPreset;
        var revLimit = req.RevisionLimit ?? 2;
        var weeks = req.TimelineWeeks ?? 8;

        p.Contract ??= new ContractRecord { Id = Guid.NewGuid(), ProjectId = p.Id };
        p.Contract.FileName = $"SOW_Baseline_{(string.IsNullOrWhiteSpace(p.Name) ? "Project" : p.Name.Replace(" ", "_"))}.pdf";
        p.Contract.Uploaded = true;

        var fallbackScope = req.RequirementsText.Trim();
        var fallbackExclusions = $"1. Design revisions exceeding {revLimit} rounds after milestone sign-off.\n2. Third-party integrations or APIs not explicitly itemized in the agreed scope.\n3. Custom native mobile applications (iOS/Android).\n4. Unbudgeted legacy data enrichment, cleanup, or manual entry exceeding 1,000 records.";
        var fallbackChangeRules = $"§3 — Change Request & Variation Process: Any work exceeding agreed scope or falling under exclusions requires written approval via Change Request at the standard billing rate of ${hourly}/hour.";
        var fallbackPayment = $"Milestone 1 (25% — ${val * 0.25m:N0}): Project Kickoff & Architecture Sign-off.\nMilestone 2 (50% — ${val * 0.50m:N0}): Core Deliverables & Integration.\nMilestone 3 (25% — ${val * 0.25m:N0}): Final UAT, Launch & Handover (Net 15 days).";
        var fallbackNotice = "Client shall provide written notice of defects or requested revisions within seven (7) calendar days of milestone delivery.";
        var fallbackClauses = $"Client-directed rework billable at ${hourly}/hr; accelerated delivery requested with less than 5 days notice billable at 1.5x.";

        p.Contract.OriginalScope = fallbackScope;
        p.Contract.ContractValueText = $"${val:N0} USD (Fixed Price Milestone)";
        p.Contract.ExclusionsAllowances = fallbackExclusions;
        p.Contract.PaymentTerms = fallbackPayment;
        p.Contract.ChangeVariationRules = fallbackChangeRules;
        p.Contract.NoticePeriods = fallbackNotice;
        p.Contract.CommercialClauses = fallbackClauses;

        if (ai.IsConfigured)
        {
            var prompt = $$"""
                You are a senior commercial contracts director generating a formal Statement of Work (SOW) Baseline and protective commercial boundaries for a project based on verbal client requirements.
                
                Project: {{p.Name}} for Client {{p.ClientName}}
                Contract Price: ${{val:N0}} USD
                Standard Variation Rate: ${{hourly}}/hr
                Industry Preset: {{preset}}
                Revision Limit: {{revLimit}} rounds
                Timeline: {{weeks}} weeks
                
                VERBAL / INFORMAL REQUIREMENTS FROM CLIENT:
                {{req.RequirementsText}}

                Generate a comprehensive, protective SOW baseline AND a commercial effort forecast with upcoming upsell/expansion opportunities.
                
                Return JSON only with this exact structure:
                {
                  "originalScope": "Structured, bulleted breakdown of the in-scope deliverables agreed for the base price",
                  "contractValueText": "${{val:N0}} USD (Fixed Price Milestone)",
                  "estimatedHours": 240,
                  "hoursBreakdown": "Architecture & Specs: 35 hrs | Core UI/Frontend: 85 hrs | Backend & API Integrations: 80 hrs | QA & UAT: 40 hrs",
                  "recommendedTimelineWeeks": {{weeks}},
                  "exclusionsAllowances": "4 to 6 specific, protective out-of-scope exclusions tailored to {{preset}} (e.g. revisions > {{revLimit}}, unlisted 3rd party APIs, mobile apps, unbudgeted data migration, ongoing maintenance)",
                  "paymentTerms": "Structured 3 or 4 stage milestone schedule with percentages and dollar figures",
                  "changeVariationRules": "Formal change control clause stating written Change Request signed by both parties is required at ${{hourly}}/hr standard rate",
                  "noticePeriods": "7 calendar days written notice period for milestone acceptance or defect notice",
                  "commercialClauses": "Key commercial terms: client rework at standard rate, acceleration terms, UAT duration",
                  "futureOpportunities": [
                    {
                      "title": "Phase 2: Native iOS / Android Mobile Application",
                      "estHours": 120,
                      "billableValue": 18000,
                      "whyClientWillAsk": "Once web storefront launches, client will require push notifications and mobile biometric checkout.",
                      "opportunityType": "Expansion / Phase 2"
                    },
                    {
                      "title": "Advanced Subscription Engine & Recurring Billing (Recharge)",
                      "estHours": 50,
                      "billableValue": 7500,
                      "whyClientWillAsk": "Client marketing will want recurring subscription bundles after initial checkout launch.",
                      "opportunityType": "Out-of-Scope Integration"
                    },
                    {
                      "title": "Automated Multi-Location Inventory & ERP Sync",
                      "estHours": 40,
                      "billableValue": 6000,
                      "whyClientWillAsk": "High sales volume will require real-time warehouse sync beyond base batch import.",
                      "opportunityType": "Technical Expansion"
                    }
                  ]
                }
                """;

            var raw = await ai.CompleteJsonAsync(
                "You generate formal SOW contract baselines, effort estimations, and upcoming billing opportunity forecasts from informal requirements. JSON only.",
                prompt);

            var json = OpenAiCompatibleClient.ExtractJsonObject(raw);
            if (!string.IsNullOrWhiteSpace(json))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var r = doc.RootElement;
                    if (r.TryGetProperty("originalScope", out var os) && os.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.OriginalScope = os.GetString();
                    if (r.TryGetProperty("exclusionsAllowances", out var ex) && ex.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.ExclusionsAllowances = ex.GetString();
                    if (r.TryGetProperty("paymentTerms", out var pt) && pt.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.PaymentTerms = pt.GetString();
                    if (r.TryGetProperty("changeVariationRules", out var cr) && cr.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.ChangeVariationRules = cr.GetString();
                    if (r.TryGetProperty("noticePeriods", out var np) && np.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.NoticePeriods = np.GetString();
                    if (r.TryGetProperty("commercialClauses", out var cc) && cc.ValueKind == System.Text.Json.JsonValueKind.String)
                        p.Contract.CommercialClauses = cc.GetString();
                }
                catch { }
            }
        }

        p.Contract.ExtractedRawText = $"STATEMENT OF WORK BASELINE\nProject: {p.Name}\nClient: {p.ClientName}\nValue: {p.Contract.ContractValueText}\n\n1. SCOPE:\n{p.Contract.OriginalScope}\n\n2. EXCLUSIONS:\n{p.Contract.ExclusionsAllowances}\n\n3. CHANGE CONTROL:\n{p.Contract.ChangeVariationRules}\n\n4. PAYMENT TERMS:\n{p.Contract.PaymentTerms}\n\n5. NOTICE PERIODS:\n{p.Contract.NoticePeriods}\n\n6. CLAUSES:\n{p.Contract.CommercialClauses}";

        await db.SaveChangesAsync();
        return Ok(Mapper.Contract(p.Contract));
    }

    [HttpGet("projects/{id:guid}/documents")]
    [HttpGet("api/projects/{id:guid}/documents")]
    public async Task<IActionResult> GetDocuments(Guid id)
    {
        if (!await Mine().AnyAsync(x => x.Id == id)) return NotFound();
        var docs = await db.Documents.Where(d => d.ProjectId == id).ToListAsync();
        return Ok(docs.OrderByDescending(d => d.UploadedAt).Select(Mapper.Document));
    }

    [HttpGet("projects/{id:guid}/events")]
    [HttpGet("api/projects/{id:guid}/events")]
    public async Task<IActionResult> GetEvents(Guid id)
    {
        if (!await Mine().AnyAsync(x => x.Id == id)) return NotFound();
        var events = await db.Events.Where(e => e.ProjectId == id).ToListAsync();
        return Ok(events.OrderByDescending(e => e.EventDate).Select(e => new { e.Id, e.EventDate, e.Description, e.EventType, e.Amount }));
    }

    [HttpPost("projects/{id:guid}/documents")]
    [HttpPost("api/projects/{id:guid}/documents")]
    [RequestSizeLimit(80_000_000)]
    public async Task<IActionResult> UploadDocuments(Guid id, List<IFormFile> files)
    {
        var p = await Mine().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        foreach (var file in files)
        {
            await using var stream = file.OpenReadStream();
            var path = await storage.SaveAsync(p.Id, file.FileName, stream);
            await using var read = System.IO.File.OpenRead(path);
            var text = await extractor.ExtractAsync(file.FileName, file.ContentType, read);
            db.Documents.Add(new ProjectDocument
            {
                Id = Guid.NewGuid(),
                ProjectId = p.Id,
                FileName = file.FileName,
                ContentType = file.ContentType,
                DocKind = extractor.KindFromName(file.FileName),
                SizeBytes = file.Length,
                StoragePath = path,
                ExtractedText = text,
                UploadedAt = DateTimeOffset.UtcNow
            });
        }
        await db.SaveChangesAsync();
        var docs = await db.Documents.Where(d => d.ProjectId == id).ToListAsync();
        return Ok(docs.OrderByDescending(d => d.UploadedAt).Select(Mapper.Document));
    }

    [HttpDelete("projects/{id:guid}/documents/{docId:guid}")]
    [HttpDelete("api/projects/{id:guid}/documents/{docId:guid}")]
    public async Task<IActionResult> DeleteDocument(Guid id, Guid docId)
    {
        var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == docId && d.ProjectId == id && d.Project.WorkspaceId == WorkspaceId);
        if (doc is null) return NotFound();

        db.Documents.Remove(doc);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("projects/{id:guid}/analyze")]
    [HttpPost("api/projects/{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id)
    {
        if (!await Mine().AnyAsync(x => x.Id == id)) return NotFound();
        var job = await analysis.StartProjectAnalysisJobAsync(id, HttpContext.RequestAborted);
        return Ok(Mapper.AsyncJob(job));
    }

    [HttpGet("projects/{id:guid}/opportunities")]
    [HttpGet("api/projects/{id:guid}/opportunities")]
    public async Task<IActionResult> Opportunities(Guid id, [FromQuery] string? status)
    {
        var q = db.Opportunities
            .Where(o => o.ProjectId == id && o.Project.WorkspaceId == WorkspaceId)
            .Include(o => o.Evidence)
            .Include(o => o.Timeline)
            .Include(o => o.ChangeRequest)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            q = q.Where(o => o.Status == status);

        var list = await q.ToListAsync();
        return Ok(list.OrderByDescending(o => o.CreatedAt).Select(Mapper.Opportunity));
    }

    [HttpGet("projects/{id:guid}/change-requests")]
    [HttpGet("api/projects/{id:guid}/change-requests")]
    public async Task<IActionResult> ChangeRequests(Guid id)
    {
        var list = await db.ChangeRequests
            .Include(c => c.Opportunity).ThenInclude(o => o.Evidence)
            .Include(c => c.Opportunity).ThenInclude(o => o.Project)
            .Where(c => c.Opportunity.ProjectId == id && c.Opportunity.Project.WorkspaceId == WorkspaceId)
            .ToListAsync();
        return Ok(list.Select(c => Mapper.Opportunity(c.Opportunity)));
    }

    [HttpGet("projects/{id:guid}/invoices")]
    [HttpGet("api/projects/{id:guid}/invoices")]
    public async Task<IActionResult> Invoices(Guid id)
    {
        var list = await db.Invoices
            .Where(i => i.ProjectId == id && i.Project.WorkspaceId == WorkspaceId)
            .OrderByDescending(i => i.Date)
            .ToListAsync();
        return Ok(list.Select(Mapper.Invoice));
    }

    [HttpPost("projects/{id:guid}/invoices")]
    [HttpPost("api/projects/{id:guid}/invoices")]
    public async Task<IActionResult> AddInvoice(Guid id, InvoiceCreateRequest req)
    {
        if (!await Mine().AnyAsync(x => x.Id == id)) return NotFound();
        var inv = new Invoice
        {
            Id = Guid.NewGuid(),
            ProjectId = id,
            Number = req.Number,
            Date = req.Date,
            Amount = req.Amount,
            Collected = req.Collected,
            RelatedChangeOrder = req.RelatedChangeOrder
        };
        db.Invoices.Add(inv);
        await TryMatchInvoice(id, inv);
        await db.SaveChangesAsync();
        return Ok(Mapper.Invoice(inv));
    }

    [HttpPatch("projects/{id:guid}/invoices/{invoiceId:guid}")]
    [HttpPatch("api/projects/{id:guid}/invoices/{invoiceId:guid}")]
    public async Task<IActionResult> UpdateInvoice(Guid id, Guid invoiceId, [FromBody] InvoiceCreateRequest req)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == id && i.Project.WorkspaceId == WorkspaceId);
        if (inv is null) return NotFound();
        if (req.Amount > 0) inv.Amount = req.Amount;
        if (req.Collected >= 0) inv.Collected = req.Collected;
        if (!string.IsNullOrWhiteSpace(req.Number)) inv.Number = req.Number;
        if (!string.IsNullOrWhiteSpace(req.RelatedChangeOrder)) inv.RelatedChangeOrder = req.RelatedChangeOrder;
        await db.SaveChangesAsync();
        return Ok(Mapper.Invoice(inv));
    }

    [HttpDelete("projects/{id:guid}/invoices/{invoiceId:guid}")]
    [HttpDelete("api/projects/{id:guid}/invoices/{invoiceId:guid}")]
    public async Task<IActionResult> DeleteInvoice(Guid id, Guid invoiceId)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == id && i.Project.WorkspaceId == WorkspaceId);
        if (inv is null) return NotFound();
        db.Invoices.Remove(inv);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("projects/{id:guid}/invoicing/summary")]
    [HttpGet("api/projects/{id:guid}/invoicing/summary")]
    public async Task<IActionResult> InvoicingSummary(Guid id)
    {
        var p = await Mine()
            .Include(x => x.Opportunities).ThenInclude(o => o.ChangeRequest)
            .Include(x => x.Invoices)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        var approvedOpps = p.Opportunities.Where(o => o.Status is "approved" or "invoiced" or "paid" && o.ChangeRequest != null).ToList();
        var approvedVal = approvedOpps.Sum(o => o.BillableValue);
        var invoicedVal = approvedOpps.Sum(o => o.InvoicedValue);
        var unbilledGap = Math.Max(0, approvedVal - invoicedVal);

        return Ok(new
        {
            approvedValue = approvedVal,
            invoicedValue = invoicedVal,
            unbilledGap,
            opportunities = approvedOpps.Select(Mapper.Opportunity),
            invoices = p.Invoices.OrderByDescending(i => i.Date).Select(Mapper.Invoice)
        });
    }

    [HttpPost("projects/{id:guid}/assistant/query")]
    [HttpPost("api/projects/{id:guid}/assistant")]
    public async Task<IActionResult> Assistant(Guid id, AssistantRequest req, [FromServices] HeuristicAnalyzer heuristic, [FromServices] OpenAiCompatibleClient ai)
    {
        var p = await db.Projects
            .Include(x => x.Contract)
            .Include(x => x.Documents)
            .Include(x => x.Opportunities).ThenInclude(o => o.Evidence)
            .Include(x => x.Opportunities).ThenInclude(o => o.ChangeRequest)
            .Include(x => x.Invoices)
            .FirstOrDefaultAsync(x => x.Id == id && x.WorkspaceId == WorkspaceId);
        if (p is null) return NotFound();

        var question = req.Question ?? req.Query ?? "";
        var fallback = heuristic.Answer(question, p);
        var sources = string.Join(", ", p.Opportunities.SelectMany(o => o.Evidence.Select(e => e.Source)).Distinct().Take(8));

        if (ai.IsConfigured)
        {
            var context = $"""
                Workspace project: {p.Name} for {p.ClientName}, scope value {p.ScopeValue:C0}.
                SOW terms: {p.Contract?.OriginalScope} | {p.Contract?.ChangeVariationRules} | {p.Contract?.CommercialClauses}
                Opportunities:
                {string.Join("\n", p.Opportunities.Select(o => $"{o.Title} [{o.Status}] {o.Type} billable {o.BillableValue} invoiced {o.InvoicedValue} clause {o.Clause} evidence {string.Join("; ", o.Evidence.Select(e => e.Source))}"))}
                Invoices: {string.Join(", ", p.Invoices.Select(i => $"{i.Number} {i.Amount} related {i.RelatedChangeOrder}"))}
                Question: {question}
                Answer strictly based on this data. If citing sources, name the files.
                """;
            var raw = await ai.CompleteJsonAsync(
                "You are the Scopeline project assistant. Answer scope, evidence, exposure and billing questions based only on project data.",
                context);
            if (!string.IsNullOrWhiteSpace(raw))
                return Ok(new { text = raw, ev = sources });
        }

        return Ok(new { text = fallback, ev = sources });
    }

    private async Task TryMatchInvoice(Guid projectId, Invoice inv)
    {
        if (string.IsNullOrWhiteSpace(inv.RelatedChangeOrder) || inv.RelatedChangeOrder == "—") return;
        var opps = await db.Opportunities.Include(o => o.ChangeRequest)
            .Where(o => o.ProjectId == projectId && o.ChangeRequest != null)
            .ToListAsync();
        var match = opps.FirstOrDefault(o => inv.RelatedChangeOrder!.Contains(o.ChangeRequest!.Number, StringComparison.OrdinalIgnoreCase));
        if (match is null) return;
        match.InvoicedValue += inv.Amount;
        if (match.InvoicedValue >= match.BillableValue && match.Status is "approved" or "change-order")
            match.Status = inv.Collected > 0 ? "paid" : "invoiced";
    }

    [HttpPost("projects/{id:guid}/check-scope")]
    [HttpPost("api/projects/{id:guid}/check-scope")]
    public async Task<IActionResult> CheckScope(Guid id, CheckScopeRequest req, [FromServices] OpenAiCompatibleClient ai)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        var hourly = req.HourlyRate ?? 150m;
        var estHours = req.EstimatedHours ?? 25m;
        var calcCost = estHours * hourly * 0.7m;
        var calcBillable = estHours * hourly;

        var cleanTitle = (req.Title ?? "").Trim();
        var cleanDesc = (req.Description ?? "").Trim();
        var combined = $"{cleanTitle} {cleanDesc}".ToLowerInvariant();

        // Detect placeholder / negative cases / trivial inputs like "NA", "N/A", "none", "nil", "nothing", etc.
        var isTrivial = cleanTitle.Length < 4 || 
            new[] { "na", "n/a", "none", "nil", "nothing", "no changes", "no change", "all good", "as is", "null" }
            .Any(token => cleanTitle.Equals(token, StringComparison.OrdinalIgnoreCase) || 
                          cleanDesc.Equals(token, StringComparison.OrdinalIgnoreCase) ||
                          combined.Contains($"ask / decision:\n{token}") ||
                          combined.Contains($"ask / decision:\r\n{token}"));

        if (isTrivial)
        {
            return Ok(new
            {
                verdict = "IN_SCOPE",
                type = "No Scope Change",
                clause = "§1.0 Baseline Scope (Standard Delivery)",
                reasoning = "No actionable scope addition or new requirement was detected in these notes (placeholder / standard routine update). No Change Request is warranted.",
                estimatedCost = 0m,
                billableValue = 0m,
                confidence = 0.99,
                isOutOfScope = false,
                title = req.Title,
                description = req.Description,
                source = req.Source ?? "Routine Meeting Standup"
            });
        }

        var isClient = (p.Perspective ?? "").Equals("client", StringComparison.OrdinalIgnoreCase);
        var contract = p.Contract;
        var fallbackVerdict = isClient ? "CHALLENGE_OVERBILLING" : "OUT_OF_SCOPE";
        var fallbackReasoning = isClient
            ? "The vendor's claim overlaps with baseline deliverables defined in Section 1.0 of the Statement of Work."
            : "This requirement adds functionality not explicitly specified in the baseline Statement of Work deliverables.";
        var fallbackClause = contract?.ChangeVariationRules ?? "§3 — Change Request & Variation Process";

        if (ai.IsConfigured)
        {
            var systemPrompt = isClient
                ? "You are an expert commercial contract auditor and buyer advocate defending the client/founder against vendor overbilling and double-charging. JSON only."
                : "You are an expert commercial project manager evaluating SOW scope boundaries for an agency/service provider. JSON only.";

            var prompt = isClient
                ? $$"""
                    Compare this incoming vendor change order claim or supplementary invoice against the signed Statement of Work (SOW).
                    
                    Determine if this vendor claim is:
                    1. "CHALLENGE_OVERBILLING" — The vendor is attempting to charge for deliverables, features, bug fixes, or performance SLAs that are ALREADY INCLUDED in the baseline SOW (Section 1.0) or covered under the 90-day defect warranty (Section 5.0). E.g. Faceted category filters, search bars, responsive layout, or defect fixes.
                    2. "VALID_VARIATION" — Legitimate new scope explicitly excluded under Section 2.0 (e.g. ERP integration).
                    3. "AMBIGUOUS" — Needs clarification.

                    Return JSON only:
                    {
                      "verdict": "CHALLENGE_OVERBILLING" | "VALID_VARIATION" | "AMBIGUOUS",
                      "type": "Redundant Charge / Double-Billing Defense" | "Contractual Defect Warranty" | "Legitimate Excluded Variation",
                      "clause": "Cite the exact SOW section protecting the client (e.g. §1.2 Search & Filters or §5.1 Warranty)",
                      "reasoning": "Clear contract-grounded explanation why the client must challenge this vendor charge or approve it",
                      "estimatedCost": {{calcCost}},
                      "billableValue": {{calcBillable}},
                      "confidence": 0.95
                    }

                    SOW BASELINE / VENDOR CONTRACT:
                    Included Deliverables: {{contract?.OriginalScope}}
                    Exclusions: {{contract?.ExclusionsAllowances}}
                    Change Rules: {{contract?.ChangeVariationRules}}
                    Warranty & Terms: {{contract?.CommercialClauses}}
                    Raw Text: {{contract?.ExtractedRawText}}

                    INCOMING VENDOR CLAIM:
                    Title: {{req.Title}}
                    Description: {{req.Description}}
                    Source: {{req.Source}}
                    """
                : $$"""
                    Compare this incoming client request or meeting requirement against the signed Statement of Work (SOW).
                    Determine if this requirement is:
                    1. "OUT_OF_SCOPE" — Extra work, excluded item, additional design iteration, or new feature that warrants an additional billable Change Request.
                    2. "IN_SCOPE" — Already covered in the base SOW deliverables, standard bug fix, or routine status update with no new scope.
                    3. "AMBIGUOUS" — Needs clarification from the client.

                    If the request is blank, placeholder (NA/None), or trivial routine conversation, mark it "IN_SCOPE" with $0 billableValue.

                    Return JSON only:
                    {
                      "verdict": "OUT_OF_SCOPE" | "IN_SCOPE" | "AMBIGUOUS",
                      "type": "Scope Expansion" | "Excluded Deliverable" | "Extra Revision" | "Technical Integration" | "Base Deliverable" | "No Scope Change",
                      "clause": "e.g. §2 Exclusions or §3 Change Process",
                      "reasoning": "Clear explanation citing why it is or isn't covered by SOW",
                      "estimatedCost": {{calcCost}},
                      "billableValue": {{calcBillable}},
                      "confidence": 0.90
                    }

                    SOW / CONTRACT:
                    Scope: {{contract?.OriginalScope}}
                    Exclusions: {{contract?.ExclusionsAllowances}}
                    Change Rules: {{contract?.ChangeVariationRules}}
                    Terms: {{contract?.CommercialClauses}}
                    Raw Text: {{contract?.ExtractedRawText}}

                    INCOMING CLIENT ASK:
                    Title: {{req.Title}}
                    Description: {{req.Description}}
                    Source: {{req.Source}}
                    """;

            var raw = await ai.CompleteJsonAsync(systemPrompt, prompt);
            var json = OpenAiCompatibleClient.ExtractJsonObject(raw);
            if (!string.IsNullOrWhiteSpace(json))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var r = doc.RootElement;
                    var verd = r.TryGetProperty("verdict", out var v) ? v.GetString() : fallbackVerdict;
                    var isOut = isClient ? (verd == "CHALLENGE_OVERBILLING") : (verd == "OUT_OF_SCOPE");
                    var billVal = r.TryGetProperty("billableValue", out var bv) && bv.TryGetDecimal(out var bvd) ? bvd : calcBillable;
                    var estC = r.TryGetProperty("estimatedCost", out var ec) && ec.TryGetDecimal(out var ecd) ? ecd : calcCost;

                    return Ok(new
                    {
                        verdict = verd,
                        isOutOfScope = !isClient && isOut,
                        isOverbilling = isClient && (verd == "CHALLENGE_OVERBILLING"),
                        type = r.TryGetProperty("type", out var t) ? t.GetString() : (isClient ? "Redundant Charge / Double-Billing Defense" : (isOut ? "Scope Expansion" : "Base Deliverable")),
                        clause = r.TryGetProperty("clause", out var c) ? c.GetString() : fallbackClause,
                        reasoning = r.TryGetProperty("reasoning", out var rs) ? rs.GetString() : fallbackReasoning,
                        estimatedCost = estC,
                        billableValue = billVal,
                        confidence = r.TryGetProperty("confidence", out var cf) && cf.TryGetDouble(out var cfd) ? cfd : 0.92,
                        title = req.Title,
                        description = req.Description,
                        source = req.Source ?? "Vendor claim correspondence"
                    });
                }
                catch { }
            }
        }

        return Ok(new
        {
            verdict = fallbackVerdict,
            isOutOfScope = !isClient,
            isOverbilling = isClient,
            type = isClient ? "Redundant Charge / Double-Billing Defense" : "Scope Expansion",
            clause = fallbackClause,
            reasoning = fallbackReasoning,
            estimatedCost = calcCost,
            billableValue = calcBillable,
            confidence = 0.88,
            title = req.Title,
            description = req.Description,
            source = req.Source ?? "Vendor claim correspondence"
        });
    }

    [HttpPost("projects/{id:guid}/manual-opportunity")]
    [HttpPost("api/projects/{id:guid}/manual-opportunity")]
    public async Task<IActionResult> AddManualOpportunity(Guid id, ManualOpportunityRequest req)
    {
        var p = await Mine().Include(x => x.Contract).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        var opp = new Opportunity
        {
            Id = Guid.NewGuid(),
            ProjectId = id,
            Type = string.IsNullOrWhiteSpace(req.Type) ? "Scope Expansion" : req.Type,
            Title = req.Title.Trim(),
            Description = req.Description.Trim(),
            EstimatedCost = Math.Round(req.EstimatedCost, 2),
            BillableValue = Math.Round(req.BillableValue, 2),
            Confidence = 0.95,
            Status = req.CreateChangeRequest ? "change-order" : "detected",
            Clause = string.IsNullOrWhiteSpace(req.Clause) ? p.Contract?.ChangeVariationRules ?? "§3 — Change Request Process" : req.Clause,
            CreatedAt = DateTimeOffset.UtcNow,
            Evidence = [
                new OpportunityEvidence
                {
                    Id = Guid.NewGuid(),
                    Text = req.Description.Trim(),
                    Source = string.IsNullOrWhiteSpace(req.Source) ? "Manual entry / client request" : req.Source.Trim()
                }
            ],
            Timeline = [
                new OpportunityTimelineItem
                {
                    Id = Guid.NewGuid(),
                    DateLabel = string.IsNullOrWhiteSpace(req.DateLabel) ? DateTime.UtcNow.ToString("MMM d, yyyy") : req.DateLabel,
                    Description = req.Description.Trim(),
                    SortOrder = 0
                }
            ]
        };

        if (req.CreateChangeRequest)
        {
            var count = await db.ChangeRequests.CountAsync(c => c.Opportunity.ProjectId == id);
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
                CostBreakdown = $"Estimated cost {opp.EstimatedCost:C0}. Proposed billable value {opp.BillableValue:C0}."
            };
        }

        db.Opportunities.Add(opp);
        db.Events.Add(new ProjectEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = id,
            Description = opp.Description,
            EventType = opp.Type,
            Amount = opp.BillableValue
        });

        await db.SaveChangesAsync();
        var full = await db.Opportunities
            .Include(o => o.Evidence).Include(o => o.Timeline).Include(o => o.ChangeRequest)
            .FirstAsync(o => o.Id == opp.Id);

        return Ok(Mapper.Opportunity(full));
    }

    private Task<Project?> Load(Guid id) =>
        Mine()
            .Include(p => p.Contract)
            .Include(p => p.Documents)
            .Include(p => p.Events)
            .Include(p => p.Opportunities).ThenInclude(o => o.Evidence)
            .Include(p => p.Opportunities).ThenInclude(o => o.Timeline)
            .Include(p => p.Opportunities).ThenInclude(o => o.ChangeRequest)
            .Include(p => p.Invoices)
            .FirstOrDefaultAsync(p => p.Id == id);
}
