import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle';
import * as nextThemes from 'next-themes';

// Mock next-themes
vi.mock('next-themes', () => ({
    useTheme: vi.fn(),
}));

describe('ThemeToggle', () => {
    const mockSetTheme = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (nextThemes.useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            theme: 'system',
            setTheme: mockSetTheme,
        });
    });


    it('should render theme toggle buttons', async () => {
        render(<ThemeToggle />);

        // Wait for component to mount (it returns null until mounted)
        const lightTrigger = await screen.findByTitle(/light theme/i);
        const darkTrigger = screen.getByTitle(/dark theme/i);
        const systemTrigger = screen.getByTitle(/system theme/i);

        expect(lightTrigger).toBeInTheDocument();
        expect(darkTrigger).toBeInTheDocument();
        expect(systemTrigger).toBeInTheDocument();
    });

    it('should call setTheme when clicking theme buttons', async () => {
        const user = userEvent.setup();
        render(<ThemeToggle />);

        // Wait for component to mount
        const darkTrigger = await screen.findByTitle(/dark theme/i);
        const lightTrigger = screen.getByTitle(/light theme/i);

        // Click dark theme - this should work because current theme is 'system'
        await user.click(darkTrigger);
        expect(mockSetTheme).toHaveBeenCalledWith('dark');

        // Click light theme - this should also work
        await user.click(lightTrigger);
        expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should show system theme as active by default', async () => {
        render(<ThemeToggle />);

        const systemTrigger = await screen.findByTitle(/system theme/i);
        expect(systemTrigger).toHaveAttribute('data-state', 'active');
    });
});
