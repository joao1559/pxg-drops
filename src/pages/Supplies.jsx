import { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { formatMoney, slugify } from '../utils/format.js'

const emptySupply = { name: '', price: 0 }

export default function Supplies() {
  const { supplies, hunts, saveSupply, deleteSupply } = useData()
  const [form, setForm] = useState(emptySupply)
  const [search, setSearch] = useState('')

  const onAdd = (e) => {
    e.preventDefault()
    const id = slugify(form.name)
    if (!id) return
    if (supplies.some((i) => i.id === id)) return alert('Já existe um supply com esse nome.')
    saveSupply({ id, name: form.name.trim(), price: Number(form.price) || 0 })
    setForm(emptySupply)
  }

  // Quantidade total usada e em quantas hunts, para dar noção do impacto de mudar o preço
  const usageOf = (id) => {
    let qty = 0
    let count = 0
    for (const h of hunts) {
      const entry = h.supplies?.find((e) => e.itemId === id)
      if (entry) {
        qty += entry.qty
        count++
      }
    }
    return { qty, count }
  }

  const onDelete = (supply, count) => {
    if (count) return alert(`Este supply está em uso em ${count} hunt(s).`)
    if (confirm(`Excluir ${supply.name}?`)) deleteSupply(supply.id)
  }

  const filtered = supplies
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <header className="page-header">
        <h1>Supplies & Preços</h1>
      </header>

      <form className="card row wrap" onSubmit={onAdd}>
        <input className="input" placeholder="Nome do supply" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input qty" type="number" min="0" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <button className="btn primary" type="submit">Adicionar supply</button>
      </form>

      <div className="card">
        <input className="input" placeholder="Buscar supply..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="muted small">
          Supplies importados entram aqui com o preço do analyser. Alterar o preço recalcula os gastos e o lucro de todas as hunts que usam o supply.
        </p>
        {filtered.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Supply</th>
                <th className="num">Preço un.</th>
                <th className="num">Hunts</th>
                <th className="num">Qtd usada</th>
                <th className="num">Gasto total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((supply) => {
                const u = usageOf(supply.id)
                return (
                  <tr key={supply.id}>
                    <td>{supply.name}</td>
                    <td className="num">
                      <input
                        className="input inline num"
                        type="number"
                        min="0"
                        value={supply.price}
                        onChange={(e) => saveSupply({ ...supply, price: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="num">{u.count}</td>
                    <td className="num">{u.qty.toLocaleString('pt-BR')}</td>
                    <td className="num">{formatMoney(u.qty * (Number(supply.price) || 0))}</td>
                    <td className="num">
                      <button className="btn small danger" onClick={() => onDelete(supply, u.count)}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nenhum supply cadastrado ainda. Eles são criados automaticamente ao importar uma hunt.</p>
        )}
      </div>
    </>
  )
}
