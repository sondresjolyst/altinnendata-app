import { describe, it, expect } from 'vitest';
import { zodFieldErrors } from '@sjolystinnovation/app-kit/validation';
import { checkoutApiFieldMessage, checkoutFieldOfApiKey, checkoutIssueMessage, checkoutSchema, contactSchema, issueMessage } from '@/lib/validation';
import { getDictionary } from '@/i18n/dictionaries';

const dict = getDictionary('no');

const valid = {
    name: 'Ola Nordmann',
    email: 'ola@kunde.no',
    phone: '',
    useCase: 'gaming',
    budgetNok: '25000+',
    buildSlug: '',
    message: 'Hei!',
};

describe('contactSchema', () => {
    it('accepts a filled-in enquiry', () => {
        expect(contactSchema.safeParse(valid).success).toBe(true);
    });

    it('accepts an enquiry without the optional fields', () => {
        const result = contactSchema.safeParse({ name: 'Ola', email: 'ola@kunde.no', message: 'Hei' });
        expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
        const result = contactSchema.safeParse({ ...valid, email: 'ikke-en-epost' });
        expect(result.success).toBe(false);
    });

    it('rejects an empty message', () => {
        const result = contactSchema.safeParse({ ...valid, message: '' });
        expect(result.success).toBe(false);
    });

    it('rejects an invalid budget range', () => {
        const result = contactSchema.safeParse({ ...valid, budgetNok: '1-2' });
        expect(result.success).toBe(false);
    });
});

describe('issueMessage', () => {
    it('returns messages in the visitor language, one per field', () => {
        const result = contactSchema.safeParse({ ...valid, email: 'nope', message: '' });
        expect(result.success).toBe(false);
        if (result.success) return;

        const errors = zodFieldErrors(result.error, { message: (issue) => issueMessage(issue, dict) });
        expect(errors.email).toBe('Skriv inn en gyldig e-postadresse.');
        expect(errors.message).toBe('Du må fylle ut melding.');
        expect(errors.name).toBeUndefined();
    });

    it('names the field and the limit, in English too', () => {
        const en = getDictionary('en');
        const result = contactSchema.safeParse({ ...valid, name: '', useCase: 'x'.repeat(161) });
        expect(result.success).toBe(false);
        if (result.success) return;

        const errors = zodFieldErrors(result.error, { message: (issue) => issueMessage(issue, en) });
        expect(errors.name).toBe('Enter your name.');
        expect(errors.useCase).toBe('Use 160 characters or fewer.');
        expect(zodFieldErrors(result.error, { message: (issue) => issueMessage(issue, dict) }).useCase).toBe('Bruk 160 eller færre tegn.');
    });
});

