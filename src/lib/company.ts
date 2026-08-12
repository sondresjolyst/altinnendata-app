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
