import { COMPANY } from '@/lib/company';
import { getCompanyInfo } from '@/lib/companyInfo';

export default async function StructuredData() {
    const company = await getCompanyInfo();
    const data = {
        '@context': 'https://schema.org',
        '@type': 'ComputerStore',
        name: company.name,
        ...(company.legalName ? { legalName: company.legalName } : {}),
        url: COMPANY.url,
        image: `${COMPANY.url}/icon.png`,
        telephone: company.phone ?? COMPANY.phone,
        email: company.email ?? COMPANY.email,
        address: {
            '@type': 'PostalAddress',
            streetAddress: company.address,
            addressCountry: 'NO',
        },
        areaServed: 'NO',
        // Only a VAT-registered business may publish a VAT id.
        ...(company.vatRegistered && company.orgNumber ? { vatID: `NO${company.orgNumber.replace(/\s/g, '')}MVA` } : {}),
        ...(company.orgNumber ? { taxID: company.orgNumber } : {}),
    };

    const json = JSON.stringify(data).replace(/</g, '\\u003c');

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
        />
    );
}
