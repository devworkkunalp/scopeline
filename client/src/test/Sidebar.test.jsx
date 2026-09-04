import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar.jsx';

describe('Sidebar Component', () => {
  const mockProjects = [
    { id: 'p1', name: 'Enterprise Portal', perspective: 'client' },
    { id: 'p2', name: 'Mobile App', perspective: 'vendor' },
  ];

  it('renders Client Shield edition badge and client navigation labels when perspective is client', () => {
    const setPage = vi.fn();
    render(
      <Sidebar
        page="dashboard"
        setPage={setPage}
        projects={mockProjects}
        activeProjectId="p1"
        workspace={{ perspective: 'client' }}
        user={{ displayName: 'Kunal Founder' }}
      />
    );

    expect(screen.getByText(/CLIENT SHIELD EDITION/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope & Overbilling Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendor Invoices/i)).toBeInTheDocument();

    const invoicesBtn = screen.getByRole('button', { name: /Vendor Invoices/i });
    fireEvent.click(invoicesBtn);
    expect(setPage).toHaveBeenCalledWith('invoices');
  });

  it('renders Agency edition badge and revenue navigation labels when perspective is vendor', () => {
    const setPage = vi.fn();
    render(
      <Sidebar
        page="dashboard"
        setPage={setPage}
        projects={mockProjects}
        activeProjectId="p2"
        workspace={{ perspective: 'vendor' }}
        user={{ displayName: 'Sarah PM' }}
      />
    );

    expect(screen.getByText(/AGENCY EDITION/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope Opportunities/i)).toBeInTheDocument();
    expect(screen.getByText(/Invoice Tracking/i)).toBeInTheDocument();
  });
});
