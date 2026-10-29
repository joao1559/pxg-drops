import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import CharacterSelect from '../components/CharacterSelect.jsx'
import { formatMoney } from '../utils/format.js'

const today = () => new Date().toISOString().slice(0, 10)

const emptyHunt = () => ({
  date: today(),
  characterId: '',
  location: '',
  pokemon: '',
  durationMin: 60,
  expenses: 0,
  drops: [],
  notes: '',
})

export default function HuntForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hunts, items, saveHunt, dropPrice } = useData()
  const existing = id ? hunts.find((h) => h.id === id) : null

  const [hunt, setHunt] = useState(() => existing ?? emptyHunt())
  const [dropItem, setDropItem] = useState(items[0]?.id ?? '')
  const [dropQty, setDropQty] = useState(1)

  if (id && !existing) return <p>Hunt não encontrada.</p>

  const set = (field) => (e) => setHunt((h) => ({ ...h, [field]: e.target.value }))

  const addDrop = () => {
    const qty = Number(dropQty)
    if (!dropItem || qty <= 0) return
    setHunt((h) => {
      const found = h.drops.find((d) => d.itemId === dropItem)
      const drops = found
        ? h.drops.map((d) => (d.itemId === dropItem ? { ...d, qty: d.qty + qty } : d))
        : [...h.drops, { itemId: dropItem, qty }]
      return { ...h, drops }
    })
    setDropQty(1)
  }

  const removeDrop = (itemId) =>
    setHunt((h) => ({ ...h, drops: h.drops.filter((d) => d.itemId !== itemId) }))

  const onSubmit = (e) => {
    e.preventDefault()
    const savedId = saveHunt({
      ...hunt,
      characterId: hunt.characterId || null,
      durationMin: Number(hunt.durationMin) || 0,
      expenses: Number(hunt.expenses) || 0,
    })
    navigate(`/hunts/${savedId}`)
  }

  const lootTotal = hunt.drops.reduce((s, d) => s + d.qty * dropPrice(d), 0)

  return (
    <>
      <header className="page-header">
        <h1>{existing ? 'Editar hunt' : 'Nova hunt'}</h1>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Data
            <input className="input" type="date" value={hunt.date} onChange={set('date')} required />
          </label>
          <label>
            Local
            <input className="input" value={hunt.location} onChange={set('location')} placeholder="Ex: Cinnabar" required />
          </label>
          <label>
            Personagem
            <CharacterSelect value={hunt.characterId} onChange={(characterId) => setHunt((h) => ({ ...h, characterId }))} />
          </label>
          <label>
            Pokémon(s) caçados
            <input className="input" value={hunt.pokemon} onChange={set('pokemon')} placeholder="Ex: Magmar, Ponyta" />
          </label>
          <label>
            Duração (min)
            <input className="input" type="number" min="0" value={hunt.durationMin} onChange={set('durationMin')} />
          </label>
          <label>
            Gastos (potions, revives...)
            <input className="input" type="number" min="0" value={hunt.expenses} onChange={set('expenses')} />
          </label>
        </div>

        <h2>Drops</h2>
        <div className="row">
          <select className="input" value={dropItem} onChange={(e) => setDropItem(e.target.value)}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <input className="input qty" type="number" min="1" value={dropQty} onChange={(e) => setDropQty(e.target.value)} />
          <button type="button" className="btn" onClick={addDrop}>Adicionar</button>
        </div>

        {hunt.drops.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qtd</th>
                <th className="num">Preço un.</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {hunt.drops.map((d) => (
                <tr key={d.itemId}>
                  <td>{items.find((i) => i.id === d.itemId)?.name ?? d.itemId}</td>
                  <td className="num">{d.qty}</td>
                  <td className="num">{formatMoney(dropPrice(d))}</td>
                  <td className="num">{formatMoney(d.qty * dropPrice(d))}</td>
                  <td className="num">
                    <button type="button" className="btn small danger" onClick={() => removeDrop(d.itemId)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Loot total</td>
                <td className="num">{formatMoney(lootTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        <label>
          Observações
          <textarea className="input" rows={3} value={hunt.notes} onChange={set('notes')} />
        </label>

        <div className="row end">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn primary">Salvar</button>
        </div>
      </form>
    </>
  )
}
