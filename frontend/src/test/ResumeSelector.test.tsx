import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ResumeSelector } from '../components/ResumeSelector';
import { Resume } from '../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock('@/lib/api', () => ({
    downloadResumePdf: vi.fn(),
    downloadResumeDocx: vi.fn(),
}));

import * as api from '@/lib/api';

describe('ResumeSelector Component', () => {
    const mockResumes: Resume[] = [
        { id: 1, name: 'First Resume', content: 'Content 1', isSelected: false },
        { id: 2, name: 'Active Resume', content: 'Content 2', isSelected: true },
        { id: 3, name: 'Third Resume', content: 'Content 3', isSelected: false },
    ];

    it('should initially preview the selected resume when opened', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ResumeSelector
                        open={true}
                        onOpenChange={vi.fn()}
                        resumes={mockResumes}
                        selectedResumeId="2"
                        onSelectResume={vi.fn()}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Check if "Active Resume" is the one being previewed
        const names = screen.getAllByText('Active Resume');
        expect(names.length).toBeGreaterThan(0);
        expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should allow switching between resumes for preview', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ResumeSelector
                        open={true}
                        onOpenChange={vi.fn()}
                        resumes={mockResumes}
                        selectedResumeId="2"
                        onSelectResume={vi.fn()}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Preview "Active Resume" (id: 2) initially
        expect(screen.getByText('Content 2')).toBeInTheDocument();

        // Simulate clicking "First Resume"
        const firstResumeBtn = screen.getByText('First Resume');
        fireEvent.click(firstResumeBtn);

        // Should now preview "First Resume"
        await waitFor(() => {
            expect(screen.getByText('Content 1')).toBeInTheDocument();
        });
    });

    it('should show PDF and Word download buttons in preview', async () => {
        const user = userEvent.setup();

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ResumeSelector
                        open={true}
                        onOpenChange={vi.fn()}
                        resumes={mockResumes}
                        selectedResumeId="2"
                        onSelectResume={vi.fn()}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // PDF button
        const pdfButton = screen.getByRole('button', { name: /^pdf$/i });
        expect(pdfButton).toBeInTheDocument();

        // Word button
        const wordButton = screen.getByRole('button', { name: /^word$/i });
        expect(wordButton).toBeInTheDocument();

        // Test PDF click
        await user.click(pdfButton);
        expect(api.downloadResumePdf).toHaveBeenCalledWith("2");

        // Test Word click
        await user.click(wordButton);
        expect(api.downloadResumeDocx).toHaveBeenCalledWith("2");
    });
});
