import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DefenseLetterModal from '../components/DefenseLetterModal.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    generateDefenseLetter: vi.fn(),
  },
}));

describe('DefenseLetterModal Component', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Enterprise Cloud Migration',
    clientName: 'Global Horizon Bank',
    perspective: 'vendor',
  };

  const mockOpp = {
    id: 'opp-1',
    title: 'Custom Kubernetes Disaster Recovery Setup',
    billable: 14500,
    clause: '§4.2 — SOW Exclusions',
  };

  const mockResponse = {
    subject: 'Scope Alignment & Change Order Summary: Custom Kubernetes Disaster Recovery Setup [Enterprise Cloud Migration]',
    body: 'Dear Global Horizon Bank,\n\nThank you for your partnership on Enterprise Cloud Migration.\n\nWe have prepared Change Order #CR-012 ($14,500).',
    sowReference: '§4.2 — SOW Exclusions',
    challengeVerdict: 'OUT_OF_SCOPE_DEFENDED',
    defendedAmount: 14500,
    tone: 'diplomatic',
    perspective: 'vendor',
    evidenceCitations: ['"Please add multi-region K8s failover" (Source: slack_ticket.json)'],
    suggestedNextSteps: 'Provide the magic link to the client for digital execution.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.generateDefenseLetter.mockResolvedValue(mockResponse);
  });

  it('renders defense letter modal with formatted subject, body, and SOW reference', async () => {
    render(<DefenseLetterModal project={mockProject} opp={mockOpp} onClose={() => {}} />);

    expect(await screen.findByText(/Scope Alignment & Change Order Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/We have prepared Change Order #CR-012/i)).toBeInTheDocument();
    expect(screen.getByText(/§4.2 — SOW Exclusions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$14,500/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls api with selected tone when user switches to Formal Contractual tone', async () => {
    render(<DefenseLetterModal project={mockProject} opp={mockOpp} onClose={() => {}} />);

    await screen.findByText(/Scope Alignment & Change Order Summary/i);

    const formalToneBtn = screen.getByText(/Formal Contractual/i);
    fireEvent.click(formalToneBtn);

    await waitFor(() => {
      expect(api.generateDefenseLetter).toHaveBeenCalledWith(
        'proj-1',
        'opp-1',
        expect.objectContaining({ tone: 'firm_contractual' })
      );
    });
  });

  it('copies notice text to clipboard when copy button is clicked', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    render(<DefenseLetterModal project={mockProject} opp={mockOpp} onClose={() => {}} />);

    await screen.findByText(/Scope Alignment & Change Order Summary/i);

    const copyBtn = screen.getByRole('button', { name: /Copy Notice Text/i });
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('SUBJECT: Scope Alignment & Change Order Summary')
    );
    expect(await screen.findByText(/Copied Notice!/i)).toBeInTheDocument();
  });
});
