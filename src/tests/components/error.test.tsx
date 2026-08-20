import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocaleError from '@/app/[locale]/error';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';

const renderError = (locale: 'no' | 'en', reset = vi.fn()) => {
    render(
        <DictionaryProvider locale={locale}>
            <LocaleError error={new Error('API unreachable')} reset={reset} />
        </DictionaryProvider>,
    );
    return reset;
};

describe('error boundary', () => {
    it('says the site is temporarily unavailable, in the reader\'s language', () => {
        renderError('no');
        expect(screen.getByRole('heading')).toHaveTextContent(getDictionary('no').common.unavailable);
        expect(screen.getByText(getDictionary('no').common.unavailableBody)).toBeInTheDocument();
    });

    it('is translated', () => {
        renderError('en');
        expect(screen.getByRole('heading')).toHaveTextContent(getDictionary('en').common.unavailable);
    });

    it('lets the reader retry without a full reload', async () => {
        const reset = renderError('no');
        await userEvent.click(screen.getByRole('button', { name: getDictionary('no').common.tryAgain }));

        expect(reset).toHaveBeenCalledOnce();
    });

    it('offers a way out to the front page in the current locale', () => {
        renderError('en');
        expect(screen.getByRole('link')).toHaveAttribute('href', '/en');
    });

    it('does not show the reader the underlying error', () => {
        renderError('no');
        expect(document.body.textContent).not.toContain('API unreachable');
    });
});
