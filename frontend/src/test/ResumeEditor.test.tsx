import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeEditor } from '../components/ResumeEditor';
import { Resume } from '../types';

// Mock UI components that might cause issues in testing environment
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

describe('ResumeEditor Component', () => {
    const mockResume: Resume = {
        id: 1,
        name: 'Test Resume',
        content: '# Old Content',
        is_selected: true
    };

    const mockResume2: Resume = {
        id: 2,
        name: 'Test Resume 2',
        content: '# New Content',
        is_selected: false
    };

    it('should refresh content when resume prop changes while open', async () => {
        const { rerender } = render(
            <ResumeEditor
                open={true}
                onOpenChange={vi.fn()}
                resume={mockResume}
                onSaveComplete={vi.fn()}
            />
        );

        // Check if old content is there
        const textarea = screen.getByPlaceholderText(/Enter resume content/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe('# Old Content');

        // Rerender with different resume
        rerender(
            <ResumeEditor
                open={true}
                onOpenChange={vi.fn()}
                resume={mockResume2}
                onSaveComplete={vi.fn()}
            />
        );

        // Check if content updated
        await waitFor(() => {
            expect(textarea.value).toBe('# New Content');
        });
    });

    it('should reset content when opening the dialog', async () => {
        const { rerender } = render(
            <ResumeEditor
                open={false}
                onOpenChange={vi.fn()}
                resume={mockResume}
                onSaveComplete={vi.fn()}
            />
        );

        // Open it
        rerender(
            <ResumeEditor
                open={true}
                onOpenChange={vi.fn()}
                resume={mockResume}
                onSaveComplete={vi.fn()}
            />
        );

        const textarea = screen.getByPlaceholderText(/Enter resume content/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe('# Old Content');
    });
});
