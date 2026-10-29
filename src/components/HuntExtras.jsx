import { formatMoney } from '../utils/format.js'

const nf = new Intl.NumberFormat('pt-BR')

export function SuppliesTable({ supplies }) {
  if (!supplies?.length) return <p className="muted">Nenhum supply registrado.</p>
  const total = supplies.reduce((s, e) => s + e.qty * (e.unitPrice ?? 0), 0)
  return (
    <table className="table">
      <thead>
        <tr><th>Item</th><th className="num">Qtd</th><th className="num">Preço un.</th><th className="num">Total</th></tr>
      </thead>
      <tbody>
        {supplies.map((e) => (
          <tr key={e.itemId}>
            <td>{e.name}</td>
            <td className="num">{e.qty}</td>
            <td className="num">{formatMoney(e.unitPrice)}</td>
            <td className="num">{formatMoney(e.qty * (e.unitPrice ?? 0))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td colSpan={3}>Total</td><td className="num">{formatMoney(total)}</td></tr>
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
