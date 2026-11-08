// Numbers read best right aligned, so their digits line up down a column.
// Tables build their header cells from a list of labels, so the label decides.
const NUMERIC_HEADER =
  /^(amount|taxable|tax|total|total tax|grand total|cgst|sgst|igst|cess|credit|debit|balance|closing|opening|net|gross|invoices?|qty|quantity|free|sold|mrp|rate|price|sale price|purchase price|current stock|stock|central|state|integrated|disc.*|gst ?%?|tax ?%?|outward|inward|returns?|value)( .*)?$/i;
const TEXT_HEADER = /^(invoice no|invoice|gstin|customer|return no|party|date|tax type)/i;

export function thAlign(label: string): string {
  return NUMERIC_HEADER.test(label.trim()) && !TEXT_HEADER.test(label.trim())
    ? "text-right"
    : "text-left";
}
