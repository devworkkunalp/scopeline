using System.Text;
using ClosedXML.Excel;
using DocumentFormat.OpenXml.Packaging;
using MimeKit;
using UglyToad.PdfPig;

namespace LedgerAndField.Api.Services;

public class DocumentTextExtractor
{
    public string KindFromName(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "pdf",
            ".doc" or ".docx" => "doc",
            ".xls" or ".xlsx" or ".csv" => "xls",
            ".png" or ".jpg" or ".jpeg" or ".webp" or ".tif" or ".tiff" => "img",
            ".eml" or ".msg" => "eml",
            ".txt" => "txt",
            _ => "doc"
        };
    }

    public async Task<string> ExtractAsync(string fileName, string contentType, Stream stream)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        try
        {
            return ext switch
            {
                ".pdf" => ExtractPdf(stream),
                ".docx" => ExtractDocx(stream),
                ".xlsx" or ".xls" => ExtractExcel(stream),
                ".csv" => await ExtractCsvAsync(stream),
                ".eml" => ExtractEml(stream),
                ".txt" => await new StreamReader(stream).ReadToEndAsync(),
                ".png" or ".jpg" or ".jpeg" or ".webp" =>
                    $"[Image uploaded: {fileName}. OCR is not enabled in the free MVP; store the file as evidence and describe findings in notes.]",
                _ => await TryReadText(stream)
            };
        }
        catch (Exception ex)
        {
            return $"[Could not parse {fileName}: {ex.Message}]";
        }
    }

    private static string ExtractPdf(Stream stream)
    {
        using var ms = Copy(stream);
        using var doc = PdfDocument.Open(ms);
        var sb = new StringBuilder();
        foreach (var page in doc.GetPages())
        {
            sb.AppendLine($"--- page {page.Number} ---");
            sb.AppendLine(page.Text);
        }
        return sb.ToString();
    }

    private static string ExtractDocx(Stream stream)
    {
        using var ms = Copy(stream);
        using var word = WordprocessingDocument.Open(ms, false);
        return word.MainDocumentPart?.Document?.InnerText ?? "";
    }

    private static string ExtractExcel(Stream stream)
    {
        using var ms = Copy(stream);
        using var wb = new XLWorkbook(ms);
        var sb = new StringBuilder();
        foreach (var ws in wb.Worksheets)
        {
            sb.AppendLine($"--- sheet {ws.Name} ---");
            foreach (var row in ws.RangeUsed()?.Rows() ?? Enumerable.Empty<IXLRangeRow>())
                sb.AppendLine(string.Join(" | ", row.Cells().Select(c => c.GetString())));
        }
        return sb.ToString();
    }

    private static async Task<string> ExtractCsvAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }

    private static string ExtractEml(Stream stream)
    {
        var message = MimeMessage.Load(stream);
        var sb = new StringBuilder();
        sb.AppendLine($"From: {message.From}");
        sb.AppendLine($"To: {message.To}");
        sb.AppendLine($"Date: {message.Date}");
        sb.AppendLine($"Subject: {message.Subject}");
        sb.AppendLine();
        sb.AppendLine(message.TextBody ?? message.HtmlBody ?? "");
        return sb.ToString();
    }

    private static async Task<string> TryReadText(Stream stream)
    {
        using var reader = new StreamReader(stream, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }

    private static MemoryStream Copy(Stream stream)
    {
        var ms = new MemoryStream();
        stream.CopyTo(ms);
        ms.Position = 0;
        return ms;
    }
}
