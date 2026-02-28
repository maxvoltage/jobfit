import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UploadResume from '../pages/UploadResume';
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
    uploadResume: vi.fn(),
    importResumeFromUrl: vi.fn(),
    addResumeManual: vi.fn(),
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

describe('UploadResume', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    describe('Drag and Drop', () => {
        it('should handle drag enter events', async () => {
            render(
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <UploadResume />
                    </MemoryRouter>
                </QueryClientProvider>
            );

            // Switch to File tab
            const fileTab = screen.getByRole('tab', { name: /pdf file/i });
            await userEvent.click(fileTab);

            const dropZone = (await screen.findByText(/click to upload or drag and drop/i)).closest('div.relative');
            expect(dropZone).toBeInTheDocument();
        });
    });

    describe('URL Import', () => {
        it('should handle import via URL (default tab)', async () => {
            const user = userEvent.setup();
            vi.mocked(api.importResumeFromUrl).mockResolvedValue({
                id: 1,
                name: 'Test Resume',
                content: 'Imported content',
                isSelected: true
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <UploadResume />
                    </MemoryRouter>
                </QueryClientProvider>
            );

            // URL tab is default, so no need to click it
            const urlTab = screen.getByRole('tab', { name: /from url/i });
            expect(urlTab.getAttribute('data-state')).toBe('active');

            // Fill name
            const nameInput = screen.getByLabelText(/resume name/i);
            await user.type(nameInput, 'My LinkedIn');

            // Fill URL
            const urlInput = screen.getByPlaceholderText(/linkedin.com/i);
            await user.type(urlInput, 'https://linkedin.com/in/test');

            // Click Import
            const importButton = screen.getByRole('button', { name: /import and process/i });
            await user.click(importButton);

            await waitFor(() => {
                expect(api.importResumeFromUrl).toHaveBeenCalledWith('https://linkedin.com/in/test', 'My LinkedIn');
                expect(screen.getByText(/resume added/i)).toBeDefined();
            });
        });
    });

    describe('Paste Text', () => {
        it('should handle resume pasting', async () => {
            const user = userEvent.setup();
            vi.mocked(api.addResumeManual).mockResolvedValue({
                id: 2,
                name: 'Pasted Resume',
                content: 'Cleaned content',
                isSelected: true
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <UploadResume />
                    </MemoryRouter>
                </QueryClientProvider>
            );

            // Switch to Paste tab
            const pasteTab = screen.getByRole('tab', { name: /manual entry/i });
            await user.click(pasteTab);

            // Fill name
            const nameInput = screen.getByLabelText(/resume name/i);
            await user.type(nameInput, 'Manual Resume');

            // Fill Content
            const textArea = screen.getByPlaceholderText(/paste your resume text here/i);
            await user.type(textArea, 'This is my resume text content which is long enough.');

            // Click Save
            const saveButton = screen.getByRole('button', { name: /clean and save/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(api.addResumeManual).toHaveBeenCalledWith('This is my resume text content which is long enough.', 'Manual Resume');
                expect(screen.getByText(/resume added/i)).toBeDefined();
            });
        });
    });
});
