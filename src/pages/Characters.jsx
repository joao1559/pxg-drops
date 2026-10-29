import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { formatMoney } from '../utils/format.js'

const emptyCharacter = { name: '', level: '' }

export default function Characters() {
  const { characters, hunts, saveCharacter, deleteCharacter, huntSummary } = useData()
  const [form, setForm] = useState(emptyCharacter)

  const nameTaken = (name, exceptId) =>
    characters.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase())

  const onAdd = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    if (nameTaken(name)) return alert('Já existe um personagem com esse nome.')
    saveCharacter({ name, level: Number(form.level) || 0 })
    setForm(emptyCharacter)
  }

  const updateField = (character, field, value) =>
    saveCharacter({ ...character, [field]: field === 'level' ? Number(value) || 0 : value })

  const onRename = (character, input) => {
    const name = input.value.trim()
    if (name && name !== character.name && !nameTaken(name, character.id)) return updateField(character, 'name', name)
    if (name && nameTaken(name, character.id)) alert('Já existe um personagem com esse nome.')
    input.value = character.name
  }

  const statsOf = (id) => {
    const own = hunts.filter((h) => h.characterId === id)
    const profit = own.reduce((sum, h) => sum + huntSummary(h).profit, 0)
    const minutes = own.reduce((sum, h) => sum + (Number(h.durationMin) || 0), 0)
    return { count: own.length, profit, profitPerHour: minutes ? profit / (minutes / 60) : 0 }
  }

  const onDelete = (character, count) => {
    const msg = count
      ? `Excluir ${character.name}? As ${count} hunt(s) dele ficarão sem personagem.`
      : `Excluir ${character.name}?`
    if (confirm(msg)) deleteCharacter(character.id)
  }

  const sorted = [...characters].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <header className="page-header">
        <h1>Personagens</h1>
      </header>

      <form className="card row wrap" onSubmit={onAdd}>
        <input className="input" placeholder="Nome do personagem" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input qty" type="number" min="1" placeholder="Nível" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} required />
        <button className="btn primary" type="submit">Adicionar personagem</button>
      </form>

      <div className="card">
        {sorted.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="num">Nível</th>
                <th className="num">Hunts</th>
                <th className="num">Lucro</th>
                <th className="num">Lucro/h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const s = statsOf(c.id)
                return (
                  <tr key={c.id}>
                    <td>
                      {/* salva ao sair do campo, para validar o nome completo */}
                      <input key={c.name} className="input inline" defaultValue={c.name} onBlur={(e) => onRename(c, e.target)} />
                    </td>
                    <td className="num">
                      <input className="input inline num" type="number" min="1" value={c.level || ''} onChange={(e) => updateField(c, 'level', e.target.value)} />
                    </td>
                    <td className="num">
                      {s.count ? <Link to={`/hunts?character=${c.id}`}>{s.count}</Link> : 0}
                    </td>
                    <td className={`num ${s.profit >= 0 ? 'pos' : 'neg'}`}>{formatMoney(s.profit)}</td>
                    <td className="num">{formatMoney(s.profitPerHour)}</td>
                    <td className="num">
                      <button className="btn small danger" onClick={() => onDelete(c, s.count)}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nenhum personagem cadastrado ainda.</p>
        )}
      </div>
    </>
  )
}
