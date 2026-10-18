import { mergeCompanyInfo, type CompanyInfo } from '@sjolystinnovation/app-kit/company';
import { publicGetOptional } from '@/lib/publicApi';
import { COMPANY } from '@/lib/company';

export { formatOrgNumber, type CompanyInfo } from '@sjolystinnovation/app-kit/company';

/** The API's company details, with the built-in ones for any field it leaves blank or cannot give. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
    return mergeCompanyInfo(await publicGetOptional<CompanyInfo>('/company'), COMPANY);
}
