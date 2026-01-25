import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('ResumeSelector Component', () => {
    const mockResumes: Resume[] = [
        { id: 1, name: 'First Resume', content: 'Content 1', is_selected: false },
        { id: 2, name: 'Active Resume', content: 'Content 2', is_selected: true },
        { id: 3, name: 'Third Resume', content: 'Content 3', is_selected: false },
    ];

    it('should initially preview the selected resume when opened', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
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
        const { rerender } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
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
        firstResumeBtn.click();

        // Should now preview "First Resume"
        await waitFor(() => {
            expect(screen.getByText('Content 1')).toBeInTheDocument();
        });
    });
});
