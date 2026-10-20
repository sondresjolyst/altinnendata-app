import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '@/app/[locale]/footer';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';
import type { CompanyInfo } from '@/lib/companyInfo';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
vi.mock('@sjolystinnovation/app-kit/branding', () => ({ useBranding: () => ({ logoUrl: null }) }));

const company: CompanyInfo = {
    name: 'Altinnendata',
    legalName: 'ALTINNENDATA AS',
    orgNumber: '938 433 240',
    vatRegistered: false,
    address: 'Mårvegen 21a, 4347 Lye',
    streetAddress: 'Mårvegen 21a',
    postalCode: '4347',
    addressLocality: 'Lye',
    addressRegion: '',
    email: 'altinnendata@gmail.com',
    phone: '',
};

const renderFooter = (info: CompanyInfo, locale: Locale = 'no') =>
    render(
        <DictionaryProvider locale={locale}>
            <Footer company={info} />
        </DictionaryProvider>,
    );

const registerLine = () => screen.getByRole('link', { name: /938 433 240/ }).closest('p');

describe('Footer', () => {
    it('shows the org number linked to the Brønnøysund page and the register', () => {
        renderFooter(company);

        expect(screen.getByRole('link', { name: '938 433 240' })).toHaveAttribute('href', 'https://virksomhet.brreg.no/nb/oppslag/enheter/938433240');
        expect(registerLine()).toHaveTextContent(/^Org\.nr\. 938 433 240 Foretaksregisteret · Mårvegen 21a, 4347 Lye$/);
    });

    it('adds MVA after the org number once the business is VAT registered', () => {
        renderFooter({ ...company, vatRegistered: true });

        expect(registerLine()).toHaveTextContent(/^Org\.nr\. 938 433 240 MVA Foretaksregisteret · /);
    });

    it('says nothing about VAT when the business is not VAT registered', () => {
        renderFooter(company);

        expect(document.querySelector('footer')).not.toHaveTextContent(/MVA|merverdiavgift/i);
    });

    it('uses the English words on the English site', () => {
        renderFooter(company, 'en');

        expect(registerLine()).toHaveTextContent(/^Org\. no\. 938 433 240 Register of Business Enterprises · Mårvegen 21a, 4347 Lye$/);
    });

    it('leaves out the org number and the register when no org number is set', () => {
        renderFooter({ ...company, orgNumber: '' });

        expect(screen.queryByText(/Foretaksregisteret/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Org\.nr/)).not.toBeInTheDocument();
        expect(screen.getByText('Mårvegen 21a, 4347 Lye')).toBeInTheDocument();
        expect(screen.getByText('Mårvegen 21a, 4347 Lye')).toHaveTextContent(/^Mårvegen 21a, 4347 Lye$/);
    });

    it('leaves out the dot when no address is set', () => {
        renderFooter({ ...company, address: '' });

        expect(registerLine()).toHaveTextContent(/^Org\.nr\. 938 433 240 Foretaksregisteret$/);
    });

    it('leaves out the second line when neither org number nor address is set', () => {
        renderFooter({ ...company, orgNumber: '', address: '' });

        const first = screen.getByRole('link', { name: 'Sjølyst Innovation AS' }).closest('p')!;
        expect(first.parentElement!.children).toHaveLength(1);
    });

    it('puts the copyright and the maker on one line and the org number and the address on the next', () => {
        renderFooter(company);

        const lines = [...registerLine()!.parentElement!.children].map(line => line.textContent);
        expect(lines).toEqual([
            expect.stringMatching(/^© \d{4} ALTINNENDATA AS · Laget av Sjølyst Innovation AS$/),
            'Org.nr. 938 433 240 Foretaksregisteret · Mårvegen 21a, 4347 Lye',
        ]);
        expect(screen.getByRole('link', { name: 'Sjølyst Innovation AS' })).toHaveAttribute('href', 'https://www.sjolystinnovation.no/');
    });

    it('falls back to the company name when the legal name is empty', () => {
        renderFooter({ ...company, legalName: '' });

        expect(screen.getByRole('link', { name: 'Sjølyst Innovation AS' }).closest('p')).toHaveTextContent(/^© \d{4} Altinnendata · /);
    });
});
