import { useData } from '../context/DataContext.jsx'
import { formatMoney } from '../utils/format.js'

const nf = new Intl.NumberFormat('pt-BR')

// newIds: supplies que ainda serão cadastrados no catálogo (prévia da importação)
export function SuppliesTable({ supplies, newIds = [] }) {
  const { supplies: catalog, supplyPrice, suppliesTotal } = useData()
  if (!supplies?.length) return <p className="muted">Nenhum supply registrado.</p>
  const nameOf = (e) => catalog.find((i) => i.id === e.itemId)?.name ?? e.name ?? e.itemId
  return (
    <table className="table">
      <thead>
        <tr><th>Item</th><th className="num">Qtd</th><th className="num">Preço un.</th><th className="num">Total</th></tr>
      </thead>
      <tbody>
        {supplies.map((e) => (
          <tr key={e.itemId}>
            <td>
              {nameOf(e)}
              {newIds.includes(e.itemId) && <span className="tag">novo</span>}
            </td>
            <td className="num">{e.qty}</td>
            <td className="num">{formatMoney(supplyPrice(e))}</td>
            <td className="num">{formatMoney(e.qty * supplyPrice(e))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td colSpan={3}>Total</td><td className="num">{formatMoney(suppliesTotal(supplies))}</td></tr>
      </tfoot>
    </table>
  )
}

export function EnemiesTable({ kills, enemies }) {
  if (kills?.length) {
    return (
      <ul className="rank">
        {kills.map((k) => <li key={k.name}><span>{k.name}</span><strong>{k.qty}</strong></li>)}
      </ul>
    )
  }
  if (!enemies?.length) return <p className="muted">Nenhum inimigo registrado.</p>
  return (
    <table className="table">
      <thead>
        <tr><th>Inimigo</th><th className="num">Dano causado</th><th className="num">Dano recebido</th></tr>
      </thead>
      <tbody>
        {enemies.map((e) => (
          <tr key={e.name}>
            <td>{e.name}</td>
            <td className="num">{nf.format(e.dealt)}</td>
            <td className="num">{nf.format(e.taken)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
