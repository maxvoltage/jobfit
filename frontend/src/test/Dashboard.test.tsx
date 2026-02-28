import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '../lib/api';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

// Mock the API and toast
vi.mock('../lib/api', () => ({
    getApplications: vi.fn(),
    deleteApplication: vi.fn(),
    getSelectedResume: vi.fn(),
    getResumes: vi.fn(),
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
        queryClient.clear();
        vi.mocked(api.getApplications).mockResolvedValue(mockApplications as unknown as JobApplication[]);
        vi.mocked(api.getSelectedResume).mockResolvedValue({ id: 1, name: 'First Resume', isSelected: true } as unknown as Resume);
        vi.mocked(api.getResumes).mockResolvedValue([{ id: 1, name: 'First Resume', content: '...', isSelected: true } as unknown as Resume]);
    });


    it('should load and display applications', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Dashboard />
                </MemoryRouter>
            </QueryClientProvider>
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
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Dashboard />
                </MemoryRouter>
            </QueryClientProvider>
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
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Dashboard />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Wait for applications to load
        await screen.findByText('High Match Corp');

        // Find delete buttons by aria-label
        const deleteButtons = await screen.findAllByRole('button', { name: /delete/i });

        // Click the first delete button to open the confirmation dialog
        await user.click(deleteButtons[0]);

        // Mock next call to return updated list
        vi.mocked(api.getApplications).mockResolvedValue(mockApplications.slice(1) as unknown as JobApplication[]);

        // Find and click the "Delete" button in the AlertDialog
        const confirmDeleteButton = screen.getByRole('button', { name: /^delete$/i });
        await user.click(confirmDeleteButton);

        expect(api.deleteApplication).toHaveBeenCalledWith('1');

        await waitFor(() => {
            expect(screen.queryByText('High Match Corp')).not.toBeInTheDocument();
        });
    });

    it('should show the selected resume and allow opening the selector', async () => {
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Dashboard />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Wait for resume to load
        await screen.findByText('First Resume');

        // Check if the button is there
        const resumeButton = screen.getByRole('button', { name: /first resume/i });
        expect(resumeButton).toBeInTheDocument();

        // Click to open selector
        await user.click(resumeButton);

        // Should see the selector dialog title
        expect(screen.getByText(/select your resume/i)).toBeInTheDocument();
    });
});
