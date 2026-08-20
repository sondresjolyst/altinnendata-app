import { describe, it, expect } from 'vitest';
import { afterEach, vi } from 'vitest';
import { formatOrgNumber, getCompanyInfo, CompanyInfo } from '@/lib/companyInfo';
import { COMPANY } from '@/lib/company';

const base: CompanyInfo = {
    name: 'Altinnendata',
    legalName: 'Altinnendata',
    orgNumber: '999 888 777',
    vatRegistered: true,
    address: 'Mårvegen 21a, 4347 Lye',
    streetAddress: 'Mårvegen 21a',
    postalCode: '4347',
    addressLocality: 'Lye',
    addressRegion: 'Rogaland',
    email: 'altinnendata@gmail.com',
    phone: '+47 473 88 759',
};

describe('formatOrgNumber', () => {
    it('appends MVA when VAT-registered', () => {
        expect(formatOrgNumber(base)).toBe('999 888 777 MVA');
    });

    it('omits MVA when not VAT-registered', () => {
        expect(formatOrgNumber({ ...base, vatRegistered: false })).toBe('999 888 777');
    });

    it('returns nothing while the business has no org number', () => {
        expect(formatOrgNumber({ ...base, orgNumber: '', vatRegistered: false })).toBe('');
    });
});

describe('getCompanyInfo', () => {
    afterEach(() => vi.restoreAllMocks());

    const respond = (body: unknown) =>
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
        );

    it('passes the structured address parts through', async () => {
        respond({ streetAddress: 'Mårvegen 21a', postalCode: '4347', addressLocality: 'Lye', addressRegion: 'Rogaland' });

        const info = await getCompanyInfo();
        expect(info.streetAddress).toBe('Mårvegen 21a');
        expect(info.postalCode).toBe('4347');
        expect(info.addressRegion).toBe('Rogaland');
    });

    it('leaves the parts empty against an API that does not send them', async () => {
        // The version of the API that predates the structured fields.
        respond({ name: 'Altinnendata', address: 'Mårvegen 21a, 4347 Lye' });

        const info = await getCompanyInfo();
        expect(info.address).toBe('Mårvegen 21a, 4347 Lye');
        expect(info.streetAddress).toBe('');
        expect(info.postalCode).toBe('');
    });

    it('falls back to the built-in details when the API is unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

        const info = await getCompanyInfo();
        expect(info.name).toBe(COMPANY.name);
        expect(info.address).toBe(COMPANY.address);
        expect(info.streetAddress).toBe('');
    });
});
