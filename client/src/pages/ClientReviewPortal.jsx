import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ClientReviewPortal({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Form state
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Decline state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineNotes, setDeclineNotes] = useState("");

  // Canvas ref for drawing signature
  const [sigMode, setSigMode] = useState("type"); // 'type' | 'draw'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    loadReview();
  }, [token]);

  const loadReview = async () => {
    if (!token) {
      setError("No approval token provided in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPublicReview(token);
      setData(res);
      if (res.signedBy) setSignerName(res.signedBy);
      if (res.signedEmail) setSignerEmail(res.signedEmail);
    } catch (err) {
      setError(err.message || "Failed to load change order for review. The link may have expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  // Drawing canvas handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getSignatureData = () => {
    if (sigMode === "draw" && canvasRef.current && hasDrawn) {
      return canvasRef.current.toDataURL("image/png");
    }
    return `Typed: ${signerName}`;
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!signerName.trim() || !signerEmail.trim()) {
      alert("Please provide both your full name and work email.");
      return;
    }
    if (!agreed) {
      alert("Please check the authorization confirmation box.");
      return;
    }

    setSubmitting(true);
    try {
      const sigData = getSignatureData();
      const res = await api.approvePublicReview(token, {
        signedBy: signerName.trim(),
        signedEmail: signerEmail.trim(),
        signatureData: sigData,
        notes: clientNotes.trim()
      });
      setData(res);
      setActionSuccess("Change order successfully approved and digitally executed!");
    } catch (err) {
      alert("Approval error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      alert("Please state a reason for declining or requesting clarification.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.declinePublicReview(token, {
        reason: declineReason.trim(),
        notes: declineNotes.trim()
      });
      setData(res);
      setShowDeclineModal(false);
      setActionSuccess("Feedback submitted. The contractor team has been notified.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    const exportUrl = api.publicCoExportUrl(token);
    window.open(exportUrl, "_blank");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#090d16", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid #334155", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 16, fontWeight: 500 }}>Loading ScopeLine Commercial Review Portal...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#090d16", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, background: "#131b2e", border: "1px solid #ef444433", borderRadius: 16, padding: 36, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: "#f87171", fontSize: 20, marginBottom: 8, fontWeight: 700 }}>Unable to Load Review Portal</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{error || "Invalid or expired review link."}</p>
          <p style={{ color: "#64748b", fontSize: 12 }}>If you believe this is an error, please contact your project delivery team for a refreshed magic link.</p>
        </div>
      </div>
    );
  }

  const isApproved = data.status?.toLowerCase() === "approved";
  const isDeclined = data.status?.toLowerCase() === "declined" || data.status?.toLowerCase() === "rejected";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#090d16", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 64 }}>
      {/* Top Brand Banner */}
      <header style={{ borderBottom: "1px solid #1e293b", backgroundColor: "#0d1322", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff" }}>
              S
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#f8fafc" }}>
                ScopeLine <span style={{ color: "#10b981", fontSize: 13, fontWeight: 500, marginLeft: 4 }}>Commercial Review Portal</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Secure Audit & E-Signature Gateway</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: isApproved ? "#065f4633" : isDeclined ? "#ef444422" : "#3b82f622", border: `1px solid ${isApproved ? "#10b981" : isDeclined ? "#ef4444" : "#3b82f6"}`, color: isApproved ? "#34d399" : isDeclined ? "#f87171" : "#60a5fa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isApproved ? "✓ Approved & Executed" : isDeclined ? "Disputed / Declined" : "Pending Client Approval"}
            </span>
            <button
              onClick={handleDownloadPdf}
              style={{ padding: "7px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
            >
              📄 Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1180, margin: "24px auto 0", padding: "0 24px" }}>
        {actionSuccess && (
          <div style={{ background: "#065f4622", border: "1px solid #10b981", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, color: "#34d399", fontSize: 14, fontWeight: 500 }}>
            <span>🎉</span>
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Project Header Bar */}
        <div style={{ background: "#131b2e", border: "1px solid #1e293b", borderRadius: 16, padding: "24px 28px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981", fontWeight: 700, marginBottom: 4 }}>
              {data.project?.clientName || "Client Project"} &bull; {data.project?.name || "Contract Engagement"}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              Change Order {data.changeRequest?.number || "CR-001"}: {data.opportunity?.title || "Scope Modification"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 14 }}>
              Submitted for authorization on <strong>{data.changeRequest?.submitted || "Recently"}</strong> by Contractor Project Delivery.
            </p>
          </div>

          <div style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 20px", textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Proposed Billable Value</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981" }}>
              ${(data.opportunity?.billableValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Est. Delivery Cost: ${(data.opportunity?.estimatedCost || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
          
          {/* LEFT: 3-Way Grounded Proof & Baseline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* 3-Way Grounded Proof Card */}
            <div style={{ background: "#131b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  3-Way Grounded Proof & Scope Boundary
                </h3>
              </div>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.5 }}>
                ScopeLine grounds every change request in verified communication artifacts, baseline SOW exclusions, and transparent cost formulas to ensure total commercial alignment.
              </p>

              {/* Proof Step 1: Requested Scope */}
              <div style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>1.</span> Requested Scope Addition / Out-of-Scope Ask
                </div>
                <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, background: "#131b2e", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid #3b82f6" }}>
                  {data.changeRequest?.changedScope || data.opportunity?.description || "Scope addition requested during project execution."}
                </div>
              </div>

              {/* Proof Step 2: SOW Contract Boundary Clause */}
              <div style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>2.</span> Baseline SOW Exclusion & Variation Clause
                </div>
                <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, background: "#131b2e", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
                  <strong>Contract Clause:</strong> {data.opportunity?.clause || data.contractBaseline?.changeVariationRules || "Standard Change Request Provision (§4)"}
                  {data.contractBaseline?.exclusionsAllowances && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
                      <strong>Original SOW Exclusions:</strong> {data.contractBaseline.exclusionsAllowances}
                    </div>
                  )}
                </div>
              </div>

              {/* Proof Step 3: Transparent Valuation & Deliverables */}
              <div style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>3.</span> Transparent Valuation & Resource Math
                </div>
                <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, background: "#131b2e", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid #10b981" }}>
                  {data.changeRequest?.costBreakdown || `Calculated based on estimated direct delivery hours ($${data.opportunity?.estimatedCost || 0}) plus contractor commercial margin to deliver the requested milestone.`}
                </div>
              </div>
            </div>

            {/* Grounding Evidence Audit Trail */}
            {data.evidence && data.evidence.length > 0 && (
              <div style={{ background: "#131b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📎</span> Verified Communication Artifacts & Evidence
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.evidence.map((ev, i) => (
                    <div key={i} style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontStyle: "italic", marginBottom: 4 }}>
                        &ldquo;{ev.text}&rdquo;
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>📄 Source:</span>
                        <strong style={{ color: "#94a3b8" }}>{ev.source || "Project Document"}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Milestones */}
            {data.timeline && data.timeline.length > 0 && (
              <div style={{ background: "#131b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⏱️</span> Chronological Event Timeline
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: "2px solid #1e293b", paddingLeft: 16, marginLeft: 8 }}>
                  {data.timeline.map((item, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{item.dateLabel}</div>
                      <div style={{ fontSize: 13, color: "#cbd5e1" }}>{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: E-Signature & Approval Desk */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* If Already Approved */}
            {isApproved ? (
              <div style={{ background: "#131b2e", border: "1px solid #10b98155", borderRadius: 16, padding: 28, boxShadow: "0 8px 32px rgba(16, 185, 129, 0.1)" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#065f4633", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px", color: "#10b981" }}>
                    ✓
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", margin: "0 0 4px" }}>
                    Change Order Executed
                  </h3>
                  <p style={{ color: "#34d399", fontSize: 13, fontWeight: 500, margin: 0 }}>
                    Legally signed & authorized under contract terms
                  </p>
                </div>

                <div style={{ background: "#0d1322", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Authorized By:</span>
                    <strong style={{ color: "#f8fafc" }}>{data.signedBy || signerName || "Authorized Client Representative"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Signer Email:</span>
                    <strong style={{ color: "#f8fafc" }}>{data.signedEmail || signerEmail || "—"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Execution Date:</span>
                    <strong style={{ color: "#10b981" }}>
                      {data.signedAt ? new Date(data.signedAt).toLocaleString() : data.changeRequest?.approved || "Recently"}
                    </strong>
                  </div>
                  {data.clientNotes && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e293b", fontSize: 13 }}>
                      <span style={{ color: "#64748b", display: "block", marginBottom: 4 }}>Signer Notes / PO Reference:</span>
                      <div style={{ color: "#cbd5e1", fontStyle: "italic" }}>{data.clientNotes}</div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDownloadPdf}
                  style={{ width: "100%", padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)" }}
                >
                  📄 Download Executed Change Order PDF
                </button>
              </div>
            ) : (
              /* Interactive E-Signature Form */
              <div style={{ background: "#131b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 28 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "#f8fafc" }}>
                  Client Authorization & E-Signature
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>
                  Please review the grounded proof on the left, provide your authorized contact details, and execute this scope addition.
                </p>

                <form onSubmit={handleApprove} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                      Signer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins (VP Operations)"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", background: "#0d1322", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sjenkins@clientcorp.com"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", background: "#0d1322", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Signature Mode Toggle */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                        Digital Signature *
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSigMode("type")}
                          style={{ padding: "3px 8px", fontSize: 11, borderRadius: 6, background: sigMode === "type" ? "#10b981" : "#1e293b", color: sigMode === "type" ? "#fff" : "#94a3b8", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >
                          Type
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigMode("draw")}
                          style={{ padding: "3px 8px", fontSize: 11, borderRadius: 6, background: sigMode === "draw" ? "#10b981" : "#1e293b", color: sigMode === "draw" ? "#fff" : "#94a3b8", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >
                          Draw
                        </button>
                      </div>
                    </div>

                    {sigMode === "type" ? (
                      <div style={{ background: "#0d1322", border: "1px dashed #334155", borderRadius: 8, padding: "18px 16px", textAlign: "center", minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif", fontSize: 28, color: signerName ? "#10b981" : "#475569" }}>
                          {signerName || "Your Signature Preview"}
                        </span>
                      </div>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <canvas
                          ref={canvasRef}
                          width={380}
                          height={90}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          style={{ width: "100%", height: 90, background: "#0d1322", border: "1px dashed #334155", borderRadius: 8, cursor: "crosshair", display: "block" }}
                        />
                        {hasDrawn && (
                          <button
                            type="button"
                            onClick={clearCanvas}
                            style={{ position: "absolute", right: 8, top: 8, padding: "2px 8px", fontSize: 10, background: "#ef444422", color: "#f87171", border: "1px solid #ef4444", borderRadius: 4, cursor: "pointer" }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                      Purchase Order # / Internal Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-98442 or 'Approved for sprint 4'"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", background: "#0d1322", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Legal Authorization Checkbox */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      id="legalAuth"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      style={{ marginTop: 3, cursor: "pointer" }}
                    />
                    <label htmlFor="legalAuth" style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, cursor: "pointer" }}>
                      I confirm that I am authorized to approve scope modifications and billable additions (${(data.opportunity?.billableValue || 0).toLocaleString()}) on behalf of <strong>{data.project?.clientName || "the Client"}</strong>.
                    </label>
                  </div>

                  {/* Primary Approval Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ width: "100%", padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)", opacity: submitting ? 0.7 : 1, marginTop: 8 }}
                  >
                    {submitting ? "Signing & Executing..." : `✍️ Authorize & Execute Change Order ($${(data.opportunity?.billableValue || 0).toLocaleString()})`}
                  </button>
                </form>

                {/* Decline / Request Clarification Button */}
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(true)}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Request Clarification or Dispute This Change Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decline / Feedback Modal */}
      {showDeclineModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ maxWidth: 480, width: "100%", background: "#131b2e", border: "1px solid #334155", borderRadius: 16, padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f87171", margin: "0 0 8px" }}>
              Request Clarification or Decline
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.4 }}>
              Please specify the reason you are disputing or requesting changes to this Change Order. The contractor team will be notified immediately.
            </p>

            <form onSubmit={handleDecline} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Reason for Dispute / Clarification *
                </label>
                <select
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d1322", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc", fontSize: 13, outline: "none" }}
                >
                  <option value="">Select a reason...</option>
                  <option value="Believed to be in original SOW scope">Believed to be in original SOW scope</option>
                  <option value="Rate or hour estimate disputed">Rate or hour estimate disputed</option>
                  <option value="Scope addition not authorized internally">Scope addition not authorized internally</option>
                  <option value="Other">Other / Additional notes</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Detailed Notes & Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide any additional details or counter-proposals..."
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d1322", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#1e293b", color: "#94a3b8", border: "none", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
