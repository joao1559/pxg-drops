import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import StatCard from '../components/StatCard.jsx'
import HuntTable from '../components/HuntTable.jsx'
import CharacterSelect, { NO_CHARACTER, filterByCharacter } from '../components/CharacterSelect.jsx'
import { formatMoney } from '../utils/format.js'

export default function Dashboard() {
  const { hunts: allHunts, items, characters, huntSummary } = useData()
  const [character, setCharacter] = useState('')
  const hunts = filterByCharacter(allHunts, character)

  const sumUp = (list) => {
    const t = list.reduce(
      (acc, h) => {
        const s = huntSummary(h)
        acc.loot += s.loot
        acc.expenses += s.expenses
        acc.profit += s.profit
        acc.minutes += Number(h.durationMin) || 0
        return acc
      },
      { count: list.length, loot: 0, expenses: 0, profit: 0, minutes: 0 },
    )
    return { ...t, profitPerHour: t.minutes ? t.profit / (t.minutes / 60) : 0 }
  }

  const totals = sumUp(hunts)

  // Resumo por personagem (só na visão geral)
  const byCharacter = [
    ...[...characters]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name, level: c.level, ...sumUp(filterByCharacter(allHunts, c.id)) })),
    { id: NO_CHARACTER, name: 'Sem personagem', ...sumUp(filterByCharacter(allHunts, NO_CHARACTER)) },
  ].filter((r) => r.id !== NO_CHARACTER || r.count > 0)

  // Itens mais dropados (por quantidade)
  const dropCount = {}
  hunts.forEach((h) => h.drops.forEach((d) => (dropCount[d.itemId] = (dropCount[d.itemId] || 0) + d.qty)))
  const topDrops = Object.entries(dropCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => ({ name: items.find((i) => i.id === id)?.name ?? id, qty }))

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <div className="row">
          <CharacterSelect value={character} onChange={setCharacter} emptyLabel="Todos os personagens" withNone />
          <Link to="/hunts/new" className="btn">+ Manual</Link>
          <Link to="/hunts/import" className="btn primary">Importar JSON</Link>
        </div>
      </header>

      <section className="stats">
        <StatCard label="Hunts" value={hunts.length} />
        <StatCard label="Loot total" value={formatMoney(totals.loot)} />
        <StatCard label="Gastos" value={formatMoney(totals.expenses)} />
        <StatCard label="Lucro" value={formatMoney(totals.profit)} tone={totals.profit >= 0 ? 'pos' : 'neg'} />
        <StatCard label="Lucro/h médio" value={formatMoney(totals.profitPerHour)} />
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Últimas hunts</h2>
          <HuntTable hunts={hunts.slice(0, 5)} />
          {totals.count > 5 && (
            <p className="small">
              <Link to={character ? `/hunts?character=${character}` : '/hunts'}>Ver todas ({totals.count})</Link>
            </p>
          )}
        </section>
        <section className="card">
          <h2>Mais dropados</h2>
          {topDrops.length ? (
            <ul className="rank">
              {topDrops.map((d) => (
                <li key={d.name}>
                  <span>{d.name}</span>
                  <strong>{d.qty}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sem drops ainda.</p>
          )}
        </section>
      </div>

      {!character && characters.length > 0 && (
        <section className="card">
          <h2>Por personagem</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Personagem</th>
                <th className="num">Nível</th>
                <th className="num">Hunts</th>
                <th className="num">Loot</th>
                <th className="num">Gastos</th>
                <th className="num">Lucro</th>
                <th className="num">Lucro/h</th>
              </tr>
            </thead>
            <tbody>
              {byCharacter.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCharacter(r.id) }}>{r.name}</a>
                  </td>
                  <td className="num">{r.level || '-'}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{formatMoney(r.loot)}</td>
                  <td className="num">{formatMoney(r.expenses)}</td>
                  <td className={`num ${r.profit >= 0 ? 'pos' : 'neg'}`}>{formatMoney(r.profit)}</td>
                  <td className="num">{formatMoney(r.profitPerHour)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
