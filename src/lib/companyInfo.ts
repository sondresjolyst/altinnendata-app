import { mergeCompanyInfo, type CompanyInfo } from '@sjolystinnovation/app-kit/company';
import { publicGetOptional } from '@/lib/publicApi';
import { COMPANY } from '@/lib/company';

export { formatOrgNumber, type CompanyInfo } from '@sjolystinnovation/app-kit/company';

/** The API's company details, with the built-in ones for any field it leaves blank or cannot give. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
    return mergeCompanyInfo(await publicGetOptional<CompanyInfo>('/company'), COMPANY);
}

/** The Brønnøysund Register Centre's page for the business, from the digits of its org number. */
export const brregUrl = (orgNumber: string): string =>
    `https://virksomhet.brreg.no/nb/oppslag/enheter/${orgNumber.replace(/\D/g, '')}`;