describe('checkoutSchema', () => {
    const checkout = {
        buildSlug: 'gaming-pc',
        deliveryMethod: 'Shipping',
        name: 'Kari Nordmann',
        email: 'kari@example.no',
        phone: '912 34 567',
        streetAddress: 'Storgata 1',
        postalCode: '4347',
        city: 'Lye',
        withinDistance: false,
        pickupNote: null,
        acceptTerms: true,
        termsVersion: '2026-10-19T12:00:00.000000Z',
        locale: 'no',
    };

    const fieldNames = { name: 'navn', email: 'e-postadresse', phone: 'mobilnummer', streetAddress: 'gateadresse', postalCode: 'postnummer', city: 'sted' };

    const messages = (input: object): Record<string, string | undefined> => {
        const result = checkoutSchema.safeParse(input);
        if (result.success) return {};
        return zodFieldErrors(result.error, {
            message: issue => checkoutIssueMessage(issue, fieldNames[issue.path[0] as keyof typeof fieldNames] ?? '', dict, 30),
        });
    };

    it('accepts a complete shipping order', () => {
        expect(checkoutSchema.safeParse(checkout).success).toBe(true);
    });

    it('accepts pickup without an address', () => {
        const pickup = { ...checkout, deliveryMethod: 'Pickup', streetAddress: null, postalCode: null, city: null, pickupNote: 'Etter fire' };
        expect(checkoutSchema.safeParse(pickup).success).toBe(true);
    });

    it.each(['912 34 567', '91234567', '+47 912 34 567', '47-912-34-567', '(912) 34567'])('accepts the mobile number %s', phone => {
        expect(checkoutSchema.safeParse({ ...checkout, phone }).success).toBe(true);
    });

    it.each(['0701234567', '1234567', '+46 701 234 567', '912345678', 'abc'])('rejects the mobile number %s', phone => {
        expect(messages({ ...checkout, phone }).phone).toBe('Skriv inn et norsk mobilnummer.');
    });

    it('asks for what is missing in the Altinn wording', () => {
        const errors = messages({ ...checkout, name: '', email: ' ', phone: '', city: '', acceptTerms: false });
        expect(errors.name).toBe('Du må fylle ut navn.');
        expect(errors.email).toBe('Du må fylle ut e-postadresse.');
        expect(errors.phone).toBe('Du må fylle ut mobilnummer.');
        expect(errors.city).toBe('Du må fylle ut sted.');
        expect(errors.acceptTerms).toBe('Du må godta salgsvilkårene.');
    });

    it('limits the lengths as the API does', () => {
        const errors = messages({ ...checkout, name: 'a'.repeat(121), streetAddress: 'a'.repeat(201), city: 'a'.repeat(101), pickupNote: 'a'.repeat(501) });
        expect(errors.name).toBe('Bruk 120 eller færre tegn.');
        expect(errors.streetAddress).toBe('Bruk 200 eller færre tegn.');
        expect(errors.city).toBe('Bruk 100 eller færre tegn.');
        expect(errors.pickupNote).toBe('Bruk 500 eller færre tegn.');
        expect(messages({ ...checkout, email: `${'a'.repeat(200)}@example.no` }).email).toBe('Bruk 200 eller færre tegn.');
    });

    it('rejects an email that is not an address', () => {
        expect(messages({ ...checkout, email: 'kari' }).email).toBe('Skriv inn en gyldig e-postadresse.');
    });

    it('wants a postal code of four digits for shipping and home delivery only', () => {
        expect(messages({ ...checkout, postalCode: '434' }).postalCode).toBe('Postnummeret må ha fire siffer.');
        expect(messages({ ...checkout, postalCode: '43470' }).postalCode).toBe('Postnummeret må ha fire siffer.');
        expect(messages({ ...checkout, deliveryMethod: 'Pickup', postalCode: 'x' }).postalCode).toBeUndefined();
    });

    it('wants the distance confirmed for home delivery only', () => {
        const home = { ...checkout, deliveryMethod: 'HomeDelivery' };
        expect(messages(home).withinDistance).toBe('Du må bekrefte at adressen er innenfor 30 km.');
        expect(checkoutSchema.safeParse({ ...home, withinDistance: true }).success).toBe(true);
        expect(checkoutSchema.safeParse(checkout).success).toBe(true);
    });

    it('wants the terms version from the shop config, at most 40 characters as the API takes', () => {
        expect(checkoutSchema.safeParse({ ...checkout, termsVersion: '' }).success).toBe(false);
        expect(checkoutSchema.safeParse({ ...checkout, termsVersion: 'a'.repeat(41) }).success).toBe(false);
        expect(checkoutSchema.safeParse({ ...checkout, termsVersion: 'none' }).success).toBe(true);
    });

    it('trims the name and refuses a blank one', () => {
        const parsed = checkoutSchema.safeParse({ ...checkout, name: '  Kari  ' });
        expect(parsed.success && parsed.data.name).toBe('Kari');
        expect(checkoutSchema.safeParse({ ...checkout, name: '   ' }).success).toBe(false);
    });

    it('limits the build slug and wants a locale', () => {
        expect(checkoutSchema.safeParse({ ...checkout, buildSlug: 'a'.repeat(160) }).success).toBe(true);
        expect(checkoutSchema.safeParse({ ...checkout, buildSlug: 'a'.repeat(161) }).success).toBe(false);
        expect(checkoutSchema.safeParse({ ...checkout, buildSlug: '' }).success).toBe(false);
        expect(checkoutSchema.safeParse({ ...checkout, locale: '' }).success).toBe(false);
    });

    it('gives the English messages', () => {
        const en = getDictionary('en');
        const result = checkoutSchema.safeParse({ ...checkout, deliveryMethod: 'HomeDelivery', acceptTerms: false, phone: '1' });
        expect(result.success).toBe(false);
        if (result.success) return;
        const errors = zodFieldErrors(result.error, { message: issue => checkoutIssueMessage(issue, 'name', en, 30) });
        expect(errors.withinDistance).toBe('You must confirm that the address is within 30 km.');
        expect(errors.acceptTerms).toBe('You must accept the terms of sale.');
        expect(errors.phone).toBe('Enter a Norwegian mobile number.');
    });
});

describe('checkoutFieldOfApiKey', () => {
    it('reads the API keys in any case, including the pickup note', () => {
        expect(checkoutFieldOfApiKey('PickupNote')).toBe('pickupNote');
        expect(checkoutFieldOfApiKey('streetAddress')).toBe('streetAddress');
        expect(checkoutFieldOfApiKey('AcceptTerms')).toBe('acceptTerms');
        expect(checkoutFieldOfApiKey('BuildSlug')).toBeUndefined();
    });
});

describe('checkoutApiFieldMessage', () => {
    const message = (field: Parameters<typeof checkoutApiFieldMessage>[0], value: string) => checkoutApiFieldMessage(field, value, 'navn', dict, 30);

    it('asks for an empty field and names the rule for a filled one', () => {
        expect(message('phone', ' ')).toBe('Du må fylle ut navn.');
        expect(message('phone', '123')).toBe('Skriv inn et norsk mobilnummer.');
        expect(message('postalCode', '')).toBe('Du må fylle ut navn.');
        expect(message('postalCode', '12')).toBe('Postnummeret må ha fire siffer.');
        expect(message('email', '')).toBe('Du må fylle ut navn.');
        expect(message('email', 'ikke-en-adresse')).toBe('Skriv inn en gyldig e-postadresse.');
        expect(message('name', '')).toBe('Du må fylle ut navn.');
    });

    it('says too long for an email past 200 characters', () => {
        expect(message('email', `${'a'.repeat(201)}@x.no`)).toBe('Bruk 200 eller færre tegn.');
    });

    it('gives the limit of each text field', () => {
        expect(message('name', 'a')).toBe('Bruk 120 eller færre tegn.');
        expect(message('streetAddress', 'a')).toBe('Bruk 200 eller færre tegn.');
        expect(message('city', 'a')).toBe('Bruk 100 eller færre tegn.');
        expect(message('pickupNote', 'a')).toBe('Bruk 500 eller færre tegn.');
    });

    it('names the terms and the distance', () => {
        expect(message('acceptTerms', '')).toBe('Du må godta salgsvilkårene.');
        expect(message('withinDistance', '')).toBe('Du må bekrefte at adressen er innenfor 30 km.');
    });
});
