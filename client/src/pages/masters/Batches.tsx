import { useState, useEffect } from 'react'
import { batchApi, itemApi } from '../../utils/api'
import { Button, Modal, PageHeader, Card, EmptyState, LoadingScreen, Toast, Input, Select } from '../../components/ui'
import type { Batch, Item, BatchFormData } from '../../types'

const EMPTY: BatchFormData = { itemId:'', batchNo:'', expiryDate:'', mfgDate:'', purchasePrice:'', salePrice:'', mrp:'', openingQty:'0' }

export default function BatchMaster() {
  const [batches, setBatches] = useState<(Batch & {item:Item})[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Batch|null>(null)
  const [form, setForm] = useState<BatchFormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [bData, iData] = await Promise.all([batchApi.getAll(), itemApi.getAll()])
      setBatches(bData as any); setItems(iData)
    } catch { setToast({msg:'Failed to load',type:'error'}) }
    finally { setLoading(false) }
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(b: Batch) {
    setEditing(b)
    setForm({ itemId:String((b as any).itemId), batchNo:b.batchNo, expiryDate:b.expiryDate||'', mfgDate:b.mfgDate||'', purchasePrice:String(b.purchasePrice||''), salePrice:String(b.salePrice||''), mrp:String(b.mrp||''), openingQty:String(b.openingQty) })
    setModal(true)
  }

  async function handleSave() {
    if (!form.itemId || !form.batchNo) { setToast({msg:'Item and Batch No required',type:'error'}); return }
    setSaving(true)
    try {
      if (editing) { await batchApi.update(editing.id, form); setToast({msg:'Batch updated',type:'success'}) }
      else { await batchApi.create(form); setToast({msg:'Batch created',type:'success'}) }
      setModal(false); load()
    } catch (err: any) { setToast({msg:err.response?.data?.error||'Failed',type:'error'}) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this batch?')) return
    try { await batchApi.delete(id); setToast({msg:'Deleted',type:'success'}); load() }
    catch { setToast({msg:'Failed',type:'error'}) }
  }

  const filtered = batches.filter(b =>
    (b as any).item?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.batchNo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <PageHeader title="Batches & Stock" subtitle={`${batches.length} batches`}
        actions={<>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search item or batch..." className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"/>
          <Button onClick={openCreate}>+ New Batch</Button>
        </>}
      />
      {loading ? <LoadingScreen/> : (
        <Card>
          {filtered.length === 0 ? <EmptyState title="No batches" action={<Button onClick={openCreate}>+ New Batch</Button>}/> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {['Item','Batch No','Mfg Date','Expiry','Purchase Price','Sale Price','MRP','Opening Qty','Current Stock','Actions'].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b=>(
                    <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{(b as any).item?.name||'-'}</td>
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">{b.batchNo}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{b.mfgDate||'-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{b.expiryDate||'-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">₹{b.purchasePrice||0}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">₹{b.salePrice||0}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">₹{b.mrp||0}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{b.openingQty}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${b.currentQty <= 0 ? 'text-red-600' : b.currentQty < 50 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          {b.currentQty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={()=>openEdit(b)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={()=>handleDelete(b.id)} className="text-red-500">Del</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit Batch':'New Batch'} width="max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select label="Item *" value={form.itemId} onChange={e=>setForm(p=>({...p,itemId:e.target.value}))}
              options={[{value:'',label:'-- Select Item --'},...items.map(i=>({value:String(i.id),label:i.name}))]}/>
          </div>
          <Input label="Batch No *" value={form.batchNo} onChange={e=>setForm(p=>({...p,batchNo:e.target.value}))} placeholder="e.g. NU01"/>
          <Input label="Expiry Date" value={form.expiryDate} onChange={e=>setForm(p=>({...p,expiryDate:e.target.value}))} placeholder="e.g. 9-2028"/>
          <Input label="Mfg Date" value={form.mfgDate} onChange={e=>setForm(p=>({...p,mfgDate:e.target.value}))} placeholder="e.g. 9-2025"/>
          <Input label="Opening Qty" value={form.openingQty} onChange={e=>setForm(p=>({...p,openingQty:e.target.value}))} type="number"/>
          <Input label="Purchase Price" value={form.purchasePrice} onChange={e=>setForm(p=>({...p,purchasePrice:e.target.value}))} type="number" placeholder="0"/>
          <Input label="Sale Price" value={form.salePrice} onChange={e=>setForm(p=>({...p,salePrice:e.target.value}))} type="number" placeholder="0"/>
          <Input label="MRP" value={form.mrp} onChange={e=>setForm(p=>({...p,mrp:e.target.value}))} type="number" placeholder="0"/>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing?'Update':'Create'} Batch</Button>
        </div>
      </Modal>
    </div>
  )
}
