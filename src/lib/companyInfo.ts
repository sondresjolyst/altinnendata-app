import { publicGet } from '@/lib/publicApi';
import { COMPANY } from '@/lib/company';

export interface CompanyInfo {
    name: string;
    legalName: string;
    orgNumber: string;
    vatRegistered: boolean;
    address: string;
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
        email: data?.email || COMPANY.email,
        phone: data?.phone || COMPANY.phone,
    };
}

/** Org number with the Norwegian " MVA" suffix when the company is VAT-registered; empty until registered. */
export function formatOrgNumber(info: CompanyInfo): string {
    if (!info.orgNumber) return '';
    return info.vatRegistered ? `${info.orgNumber} MVA` : info.orgNumber;
}
