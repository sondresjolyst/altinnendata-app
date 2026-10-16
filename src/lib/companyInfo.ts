import { mergeCompanyInfo, type CompanyInfo } from '@sjolystinnovation/app-kit/api';
import { publicGetOptional } from '@/lib/publicApi';
import { COMPANY } from '@/lib/company';

export { formatOrgNumber, type CompanyInfo } from '@sjolystinnovation/app-kit/api';

/** The API's company details, with the built-in ones for any field it leaves blank or cannot give. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
    return mergeCompanyInfo(await publicGetOptional<CompanyInfo>('/company'), COMPANY);
}
