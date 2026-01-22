import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewApplication from '../pages/NewApplication';
import { BrowserRouter } from 'react-router-dom';
import * as api from '../lib/api';

// Mock the API and toast
vi.mock('../lib/api', () => ({
    analyzeJobUrl: vi.fn(),
    analyzeJobDescription: vi.fn(),
    getResumes: vi.fn(),
    saveApplication: vi.fn(),
}));

vi.mock('../hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('NewApplication Auto-save and Redirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.getResumes).mockResolvedValue([{ id: 1, name: 'Resume 1', is_master: true }]);
    });

    it('should analyze manual entry and redirect immediately', async () => {
        const user = userEvent.setup();
        const mockResult = {
            id: '123',
            companyName: 'Test Corp',
            jobTitle: 'Backend Developer',
            matchScore: 90,
            tailoredResume: '<html>Content</html>',
            cover_letter: '<html>Letter</html>'
        };

        vi.mocked(api.analyzeJobDescription).mockResolvedValue(mockResult as any);

        render(
            <BrowserRouter>
                <NewApplication />
            </BrowserRouter>
        );

        // Wait for resumes to load
        await waitFor(() => {
            expect(screen.queryByText(/No resumes found/i)).toBeNull();
        });

        // Switch to manual tab
        const manualTab = screen.getByRole('tab', { name: /manual entry/i });
        await user.click(manualTab);

        // Find textarea - use more flexible query
        const textarea = await screen.findByPlaceholderText(/paste the full job description/i);

        // Fill description
        await user.type(textarea, 'Awesome job description');

        // Click Analyze - the one in the manual tab
        const analyzeButton = screen.getAllByRole('button', { name: /analyze/i }).find(btn => btn.closest('[data-state="active"]'));
        if (!analyzeButton) throw new Error('Analyze button not found');

        await user.click(analyzeButton);

        // Wait for analysis and redirect
        await waitFor(() => {
            expect(api.analyzeJobDescription).toHaveBeenCalledWith('Awesome job description', 1);
            expect(mockNavigate).toHaveBeenCalledWith('/job/123');
        });
    });

    it('should default to master resume even if it is not the first one', async () => {
        const resumes = [
            { id: 1, name: 'Old CV', is_master: false },
            { id: 2, name: 'Latest Master CV', is_master: true },
            { id: 3, name: 'Draft CV', is_master: false }
        ];
        vi.mocked(api.getResumes).mockResolvedValue(resumes);

        render(
            <BrowserRouter>
                <NewApplication />
            </BrowserRouter>
        );

        // Wait for resumes to load and check selected value in trigger
        await waitFor(() => {
            const trigger = screen.getByRole('combobox');
            expect(trigger.textContent).toContain('Latest Master CV');
        });
    });
});
