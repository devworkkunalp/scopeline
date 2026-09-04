import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceTracking from '../pages/InvoiceTracking.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    opportunities: vi.fn(),
    invoices: vi.fn(),
    generateDefenseLetter: vi.fn(),
    reconcilePayment: vi.fn(),
    patchInvoice: vi.fn(),
    deleteInvoice: vi.fn(),
    setStatus: vi.fn(),
    addInvoice: vi.fn(),
  },
}));

describe('InvoiceTracking Component', () => {
  const mockClientProject = {
    id: 'proj-123',
    name: 'Enterprise Web Application & Portal',
    clientName: 'DevConsulting Global Ltd.',
    scopeValue: 185000,
    perspective: 'client',
  };

  const mockAgencyProject = {
    id: 'proj-456',
    name: 'Mobile App Project',
    clientName: 'Startup Inc',
    scopeValue: 90000,
    perspective: 'vendor',
  };

  const mockOpportunities = [
    {
      id: 'opp-1',
      title: 'Vendor Change Order #04 - Category Filter Implementation',
      desc: 'Surcharge for category filtering',
      billable: 3500,
      invoiced: 0,
      status: 'detected',
      clause: 'SOW Section 1.2 Baseline Deliverables',
      changeRequest: { number: 'CR-010' },
      evidence: [{ text: 'We require $3,500', src: 'Vendor_Email.txt' }],
    },
  ];

  const mockInvoices = [
    {
      id: 'inv-1',
      number: 'INV-2026-001',
      date: '2026-09-01',
      amount: 46250,
      collected: 46250,
      related: 'Milestone 1 — Architecture',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.opportunities.mockResolvedValue(mockOpportunities);
    api.invoices.mockResolvedValue(mockInvoices);
  });

  it('Client Shield Edition: renders defense KPIs and overbilling shield badges', async () => {
    render(<InvoiceTracking activeProject={mockClientProject} />);

    expect(await screen.findByText(/Vendor Invoice Audit & Payment Shield/i)).toBeInTheDocument();
    expect(await screen.findByText(/Contract Sum Committed/i)).toBeInTheDocument();
    expect(await screen.findByText(/Overbilling Blocked & Saved/i)).toBeInTheDocument();
    expect(await screen.findByText(/Vendor Billing Surcharges & Change Claims Audit/i)).toBeInTheDocument();
    const titleElements = await screen.findAllByText(/Vendor Change Order #04 - Category Filter Implementation/i);
    expect(titleElements[0]).toBeInTheDocument();
    const disputeButtons = await screen.findAllByRole('button', { name: /🛡️ Dispute Line Item/i });
    expect(disputeButtons[0]).toBeInTheDocument();
  });

  it('Client Shield Edition: opens dispute modal with SOW proof when Dispute is clicked', async () => {
    api.generateDefenseLetter.mockResolvedValue({
      subject: 'Notice of Disputed Surcharge: Category Filter ($3,500)',
      body: 'Pursuant to SOW Section 1.2 Baseline Deliverables, payment is withheld.',
      sowReference: 'SOW Section 1.2',
      verdict: 'CHALLENGE_OVERBILLING',
      disputedAmount: 3500,
    });

    render(<InvoiceTracking activeProject={mockClientProject} />);

    const disputeButtons = await screen.findAllByRole('button', { name: /🛡️ Dispute Line Item/i });
    fireEvent.click(disputeButtons[0]);

    expect(await screen.findByText(/Contractual Payment Defense Notice/i)).toBeInTheDocument();
    expect(await screen.findByText(/DISPUTED CLAIM AMOUNT:/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /🛡️ Confirm Dispute & Withhold Payment/i })).toBeInTheDocument();
  });

  it('Agency Edition: renders revenue recovery metrics and reconciliation action buttons', async () => {
    api.opportunities.mockResolvedValue([
      {
        id: 'opp-2',
        title: 'Multi-Currency Gateway',
        billable: 6000,
        invoiced: 0,
        status: 'approved',
        changeRequest: { number: 'CR-002' },
      },
    ]);

    render(<InvoiceTracking activeProject={mockAgencyProject} />);

    expect(await screen.findByText(/Approved value reconciled against what's actually been billed/i)).toBeInTheDocument();
    expect(await screen.findByText(/Potentially Unbilled/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /✓ Clear \(Full\)/i })).toBeInTheDocument();
  });
});
