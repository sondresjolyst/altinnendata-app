import { describe, it, expect } from 'vitest';
import { formatOrgNumber, CompanyInfo } from '@/lib/companyInfo';

const base: CompanyInfo = {
    name: 'Altinnendata',
    legalName: 'Altinnendata',
    orgNumber: '999 888 777',
    vatRegistered: true,
    address: 'Mårvegen 21a, 4347 Lye',
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
