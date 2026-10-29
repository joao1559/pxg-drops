export default function StatCard({ label, value, tone }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ?? ''}`}>{value}</span>
    </div>
  )
}
