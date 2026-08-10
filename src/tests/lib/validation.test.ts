import { describe, it, expect } from 'vitest';
import { contactSchema, fieldErrors, passwordSchema } from '@/lib/validation';
import { getDictionary } from '@/i18n/dictionaries';

const dict = getDictionary('no');

const valid = {
    name: 'Ola Nordmann',
    email: 'ola@kunde.no',
    phone: '',
    useCase: 'gaming',
    budgetNok: 20000,
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

    it('rejects a negative budget', () => {
        const result = contactSchema.safeParse({ ...valid, budgetNok: -1 });
        expect(result.success).toBe(false);
    });
});

describe('fieldErrors', () => {
    it('returns messages in the visitor language, one per field', () => {
        const result = contactSchema.safeParse({ ...valid, email: 'nope', message: '' });
        expect(result.success).toBe(false);
        if (result.success) return;

        const errors = fieldErrors(result.error, dict);
        expect(errors.email).toBe(dict.validation.email);
        expect(errors.message).toBe(dict.validation.required);
        expect(errors.name).toBeUndefined();
    });
});

describe('passwordSchema', () => {
    it('requires length, case mix and a digit', () => {
        expect(passwordSchema.safeParse('Passord1').success).toBe(true);
        expect(passwordSchema.safeParse('passord1').success).toBe(false);
        expect(passwordSchema.safeParse('Passord').success).toBe(false);
        expect(passwordSchema.safeParse('Pass1').success).toBe(false);
    });
});
