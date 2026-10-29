import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import StatCard from '../components/StatCard.jsx'
import { EnemiesTable, SuppliesTable } from '../components/HuntExtras.jsx'
import { formatDate, formatDuration, formatMoney } from '../utils/format.js'

export default function HuntDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hunts, items, huntSummary, dropPrice, deleteHunt, characterName } = useData()
  const hunt = hunts.find((h) => h.id === id)

  if (!hunt) return <p>Hunt não encontrada. <Link to="/hunts">Voltar</Link></p>

  const s = huntSummary(hunt)

  const onDelete = () => {
    if (confirm('Excluir esta hunt?')) {
      deleteHunt(hunt.id)
      navigate('/hunts')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{hunt.location}</h1>
          <p className="muted">
            {formatDate(hunt.date)} · {formatDuration(hunt.durationMin)}
            {hunt.characterId && characterName(hunt.characterId) && (
              <> · <Link to={`/hunts?character=${hunt.characterId}`}>{characterName(hunt.characterId)}</Link></>
            )}
            {hunt.player && hunt.player !== characterName(hunt.characterId) && ` · ${hunt.player}`}
            {hunt.sessionId != null && ` · Sessão #${hunt.sessionId}`}
          </p>
        </div>
        <div className="row">
          <Link to={`/hunts/${hunt.id}/edit`} className="btn">Editar</Link>
          <button className="btn danger" onClick={onDelete}>Excluir</button>
        </div>
      </header>

      <section className="stats">
        <StatCard label="Loot" value={formatMoney(s.loot)} />
        <StatCard label="Gastos" value={formatMoney(s.expenses)} />
        <StatCard label="Lucro" value={formatMoney(s.profit)} tone={s.profit >= 0 ? 'pos' : 'neg'} />
        <StatCard label="Lucro/h" value={formatMoney(s.profitPerHour)} />
        {hunt.exp > 0 && <StatCard label="EXP" value={hunt.exp.toLocaleString('pt-BR')} />}
      </section>

      {(hunt.supplies?.length > 0 || hunt.kills?.length > 0 || hunt.enemies?.length > 0) && (
        <div className="grid-2 even">
          <section className="card">
            <h2>Supplies</h2>
            <SuppliesTable supplies={hunt.supplies} />
          </section>
          <section className="card">
            <h2>{hunt.kills?.length ? 'Abates' : 'Inimigos'}</h2>
            <EnemiesTable kills={hunt.kills} enemies={hunt.enemies} />
          </section>
        </div>
      )}

      <section className="card">
        <h2>Drops</h2>
        {hunt.drops.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qtd</th>
                <th className="num">Preço un.</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {hunt.drops.map((d) => (
                <tr key={d.itemId}>
                  <td>{items.find((i) => i.id === d.itemId)?.name ?? d.itemId}</td>
                  <td className="num">{d.qty}</td>
                  <td className="num">{formatMoney(dropPrice(d))}</td>
                  <td className="num">{formatMoney(d.qty * dropPrice(d))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nenhum drop registrado.</p>
        )}
        {hunt.notes && (
          <>
            <h2>Observações</h2>
            <p>{hunt.notes}</p>
          </>
        )}
      </section>
    </>
  )
}
