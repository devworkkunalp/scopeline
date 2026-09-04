# Scenario 1: Double-Billing Attempt on SOW Deliverable (Search Filter)

## 🎯 Test Objective
Validate that Scopeline's Client Shield Edition catches a vendor attempting to bill a $3,500 Change Order for a deliverable already promised in SOW Section 1.2 and automatically generates a formal dispute letter citing the contract.

---

## 📥 Input Document
- **File:** [`Vendor_ChangeOrder_Claim_SearchFilter.txt`](file:///C:/Leadger%20Field/test-scenarios/02_client_buyer_shield_edition/Scenario_1_DoubleBilling_SearchFilter/Vendor_ChangeOrder_Claim_SearchFilter.txt)
- **Vendor:** DevConsulting Global Ltd.
- **Claim:** Change Order #04 requesting +$3,500 for "Faceted Category Filter".

---

## 🤖 Expected AI Scope Verdict

| Evaluation Field | Expected Value |
| :--- | :--- |
| **Audit Status** | `⚠️ CHALLENGE_OVERBILLING (Already In-Scope Deliverable)` |
| **Claim Type** | `Redundant Charge / Double-Billing Defense` |
| **Governing SOW Clause** | `§1.2 Search & Discovery (Faceted Category Filter)` |
| **Grounding Reasoning** | SOW §1.2 explicitly includes "multi-attribute faceted category filters" within the contracted $185,000 baseline. The vendor has already been paid for this deliverable. |
| **Defended Budget Amount** | **`$3,500.00 USD Saved`** |
| **Confidence Score** | `>= 94%` |

---

## 💼 Expected Next Action
- **Platform Action:** Click **`🛡️ Generate SOW Defense Letter →`**
- **Result:** Generates formal SOW Rebuttal letter citing Section 1.2 to decline the $3,500 charge and instruct the vendor to proceed under the baseline contract sum.
