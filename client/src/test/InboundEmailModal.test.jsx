import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InboundEmailModal from '../components/InboundEmailModal.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    inboundAddress: vi.fn(),
    simulateInboundEmail: vi.fn(),
  },
}));

describe('InboundEmailModal Component', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Enterprise Cloud Portal',
    clientName: 'Apex Health Systems',
    perspective: 'vendor',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.inboundAddress.mockResolvedValue({
      standardInboundAddress: 'inbound+proj-123@scopeline.io',
      vanityInboundAddress: 'project-enterprise-cloud-portal-proj-123@inbound.scopeline.io',
    });
    api.simulateInboundEmail.mockResolvedValue({
      success: true,
      message: 'Email successfully ingested and classified as OUT OF SCOPE.',
      projectId: 'proj-123',
      isOutOfScope: true,
      billableValue: 3600,
      clause: '§4.0 — Change Orders Required',
      opportunityTitle: 'Urgent: Add Stripe Multi-Currency Subscriptions to Portal',
    });
  });

  it('renders inbound forwarding address and sample email presets', async () => {
    render(<InboundEmailModal activeProject={mockProject} onClose={() => {}} />);

    expect(await screen.findByText(/Inbound Email Forwarding & Zero-Manual Scope Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText('inbound+proj-123@scopeline.io')).toBeInTheDocument();
    expect(screen.getByText(/Multi-Currency & Subscriptions/i)).toBeInTheDocument();
  });

  it('allows simulating inbound email ingestion and displays out-of-scope verdict with auto-created opportunity', async () => {
    const mockIngested = vi.fn();
    render(<InboundEmailModal activeProject={mockProject} onClose={() => {}} onIngested={mockIngested} />);

    const submitBtn = screen.getByRole('button', { name: /Simulate Inbound Email Ingestion/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.simulateInboundEmail).toHaveBeenCalledWith(
        'proj-123',
        expect.objectContaining({
          from: expect.any(String),
          subject: expect.any(String),
          createChangeRequest: true,
        })
      );
    });

    expect(await screen.findByText(/OUT OF SCOPE VARIATION DETECTED/i)).toBeInTheDocument();
    expect(screen.getByText('+$3,600')).toBeInTheDocument();
    expect(screen.getByText(/§4.0 — Change Orders Required/i)).toBeInTheDocument();
    expect(mockIngested).toHaveBeenCalled();
  });
});
