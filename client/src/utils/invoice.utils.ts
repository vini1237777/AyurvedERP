import type { SaleRow, TaxType } from '../types'

export const r2 = (v: number) => Math.round(v * 100) / 100

export const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0)

export const fmtInt = (n: number) =>
  new Intl.NumberFormat('en-IN').format(Math.round(n || 0))

export function determineTaxType(sellerStateCode: string, customerStateCode: string): TaxType {
  return sellerStateCode === customerStateCode ? 'CGST_SGST' : 'IGST'
}

export function validateGstin(gstin: string): { valid: boolean; stateCode?: string; error?: string } {
  if (!gstin) return { valid: false, error: 'GSTIN is empty' }
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!regex.test(gstin)) return { valid: false, error: 'Invalid GSTIN format' }
  return { valid: true, stateCode: gstin.substring(0, 2) }
}

export function calcRow(row: SaleRow): SaleRow {
  const price = parseFloat(row.price) || 0
  const qty   = parseFloat(row.qty)   || 0
  const disc  = parseFloat(row.disc)  || 0
  const gst   = row.gst || 0

  const basicAmt = r2(price * qty)
  const discAmt  = r2(basicAmt * disc / 100)
  const taxable  = r2(basicAmt - discAmt)
  const taxAmt   = r2(taxable * gst / 100)
  const netValue = r2(taxable + taxAmt)

  return { ...row, basicAmt, discAmt, taxAmt, netValue }
}

export function calcInvoiceTotals(rows: SaleRow[], taxType: TaxType) {
  const filled = rows.filter(r => r.itemName && parseFloat(r.qty) > 0)
  const totBasic   = r2(filled.reduce((s, r) => s + r.basicAmt, 0))
  const totDisc    = r2(filled.reduce((s, r) => s + r.discAmt, 0))
  const totTaxable = r2(totBasic - totDisc)
  const totTax     = r2(filled.reduce((s, r) => s + r.taxAmt, 0))
  const totCgst    = taxType === 'CGST_SGST' ? r2(totTax / 2) : 0
  const totSgst    = taxType === 'CGST_SGST' ? r2(totTax / 2) : 0
  const totIgst    = taxType === 'IGST' ? totTax : 0
  const grand      = r2(totTaxable + totTax)
  const totQty     = filled.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)
  const totFree    = filled.reduce((s, r) => s + (parseFloat(r.free) || 0), 0)
  return { totBasic, totDisc, totTaxable, totTax, totCgst, totSgst, totIgst, grand, totQty, totFree }
}

export function toWords(n: number): string {
  if (!n) return 'Zero'
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const w = (num: number): string => {
    if (num < 20) return a[num]
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' '+a[num%10] : '')
    if (num < 1000) return a[Math.floor(num/100)]+' Hundred'+(num%100?' '+w(num%100):'')
    if (num < 100000) return w(Math.floor(num/1000))+' Thousand'+(num%1000?' '+w(num%1000):'')
    if (num < 10000000) return w(Math.floor(num/100000))+' Lakh'+(num%100000?' '+w(num%100000):'')
    return w(Math.floor(num/10000000))+' Crore'+(num%10000000?' '+w(num%10000000):'')
  }
  const int = Math.floor(n), dec = Math.round((n-int)*100)
  return 'Rupee '+w(int)+(dec?' and '+w(dec)+' Paise':'')+' Only'
}

export const emptyRow = (id: number): SaleRow => ({
  id, itemName:'', itemId:null, batchNo:'', batchId:null,
  qty:'', altQty:'', free:'', price:'', per:'Pcs',
  basicAmt:0, disc:'', discAmt:0, taxPct:'5', taxAmt:0, netValue:0,
  hsn:'', gst:0, mrp:0, _batches:[],
})

export const SELLER_STATE = '27'

export const COMPANY = {
  name: 'FULANAND AYURVED',
  address: 'RAJMANE PLOT, PLOT NO 48 DHAVALVES, TASGAON TASGAON',
  mobile: 'MOB.8668446400',
  gstin: '27AZVPB8817G2ZW',
  pan: 'AZVPB8817G',
  stateCode: '27',
  state: 'Maharashtra',
  bank: 'UCO BANK, TASGAON',
  ifsc: 'IFSC-UCB40003225',
  account: 'ACC NO-22250610000311',
} as const
