# 🧪 Scopeline Test Scenarios & Multi-Product Benchmark Suite

This directory contains real-world test datasets and benchmark scenarios organized into two dedicated folders based on the product edition:

```
test-scenarios/
├── 01_agency_vendor_edition/
│   ├── SOW_Baseline_AcmeCorp.txt
│   ├── Scenario_1_MultiCurrency_ScopeExpansion/
│   │   ├── Client_Email_MultiCurrency_Request.txt
│   │   └── EXPECTED_OUTCOME.md
│   ├── Scenario_2_Responsive_Tablet_Bug_InScope/
│   │   ├── Client_Email_Tablet_Fix_Request.txt
│   │   └── EXPECTED_OUTCOME.md
│   ├── Scenario_3_Placeholder_Routine_Standup_NA/
│   │   ├── Meeting_Notes_Routine_Standup_NA.txt
│   │   └── EXPECTED_OUTCOME.md
│   └── Scenario_4_Rush_Acceleration_Overtime/
│       ├── Client_Instruction_Rush_Launch.txt
│       └── EXPECTED_OUTCOME.md
│
└── 02_client_buyer_shield_edition/
    ├── SOW_Baseline_DevVendor_Contract.txt
    ├── Scenario_1_DoubleBilling_SearchFilter/
    │   ├── Vendor_ChangeOrder_Claim_SearchFilter.txt
    │   └── EXPECTED_OUTCOME.md
    ├── Scenario_2_Legitimate_Variation_ERP/
    │   ├── Vendor_ChangeOrder_Claim_SAP_ERP.txt
    │   └── EXPECTED_OUTCOME.md
    └── Scenario_3_Warranty_Bug_Disguised_As_Charge/
        ├── Vendor_Invoice_Claim_Checkout_BugFix.txt
        └── EXPECTED_OUTCOME.md
```

---

## 🏢 Product 1: Agency / Vendor Edition (`01_agency_vendor_edition`)

| Scenario | Input File | Expected Scope Status | Billable Value | Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Multi-Currency Expansion** | `Client_Email_MultiCurrency_Request.txt` | `⚡ OUT_OF_SCOPE` | `$4,200` | Generate Change Request #CR-01 |
| **2. Tablet Viewport Bug Fix** | `Client_Email_Tablet_Fix_Request.txt` | `✓ IN_SCOPE` | `$0` | Standard Delivery ($0) |
| **3. Routine Sync / "NA"** | `Meeting_Notes_Routine_Standup_NA.txt` | `✓ IN_SCOPE` | `$0` | Acknowledge & Log ($0) |
| **4. Rush Acceleration** | `Client_Instruction_Rush_Launch.txt` | `⚡ OUT_OF_SCOPE` | `$3,600` | Generate Rush Change Order (1.5x) |

---

## 🛡️ Product 2: Client / Buyer Shield Edition (`02_client_buyer_shield_edition`)

| Scenario | Input File | Expected Audit Verdict | Defended / Approved | Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Search Filter Double-Billing** | `Vendor_ChangeOrder_Claim_SearchFilter.txt` | `⚠️ CHALLENGE_OVERBILLING` | `$3,500 Saved` | Generate SOW Defense Letter |
| **2. Legitimate SAP ERP Sync** | `Vendor_ChangeOrder_Claim_SAP_ERP.txt` | `✓ VALIDATED_VARIATION` | `$6,800 Approved` | Approve Legitimate Change |
| **3. Warranty Bug Disguised** | `Vendor_Invoice_Claim_Checkout_BugFix.txt` | `⚠️ CHALLENGE_OVERBILLING` | `$2,200 Saved` | Generate SOW Warranty Rebuttal |

---

## 🚀 How to Run a Test Scenario:

1. **Upload the Baseline SOW:**
   - Go to **`02 Scope of Work`** (or **`02 Baseline SOW Contract`**).
   - Upload the corresponding `SOW_Baseline_*.txt` file.

2. **Upload / Log the Activity File:**
   - Go to **`03 Project Activity`** (or **`03 Vendor Correspondence`**).
   - Click **`+ Upload Document`** (or paste text via **`+ Log Post-Meeting MOM`**).

3. **Verify Against the `EXPECTED_OUTCOME.md`:**
   - Compare the AI Grounded Proof, Clause citation, and Financial totals against the scenario's expected values.
