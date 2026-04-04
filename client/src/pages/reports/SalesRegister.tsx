import { useEffect, useState } from "react";
import { customerApi, reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader, Input, Select, Badge } from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { Customer, Invoice } from "../../types";

type SortKey = 'invoiceNo' | 'invoiceDate' | 'customer' | 'totalTaxable' | 'totalTax' | 'grandTotal'
type SortDir = 'asc' | 'desc'

function SortTh({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey
  return (
    <th onClick={() => onSort(sortKey)} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 cursor-pointer select-none whitespace-nowrap hover:text-slate-700 group">
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▼'}
        </span>
      </span>
    </th>
  )
}

function exportCSV(rows: Invoice[]) {
  const headers = ["Invoice No","Date","Customer","Tax Type","Taxable","Tax","Amount","Status"]
  const data = rows.map(r => [r.invoiceNo, new Date(r.invoiceDate).toLocaleDateString("en-IN"), r.customer?.name||"", r.taxType==="CGST_SGST"?"CGST+SGST":"IGST", r.totalTaxable, r.totalTax, r.grandTotal, r.status])
  const csv = [headers,...data].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="sale-register.csv"; a.click()
}

function exportPDF(rows: Invoice[], total: number) {
  const win=window.open("","_blank")!
  const trs=rows.map(r=>`<tr><td>#${r.invoiceNo}</td><td>${new Date(r.invoiceDate).toLocaleDateString("en-IN")}</td><td>${r.customer?.name||""}</td><td>${r.taxType==="CGST_SGST"?"CGST+SGST":"IGST"}</td><td>₹${fmt(r.totalTaxable)}</td><td>₹${fmt(r.totalTax)}</td><td>₹${fmt(r.grandTotal)}</td><td>${r.status}</td></tr>`).join("")
  win.document.write(`<html><head><title>Sale Register</title><style>body{font-family:Arial;font-size:11px;padding:20px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;font-size:10px;text-align:left}td{border:1px solid #e2e8f0;padding:5px 8px}tr:nth-child(even){background:#f8fafc}.total{font-weight:bold;margin-top:8px;text-align:right}</style></head><body><h2>Sale Register</h2><p>Fulanand Ayurved, Tasgaon</p><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Tax Type</th><th>Taxable</th><th>Tax</th><th>Amount</th><th>Status</th></tr></thead><tbody>${trs}</tbody></table><div class="total">Grand Total: ₹${fmt(total)}</div></body></html>`)
  win.document.close(); win.print()
}

export default function SaleRegister() {
  const [rows, setRows]           = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [from, setFrom]           = useState("")
  const [to, setTo]               = useState("")
  const [customerId, setCustomerId] = useState("")
  const [sortKey, setSortKey]     = useState<SortKey>('invoiceDate')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')

  async function load() {
    setLoading(true)
    try {
      const [sales, custs] = await Promise.all([
        reportApi.getSaleRegister({ from:from||undefined, to:to||undefined, customerId:customerId?Number(customerId):undefined }),
        customerApi.getAll(),
      ])
      setRows(sales); setCustomers(custs)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: any, bv: any
    if (sortKey === 'invoiceNo')    { av = a.invoiceNo; bv = b.invoiceNo }
    else if (sortKey === 'invoiceDate') { av = new Date(a.invoiceDate); bv = new Date(b.invoiceDate) }
    else if (sortKey === 'customer')    { av = a.customer?.name||''; bv = b.customer?.name||'' }
    else if (sortKey === 'totalTaxable'){ av = a.totalTaxable; bv = b.totalTaxable }
    else if (sortKey === 'totalTax')    { av = a.totalTax;     bv = b.totalTax }
    else                                { av = a.grandTotal;   bv = b.grandTotal }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const pg    = usePagination(sorted, 50)
  const total = rows.reduce((s,r)=>s+r.grandTotal, 0)

  return (
    <div>
      <PageHeader title="Sale Register" subtitle="Invoice-wise sales report" />
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <Input type="date" label="From" value={from} onChange={e=>setFrom(e.target.value)} />
          <Input type="date" label="To"   value={to}   onChange={e=>setTo(e.target.value)} />
          <Select label="Customer" value={customerId} onChange={e=>setCustomerId(e.target.value)}
            options={[{value:"",label:"All Customers"},...customers.map(c=>({value:c.id,label:c.name}))]} />
          <div className="flex items-end">
            <button onClick={load} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Load Report</button>
          </div>
        </div>
      </Card>
      <Card>
        {loading ? <LoadingScreen/> : (<>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-slate-800">
              Sales <span className="text-slate-400 font-normal text-sm ml-2">{rows.length} invoices</span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Total: ₹{fmt(total)}</span>
              {rows.length > 0 && <>
                <button onClick={()=>exportCSV(rows)} className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">⬇ CSV</button>
                <button onClick={()=>exportPDF(rows,total)} className="px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">🖨 PDF</button>
              </>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <SortTh label="Invoice No" sortKey="invoiceNo"    current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <SortTh label="Date"       sortKey="invoiceDate"  current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <SortTh label="Customer"   sortKey="customer"     current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Tax Type</th>
                  <SortTh label="Taxable"    sortKey="totalTaxable" current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <SortTh label="Tax"        sortKey="totalTax"     current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <SortTh label="Amount"     sortKey="grandTotal"   current={sortKey} dir={sortDir} onSort={handleSort}/>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map(inv=>(
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">#{inv.invoiceNo}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 text-sm text-slate-800">{inv.customer?.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{inv.taxType==="CGST_SGST"?"CGST+SGST":"IGST"}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">₹{fmt(inv.totalTaxable)}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">₹{fmt(inv.totalTax)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">₹{fmt(inv.grandTotal)}</td>
                    <td className="px-5 py-3"><Badge color={inv.status==="SAVED"?"green":"red"}>{inv.status}</Badge></td>
                  </tr>
                ))}
                {rows.length===0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">No sales found</td></tr>}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && <Pagination total={pg.total} page={pg.page} perPage={pg.perPage} from={pg.from} to={pg.to} onPage={pg.setPage} onPerPage={pg.onPerPage}/>}
        </>)}
      </Card>
    </div>
  )
}
