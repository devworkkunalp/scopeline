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

  it('renders inbound forwarding address and instant paste box', async () => {
    render(<InboundEmailModal activeProject={mockProject} onClose={() => {}} />);

    expect(await screen.findByText(/Forward Client Email for Instant Scope Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText('inbound+proj-123@scopeline.io')).toBeInTheDocument();
    expect(screen.getByText(/Option B: Paste Email Thread or Drop Content Here/i)).toBeInTheDocument();
  });

  it('allows pasting email and auto-processing scope with zero manual forms', async () => {
    const mockIngested = vi.fn();
    render(<InboundEmailModal activeProject={mockProject} onClose={() => {}} onIngested={mockIngested} />);

    const sampleBtn = screen.getByRole('button', { name: /Paste Sample Email/i });
    fireEvent.click(sampleBtn);

    const submitBtn = screen.getByRole('button', { name: /Auto-Process Email/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.simulateInboundEmail).toHaveBeenCalledWith(
        'proj-123',
        expect.objectContaining({
          body: expect.stringContaining('Stripe Multi-Currency'),
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
