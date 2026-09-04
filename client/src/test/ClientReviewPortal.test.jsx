import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClientReviewPortal from '../pages/ClientReviewPortal.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    getPublicReview: vi.fn(),
    approvePublicReview: vi.fn(),
    declinePublicReview: vi.fn(),
    publicCoExportUrl: vi.fn((token) => `/public/change-requests/${token}/export`),
  },
}));

describe('ClientReviewPortal Component', () => {
  const mockReviewData = {
    approvalToken: 'demo-token-123',
    status: 'draft',
    project: {
      id: 'proj-1',
      name: 'Mobile App Modernization',
      clientName: 'Apex Health Systems',
    },
    contractBaseline: {
      originalScope: 'Baseline web portal',
      exclusionsAllowances: 'HIPAA biometric scanner module excluded',
      changeVariationRules: '§4 — Formal written change order required',
    },
    opportunity: {
      id: 'opp-1',
      title: 'Biometric FaceID Login Integration',
      description: 'Client requested Apple FaceID & Android Biometric auth flow.',
      estimatedCost: 3200,
      billableValue: 6400,
      clause: '§4 — Formal written change order required',
    },
    changeRequest: {
      id: 'cr-1',
      number: 'CR-009',
      submitted: '2026-09-01',
      changedScope: 'Native biometric hardware integration.',
      costBreakdown: '32 hours engineering @ $200/hr',
    },
    evidence: [
      { text: 'Can we add FaceID biometric login for next sprint?', source: 'slack_export.json' },
    ],
    timeline: [
      { dateLabel: 'Aug 28, 2026', description: 'Client asked for Biometrics in Slack.' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getPublicReview.mockResolvedValue(mockReviewData);
  });

  it('renders 3-way grounded proof, baseline clauses, and financial math without requiring login', async () => {
    render(<ClientReviewPortal token="demo-token-123" />);

    expect(await screen.findByText(/Biometric FaceID Login Integration/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Apex Health Systems/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/CR-009/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$6,400/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HIPAA biometric scanner module excluded/i)).toBeInTheDocument();
    expect(screen.getByText(/Can we add FaceID biometric login for next sprint\?/i)).toBeInTheDocument();
  });

  it('allows client to fill e-signature form and submit legal approval', async () => {
    api.approvePublicReview.mockResolvedValue({
      ...mockReviewData,
      status: 'approved',
      signedBy: 'Dr. John Sterling (Chief Medical Officer)',
      signedEmail: 'jsterling@apexhealth.org',
      signedAt: '2026-09-04T12:00:00Z',
      clientNotes: 'PO-99120',
    });

    render(<ClientReviewPortal token="demo-token-123" />);

    await screen.findByText(/Biometric FaceID Login Integration/i);

    const nameInput = screen.getByPlaceholderText(/Sarah Jenkins/i);
    const emailInput = screen.getByPlaceholderText(/sjenkins@clientcorp.com/i);
    const authCheckbox = screen.getByRole('checkbox');

    fireEvent.change(nameInput, { target: { value: 'Dr. John Sterling (Chief Medical Officer)' } });
    fireEvent.change(emailInput, { target: { value: 'jsterling@apexhealth.org' } });
    fireEvent.click(authCheckbox);

    const submitBtn = screen.getByRole('button', { name: /Authorize & Execute Change Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.approvePublicReview).toHaveBeenCalledWith('demo-token-123', expect.objectContaining({
        signedBy: 'Dr. John Sterling (Chief Medical Officer)',
        signedEmail: 'jsterling@apexhealth.org',
      }));
    });

    expect(await screen.findByText(/Change Order Executed/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. John Sterling/i)).toBeInTheDocument();
  });
});
