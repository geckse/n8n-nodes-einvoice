import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { NodeOperationError, deepCopy } from 'n8n-workflow';

import unset from 'lodash/unset';

import { extractEInvoiceFromPDF, extractEInvoiceFromXML } from '../utils/einvoice';

export const properties: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: 'The name of the input binary field containing the file with embedded Invoice XML Informations to be extracted',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Keep Source',
				name: 'keepSource',
				type: 'options',
				default: 'json',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Include JSON data of the input item',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Include binary data of the input item',
					},
					{
						name: 'Both',
						value: 'both',
						description: 'Include both JSON and binary data of the input item',
					},
				],
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Prowide password, if the PDF is encrypted',
			},
			{
				displayName: 'Return Raw as JSON',
				name: 'returnRawJSON',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						returnRawXML: [true],
					},
				},
				description: 'Whether to return the raw XML data of the e-invoice as JSON object',
			},
			{
				displayName: 'Return Raw as XML',
				name: 'returnRawXML',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						returnRawJSON: [true],
					},
				},
				description: 'Whether to return the raw XML data of the e-invoice as XML-String',
			},
		],
	},
];

export const description = properties;

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex);
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);
			const resource = this.getNodeParameter('resource', itemIndex);

			var json = {};
			
			if(resource === 'pdf') {
				json = await extractEInvoiceFromPDF.call(
					this,
					binaryPropertyName,
					options.password as string,
					options.returnRawJSON ? 'json' : options.returnRawXML ? 'xml' : 'simple',
					itemIndex,
				);
			} else if(resource === 'xml') {
				json = await extractEInvoiceFromXML.call(
					this,
					binaryPropertyName,
					options.returnRawJSON ? 'json' : options.returnRawXML ? 'xml' : 'simple',
					itemIndex,
				);
			} else {
				throw new Error("Invalid resource");
			}

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: { item: itemIndex },
			};

			if (options.keepSource && options.keepSource !== 'binary') {
				newItem.json = { ...deepCopy(item.json), ...json };
			} else {
				newItem.json = json;
			}

			if (options.keepSource === 'binary' || options.keepSource === 'both') {
				newItem.binary = item.binary;
			} else {
				// this binary data would not be included, but there also might be other binary data
				// which should be included, copy it over and unset current binary data
				newItem.binary = deepCopy(item.binary);
				unset(newItem.binary, binaryPropertyName);
			}

			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex });
		}
	}

	return returnData;
}