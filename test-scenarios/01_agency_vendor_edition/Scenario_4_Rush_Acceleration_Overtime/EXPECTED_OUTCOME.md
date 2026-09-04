# Scenario 4: Accelerated Rush Launch & Overtime Request

## 🎯 Test Objective
Validate that Scopeline detects schedule acceleration with less than 10 days notice and applies the contractual 1.5x surge rate ($225/hr) under SOW Section 3.3.

---

## 📥 Input Document
- **File:** [`Client_Instruction_Rush_Launch.txt`](file:///C:/Leadger%20Field/test-scenarios/01_agency_vendor_edition/Scenario_4_Rush_Acceleration_Overtime/Client_Instruction_Rush_Launch.txt)
- **Sender:** Dave Miller (VP Product, Acme Corp)
- **Ask:** Move launch up by 2.5 weeks, requiring weekend crew and engineering overtime.

---

## 🤖 Expected AI Scope Verdict

| Evaluation Field | Expected Value |
| :--- | :--- |
| **Scope Status** | `⚡ OUT_OF_SCOPE (Billable Acceleration)` |
| **Opportunity Type** | `Schedule Acceleration / Rush Delivery` |
| **Governing SOW Clause** | `§3.3 Accelerated Rush Delivery Rate (1.5x Surge)` |
| **Grounding Reasoning** | SOW §1.5 sets baseline delivery to May 15. SOW §3.3 stipulates that schedule compression requested with <10 days notice is billable at the accelerated 1.5x rate ($225/hr). |
| **Estimated Hours** | ~16 Hours (Weekend Overtime Crew) |
| **Billable Value ($)** | **`$3,600.00 USD`** (16 hrs × $225/hr rush rate) |
| **Confidence Score** | `>= 86%` |

---

## 💼 Expected Next Action
- **Platform Action:** Click **`⚡ Generate Change Request with Proof →`**
- **Artifact Created:** Change Request **#CR-02** (`$3,600`) for Accelerated Delivery with SOW schedule citation.
