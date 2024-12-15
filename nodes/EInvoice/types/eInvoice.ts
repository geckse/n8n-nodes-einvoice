export interface PostalAddress {
    address: string[];
    postCode: string | null;
    city: string | null;
    countryCode: string;
    countrySubdivision: string | null;
}

export interface TaxRegistration {
    type: string;
    value: string | null;
}

export interface Note {
    text: string;
    code: string | null;
}

export interface Tax {
    taxType: "VAT";
    taxPercent: number;
    taxAmount: number;
    totalNet: number;
}

export interface Position {
    lineId: string;
    gtin: string | null;
    name: string;
    description: string | null;
    quantity: number;
    unitCode: string;
    grossItemPrice: number;
    netItemPrice: number;
    total: number;
}

export interface Transaction {
    currency: string;
    totalGross: number;
    totalNet: number;
    totalVat: number;
    totalPrepaid: number;
    totalPayable: number;
    paymentReference: string | null;
    taxes: Tax[];
    positions: Position[];
}

export interface EInvoice {
    meta: {
        businessProcessType: string;
        specificationProfile: string;
    };
    documentId: string;
    documentType: string;
    documentTypeCode: string;
    documentDate: string;
    notes: Note[];
    buyerReference: string | null;
    seller: {
        sellerId: string | null;
        sellerName: string;
        postalAddress: PostalAddress;
        taxRegistrations: TaxRegistration[];
    };
    buyer: {
        buyerId: string | null;
        buyerName: string;
        postalAddress: PostalAddress;
        taxRegistrations: TaxRegistration[];
    };
    transaction: Transaction;
}