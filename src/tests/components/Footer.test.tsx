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
        expect(registerLine()).toHaveTextContent(/^Org\.nr\. 938 433 240 Foretaksregisteret$/);
    });

    it('adds MVA after the org number once the business is VAT registered', () => {
        renderFooter({ ...company, vatRegistered: true });

        expect(registerLine()).toHaveTextContent(/^Org\.nr\. 938 433 240 MVA Foretaksregisteret$/);
    });

    it('says nothing about VAT when the business is not VAT registered', () => {
        renderFooter(company);

        expect(document.querySelector('footer')).not.toHaveTextContent(/MVA|merverdiavgift/i);
    });

    it('uses the English words on the English site', () => {
        renderFooter(company, 'en');

        expect(registerLine()).toHaveTextContent(/^Org\. no\. 938 433 240 Register of Business Enterprises$/);
    });

    it('leaves out the org number and the register when no org number is set', () => {
        renderFooter({ ...company, orgNumber: '' });

        expect(screen.queryByText(/Foretaksregisteret/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Org\.nr/)).not.toBeInTheDocument();
    });

    it('shows the legal name in the copyright line and the address', () => {
        renderFooter(company);

        expect(screen.getByText(/© \d{4} ALTINNENDATA AS/)).toBeInTheDocument();
        expect(screen.getByText('Mårvegen 21a, 4347 Lye')).toBeInTheDocument();
    });

    it('falls back to the company name when the legal name is empty', () => {
        renderFooter({ ...company, legalName: '' });

        expect(screen.getByText(/© \d{4} Altinnendata ·/)).toBeInTheDocument();
    });
});
