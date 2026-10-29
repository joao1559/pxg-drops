import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import StatCard from '../components/StatCard.jsx'
import CharacterSelect from '../components/CharacterSelect.jsx'
import { EnemiesTable, SuppliesTable } from '../components/HuntExtras.jsx'
import { parseHuntJson } from '../utils/parseHuntJson.js'
import { formatDate, formatDuration, formatMoney } from '../utils/format.js'
import EXAMPLE from '../../json-example.json?raw'

export default function ImportHunt() {
  const navigate = useNavigate()
  const { items, hunts, characters, saveItem, saveHunt, saveCharacter, dropPrice } = useData()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [characterId, setCharacterId] = useState('')

  const findCharacter = (name) =>
    characters.find((c) => c.name.trim().toLowerCase() === (name ?? '').trim().toLowerCase())

  const analyse = (json = text) => {
    setError('')
    try {
      const r = parseHuntJson(json, items)
      setResult(r)
      setLocation(r.hunt.location)
      setNotes(r.hunt.notes)
      // seleciona automaticamente o personagem com o mesmo nome do jogador do analyser
      setCharacterId(findCharacter(r.hunt.player)?.id ?? '')
    } catch (err) {
      setResult(null)
      setError(err.message)
    }
  }

  const onPaste = (e) => {
    // analisa automaticamente ao colar o JSON inteiro
    const pasted = e.clipboardData.getData('text')
    if (!text.trim() && pasted.trim().startsWith('{')) setTimeout(() => analyse(pasted))
  }

  const h = result?.hunt
  const duplicate = h?.sessionId != null
    ? hunts.find((x) => x.sessionId === h.sessionId && x.startedAt === h.startedAt)
    : null

  const allItems = [...items, ...(result?.newItems ?? [])]
  const nameOf = (id) => allItems.find((i) => i.id === id)?.name ?? id
  const priceOf = dropPrice

  const loot = h ? h.drops.reduce((s, d) => s + d.qty * priceOf(d), 0) : 0
  const profit = loot - (h?.expenses ?? 0)
  const hours = (h?.durationMin ?? 0) / 60

  const onSave = (e) => {
    e.preventDefault()
    result.newItems.forEach(saveItem)
    const id = saveHunt({ ...h, location: location.trim(), notes, characterId: characterId || null })
    navigate(`/hunts/${id}`)
  }

  // jogador único do analyser que ainda não está cadastrado
  const unknownPlayer = h?.player && !h.player.includes(',') && !findCharacter(h.player) ? h.player : null

  const registerPlayer = () => {
    const level = prompt(`Nível de ${unknownPlayer}:`)
    if (level === null) return
    setCharacterId(saveCharacter({ name: unknownPlayer, level: Number(level) || 0 }))
  }

  return (
    <>
      <header className="page-header">
        <h1>Importar hunt</h1>
      </header>

      <section className="card form">
        <label>
          Cole aqui o JSON exportado do Hunt Analyser
          <textarea
            className="input mono"
            rows={result ? 5 : 14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder='{ "Drops": [...], "Supplies": [...], "Session": {...}, ... }'
            spellCheck={false}
          />
        </label>
        <div className="row end">
          <button type="button" className="btn" onClick={() => { setText(EXAMPLE); analyse(EXAMPLE) }}>Usar exemplo</button>
          <button type="button" className="btn" onClick={() => { setText(''); setResult(null); setError('') }}>Limpar</button>
          <button type="button" className="btn primary" onClick={() => analyse()} disabled={!text.trim()}>Analisar</button>
        </div>
        {error && <p className="neg">{error}</p>}
      </section>

      {h && (
        <form onSubmit={onSave}>
          {(duplicate || result.warnings.length > 0) && (
            <section className="card warn">
              {duplicate && (
                <p>⚠ Esta sessão já foi importada: <Link to={`/hunts/${duplicate.id}`}>{duplicate.location}</Link>. Salvar vai criar uma cópia.</p>
              )}
              {result.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
            </section>
          )}

          <section className="card form">
            <h2>Sessão</h2>
            <div className="form-grid">
              <label>
                Local da hunt *
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Nightmare World - Terror" required autoFocus />
              </label>
              <label>
                Personagem
                <CharacterSelect value={characterId} onChange={setCharacterId} />
                {unknownPlayer && (
                  <button type="button" className="btn small" onClick={registerPlayer}>
                    + Cadastrar “{unknownPlayer}”
                  </button>
                )}
              </label>
              <label>Início<span className="value">{h.startedAt ?? formatDate(h.date)}</span></label>
              <label>Duração<span className="value">{formatDuration(h.durationMin)}</span></label>
              {h.player && <label>Jogador<span className="value">{h.player}</span></label>}
            </div>
            <label>
              Observações
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </section>

          <section className="stats">
            <StatCard label="Loot" value={formatMoney(loot)} />
            <StatCard label="Supplies" value={formatMoney(h.expenses)} />
            <StatCard label="Lucro" value={formatMoney(profit)} tone={profit >= 0 ? 'pos' : 'neg'} />
            <StatCard label="Lucro/h" value={formatMoney(hours ? profit / hours : 0)} />
            {h.exp > 0 && <StatCard label="EXP" value={h.exp.toLocaleString('pt-BR')} />}
            {h.exp > 0 && hours > 0 && <StatCard label="EXP/h" value={Math.round(h.exp / hours).toLocaleString('pt-BR')} />}
          </section>
          {h.reportedProfit !== null && h.reportedProfit !== profit && (
            <p className="muted small">
              Lucro informado pelo analyser: {formatMoney(h.reportedProfit)} (diferença vem de preços do catálogo usados em itens sem preço).
            </p>
          )}

          <section className="card">
            <h2>Drops ({h.drops.length})</h2>
            <table className="table">
              <thead>
                <tr><th>Item</th><th className="num">Qtd</th><th className="num">Preço un.</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {h.drops.map((d) => (
                  <tr key={d.itemId}>
                    <td>
                      {nameOf(d.itemId)}
                      {result.newItems.some((n) => n.id === d.itemId) && <span className="tag">novo</span>}
                    </td>
                    <td className="num">{d.qty}</td>
                    <td className="num">{formatMoney(priceOf(d))}</td>
                    <td className="num">{formatMoney(d.qty * priceOf(d))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid-2 even">
            <section className="card">
              <h2>Supplies</h2>
              <SuppliesTable supplies={h.supplies} />
            </section>
            <section className="card">
              <h2>{h.kills.length ? 'Abates' : 'Inimigos'}</h2>
              <EnemiesTable kills={h.kills} enemies={h.enemies} />
            </section>
          </div>

          <div className="row end">
            <button type="submit" className="btn primary">Salvar hunt</button>
          </div>
        </form>
      )}
    </>
  )
}
