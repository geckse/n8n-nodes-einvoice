![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Work with E-Invoices in n8n with the E-Invoice Node

This community package contains a node to work with E-Invoices in n8n.io

What you get:
* Extract Invoice Informations from valid E-Invoices via PDFs or XML-Files (Standards: ZUGFeRD / XRechnung / Factur-X / EN-16931)
* Option to get the raw XML as JSON
* Option to get the raw XML embedded in the PDFs

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Supported Operations](#supported-operations)  
[Installation](#installation)  
[Compatibility](#compatibility)  
[About](#about)  
[Version History](#version-history)  

## Supported Operations

| Operation  | Description | Options |
| ------------- |  ------------- |  ------------- | 
| Extract  | Extract e-Invoice Informations from a PDF or XML-File | PDF password, return raw JSON, return raw XML, keep Source |
| _Attach (planed)_  | Attach valid E-Invoice Informations to a PDF-File or generate a valid e-Invoice XML-File | - |


## Installation
Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.
It also should automatically install depencies (which should be the same n8n uses for handling PDFs and XML)

## Compatibility

The Latest Version of n8n (at least 1.72.x). If you encounter any problem, feel free to [open an issue](https://github.com/geckse/n8n-nodes-einvoice) on Github. 

## About

<img src="https://cloud.let-the-work-flow.com/kontoflux-icon.png" align="left" height="64" width="64"> 
Hi, I’m geckse! Beside building Automations I’ve also built a SaaS that automates your bank accounts and makes them accessible for your automations! 👋
This node is a small sponsorship of my ongoing effort to help you automate your cashflow processes. 💸 <br><br>
If you want to not only extract invoice data but also match payments with your bank accounts, check out my SaaS: https://kontoflux.io

## Version History

### 0.1.2
- stable release

### 0.1.1
- depency fix

### 0.1.0
- initial release
