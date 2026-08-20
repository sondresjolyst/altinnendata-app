import { publicGet } from '@/lib/publicApi';
import { COMPANY } from '@/lib/company';

export interface CompanyInfo {
    name: string;
    legalName: string;
    orgNumber: string;
    vatRegistered: boolean;
    /** The address on one line, for display. Derived by the API from the parts below. */
    address: string;
    streetAddress: string;
    /** Blank until an admin fills it in; structured data omits the field rather than guessing. */
    postalCode: string;
    addressLocality: string;
    addressRegion: string;
    email: string;
    phone: string;
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
    const data = await publicGet<CompanyInfo>('/company');
    return {
        name: data?.name || COMPANY.name,
        legalName: data?.legalName || COMPANY.name,
        orgNumber: data?.orgNumber || COMPANY.orgNumber,
        vatRegistered: data?.vatRegistered ?? COMPANY.vatRegistered,
        address: data?.address || COMPANY.address,
        streetAddress: data?.streetAddress ?? '',
        postalCode: data?.postalCode ?? '',
        addressLocality: data?.addressLocality ?? '',
        addressRegion: data?.addressRegion ?? '',
        email: data?.email || COMPANY.email,
        phone: data?.phone || COMPANY.phone,
    };
}

/** Org number with the Norwegian " MVA" suffix when the company is VAT-registered; empty until registered. */
export function formatOrgNumber(info: CompanyInfo): string {
    if (!info.orgNumber) return '';
    return info.vatRegistered ? `${info.orgNumber} MVA` : info.orgNumber;
}
