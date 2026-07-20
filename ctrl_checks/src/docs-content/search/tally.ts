import type { DocsSearchIndexItem } from '../search-index';

export const tallySearchIndex = [
  {
    "type": "node",
    "title": "Tally Solutions",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally",
    "text": "Tally Solutions Connect directly to Tally ERP / TallyPrime's local XML API gateway to read ledgers, vouchers, stock items, and company info, or create new accounting vouchers. CRM"
  },
  {
    "type": "operation",
    "title": "Tally: Get Ledger",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_ledger",
    "text": "Tally Accounting Operations Get Ledger Fetches ledger account details from Tally. Filter to one ledger with Ledger Name, or omit it to fetch every ledger. get_ledger"
  },
  {
    "type": "operation",
    "title": "Tally: Get Voucher",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_voucher",
    "text": "Tally Accounting Operations Get Voucher Fetches voucher (transaction) details from Tally. Filter to one voucher with Voucher ID / Number, or omit it to fetch every voucher. get_voucher"
  },
  {
    "type": "operation",
    "title": "Tally: Create Voucher",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-create_voucher",
    "text": "Tally Accounting Operations Create Voucher Creates a new accounting voucher in Tally. Requires a complete XML payload defining the entire voucher structure. create_voucher"
  },
  {
    "type": "operation",
    "title": "Tally: Get Stock Items",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_stock_items",
    "text": "Tally Accounting Operations Get Stock Items Fetches the stock item list from Tally for inventory sync and stock level checks. get_stock_items"
  },
  {
    "type": "operation",
    "title": "Tally: Get Company Info",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_company_info",
    "text": "Tally Accounting Operations Get Company Info Fetches company information from Tally, commonly used as a connectivity health check. get_company_info"
  },
  {
    "type": "field",
    "title": "Tally: Operation",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_ledger",
    "text": "Tally Accounting Operations Operation operation Chooses which Tally XML API request this node sends."
  },
  {
    "type": "field",
    "title": "Tally: Tally Server URL",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_ledger",
    "text": "Tally Accounting Operations Tally Server URL endpoint The local or network web address where Tally's XML API gateway is listening."
  },
  {
    "type": "field",
    "title": "Tally: Company Name",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_ledger",
    "text": "Tally Accounting Operations Company Name companyName Scopes the request to a specific Tally company when more than one is loaded."
  },
  {
    "type": "field",
    "title": "Tally: Ledger Name",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_ledger",
    "text": "Tally Accounting Operations Ledger Name ledgerName Filters Get Ledger to one specific ledger account."
  },
  {
    "type": "field",
    "title": "Tally: Voucher ID / Number",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-get_voucher",
    "text": "Tally Accounting Operations Voucher ID / Number voucherId Filters Get Voucher to one specific transaction."
  },
  {
    "type": "field",
    "title": "Tally: Custom XML Payload",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally#operation-create_voucher",
    "text": "Tally Accounting Operations Custom XML Payload payload A complete Tally XML request; required for Create Voucher, optional override for read operations."
  },
  {
    "type": "connection",
    "title": "Tally: Connection setup",
    "slug": "tally",
    "category": "CRM",
    "href": "/docs/nodes/tally",
    "text": "Tally Solutions connection setup No cloud credential — direct network connection to a local Tally ERP / TallyPrime XML gateway. Enable XML Server in Tally, confirm the port, test with Get Company Info."
  }
] satisfies DocsSearchIndexItem[];
