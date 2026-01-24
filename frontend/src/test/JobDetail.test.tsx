import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobDetail from '../pages/JobDetail';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../lib/api';

// Mock the API and toast
vi.mock('../lib/api', () => ({
    getApplication: vi.fn(),
    updateApplication: vi.fn(),
    regenerateContent: vi.fn(),
    downloadJobPdf: vi.fn(),
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
        useParams: () => ({ id: '1' }),
    };
});

describe('JobDetail Page', () => {
    const mockJob = {
        id: '1',
        companyName: 'Test Company',
        jobTitle: 'Software Engineer',
        matchScore: 85,
        applied: false,
        jobDescription: 'Original JD',
        tailoredResume: '<html>Resume</html>',
        coverLetter: '<html>Cover Letter</html>',
        dateAdded: '2024-01-22',
        status: 'todo'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.getApplication).mockResolvedValue(mockJob as unknown as JobApplication);
    });

    it('should load and display job details', async () => {
        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading application/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Test Company')).toBeInTheDocument();
            expect(screen.getByText('Software Engineer')).toBeInTheDocument();
            expect(screen.getByText('85%')).toBeInTheDocument();
        });
    });

    it('should toggle applied status when checkbox is clicked', async () => {
        const user = userEvent.setup();
        vi.mocked(api.updateApplication).mockResolvedValue({ ...mockJob, applied: true, status: 'applied' } as unknown as JobApplication);

        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        const checkbox = screen.getByRole('checkbox', { name: /applied/i });
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);

        expect(api.updateApplication).toHaveBeenCalledWith('1', { applied: true });

        await waitFor(() => {
            expect(checkbox).toBeChecked();
        });
    });

    it('should revert applied status when unchecking', async () => {
        const user = userEvent.setup();
        const appliedJob = { ...mockJob, applied: true, status: 'applied' };
        vi.mocked(api.getApplication).mockResolvedValue(appliedJob as unknown as JobApplication);
        vi.mocked(api.updateApplication).mockResolvedValue({ ...mockJob, applied: false, status: 'todo' } as unknown as JobApplication);

        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        const checkbox = screen.getByRole('checkbox', { name: /applied/i });
        expect(checkbox).toBeChecked();

        await user.click(checkbox);

        expect(api.updateApplication).toHaveBeenCalledWith('1', { applied: false });

        await waitFor(() => {
            expect(checkbox).not.toBeChecked();
        });
    });

    it('should switch between resume and cover letter tabs', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        // Initially on resume tab
        expect(screen.getByRole('tab', { name: /tailored resume/i })).toHaveAttribute('data-state', 'active');

        // Click cover letter tab
        const coverTab = screen.getByRole('tab', { name: /cover letter/i });
        await user.click(coverTab);

        expect(coverTab).toHaveAttribute('data-state', 'active');
        expect(screen.getByRole('tab', { name: /tailored resume/i })).toHaveAttribute('data-state', 'inactive');
    });

    it('should handle content regeneration', async () => {
        const user = userEvent.setup();
        vi.mocked(api.regenerateContent).mockResolvedValue({
            resume: '<html>Regenerated Resume</html>',
            coverLetter: '<html>Regenerated Cover Letter</html>',
            matchScore: 95
        });

        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        // Open regenerate dialog
        const regenButton = screen.getByRole('button', { name: /regenerate/i });
        await user.click(regenButton);

        // Type prompt and start regeneration
        const textarea = screen.getByPlaceholderText(/enter your instructions here/i);
        await user.type(textarea, 'Better resume please');

        const startButton = screen.getByRole('button', { name: /start regeneration/i });
        await user.click(startButton);

        expect(api.regenerateContent).toHaveBeenCalledWith('1', 'Better resume please');

        await waitFor(() => {
            expect(screen.getByText('95%')).toBeInTheDocument();
        });
    });

    it('should call downloadJobPdf with correct type when download button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        // Download resume (default tab)
        const downloadButton = screen.getByRole('button', { name: /download pdf/i });
        await user.click(downloadButton);
        expect(api.downloadJobPdf).toHaveBeenCalledWith('1', 'resume');

        // Switch to cover letter and download
        const coverTab = screen.getByRole('tab', { name: /cover letter/i });
        await user.click(coverTab);
        await user.click(downloadButton);
        expect(api.downloadJobPdf).toHaveBeenCalledWith('1', 'cover');
    });

    it('should allow editing and saving resume content', async () => {
        const user = userEvent.setup();
        const jobWithBody = {
            ...mockJob,
            tailoredResume: '<html><head></head><body><p>Original resume content</p></body></html>',
            coverLetter: '<html><head></head><body><p>Original cover letter</p></body></html>'
        };
        vi.mocked(api.getApplication).mockResolvedValue(jobWithBody as unknown as JobApplication);
        vi.mocked(api.updateApplication).mockResolvedValue(jobWithBody as unknown as JobApplication);

        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        // Click Edit Text button
        const editButton = screen.getByRole('button', { name: /edit text/i });
        await user.click(editButton);

        // Verify edit mode is active - should see Save Changes and Cancel buttons
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        });

        // Click Save Changes
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);

        // Verify updateApplication was called with the content
        await waitFor(() => {
            expect(api.updateApplication).toHaveBeenCalledWith('1', expect.objectContaining({
                tailored_resume: expect.any(String),
                cover_letter: expect.any(String)
            }));
        });

        // Verify we're back in view mode
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /edit text/i })).toBeInTheDocument();
        });
    });

    it('should allow canceling edit mode', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/job/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/job/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('Test Company'));

        // Click Edit Text button
        const editButton = screen.getByRole('button', { name: /edit text/i });
        await user.click(editButton);

        // Verify edit mode is active
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        });

        // Click Cancel
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // Verify we're back in view mode and updateApplication was NOT called
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /edit text/i })).toBeInTheDocument();
        });
        expect(api.updateApplication).not.toHaveBeenCalled();
    });
});

