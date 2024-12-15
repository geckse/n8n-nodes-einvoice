import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import * as extraction from './actions/exctraction.operation';

export class EInvoice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E-Invoice',
		name: 'eInvoice',
		group: ['transform'],
		icon: { light: 'file:eInvoice.svg', dark: 'file:eInvoice.dark.svg' },
		version: 1,
		description: 'Handle E-Invoices (ZUGFeRD / XRechnung / Factur-X / EN-16931)',
		defaults: {
			name: 'E-Invoice',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'PDF',
						value: 'pdf',
						action: 'Use PDF for E-Invoice',
						description: 'Handle the E-Invoice Informations with PDF files',
					},
					{
						name: 'XML',
						value: 'xml',
						action: 'Use XML for E-Invoice',
						description: 'Handle the E-Invoice Informations with XML files',
					},
				],
				default: 'pdf',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Extract Invoice Data',
						value: 'extraction',
						action: 'Extract Invoice Data',
						description: 'Extracts the invoice data from a PDF or XML file',
					},
				],
				default: 'extraction',
			},
			...extraction.description,
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const resource = this.getNodeParameter('resource', 0);
		let returnData: INodeExecutionData[] = [];

		// Using dynamic import for PDF.js
		if (operation === 'extraction') {
			if (resource === 'pdf' || resource === 'xml') {
				returnData = await extraction.execute.call(this, items);
			}
		}

		return [returnData];
	}
}
