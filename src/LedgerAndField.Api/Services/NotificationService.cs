using System.Net.Http.Headers;
using System.Text;

namespace LedgerAndField.Api.Services;

public class NotificationService(IConfiguration config, ILogger<NotificationService> logger, HttpClient http)
{
    public async Task NotifyNewSignupAsync(string email, string displayName, string company, string phone, string role, string perspective)
    {
        var msg = $"""
            🚀 *New User Registered on Scopeline!*
            👤 *Name:* {displayName}
            📧 *Email:* {email}
            📱 *Phone:* {(string.IsNullOrWhiteSpace(phone) ? "Not provided" : phone)}
            🏢 *Company:* {company}
            🎭 *Role:* {role}
            🎯 *Edition:* {(perspective == "client" ? "Buyer / Founder Shield" : "Agency / Vendor Edition")}
            ⏰ *Time:* {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
            """;

        await SendWhatsAppMessageAsync(msg);
    }

    public async Task NotifyOnboardingCompleteAsync(string email, string displayName, string company, string projectName, decimal? scopeValue, string perspective)
    {
        var msg = $"""
            🎉 *User Completed Onboarding on Scopeline!*
            👤 *User:* {displayName} ({email})
            🏢 *Company:* {company}
            📁 *Initial Project:* {projectName}
            💰 *Contract Value:* {(scopeValue.HasValue ? $"{scopeValue.Value:C0}" : "Not set")}
            🎯 *Edition:* {(perspective == "client" ? "Buyer / Founder Shield" : "Agency / Vendor Edition")}
            ⏰ *Time:* {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
            """;

        await SendWhatsAppMessageAsync(msg);
    }

    private async Task SendWhatsAppMessageAsync(string message)
    {
        try
        {
            var accountSid = GetConfigValue("Twilio:AccountSid", "TWILIO_ACCOUNT_SID", "Twilio__AccountSid");
            var authToken = GetConfigValue("Twilio:AuthToken", "TWILIO_AUTH_TOKEN", "Twilio__AuthToken");
            var configuredFrom = GetConfigValue("Twilio:FromNumber", "TWILIO_FROM_NUMBER", "Twilio__FromNumber") ?? "whatsapp:+14155238886";
            var toNumber = GetConfigValue("Twilio:ToNumber", "TWILIO_TO_NUMBER", "Twilio__ToNumber") ?? "whatsapp:+917387028577";

            logger.LogInformation("[NOTIFIER] Dispatching alert. AccountSid configured: {HasSid}, To: {To}", 
                !string.IsNullOrWhiteSpace(accountSid), toNumber);

            if (!string.IsNullOrWhiteSpace(accountSid) && !string.IsNullOrWhiteSpace(authToken) && !string.IsNullOrWhiteSpace(toNumber))
            {
                var cleanToNumber = toNumber.StartsWith("whatsapp:") ? toNumber : $"whatsapp:{toNumber}";
                var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";
                var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));

                // Attempt 1: WhatsApp via Configured From (or default Sandbox)
                var fromCandidates = new List<string>();
                if (!string.IsNullOrWhiteSpace(configuredFrom))
                    fromCandidates.Add(configuredFrom.StartsWith("whatsapp:") ? configuredFrom : $"whatsapp:{configuredFrom}");
                if (!fromCandidates.Contains("whatsapp:+14155238886"))
                    fromCandidates.Add("whatsapp:+14155238886");

                bool sent = false;
                foreach (var from in fromCandidates)
                {
                    try
                    {
                        var req = new HttpRequestMessage(HttpMethod.Post, url);
                        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                        req.Content = new FormUrlEncodedContent(new Dictionary<string, string>
                        {
                            { "From", from },
                            { "To", cleanToNumber },
                            { "Body", message }
                        });

                        var res = await http.SendAsync(req);
                        var body = await res.Content.ReadAsStringAsync();

                        if (res.IsSuccessStatusCode)
                        {
                            logger.LogInformation("[NOTIFIER] WhatsApp notification sent via {From} to {To}", from, cleanToNumber);
                            sent = true;
                            break;
                        }
                        else
                        {
                            logger.LogWarning("[NOTIFIER] WhatsApp attempt via {From} failed ({Status}): {Body}", from, res.StatusCode, body);
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "[NOTIFIER] WhatsApp request error for {From}", from);
                    }
                }

                if (sent) return;

                // Attempt 2: SMS Fallback to user's phone
                var rawTo = cleanToNumber.Replace("whatsapp:", "");
                var smsFrom = (GetConfigValue("Twilio:SmsFromNumber", "TWILIO_SMS_FROM_NUMBER", "Twilio__SmsFromNumber") ?? "+18452951974").Replace("whatsapp:", "");
                
                var smsReq = new HttpRequestMessage(HttpMethod.Post, url);
                smsReq.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                smsReq.Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    { "From", smsFrom },
                    { "To", rawTo },
                    { "Body", message }
                });

                var smsRes = await http.SendAsync(smsReq);
                if (smsRes.IsSuccessStatusCode)
                {
                    logger.LogInformation("[NOTIFIER] SMS fallback sent via {From} to {To}", smsFrom, rawTo);
                    return;
                }
                else
                {
                    var body = await smsRes.Content.ReadAsStringAsync();
                    logger.LogWarning("[NOTIFIER] SMS fallback failed ({Status}): {Body}", smsRes.StatusCode, body);
                }
                return;
            }

            // 2. CallMeBot Fallback (if configured)
            var callMeBotPhone = GetConfigValue("WhatsApp:Phone", "WHATSAPP_PHONE", "WhatsApp__Phone");
            var callMeBotKey = GetConfigValue("WhatsApp:ApiKey", "WHATSAPP_API_KEY", "WhatsApp__ApiKey");

            if (!string.IsNullOrWhiteSpace(callMeBotPhone) && !string.IsNullOrWhiteSpace(callMeBotKey))
            {
                var encodedMsg = Uri.EscapeDataString(message);
                var callMeBotUrl = $"https://api.callmebot.com/whatsapp.php?phone={callMeBotPhone}&text={encodedMsg}&apikey={callMeBotKey}";
                
                var res = await http.GetAsync(callMeBotUrl);
                if (res.IsSuccessStatusCode)
                {
                    logger.LogInformation("[NOTIFIER] CallMeBot WhatsApp notification sent successfully to {Phone}", callMeBotPhone);
                }
                else
                {
                    logger.LogWarning("[NOTIFIER] CallMeBot API returned error {Status}", res.StatusCode);
                }
                return;
            }

            logger.LogWarning("[NOTIFIER] No WhatsApp/Twilio credentials found. Notification: \n{Message}", message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[NOTIFIER] Failed to send notification");
        }
    }

    private string? GetConfigValue(string configKey, params string[] envKeys)
    {
        var val = config[configKey];
        if (!string.IsNullOrWhiteSpace(val)) return val.Trim();

        foreach (var key in envKeys)
        {
            var envVal = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(envVal)) return envVal.Trim();
        }
        return null;
    }
}
