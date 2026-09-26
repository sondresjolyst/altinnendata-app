import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/[locale]/not-found';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';

const renderNotFound = (locale: 'no' | 'en') =>
    render(
        <DictionaryProvider locale={locale}>
            <NotFound />
        </DictionaryProvider>,
    );

describe('not found page', () => {
    it('explains the missing page in the reader\'s language', () => {
        renderNotFound('en');
        expect(screen.getByRole('heading')).toHaveTextContent(getDictionary('en').common.notFoundBody);
    });

    it('links to the front page in the current locale', () => {
        renderNotFound('no');
        expect(screen.getByRole('link', { name: getDictionary('no').common.toFrontPage })).toHaveAttribute('href', '/no');
    });
});
