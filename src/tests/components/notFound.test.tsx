import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/[locale]/not-found';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { nbNotFoundStateStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import { defaultNotFoundStateStrings } from '@sjolystinnovation/app-kit/ui';

const renderNotFound = (locale: 'no' | 'en') =>
    render(
        <DictionaryProvider locale={locale}>
            <NotFound />
        </DictionaryProvider>,
    );

describe('not found page', () => {
    it('explains the missing page in the reader\'s language', () => {
        renderNotFound('en');
        expect(screen.getByRole('heading')).toHaveTextContent(defaultNotFoundStateStrings.body);
    });

    it('links to the front page in the current locale', () => {
        renderNotFound('no');
        expect(screen.getByRole('link', { name: nb.home })).toHaveAttribute('href', '/no');
    });
});
