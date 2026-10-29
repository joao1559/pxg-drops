import { useRef, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { slugify } from '../utils/format.js'

const emptyItem = { name: '', category: '', npcPrice: 0, marketPrice: 0 }

export default function Items() {
  const { items, hunts, saveItem, deleteItem, exportData, importData } = useData()
  const [form, setForm] = useState(emptyItem)
  const [search, setSearch] = useState('')
  const fileRef = useRef(null)

  const onAdd = (e) => {
    e.preventDefault()
    const id = slugify(form.name)
    if (!id) return
    if (items.some((i) => i.id === id)) return alert('Já existe um item com esse nome.')
    saveItem({ ...form, id, npcPrice: Number(form.npcPrice) || 0, marketPrice: Number(form.marketPrice) || 0 })
    setForm(emptyItem)
  }

  const updateField = (item, field, value) =>
    saveItem({ ...item, [field]: field.endsWith('Price') ? Number(value) || 0 : value })

  const onDelete = (item) => {
    const used = hunts.some((h) => h.drops.some((d) => d.itemId === item.id))
    if (used) return alert('Este item está em uso em alguma hunt.')
    if (confirm(`Excluir ${item.name}?`)) deleteItem(item.id)
  }

  const onExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pxg-drops-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importData(await file.text())
      alert('Dados importados!')
    } catch (err) {
      alert(`Falha ao importar: ${err.message}`)
    }
    e.target.value = ''
  }

  const filtered = items
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <header className="page-header">
        <h1>Itens & Preços</h1>
        <div className="row">
          <button className="btn" onClick={onExport}>Exportar backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        </div>
      </header>

      <form className="card row wrap" onSubmit={onAdd}>
        <input className="input" placeholder="Nome do item" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input qty" type="number" min="0" placeholder="NPC" value={form.npcPrice} onChange={(e) => setForm({ ...form, npcPrice: e.target.value })} />
        <input className="input qty" type="number" min="0" placeholder="Market" value={form.marketPrice} onChange={(e) => setForm({ ...form, marketPrice: e.target.value })} />
        <button className="btn primary" type="submit">Adicionar item</button>
      </form>

      <div className="card">
        <input className="input" placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="muted small">O cálculo de loot usa o preço de Market; se estiver 0, usa o preço de NPC.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoria</th>
              <th className="num">Preço NPC</th>
              <th className="num">Preço Market</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>
                  <input className="input inline" value={item.category} onChange={(e) => updateField(item, 'category', e.target.value)} />
                </td>
                <td className="num">
                  <input className="input inline num" type="number" min="0" value={item.npcPrice} onChange={(e) => updateField(item, 'npcPrice', e.target.value)} />
                </td>
                <td className="num">
                  <input className="input inline num" type="number" min="0" value={item.marketPrice} onChange={(e) => updateField(item, 'marketPrice', e.target.value)} />
                </td>
                <td className="num">
                  <button className="btn small danger" onClick={() => onDelete(item)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
