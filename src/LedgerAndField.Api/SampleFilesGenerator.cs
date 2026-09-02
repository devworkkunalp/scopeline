using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LedgerAndField.Api;

public static class SampleFilesGenerator
{
    public static void GenerateSamples(string outputDir)
    {
        Directory.CreateDirectory(outputDir);

        var sowText = """
            STATEMENT OF WORK (SOW)
            Project Name: Acme Corp — Omnichannel E-Commerce Modernization
            Contract Value: $120,000 USD (Fixed Price Milestone)
            Effective Date: October 1, 2025
            Service Provider: Nimbus Digital
            Client: Acme Corporation

            1. PROJECT SCOPE (§1)
            The service provider shall deliver the following components:
            - Migration of core catalog and customer database from legacy Magento to Shopify Plus.
            - Custom responsive storefront design based on Acme approved Figma templates (up to 2 design revision rounds).
            - Standard integration with existing ERP (SAP Business One) for product inventory sync (hourly batch).
            - Implementation of standard Shopify Payments gateway for USD transactions.
            - User acceptance testing (UAT) period of 10 business days.

            2. EXCLUSIONS & OUT OF SCOPE (§2)
            The following deliverables and tasks are expressly EXCLUDED from this agreement and shall require an approved Change Request:
            - Multi-currency and international tax calculation engines (e.g., Avalara, Global-e).
            - Custom third-party loyalty/rewards program integration.
            - Subscription billing or recurring order workflows (e.g., Recharge).
            - Custom native iOS/Android mobile applications.
            - Data cleanup, enrichment, or legacy data migration beyond 5,000 active SKUs.
            - Design revisions exceeding two (2) iterations after milestone sign-off.

            3. CHANGE REQUEST & VARIATION PROCESS (§3)
            Any request by the Client for work outside the defined Project Scope (§1) or falling under Exclusions (§2), or changes in requirements resulting in additional engineering/design hours, must be submitted in writing.
            - The Service Provider will evaluate the request and provide a Change Request (CR) document specifying the proposed scope, estimated delivery impact, and cost based on a standard rate of $150/hour.
            - No out-of-scope work shall commence until the Client approves the Change Request in writing.

            4. PAYMENT TERMS & MILESTONES (§4)
            - Milestone 1 (25% — $30,000): Project Kickoff & Architecture Signoff (Invoiced Upon Execution).
            - Milestone 2 (30% — $36,000): Storefront UI Development & ERP Batch Sync.
            - Milestone 3 (30% — $36,000): Catalog Migration & UAT Completion.
            - Milestone 4 (15% — $18,000): Production Launch & Go-Live Support (Net 15 days).

            5. NOTICE PERIODS & CLIENT RESPONSE (§5)
            The Client shall provide written notice of any defect or requested modification within seven (7) calendar days of milestone delivery. Lack of written rejection within 7 days constitutes formal milestone acceptance.
            """;

        // 1. Generate PDF
        var pdfPath = Path.Combine(outputDir, "Sample_SOW_Acme_ECommerce.pdf");
        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Column(col =>
                {
                    col.Item().Text("STATEMENT OF WORK (SOW)").FontSize(16).Bold().FontColor("#14213D");
                    col.Item().Text("Acme Corp — Omnichannel E-Commerce Modernization").FontSize(12).FontColor("#E85D2E").Bold();
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor("#14213D");
                });

                page.Content().PaddingVertical(14).Column(col =>
                {
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Client: Acme Corporation\nProvider: Nimbus Digital");
                        r.RelativeItem().AlignRight().Text("Scope Value: $120,000 USD\nEffective: Oct 1, 2025\nType: Fixed Price Milestone");
                    });

                    col.Item().PaddingTop(14).Text("1. PROJECT SCOPE (§1)").Bold().FontSize(11).FontColor("#14213D");
                    col.Item().Text("• Migration of core catalog and customer database from legacy Magento to Shopify Plus.\n• Custom responsive storefront design based on approved Figma templates (up to 2 revisions).\n• Standard integration with ERP (SAP Business One) for product inventory sync.\n• Implementation of standard Shopify Payments gateway for USD transactions.\n• User acceptance testing (UAT) period of 10 business days.");

                    col.Item().PaddingTop(12).Text("2. EXCLUSIONS & OUT OF SCOPE (§2)").Bold().FontSize(11).FontColor("#14213D");
                    col.Item().Text("• Multi-currency and international tax calculation engines (e.g. Avalara, Global-e).\n• Custom third-party loyalty/rewards program integration.\n• Subscription billing or recurring order workflows (e.g. Recharge).\n• Custom native iOS/Android mobile applications.\n• Data cleanup beyond 5,000 active SKUs.\n• Design revisions exceeding two (2) iterations after milestone sign-off.");

                    col.Item().PaddingTop(12).Text("3. CHANGE REQUEST & VARIATION PROCESS (§3)").Bold().FontSize(11).FontColor("#14213D");
                    col.Item().Text("Any work outside defined scope or falling under exclusions requires written approval via Change Request at $150/hour standard billing rate.");

                    col.Item().PaddingTop(12).Text("4. PAYMENT TERMS & MILESTONES (§4)").Bold().FontSize(11).FontColor("#14213D");
                    col.Item().Text("• Milestone 1 (25% — $30,000): Kickoff & Architecture Signoff\n• Milestone 2 (30% — $36,000): Storefront UI Development & ERP Batch Sync\n• Milestone 3 (30% — $36,000): Catalog Migration & UAT Completion\n• Milestone 4 (15% — $18,000): Production Launch & Go-Live (Net 15 days)");

                    col.Item().PaddingTop(12).Text("5. NOTICE PERIODS (§5)").Bold().FontSize(11).FontColor("#14213D");
                    col.Item().Text("Client must provide notice of defect or revision within seven (7) calendar days of milestone delivery.");
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Page ");
                    t.CurrentPageNumber();
                    t.Span(" — Executed SOW Agreement");
                });
            });
        }).GeneratePdf(pdfPath);

        // 2. Generate Excel (.xlsx)
        var xlsxPath = Path.Combine(outputDir, "Sample_SOW_Acme_ECommerce.xlsx");
        using (var wb = new XLWorkbook())
        {
            var ws = wb.Worksheets.Add("SOW Summary & Scope");
            ws.Cell(1, 1).Value = "STATEMENT OF WORK — COMMERCIAL TERMS & SCOPE BREAKDOWN";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 14;

            ws.Cell(3, 1).Value = "Project Name";
            ws.Cell(3, 2).Value = "Acme Corp — Omnichannel E-Commerce Modernization";
            ws.Cell(4, 1).Value = "Agreed Scope Value";
            ws.Cell(4, 2).Value = 120000;
            ws.Cell(4, 2).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(5, 1).Value = "Client";
            ws.Cell(5, 2).Value = "Acme Corporation";
            ws.Cell(6, 1).Value = "Effective Date";
            ws.Cell(6, 2).Value = "2025-10-01";

            ws.Cell(8, 1).Value = "Section";
            ws.Cell(8, 2).Value = "Term Description / Clause Content";
            ws.Row(8).Style.Font.Bold = true;

            ws.Cell(9, 1).Value = "Original Scope (§1)";
            ws.Cell(9, 2).Value = "Magento to Shopify Plus migration, responsive storefront up to 2 Figma iterations, SAP Business One hourly sync, standard Shopify Payments USD, 10 days UAT.";

            ws.Cell(10, 1).Value = "Exclusions (§2)";
            ws.Cell(10, 2).Value = "Multi-currency/tax engines (Global-e), Loyalty/rewards, Subscription billing (Recharge), Native mobile apps, Data enrichment >5k SKUs, Design revisions >2.";

            ws.Cell(11, 1).Value = "Change Process (§3)";
            ws.Cell(11, 2).Value = "Written Change Request required prior to commencement. Rate: $150/hour.";

            ws.Cell(12, 1).Value = "Payment Terms (§4)";
            ws.Cell(12, 2).Value = "M1: $30k (Kickoff), M2: $36k (Storefront/ERP), M3: $36k (Catalog/UAT), M4: $18k (Go-live Net 15).";

            ws.Cell(13, 1).Value = "Notice Period (§5)";
            ws.Cell(13, 2).Value = "7 calendar days for written rejection or milestone acceptance.";

            ws.Columns().AdjustToContents();
            wb.SaveAs(xlsxPath);
        }

        // 3. Generate Word DOCX (.docx) via OpenXML
        var docxPath = Path.Combine(outputDir, "Sample_SOW_Acme_ECommerce.docx");
        using (var wordDoc = DocumentFormat.OpenXml.Packaging.WordprocessingDocument.Create(docxPath, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new DocumentFormat.OpenXml.Wordprocessing.Document();
            var body = mainPart.Document.AppendChild(new DocumentFormat.OpenXml.Wordprocessing.Body());

            foreach (var line in sowText.Split("\n"))
            {
                var p = body.AppendChild(new DocumentFormat.OpenXml.Wordprocessing.Paragraph());
                var run = p.AppendChild(new DocumentFormat.OpenXml.Wordprocessing.Run());
                run.AppendChild(new DocumentFormat.OpenXml.Wordprocessing.Text(line.TrimEnd('\r')));
            }
        }
    }
}
