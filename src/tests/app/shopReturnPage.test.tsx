import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/[locale]/shop/return/page';

describe('the shop return page metadata', () => {
    it.each([
        ['no', 'Betaling'],
        ['en', 'Payment'],
    ] as const)('uses a title that fits every state (%s)', async (locale, title) => {
        const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });

        expect(metadata.title).toBe(title);
        expect(metadata.robots).toEqual({ index: false });
    });
});
