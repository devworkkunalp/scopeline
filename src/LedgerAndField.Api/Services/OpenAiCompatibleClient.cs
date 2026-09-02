using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace LedgerAndField.Api.Services;

public class AiOptions
{
    public string Provider { get; set; } = "Heuristic";
    public string? BaseUrl { get; set; }
    public string? ApiKey { get; set; }
    public string Model { get; set; } = "llama-3.1-8b-instant";
}

public class OpenAiCompatibleClient(HttpClient http, IConfiguration config, ILogger<OpenAiCompatibleClient> log)
{
    public bool IsConfigured
    {
        get
        {
            var o = Options();
            return !string.IsNullOrWhiteSpace(o.ApiKey)
                   && !o.ApiKey.Contains("YOUR_OPENROUTER_API_KEY_HERE")
                   && !o.ApiKey.Contains("[YOUR-")
                   && !string.IsNullOrWhiteSpace(o.BaseUrl)
                   && !string.Equals(o.Provider, "Heuristic", StringComparison.OrdinalIgnoreCase);
        }
    }

    public async Task<string?> CompleteJsonAsync(string system, string user, CancellationToken ct = default)
    {
        if (!IsConfigured) return null;
        var o = Options();
        var url = o.BaseUrl!.TrimEnd('/') + "/chat/completions";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", o.ApiKey);
        var body = new
        {
            model = o.Model,
            temperature = 0.1,
            messages = new[]
            {
                new { role = "system", content = system },
                new { role = "user", content = user }
            }
        };
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        try
        {
            using var res = await http.SendAsync(req, ct);
            var text = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode)
            {
                log.LogWarning("AI call failed {Status}: {Body}", res.StatusCode, text);
                return null;
            }
            using var doc = JsonDocument.Parse(text);
            var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            return content;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "AI call error");
            return null;
        }
    }

    public static string? ExtractJsonObject(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        var match = Regex.Match(content, @"\{[\s\S]*\}");
        return match.Success ? match.Value : null;
    }

    private AiOptions Options()
    {
        var o = new AiOptions();
        config.GetSection("Ai").Bind(o);
        return o;
    }
}
