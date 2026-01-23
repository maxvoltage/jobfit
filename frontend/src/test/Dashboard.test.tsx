import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../lib/api';

// Mock the API and toast
vi.mock('../lib/api', () => ({
    getApplications: vi.fn(),
    deleteApplication: vi.fn(),
    getMasterResume: vi.fn(),
}));

vi.mock('../hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe('Dashboard Page', () => {
    const mockApplications = [
        {
            id: '1',
            companyName: 'High Match Corp',
            jobTitle: 'Senior Engineer',
            matchScore: 90,
            applied: false,
            dateAdded: '2024-01-20',
            status: 'todo'
        },
        {
            id: '2',
            companyName: 'Low Match Ltd',
            jobTitle: 'Junior Dev',
            matchScore: 40,
            applied: true,
            dateAdded: '2024-01-21',
            status: 'applied'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(api.getApplications).mockResolvedValue(mockApplications as unknown as JobApplication[]);
        vi.mocked(api.getMasterResume).mockResolvedValue({ id: 1, name: 'Master Resume', is_master: true } as unknown as Resume);
    });


    it('should load and display applications', async () => {
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading applications/i)).toBeInTheDocument();

        await screen.findByText('High Match Corp');
        expect(screen.getByText('Low Match Ltd')).toBeInTheDocument();

        expect(screen.getByText('90%')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('should filter applications when clicking stats cards', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Dashboard />
            </MemoryRouter>
        );

        await screen.findByText('High Match Corp');

        // Click "High Match" filter (score >= 80)
        const highMatchCard = screen.getByRole('button', { name: /high match/i });
        await user.click(highMatchCard);

        expect(screen.getByText('High Match Corp')).toBeInTheDocument();
        expect(screen.queryByText('Low Match Ltd')).not.toBeInTheDocument();

        // Click "Applied" filter
        const appliedCard = screen.getByRole('button', { name: /applied/i });
        await user.click(appliedCard);

        expect(screen.queryByText('High Match Corp')).not.toBeInTheDocument();
        expect(screen.getByText('Low Match Ltd')).toBeInTheDocument();
    });

    it('should delete an application', async () => {
        const user = userEvent.setup();
        vi.mocked(api.deleteApplication).mockResolvedValue(undefined);

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Dashboard />
            </MemoryRouter>
        );

        // Wait for applications to load
        await screen.findByText('High Match Corp');

        // Find delete buttons by aria-label
        const deleteButtons = await screen.findAllByRole('button', { name: /delete/i });

        // Use stopPropagation in the component means we should be able to click it directly
        await user.click(deleteButtons[0]);

        expect(api.deleteApplication).toHaveBeenCalledWith('1');

        await waitFor(() => {
            expect(screen.queryByText('High Match Corp')).not.toBeInTheDocument();
        });
    });
});
