import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function DefenseLetterModal({ project, opp, onClose }) {
  const [tone, setTone] = useState("diplomatic"); // 'diplomatic' | 'firm_contractual' | 'collaborative'
  const [recipientName, setRecipientName] = useState(
    project?.perspective === "client" ? "Vendor Project Lead" : (project?.clientName || "Client Representative")
  );
  const [recipientTitle, setRecipientTitle] = useState(
    project?.perspective === "client" ? "Account Manager / Delivery Lead" : "Project Sponsor / Procurement Lead"
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [letterData, setLetterData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const isClient = project?.perspective === "client";

  useEffect(() => {
    generateLetter();
  }, [tone]);

  const generateLetter = async () => {
    if (!project?.id || !opp?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateDefenseLetter(project.id, opp.id, {
        tone,
        perspective: project?.perspective || "vendor",
        recipientName: recipientName.trim(),
        recipientTitle: recipientTitle.trim(),
        recipientEmail: recipientEmail.trim(),
        customNotes: customNotes.trim(),
      });
      setLetterData(res);
    } catch (err) {
      setError(err.message || "Failed to generate defense notice.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!letterData) return;
    const fullText = `SUBJECT: ${letterData.subject}\n\n${letterData.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMailTo = () => {
    if (!letterData) return;
    const to = encodeURIComponent(recipientEmail || "");
    const sub = encodeURIComponent(letterData.subject);
    const body = encodeURIComponent(letterData.body);
    window.open(`mailto:${to}?subject=${sub}&body=${body}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-head" style={{ borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {isClient ? "CONTRACTUAL REJECTION & SCOPE DEFENSE LETTER" : "FORMAL SCOPE DEFENSE & VARIATION NOTICE"}
              </h3>
              <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>
                Grounded in Statement of Work &bull; {project?.name || "Project"} &bull; {opp?.title}
              </div>
            </div>
          </div>
          <button onClick={onClose}>&times;</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: "auto", padding: "18px 24px", gap: 16 }}>
          {/* Tone Selector & Perspective Banner */}
          <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--steel)", fontWeight: 700, marginBottom: 6 }}>
                Select Communication Tone
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setTone("diplomatic")}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: tone === "diplomatic" ? "var(--orange)" : "var(--line)",
                    background: tone === "diplomatic" ? "var(--orange)" : "var(--paper-1)",
                    color: tone === "diplomatic" ? "#fff" : "var(--navy)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🕊️ Diplomatic Commercial
                </button>
                <button
                  type="button"
                  onClick={() => setTone("firm_contractual")}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: tone === "firm_contractual" ? "var(--orange)" : "var(--line)",
                    background: tone === "firm_contractual" ? "var(--orange)" : "var(--paper-1)",
                    color: tone === "firm_contractual" ? "#fff" : "var(--navy)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ⚖️ Formal Contractual
                </button>
                <button
                  type="button"
                  onClick={() => setTone("collaborative")}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: tone === "collaborative" ? "var(--orange)" : "var(--line)",
                    background: tone === "collaborative" ? "var(--orange)" : "var(--paper-1)",
                    color: tone === "collaborative" ? "#fff" : "var(--navy)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🤝 Collaborative Partner
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--steel)" }}>Defended Amount</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--orange)" }}>
                ${(opp?.billable || opp?.billableValue || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Recipient Customization Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--steel)", display: "block", marginBottom: 4 }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper-1)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--steel)", display: "block", marginBottom: 4 }}>
                Recipient Title
              </label>
              <input
                type="text"
                value={recipientTitle}
                onChange={(e) => setRecipientTitle(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper-1)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--steel)", display: "block", marginBottom: 4 }}>
                Recipient Email (Optional)
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper-1)", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Optional Custom Notes Input & Refresh */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--steel)", display: "block", marginBottom: 4 }}>
                Add Custom Internal Context or Negotiation Points (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 'Referencing Sprint 3 standup agreement' or 'PO-4482 pending review'"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper-1)", boxSizing: "border-box" }}
              />
            </div>
            <button
              type="button"
              className="btn small"
              onClick={generateLetter}
              disabled={loading}
              style={{ height: 32, whiteSpace: "nowrap" }}
            >
              {loading ? "Generating…" : "🔄 Refresh Notice"}
            </button>
          </div>

          {/* Letter Output Preview */}
          {loading && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div className="spinner" />
              <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 8 }}>Grounding defense letter in contract clauses & evidence...</div>
            </div>
          )}

          {error && (
            <div style={{ color: "var(--red)", fontSize: 13, background: "var(--red-light, #fee2e2)", padding: 12, borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!loading && letterData && (
            <div style={{ background: "var(--paper-1)", border: "1px solid var(--line)", borderRadius: 10, padding: 18 }}>
              {/* Subject Banner */}
              <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12 }}>
                  <strong style={{ color: "var(--steel)", marginRight: 6 }}>SUBJECT:</strong>
                  <span style={{ fontWeight: 600, color: "var(--navy)" }}>{letterData.subject}</span>
                </div>
              </div>

              {/* Formatted Letter Body */}
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace, sans-serif",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "var(--navy)",
                  whiteSpace: "pre-wrap",
                  background: "#fff",
                  padding: "16px 18px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {letterData.body}
              </div>

              {/* Next Steps Guidance */}
              {letterData.suggestedNextSteps && (
                <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--steel)", background: "var(--paper-2)", padding: "8px 12px", borderRadius: 6, borderLeft: "3px solid var(--orange)" }}>
                  <strong>Suggested Next Action:</strong> {letterData.suggestedNextSteps}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Foot / Actions */}
        <div className="modal-foot" style={{ borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--steel)" }}>
            Grounding Reference: <strong>{letterData?.sowReference || "SOW §4"}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost small"
              onClick={handleMailTo}
              disabled={!letterData}
            >
              ✉️ Open in Mail Client
            </button>
            <button
              type="button"
              className="btn orange small"
              onClick={handleCopy}
              disabled={!letterData}
              id="btn-copy-defense-letter"
            >
              {copied ? "✓ Copied Notice!" : "📋 Copy Notice Text"}
            </button>
            <button type="button" className="btn ghost small" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
