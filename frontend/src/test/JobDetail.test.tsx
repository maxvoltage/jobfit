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
        vi.mocked(api.getApplication).mockResolvedValue(mockJob as any);
    });

    it('should load and display job details', async () => {
        render(
            <MemoryRouter initialEntries={['/job/1']}>
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
        vi.mocked(api.updateApplication).mockResolvedValue({ ...mockJob, applied: true, status: 'applied' } as any);

        render(
            <MemoryRouter initialEntries={['/job/1']}>
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
        vi.mocked(api.getApplication).mockResolvedValue(appliedJob as any);
        vi.mocked(api.updateApplication).mockResolvedValue({ ...mockJob, applied: false, status: 'todo' } as any);

        render(
            <MemoryRouter initialEntries={['/job/1']}>
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
});
