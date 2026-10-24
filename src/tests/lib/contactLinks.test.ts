import { describe, it, expect } from 'vitest';
import { mailtoHref, telHref } from '@/lib/contactLinks';

describe('telHref', () => {
    it.each([
        ['+47 473 88 759', 'tel:+4747388759'],
        ['+47 (0) 473 88 759', 'tel:+4747388759'],
        ['473.88-759', 'tel:47388759'],
        ['+123456789012345', 'tel:+123456789012345'],
    ])('links %s as %s', (phone, href) => {
        expect(telHref(phone)).toBe(href);
    });

    it.each(['', '(0)', 'ring oss', '1234567', '+1234567890123456', '47+388759', '473 88 759 ext 2'])('gives no link for %j', phone => {
        expect(telHref(phone)).toBeNull();
    });
});

describe('mailtoHref', () => {
    it.each(['post@altinnendata.no', 'havard@altinnendata.no', 'first.last+shop@sub.example-site.com', 'a_b%c@x.io'])('links %s', email => {
        expect(mailtoHref(email)).toBe(`mailto:${email}`);
    });

    it.each(['', 'no-at-sign', 'a@b@c.no', 'post @altinnendata.no', 'post@altinnendata.no?cc=x', 'post&x@altinnendata.no', '@altinnendata.no', 'post@', 'a,b@altinnendata.no', 'post@altinnendata.no#x', 'a;b@altinnendata.no', 'post@altinnendata', 'post@altinnendata.n', 'post@altinnendata.n0', 'pøst@altinnendata.no', 'post@alt_innendata.no'])(
        'gives no link for %j',
        email => {
            expect(mailtoHref(email)).toBeNull();
        },
    );
});
