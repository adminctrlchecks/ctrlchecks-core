import type { DocsSearchIndexItem } from '../search-index';

export const intuitSmesSearchIndex = [
  {
    "type": "node",
    "title": "Intuit - SME'S",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes",
    "text": "Intuit SME Mock/demo node for prototyping customer and invoice workflow shapes. Does not call the real Intuit/QuickBooks API. CRM"
  },
  {
    "type": "operation",
    "title": "Intuit SME: Get Customers",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-getCustomers",
    "text": "Intuit SME Get Customers Returns two fixed hardcoded demo customer records - mock data, not your real account."
  },
  {
    "type": "operation",
    "title": "Intuit SME: Create Customer",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-createCustomer",
    "text": "Intuit SME Create Customer Builds a fabricated confirmation object - does not create a real QuickBooks customer."
  },
  {
    "type": "operation",
    "title": "Intuit SME: Update Customer",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-updateCustomer",
    "text": "Intuit SME Update Customer Builds a fabricated confirmation object - does not update a real QuickBooks customer."
  },
  {
    "type": "operation",
    "title": "Intuit SME: Get Invoices",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-getInvoices",
    "text": "Intuit SME Get Invoices Returns two fixed hardcoded demo invoice records - mock data, not your real account."
  },
  {
    "type": "operation",
    "title": "Intuit SME: Create Invoice",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-createInvoice",
    "text": "Intuit SME Create Invoice Builds a fabricated confirmation object - does not create a real QuickBooks invoice."
  },
  {
    "type": "field",
    "title": "Intuit SME: Fields (Operation, Api Key, Access Token, Customer Id, Customer Name, Customer Email, Invoice Amount, Data)",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#operation-getCustomers",
    "text": "Intuit SME Operation Api Key Access Token Customer Id Customer Name Customer Email Invoice Amount Data mock demo"
  },
  {
    "type": "guide",
    "title": "Intuit SME: Connection setup",
    "slug": "intuit_smes",
    "category": "CRM",
    "href": "/docs/nodes/intuit_smes#connection",
    "text": "Intuit / QuickBooks Connections credential vault mock demo does not call the real Intuit API"
  }
] satisfies DocsSearchIndexItem[];
