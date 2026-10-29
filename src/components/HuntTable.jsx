import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { formatDate, formatDuration, formatMoney } from '../utils/format.js'

export default function HuntTable({ hunts }) {
  const { huntSummary, characterName, deleteHunt } = useData()

  const onDelete = (h) => {
    if (confirm(`Excluir a hunt ${h.location || 'Sem nome'} de ${formatDate(h.date)}?`)) deleteHunt(h.id)
  }

  if (!hunts.length) return <p className="muted">Nenhuma hunt registrada ainda.</p>

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Local</th>
          <th>Personagem</th>
          <th>Duração</th>
          <th className="num">Loot</th>
          <th className="num">Gastos</th>
          <th className="num">Lucro</th>
          <th className="num">Lucro/h</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {hunts.map((h) => {
          const s = huntSummary(h)
          return (
            <tr key={h.id}>
              <td>{formatDate(h.date)}</td>
              <td>
                <Link to={`/hunts/${h.id}`}>{h.location || 'Sem nome'}</Link>
              </td>
              <td>{characterName(h.characterId) || <span className="muted">-</span>}</td>
              <td>{formatDuration(h.durationMin)}</td>
              <td className="num">{formatMoney(s.loot)}</td>
              <td className="num">{formatMoney(s.expenses)}</td>
              <td className={`num ${s.profit >= 0 ? 'pos' : 'neg'}`}>{formatMoney(s.profit)}</td>
              <td className="num">{formatMoney(s.profitPerHour)}</td>
              <td className="num">
                <button className="btn small danger" title="Excluir hunt" onClick={() => onDelete(h)}>×</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
