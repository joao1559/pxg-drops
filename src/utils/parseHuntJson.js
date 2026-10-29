import { slugify } from './format.js'

// Converte o JSON do Hunt Analyser para o formato interno de hunt.
//
// Formato principal: export do Hunt Analyser do PXG
//   { Drops: [...], Supplies: [...], Session: {...}, Damage: [...], Experience: [...], "Enemies Defeated": {...} }
// Para outros formatos existe um parser genérico (parseGeneric) baseado em aliases.

const today = () => new Date().toISOString().slice(0, 10)

function toNumber(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    // aceita "1.234.567", "1,234", "12k", "1.5kk"
    const s = v.trim().toLowerCase().replace(/\$/g, '')
    const m = s.match(/^([\d.,]+)\s*(kk|k)?$/)
    if (!m) return Number(s) || 0
    let num = m[2] ? Number(m[1].replace(',', '.')) : Number(m[1].replace(/[.,]/g, ''))
    if (m[2] === 'k') num *= 1e3
    if (m[2] === 'kk') num *= 1e6
    return num || 0
  }
  return 0
}

// Retorna minutos. Aceita número (minutos), "hh:mm:ss", "hh:mm" ou "1h 20min".
function parseDuration(v) {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return 0
  const s = v.trim()
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(s)) {
    const [h, m, sec = 0] = s.split(':').map(Number)
    return h * 60 + m + sec / 60
  }
  const h = Number(s.match(/(\d+)\s*h/)?.[1] ?? 0)
  const m = Number(s.match(/(\d+)\s*m/)?.[1] ?? 0)
  return h || m ? h * 60 + m : toNumber(s)
}

// Retorna "YYYY-MM-DD" sem conversão de fuso (o horário do analyser é local).
function parseDate(v) {
  if (!v) return today()
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v).toISOString().slice(0, 10)
  const s = String(v)
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const d = new Date(s)
  return isNaN(d) ? today() : d.toISOString().slice(0, 10)
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`JSON inválido: ${err.message}`)
  }
}

// Agrupa entradas {name, qty, unitPrice} pelo id do item (slug do nome).
function groupByItem(entries) {
  const map = new Map()
  for (const e of entries) {
    const id = slugify(String(e.name ?? ''))
    if (!id || !(e.qty > 0)) continue
    const cur = map.get(id)
    if (cur) cur.qty += e.qty
    else map.set(id, { itemId: id, name: String(e.name), qty: e.qty, unitPrice: e.unitPrice })
  }
  return [...map.values()]
}

// Itens dropados que ainda não existem no catálogo viram itens novos.
function collectNewItems(drops, existingItems) {
  const known = new Set(existingItems.map((i) => i.id))
  return drops
    .filter((d) => !known.has(d.itemId))
    .map((d) => ({ id: d.itemId, name: d.name, category: '', npcPrice: d.unitPrice ?? 0, marketPrice: 0 }))
}

// ---------------------------------------------------------------------------
// Formato do Hunt Analyser do PXG
// ---------------------------------------------------------------------------

function isPxgAnalyser(data) {
  return data && typeof data === 'object' && data.Session && Array.isArray(data.Drops)
}

function parsePxgEntries(list) {
  return (list ?? [])
    .filter((e) => !e.Ignored)
    .map((e) => ({ name: e.Item, qty: toNumber(e.Count), unitPrice: toNumber(e['Unit price']) }))
}

