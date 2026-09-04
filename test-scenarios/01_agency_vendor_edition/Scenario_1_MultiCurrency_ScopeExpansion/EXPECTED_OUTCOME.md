# Scenario 1: Multi-Currency & Recurring Subscription Request

## 🎯 Test Objective
Validate that Scopeline detects a client email asking for features explicitly listed in the SOW Exclusion clause and generates a billable Change Request with 3-Way Proof.

---

## 📥 Input Document
- **File:** [`Client_Email_MultiCurrency_Request.txt`](file:///C:/Leadger%20Field/test-scenarios/01_agency_vendor_edition/Scenario_1_MultiCurrency_ScopeExpansion/Client_Email_MultiCurrency_Request.txt)
- **Sender:** Dave Miller (VP Product, Acme Corp)
- **Ask:** Dynamic multi-currency pricing (EUR/GBP) and monthly VIP recurring subscription billing.

---

## 🤖 Expected AI Scope Verdict

| Evaluation Field | Expected Value |
| :--- | :--- |
| **Scope Status** | `⚡ OUT_OF_SCOPE (Billable Revenue Detected)` |
| **Opportunity Type** | `Scope Expansion / Excluded Deliverable` |
| **Governing SOW Clause** | `§2.1 Multi-Currency & §2.2 Recurring Subscription Billing Exclusions` |
| **Grounding Reasoning** | SOW §1.3 only covers single-currency USD checkout. Section 2.1 & 2.2 explicitly exclude multi-currency conversion tables and recurring subscription management. |
| **Estimated Hours** | ~28 Hours |
| **Billable Value ($)** | **`$4,200.00 USD`** (28 hrs × $150/hr rate) |
| **Confidence Score** | `>= 88%` |

---

## 💼 Expected Next Action
- **Platform Action:** Click **`⚡ Generate Change Request with Proof →`**
- **Artifact Created:** Change Request **#CR-01** (`$4,200`) with 1-click downloadable PDF for client approval.
