const nf = new Intl.NumberFormat('pt-BR')

export function formatMoney(value) {
  const n = Number(value) || 0
  return `$ ${nf.format(Math.round(n))}`
}

export function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function formatDuration(minutes) {
  const m = Number(minutes) || 0
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}min` : `${m}min`
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function newId() {
  return crypto.randomUUID()
}