function parsePxg(data, existingItems) {
  const s = data.Session
  const warnings = []

  const drops = groupByItem(parsePxgEntries(data.Drops))
  const supplies = groupByItem(parsePxgEntries(data.Supplies))

  // "Enemies Defeated" costuma vir vazio; nesse caso usamos o Damage para saber quem foi enfrentado
  const defeated = data['Enemies Defeated'] ?? {}
  const kills = Array.isArray(defeated)
    ? defeated.map((e) => ({ name: String(e.Enemy ?? e.Name ?? e.name), qty: toNumber(e.Count ?? e.Kills ?? 1) }))
    : Object.entries(defeated).map(([name, v]) => ({ name, qty: toNumber(typeof v === 'object' ? v.Count : v) }))

  const enemyMap = new Map()
  for (const d of data.Damage ?? []) {
    const cur = enemyMap.get(d.Enemy) ?? { name: d.Enemy, dealt: 0, taken: 0 }
    cur.dealt += toNumber(d['Damage dealt'])
    cur.taken += toNumber(d['Damage taken'])
    enemyMap.set(d.Enemy, cur)
  }
  const enemies = [...enemyMap.values()].sort((a, b) => b.dealt - a.dealt)

  const players = [...new Set([...(data.Drops ?? []), ...(data.Experience ?? [])].map((e) => e.Player).filter(Boolean))]

  const supplyTotal = supplies.reduce((sum, e) => sum + e.qty * (e.unitPrice ?? 0), 0)
  const expenses = s.Supplies !== undefined ? toNumber(s.Supplies) : supplyTotal

  if (s.Status === 'Active') warnings.push('A sessão ainda estava ativa quando o JSON foi exportado.')
  if (!drops.length) warnings.push('Nenhum drop encontrado no JSON.')
  if (players.length > 1) warnings.push(`Sessão com ${players.length} jogadores: ${players.join(', ')}.`)
  const zeroPrice = drops.filter((d) => !d.unitPrice).map((d) => d.name)
  if (zeroPrice.length) warnings.push(`Drops sem preço no analyser: ${zeroPrice.join(', ')}.`)

  return {
    hunt: {
      source: 'pxg-analyser',
      sessionId: s['Session ID'] ?? null,
      startedAt: s.Start ?? null,
      date: parseDate(s.Start),
      player: players.join(', '),
      location: '',
      pokemon: (kills.length ? kills : enemies).map((e) => e.name).join(', '),
      kills,
      enemies,
      exp: toNumber(s.Experience),
      durationMin: Math.round(
        s['Duration seconds'] !== undefined ? toNumber(s['Duration seconds']) / 60 : parseDuration(s.Duration),
      ),
      expenses,
      supplies,
      drops: drops.map(({ itemId, qty, unitPrice }) => ({ itemId, qty, unitPrice })),
      reportedLoot: s['Raw gains'] !== undefined ? toNumber(s['Raw gains']) : null,
      reportedProfit: s.Profit !== undefined ? toNumber(s.Profit) : null,
      damageDealt: toNumber(s['Damage dealt']),
      damageTaken: toNumber(s['Damage taken']),
      notes: '',
    },
    newItems: collectNewItems(drops, existingItems),
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Parser genérico (fallback para outros formatos)
// ---------------------------------------------------------------------------

const ALIASES = {
  date: ['date', 'data', 'startedAt', 'start'],
  location: ['location', 'local', 'hunt', 'huntName', 'place', 'map', 'area'],
  duration: ['duration', 'duracao', 'sessionTime', 'time', 'tempo', 'elapsed'],
  durationSec: ['durationSeconds', 'durationSec', 'seconds', 'elapsedSeconds'],
  expenses: ['expenses', 'gastos', 'supplies', 'waste', 'supplyCost'],
  lootValue: ['lootValue', 'totalLoot', 'lootTotal'],
  drops: ['drops', 'loot', 'items', 'itens'],
  kills: ['kills', 'pokemon', 'pokemons', 'monsters', 'killed', 'abates'],
  exp: ['exp', 'xp', 'experience', 'expGained'],
  notes: ['notes', 'obs', 'observacoes'],
}
const ENTRY_NAME = ['name', 'nome', 'item', 'pokemon', 'monster', 'enemy']
const ENTRY_QTY = ['qty', 'quantity', 'amount', 'count', 'quantidade', 'qtd']
const ENTRY_PRICE = ['unit price', 'unitPrice', 'price', 'preco', 'value', 'valor']

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined
  const lower = Object.fromEntries(Object.keys(obj).map((k) => [k.toLowerCase(), k]))
  for (const k of keys) {
    const real = lower[k.toLowerCase()]
    if (real !== undefined && obj[real] !== undefined && obj[real] !== null) return obj[real]
  }
  return undefined
}

// Aceita lista [{name, qty, price}] ou objeto { "Item": 10 } / { "Item": {qty, price} }
function parseEntries(v) {
  if (!v) return []
  const entry = (name, e) => {
    const price = pick(e, ENTRY_PRICE)
    return { name, qty: toNumber(pick(e, ENTRY_QTY) ?? 1), unitPrice: price !== undefined ? toNumber(price) : undefined }
  }
  if (Array.isArray(v)) {
    return v
      .map((e) => (typeof e === 'string' ? { name: e, qty: 1 } : entry(pick(e, ENTRY_NAME), e)))
      .filter((e) => e.name)
  }
  if (typeof v === 'object') {
    return Object.entries(v).map(([name, val]) =>
      typeof val === 'object' ? entry(name, val) : { name, qty: toNumber(val) },
    )
  }
  return []
}

function parseGeneric(data, existingItems) {
  if (data && !Array.isArray(data)) data = data.hunt ?? data.analyser ?? data.data ?? data
  const warnings = []

  const drops = groupByItem(parseEntries(pick(data, ALIASES.drops)))
  const kills = parseEntries(pick(data, ALIASES.kills)).map((k) => ({ name: String(k.name), qty: k.qty }))

  const rawExpenses = pick(data, ALIASES.expenses)
  const supplies = rawExpenses && typeof rawExpenses === 'object' ? groupByItem(parseEntries(rawExpenses)) : []
  const expenses = supplies.length
    ? supplies.reduce((s, e) => s + e.qty * (e.unitPrice ?? 0), 0)
    : toNumber(rawExpenses)

  const durSec = pick(data, ALIASES.durationSec)
  const durationMin = Math.round(durSec !== undefined ? toNumber(durSec) / 60 : parseDuration(pick(data, ALIASES.duration)))

  const location = pick(data, ALIASES.location)
  if (!drops.length) warnings.push('Nenhum drop encontrado no JSON.')
  if (!durationMin) warnings.push('Duração não encontrada.')

  const lootValue = pick(data, ALIASES.lootValue)

  return {
    hunt: {
      source: 'generic',
      date: parseDate(pick(data, ALIASES.date)),
      location: location ? String(location) : '',
      pokemon: kills.map((k) => k.name).join(', '),
      kills,
      enemies: [],
      exp: toNumber(pick(data, ALIASES.exp)),
      durationMin,
      expenses,
      supplies,
      drops: drops.map(({ itemId, qty, unitPrice }) => ({ itemId, qty, unitPrice })),
      reportedLoot: lootValue !== undefined ? toNumber(lootValue) : null,
      reportedProfit: null,
      notes: String(pick(data, ALIASES.notes) ?? ''),
    },
    newItems: collectNewItems(drops, existingItems),
    warnings,
  }
}

/**
 * @returns {{ hunt: object, newItems: object[], warnings: string[] }}
 */
export function parseHuntJson(text, existingItems) {
  const data = parseJson(text)
  const result = isPxgAnalyser(data) ? parsePxg(data, existingItems) : parseGeneric(data, existingItems)
  if (result.newItems.length) {
    result.warnings.push(`${result.newItems.length} item(ns) novo(s) serão cadastrados no catálogo.`)
  }
  return result
}
