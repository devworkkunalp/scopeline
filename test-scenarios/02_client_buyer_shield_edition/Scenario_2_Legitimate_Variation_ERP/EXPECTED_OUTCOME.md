# Scenario 2: Legitimate Out-of-Scope Variation (SAP ERP Integration)

## 🎯 Test Objective
Validate that Scopeline accurately recognizes a legitimate out-of-scope request under SOW Section 2.1, confirms the rate against Section 3.1 ($150/hr), and approves it as a valid variation.

---

## 📥 Input Document
- **File:** [`Vendor_ChangeOrder_Claim_SAP_ERP.txt`](file:///C:/Leadger%20Field/test-scenarios/02_client_buyer_shield_edition/Scenario_2_Legitimate_Variation_ERP/Vendor_ChangeOrder_Claim_SAP_ERP.txt)
- **Vendor:** DevConsulting Global Ltd.
- **Claim:** Change Order #05 requesting +$6,800 for "SAP NetWeaver ERP Sync".

---

## 🤖 Expected AI Scope Verdict

| Evaluation Field | Expected Value |
| :--- | :--- |
| **Audit Status** | `✓ VALIDATED_VARIATION (Legitimate Out-of-Scope Scope Addition)` |
| **Claim Type** | `Excluded Enterprise Integration` |
| **Governing SOW Clause** | `§2.1 Exclusions (Enterprise ERP Integrations)` |
| **Grounding Reasoning** | SOW §2.1 explicitly excludes SAP/ERP integrations. The vendor's $150/hr rate conforms to Section 3.1 commercial terms. |
| **Approved Amount ($)** | **`$6,800.00 USD`** (Fair Market Variation) |
| **Confidence Score** | `>= 91%` |

---

## 💼 Expected Next Action
- **Platform Action:** Click **`✓ Approve Legitimate Change Order`**
- **Result:** Authorizes Change Order #05 into the project schedule and updates the client budget cleanly.
