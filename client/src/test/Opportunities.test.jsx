import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Opportunities from '../pages/Opportunities.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    opportunities: vi.fn(),
    setStatus: vi.fn(),
    generateCo: vi.fn(),
  },
}));

describe('Opportunities Page Component', () => {
  const mockClientProject = {
    id: 'proj-1',
    name: 'Enterprise Web Application & Portal',
    clientName: 'DevConsulting Global Ltd.',
    scopeValue: 185000,
    perspective: 'client',
  };

  const mockOpportunities = [
    {
      id: 'opp-1',
      title: 'Vendor Change Order #04 - Category Filter Implementation',
      desc: 'Supplementary billing attempt for faceted filter',
      billable: 3500,
      confidence: 0.95,
      status: 'detected',
      type: 'Redundant Scope Surcharge',
      clause: 'SOW Section 1.2 Baseline Deliverables',
      evidence: [{ text: 'We require $3,500', src: 'Vendor_Email.txt' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.opportunities.mockResolvedValue(mockOpportunities);
  });

  it('renders opportunity items with title, amount, and SOW clause reference', async () => {
    render(<Opportunities activeProject={mockClientProject} />);

    expect(await screen.findByText(/Vendor Change Order #04 - Category Filter Implementation/i)).toBeInTheDocument();
    expect(await screen.findByText(/SOW Section 1.2 Baseline Deliverables/i)).toBeInTheDocument();
  });
});
