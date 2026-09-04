# Scenario 3: Warranty Bug Fix Disguised as Supplementary Charge

## 🎯 Test Objective
Validate that Scopeline catches a vendor attempting to charge $2,200 for defect/performance remediation that is contractually guaranteed at zero cost under SOW Section 1.3 & Section 5.1.

---

## 📥 Input Document
- **File:** [`Vendor_Invoice_Claim_Checkout_BugFix.txt`](file:///C:/Leadger%20Field/test-scenarios/02_client_buyer_shield_edition/Scenario_3_Warranty_Bug_Disguised_As_Charge/Vendor_Invoice_Claim_Checkout_BugFix.txt)
- **Vendor:** DevConsulting Global Ltd.
- **Claim:** Supplementary invoice of +$2,200 for "Fixing memory leak in checkout under load".

---

## 🤖 Expected AI Scope Verdict

| Evaluation Field | Expected Value |
| :--- | :--- |
| **Audit Status** | `⚠️ CHALLENGE_OVERBILLING (Contractual Defect Warranty)` |
| **Claim Type** | `Defect Correction / Warranty SLA Defense` |
| **Governing SOW Clause** | `§1.3 Performance SLA & §5.1 Post-Launch 90-Day Defect Warranty` |
| **Grounding Reasoning** | SOW §1.3 guarantees sub-500ms performance under concurrent loads, and §5.1 mandates that all defect and memory leak fixes must be resolved at NO ADDITIONAL COST to the client. |
| **Defended Budget Amount** | **`$2,200.00 USD Saved`** |
| **Confidence Score** | `>= 96%` |

---

## 💼 Expected Next Action
- **Platform Action:** Click **`🛡️ Generate SOW Defense Letter →`**
- **Result:** Generates formal SOW Rebuttal letter citing Warranty §5.1 to reject the $2,200 supplementary invoice.
