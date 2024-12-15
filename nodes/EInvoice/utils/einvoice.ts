import type { IExecuteFunctions } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

// @ts-ignore
import { stringToPDFString } from 'pdfjs-dist/lib/shared/util';
import { getDocument as readPDF } from 'pdfjs-dist';
import { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api';

import { Parser } from 'xml2js';

import { DOCUMENT_TYPES } from '../types/documentTypes';
import { EInvoice } from '../types/eInvoice';

const FACTUR_X_FILENAMES = ["factur-x.xml", "factur\\055x\\056xml", "zugferd-invoice.xml", "zugferd\\055invoice\\056xml", "ZUGFeRD-invoice.xml", "ZUGFeRD\\055invoice\\056xml", "xrechnung.xml", "xrechnung\\056xml"].map(
    (name) => stringToPDFString(name),
);

type Attachment = {
    content: Uint8Array;
    filename: string;
}

/*
 * Extracts embedded XML invoice data from PDF files that follow the Factur-X/ZUGFeRD standard.
 * The function searches for XML attachments with specific filenames (factur-x.xml, zugferd-invoice.xml etc.)
 * and parses them into a JSON object.
 */
export async function extractEInvoiceFromPDF(
    this: IExecuteFunctions,
    binaryPropertyName: string,
    password: string,
    mode: 'json' | 'xml' | 'simple',
    itemIndex = 0,
) {
    const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
    
    const params: DocumentInitParameters = { password, isEvalSupported: false };
    
    if (binaryData.id) {
        params.data = await this.helpers.binaryToBuffer(
            await this.helpers.getBinaryStream(binaryData.id),
        );
    } else {
        params.data = Buffer.from(binaryData.data, BINARY_ENCODING).buffer;
    }

    const pdf = await readPDF(params).promise;
    const attachments = await pdf.getAttachments() as Record<string, Attachment>;

    for (const [filename, attachment] of Object.entries(attachments)) {
        if (FACTUR_X_FILENAMES.includes(filename)) {
            const xml = Buffer.from(attachment.content).toString('utf-8');
            if(xml === "") {
                throw new Error("empty xml-attachment in pdf");
            }

            if(mode === 'xml') {
                // give it as xml back, raw
                return {
                    xml: Buffer.from(xml).toString('base64'),
                    filename: attachment.filename,
                };
            }

            return parseEInvoiceXML(xml, mode);
        }
    }
    
    throw new Error("Could not find xml-attachment in pdf");
}

/*
 * Extracts embedded XML invoice data from XML files.
 * The function reads the XML file and parses it into a JSON object.
 */
export async function extractEInvoiceFromXML(
    this: IExecuteFunctions,
    binaryPropertyName: string,
    mode: 'json' | 'xml' | 'simple',
    itemIndex = 0,
) {
    const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
    let data = {} as any;
    if (binaryData.id) {
        data = await this.helpers.binaryToBuffer(
            await this.helpers.getBinaryStream(binaryData.id),
        );
    } else {
        data = Buffer.from(binaryData.data, BINARY_ENCODING).toString('utf-8');
    }

    if(mode === 'xml') {
        return {
            xml: data,
            filename: binaryData.filename,
        };
    }

    return parseEInvoiceXML(data, mode);
}

/*
 * Parses XML invoice data into a JSON object.
 * Takes XML string input and returns either raw JSON or simplified format.
 * Validates profile identifier and maps it to standard profile names.
 * Throws error if XML is invalid or missing required data.
 */
async function parseEInvoiceXML(xml: string, mode: 'json' | 'simple') {
    const parserOptions = {
        mergeAttrs: true,
        explicitArray: false,
        tagNameProcessors: [
            (name: string) => name.replace(/^.*:/, '')
        ],
        attrNameProcessors: [
            (name: string) => name.replace(/^.*:/, '')
        ],
        ignoreAttrs: true // Remove xmlns attributes
    };

    const parser = new Parser(parserOptions);
    const json = await parser.parseStringPromise(xml);

    // if we really just want the json, we can return it now
    if(mode === 'json') {
        return json;
    }
    // otherwise we simplify the response
    if(!json.CrossIndustryInvoice){
        throw new Error("no CrossIndustryInvoice after parsing found in xml");
    }

    const profileId = json.CrossIndustryInvoice?.ExchangedDocumentContext?.GuidelineSpecifiedDocumentContextParameter?.ID;
    var profile = "";
    if (!profileId) {
        throw new Error("missing profile identifier");
      }
  
      switch (profileId) {
        case "urn:factur-x.eu:1p0:minimum":
          profile = "minimum";
          break;
        case "urn:factur-x.eu:1p0:basicwl":
          profile = "basicwl";
          break;
        case "urn:factur-x.eu:1p0:basic":
        case "urn:cen.eu:en16931:2017:compliant:factur-x.eu:1p0:basic":
        case "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic":
          profile = "basic";
          break;
        case "urn:cen.eu:en16931:2017":
          profile = "en16931";
          break;
        case "urn:factur-x.eu:1p0:extended":
        case "urn:cen.eu:en16931:2017:compliant:factur-x.eu:1p0:extended":
        case "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended":
          profile = "extended";
          break;
        default:
          throw new Error(`unknown profile: ${profileId}`);
      }

  // otherwise we simplify the response
  const simplified = {} as EInvoice;
  const ci = json.CrossIndustryInvoice;

  // Meta data
  simplified.meta = {
      specificationProfile: profile,
      businessProcessType: ci.ExchangedDocumentContext?.BusinessProcessSpecifiedDocumentContext?.ID || 'A1'
  };

  // Document info
  simplified.documentId = ci.ExchangedDocument?.ID;
  simplified.documentType = ci.ExchangedDocument?.TypeCode;
  simplified.documentDate = ci.ExchangedDocument?.IssueDateTime?.DateTimeString;
  simplified.notes = ci.ExchangedDocument?.IncludedNote ? [{
      text: ci.ExchangedDocument.IncludedNote.Content,
      code: ci.ExchangedDocument.IncludedNote.SubjectCode
  }] : [];

  // Trade parties
  const agreement = ci.SupplyChainTradeTransaction?.ApplicableHeaderTradeAgreement;

  // Seller
  const sellerParty = agreement?.SellerTradeParty;
  if (sellerParty) {
      simplified.seller = {
          sellerId: sellerParty.ID,
          sellerName: sellerParty.Name,
          postalAddress: {
              address: [
                  sellerParty.PostalTradeAddress?.LineOne,
                  sellerParty.PostalTradeAddress?.LineTwo,
                  sellerParty.PostalTradeAddress?.LineThree
              ],
              postCode: sellerParty.PostalTradeAddress?.PostcodeCode,
              city: sellerParty.PostalTradeAddress?.CityName,
              countryCode: sellerParty.PostalTradeAddress?.CountryID,
              countrySubdivision: sellerParty.PostalTradeAddress?.CountrySubDivisionName
          },
          taxRegistrations: sellerParty.SpecifiedTaxRegistration ? [{
              type: sellerParty.SpecifiedTaxRegistration.ID?.schemeID,
              value: sellerParty.SpecifiedTaxRegistration.ID
          }] : []
      };
  }

  // Buyer
  const buyerParty = agreement?.BuyerTradeParty;
  if (buyerParty) {
      simplified.buyer = {
          buyerId: buyerParty.ID,
          buyerName: buyerParty.Name,
          postalAddress: {
              address: [
                  buyerParty.PostalTradeAddress?.LineOne,
                  buyerParty.PostalTradeAddress?.LineTwo,
                  buyerParty.PostalTradeAddress?.LineThree
              ],
              postCode: buyerParty.PostalTradeAddress?.PostcodeCode,
              city: buyerParty.PostalTradeAddress?.CityName,
              countryCode: buyerParty.PostalTradeAddress?.CountryID,
              countrySubdivision: buyerParty.PostalTradeAddress?.CountrySubDivisionName
          },
          taxRegistrations: buyerParty.SpecifiedTaxRegistration ? [{
              type: buyerParty.SpecifiedTaxRegistration.ID?.schemeID,
              value: buyerParty.SpecifiedTaxRegistration.ID
          }] : []
      };
  }

  // Transaction details
  const settlement = ci.SupplyChainTradeTransaction?.ApplicableHeaderTradeSettlement;
  simplified.transaction = {
      currency: settlement?.InvoiceCurrencyCode,
      totalGross: parseFloat(settlement?.SpecifiedTradeSettlementHeaderMonetarySummation?.GrandTotalAmount || '0'),
      totalNet: parseFloat(settlement?.SpecifiedTradeSettlementHeaderMonetarySummation?.LineTotalAmount || '0'),
      totalVat: parseFloat(settlement?.SpecifiedTradeSettlementHeaderMonetarySummation?.TaxTotalAmount || '0'),
      totalPrepaid: parseFloat(settlement?.SpecifiedTradeSettlementHeaderMonetarySummation?.TotalPrepaidAmount || '0'),
      totalPayable: parseFloat(settlement?.SpecifiedTradeSettlementHeaderMonetarySummation?.DuePayableAmount || '0'),
      paymentReference: settlement?.PaymentReference || '',
      taxes: settlement?.ApplicableTradeTax?.map( (tax: any) => ({
          taxType: 'VAT',
          taxPercent: parseFloat(tax.RateApplicablePercent || '0'),
          taxAmount: parseFloat(tax.CalculatedAmount || '0'),
          totalNet: parseFloat(tax.BasisAmount || '0')
      })) || [],
      positions: ci.SupplyChainTradeTransaction?.IncludedSupplyChainTradeLineItem?.map((item: any) => ({
          lineId: item.AssociatedDocumentLineDocument?.LineID,
          gtin: item.SpecifiedTradeProduct?.GlobalID,
          name: item.SpecifiedTradeProduct?.Name,
          quantity: parseFloat(item.SpecifiedLineTradeDelivery?.BilledQuantity || '0'),
          netItemPrice: parseFloat(item.SpecifiedLineTradeAgreement?.NetPriceProductTradePrice?.ChargeAmount || '0'),
          total: parseFloat(item.SpecifiedLineTradeSettlement?.SpecifiedTradeSettlementLineMonetarySummation?.LineTotalAmount || '0')
      })) || []
  };

      // Sanity Checks
      if (!Object.values<string>(DOCUMENT_TYPES).includes(simplified.documentType)) {
        throw new Error("XML contains invalid Invoice type code: " + simplified.documentType);
      }

      // make document code more readable
      simplified.documentTypeCode = DOCUMENT_TYPES[simplified.documentType as keyof typeof DOCUMENT_TYPES];

      if (!simplified.seller) {
        throw new Error("XML is missing Seller Entity");
      }
      if (!simplified.buyer) {
        throw new Error("XML is missing Buyer Entity");
      }

  return simplified;
}