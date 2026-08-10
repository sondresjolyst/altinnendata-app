// Fallbacks for server-rendered metadata and structured data. The live values an
// admin edits come from GET /api/company; leave orgNumber empty until the business
// is registered — every consumer hides the field while it is blank.
export const COMPANY = {
    name: "Altinnendata",
    legalName: "",
    orgNumber: "",
    vatRegistered: false,
    address: "Mårvegen 21a, 4347 Lye",
    email: "altinnendata@gmail.com",
    phone: "+47 473 88 759",
    url: "https://www.altinnendata.no",
} as const;

export const companyLegalName = (legalName?: string | null): string =>
    legalName && legalName.trim() !== '' ? legalName : COMPANY.name;
