import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UploadResume from '../pages/UploadResume';
import { BrowserRouter } from 'react-router-dom';

// Mock the API and toast
vi.mock('../lib/api', () => ({
    uploadResume: vi.fn(),
}));

vi.mock('../hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe('UploadResume Drag and Drop', () => {
    it('should visually change state when dragging over', () => {
        render(
            <BrowserRouter>
                <UploadResume />
            </BrowserRouter>
        );

        const dropZone = screen.getByText(/click to upload or drag and drop/i).parentElement?.parentElement;
        if (!dropZone) throw new Error('Drop zone not found');

        // Initial state
        expect(dropZone.className).not.toContain('scale-[1.02]');

        // Drag over
        fireEvent.dragOver(dropZone);
        expect(dropZone.className).toContain('scale-[1.02]');

        // Drag leave
        fireEvent.dragLeave(dropZone);
        expect(dropZone.className).not.toContain('scale-[1.02]');
    });

    it('should handle drop event', () => {
        render(
            <BrowserRouter>
                <UploadResume />
            </BrowserRouter>
        );

        const dropZone = screen.getByText(/click to upload or drag and drop/i).parentElement?.parentElement;
        if (!dropZone) throw new Error('Drop zone not found');

        const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });

        // Simulate drop
        fireEvent.drop(dropZone, {
            dataTransfer: {
                files: [file],
            },
        });

        // Verify file name appears in UI
        expect(screen.getByText('resume.pdf')).toBeDefined();
    });
});
