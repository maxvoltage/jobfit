import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadJobPdf } from '../lib/api';

describe('API Utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch
        global.fetch = vi.fn();
        // Mock URL.createObjectURL and revokeObjectURL
        global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
        global.URL.revokeObjectURL = vi.fn();

        // Mock document.createElement and body.appendChild for download logic
        vi.spyOn(document, 'createElement');
        vi.spyOn(document.body, 'appendChild');
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });
    });


    it('downloadJobPdf should use GET method', async () => {
        const mockResponse = {
            ok: true,
            blob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/pdf' })),
            headers: {
                get: vi.fn().mockReturnValue('attachment; filename="test.pdf"')
            }
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);


        await downloadJobPdf('123', 'resume');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/jobs/123/pdf?pdf_type=resume'),
            expect.objectContaining({
                method: 'GET'
            })
        );
    });
});
