import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api } from '../utils/api.js'
import { newId } from '../utils/format.js'

// Chave da versão antiga, que guardava tudo no localStorage
const LEGACY_STORAGE_KEY = 'pxg-drops:v1'
const DataContext = createContext(null)

// Garante os campos que versões antigas do backup/storage não tinham
function normalize(state) {
  return { items: [], hunts: [], characters: [], ...state }
}

function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // dados corrompidos ou storage bloqueado: ignora
  }
  return null
}

// Guarda uma cópia e para de usar a chave antiga, para não migrar de novo
function archiveLegacy() {
  try {
    localStorage.setItem(`${LEGACY_STORAGE_KEY}-backup`, localStorage.getItem(LEGACY_STORAGE_KEY))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignora
  }
}

const sortHunts = (hunts) =>
  [...hunts].sort((a, b) => `${b.date}${b.startedAt ?? ''}`.localeCompare(`${a.date}${a.startedAt ?? ''}`))

async function fetchInitial() {
  const data = await api.load()
  if (!data.empty) return data
  // primeiro acesso: migra o que estava no navegador ou cria o catálogo inicial
  const legacy = readLegacy()
  const imported = await api.importAll(legacy ?? { items: data.seedItems, hunts: [], characters: [] })
  if (legacy) archiveLegacy()
  return imported
}

// Compartilhado entre montagens (o StrictMode monta o provider duas vezes em dev)
let initialLoad = null

// Requisições do mesmo documento rodam em fila, para a última edição ser a que fica salva
const queues = new Map()

export function DataProvider({ children }) {
  const [state, setState] = useState(() => normalize({}))
  const [status, setStatus] = useState('loading')
  const [syncError, setSyncError] = useState('')

  const load = useCallback(() => {
    initialLoad ??= fetchInitial()
    initialLoad
      .then((data) => {
        setState(normalize({ items: data.items, hunts: sortHunts(data.hunts), characters: data.characters }))
        setStatus('ready')
      })
      .catch((err) => {
        initialLoad = null
        setSyncError(err.message)
        setStatus('error')
      })
  }, [])

  useEffect(load, [load])

  const persist = useCallback((key, fn) => {
    const next = (queues.get(key) ?? Promise.resolve()).then(fn).catch((err) => setSyncError(err.message))
    queues.set(key, next)
  }, [])

  // ---- Itens ----
  const saveItem = useCallback((item) => {
    setState((s) => {
      const exists = s.items.some((i) => i.id === item.id)
      return {
        ...s,
        items: exists ? s.items.map((i) => (i.id === item.id ? item : i)) : [...s.items, item],
      }
    })
    persist(`items:${item.id}`, () => api.save('items', item))
  }, [persist])

  const deleteItem = useCallback((id) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }))
    persist(`items:${id}`, () => api.remove('items', id))
  }, [persist])

  // ---- Hunts ----
  const saveHunt = useCallback((hunt) => {
    const withId = hunt.id ? hunt : { ...hunt, id: newId() }
    setState((s) => {
      const exists = s.hunts.some((h) => h.id === withId.id)
      return {
        ...s,
        hunts: exists ? s.hunts.map((h) => (h.id === withId.id ? withId : h)) : [withId, ...s.hunts],
      }
    })
    persist(`hunts:${withId.id}`, () => api.save('hunts', withId))
    return withId.id
  }, [persist])

  const deleteHunt = useCallback((id) => {
    setState((s) => ({ ...s, hunts: s.hunts.filter((h) => h.id !== id) }))
    persist(`hunts:${id}`, () => api.remove('hunts', id))
  }, [persist])

  // ---- Personagens ----
  const saveCharacter = useCallback((character) => {
    const withId = character.id ? character : { ...character, id: newId() }
    setState((s) => {
      const exists = s.characters.some((c) => c.id === withId.id)
      return {
        ...s,
        characters: exists
          ? s.characters.map((c) => (c.id === withId.id ? withId : c))
          : [...s.characters, withId],
      }
    })
    persist(`characters:${withId.id}`, () => api.save('characters', withId))
    return withId.id
  }, [persist])

  // Hunts do personagem excluído ficam sem personagem (o servidor faz o mesmo no banco)
  const deleteCharacter = useCallback((id) => {
    setState((s) => ({
      ...s,
      characters: s.characters.filter((c) => c.id !== id),
      hunts: s.hunts.map((h) => (h.characterId === id ? { ...h, characterId: null } : h)),
    }))
    persist(`characters:${id}`, () => api.remove('characters', id))
  }, [persist])

  const characterName = useCallback(
    (id) => state.characters.find((c) => c.id === id)?.name ?? '',
    [state.characters],
  )

  // ---- Cálculos ----
  const itemPrice = useCallback(
    (itemId) => {
      const item = state.items.find((i) => i.id === itemId)
      if (!item) return 0
      return Number(item.marketPrice) || Number(item.npcPrice) || 0
    },
    [state.items],
  )

  // Preço de um drop: o registrado na hunt (vindo do analyser) ou, se for 0/ausente, o do catálogo
  const dropPrice = useCallback(
    (drop) => (Number(drop.unitPrice) > 0 ? Number(drop.unitPrice) : itemPrice(drop.itemId)),
    [itemPrice],
  )

  const huntSummary = useCallback(
    (hunt) => {
      const loot = hunt.drops.reduce((sum, d) => sum + d.qty * dropPrice(d), 0)
      const expenses = Number(hunt.expenses) || 0
      const profit = loot - expenses
      const hours = (Number(hunt.durationMin) || 0) / 60
      return { loot, expenses, profit, profitPerHour: hours ? profit / hours : 0 }
    },
    [dropPrice],
  )

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state])

  // Substitui todos os dados do banco pelo conteúdo do backup
  const importData = useCallback(async (json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.hunts)) {
      throw new Error('Arquivo inválido')
    }
    const data = await api.importAll(normalize(parsed))
    setState(normalize({ items: data.items, hunts: sortHunts(data.hunts), characters: data.characters }))
  }, [])

  const clearSyncError = useCallback(() => setSyncError(''), [])

  const value = useMemo(
    () => ({
      items: state.items,
      hunts: state.hunts,
      characters: state.characters,
      saveItem,
      deleteItem,
      saveHunt,
      deleteHunt,
      saveCharacter,
      deleteCharacter,
      characterName,
      itemPrice,
      dropPrice,
      huntSummary,
      exportData,
      importData,
      syncError,
      clearSyncError,
    }),
    [
      state, saveItem, deleteItem, saveHunt, deleteHunt, saveCharacter, deleteCharacter, characterName,
      itemPrice, dropPrice, huntSummary, exportData, importData, syncError, clearSyncError,
    ],
  )

  if (status === 'loading') return <p className="loading muted">Carregando dados...</p>
  if (status === 'error') {
    return (
      <div className="loading">
        <p className="neg">Não foi possível conectar ao banco de dados: {syncError}</p>
        <button className="btn" onClick={() => { setStatus('loading'); load() }}>Tentar de novo</button>
      </div>
    )
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>')
  return ctx
}
