import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getConsent, setConsent } from '@sjolystinnovation/app-kit/consent';
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

const renderFooter = (info: CompanyInfo, locale: Locale = 'no', consentSettings?: boolean) =>
    render(
        <DictionaryProvider locale={locale}>
            <Footer company={info} consentSettings={consentSettings} />
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
        renderFooter({ ...company, orgNumber: '', address: '', email: '' });

        const first = screen.getByRole('link', { name: 'Sjølyst Innovation AS' }).closest('p')!;
        expect(first.parentElement!.children).toHaveLength(1);
    });

    it('puts the copyright and the maker on one line and the org number and the address on the next', () => {
        renderFooter(company);

        const lines = [...registerLine()!.parentElement!.children].map(line => line.textContent);
        expect(lines).toEqual([
            expect.stringMatching(/^© \d{4} ALTINNENDATA AS · Laget av Sjølyst Innovation AS$/),
            'Org.nr. 938 433 240 Foretaksregisteret · Mårvegen 21a, 4347 Lye',
            'E-post altinnendata@gmail.com',
        ]);
        expect(screen.getByRole('link', { name: 'Sjølyst Innovation AS' })).toHaveAttribute('href', 'https://www.sjolystinnovation.no/');
    });

    it('falls back to the company name when the legal name is empty', () => {
        renderFooter({ ...company, legalName: '' });

        expect(screen.getByRole('link', { name: 'Sjølyst Innovation AS' }).closest('p')).toHaveTextContent(/^© \d{4} Altinnendata · /);
    });

    it('has no cookie settings button without a marketing tool', () => {
        renderFooter(company);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByText(/Innstillinger for informasjonskapsler/)).not.toBeInTheDocument();
    });

    it.each([
        ['no', 'Informasjonskapsler', 'Innstillinger for informasjonskapsler'],
        ['en', 'Cookies', 'Cookie settings'],
    ] as const)('puts the cookie settings button right after the cookies link (%s)', (locale, cookies, label) => {
        renderFooter(company, locale, true);

        const nav = within(screen.getByRole('navigation'));
        const button = nav.getByRole('button', { name: label });
        expect(nav.getByRole('link', { name: cookies }).nextElementSibling).toBe(button);
        expect(button).toHaveClass('hover:text-gray-900');
    });

    it('reopens the consent choice from the cookie settings button', async () => {
        setConsent({ marketing: true, noticeVersion: 'test' });
        renderFooter(company, 'no', true);

        await userEvent.click(screen.getByRole('button', { name: 'Innstillinger for informasjonskapsler' }));

        expect(getConsent().reopened).toBe(true);
        setConsent({ marketing: false, noticeVersion: 'test' });
    });

    const contactLine = () => screen.getByRole('link', { name: 'altinnendata@gmail.com' }).closest('p');

    it.each([
        ['no', 'E-post'],
        ['en', 'Email'],
    ] as const)('shows the email as a mailto link on its own line (%s)', (locale, label) => {
        renderFooter(company, locale);

        expect(screen.getByRole('link', { name: 'altinnendata@gmail.com' })).toHaveAttribute('href', 'mailto:altinnendata@gmail.com');
        expect(contactLine()).toHaveTextContent(new RegExp(`^${label} altinnendata@gmail\.com$`));
        expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    });

    it.each([
        ['no', 'E-post altinnendata@gmail.com · Telefon +47 473 88 759'],
        ['en', 'Email altinnendata@gmail.com · Phone +47 473 88 759'],
    ] as const)('adds the phone as a tel link when it is set (%s)', (locale, line) => {
        renderFooter({ ...company, phone: '+47 473 88 759' }, locale);

        expect(screen.getByRole('link', { name: '+47 473 88 759' })).toHaveAttribute('href', 'tel:+4747388759');
        expect(contactLine()).toHaveTextContent(line);
    });

    it('shows the phone alone with no separator when no email is set', () => {
        renderFooter({ ...company, email: '', phone: '+47 473 88 759' });

        const line = screen.getByRole('link', { name: '+47 473 88 759' }).closest('p');
        expect(line).toHaveTextContent(/^Telefon \+47 473 88 759$/);
        expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
    });

    it('adds no contact line and no stray separator when neither email nor phone is set', () => {
        renderFooter({ ...company, email: '', phone: '' });

        const lines = [...registerLine()!.parentElement!.children].map(line => line.textContent);
        expect(lines).toHaveLength(2);
        expect(document.querySelector('footer')).not.toHaveTextContent(/E-post|Telefon|mailto/);
        expect(document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]')).toHaveLength(0);
    });
});
