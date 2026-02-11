import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../lib/api';

describe('API Utils - Downloads', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-expect-error - Mocking location
        delete window.location;
        window.location = { ...originalLocation, assign: vi.fn() };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    it('downloadJobPdf should assign correct location', () => {
        api.downloadJobPdf('123', 'resume');
        expect(window.location.assign).toHaveBeenCalledWith(
            expect.stringContaining('/api/jobs/123/pdf?pdf_type=resume')
        );
    });

    it('downloadJobDocx should assign correct location', () => {
        api.downloadJobDocx('123', 'cover');
        expect(window.location.assign).toHaveBeenCalledWith(
            expect.stringContaining('/api/jobs/123/docx?type=cover')
        );
    });

    it('downloadResumePdf should assign correct location', () => {
        api.downloadResumePdf('456');
        expect(window.location.assign).toHaveBeenCalledWith(
            expect.stringContaining('/api/resumes/456/pdf')
        );
    });

    it('downloadResumeDocx should assign correct location', () => {
        api.downloadResumeDocx('456');
        expect(window.location.assign).toHaveBeenCalledWith(
            expect.stringContaining('/api/resumes/456/docx')
        );
    });
});
