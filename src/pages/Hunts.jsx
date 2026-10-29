import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import HuntTable from '../components/HuntTable.jsx'
import CharacterSelect, { filterByCharacter } from '../components/CharacterSelect.jsx'

export default function Hunts() {
  const { hunts } = useData()
  const [search, setSearch] = useState('')
  // personagem fica na URL para permitir links vindos de outras telas
  const [params, setParams] = useSearchParams()
  const character = params.get('character') ?? ''

  const setCharacter = (id) => setParams(id ? { character: id } : {}, { replace: true })

  const filtered = filterByCharacter(hunts, character)
    .filter((h) => (h.location ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <>
      <header className="page-header">
        <h1>Hunts</h1>
        <div className="row">
          <Link to="/hunts/new" className="btn">+ Manual</Link>
          <Link to="/hunts/import" className="btn primary">Importar JSON</Link>
        </div>
      </header>
      <div className="card">
        <div className="row wrap">
          <input
            className="input"
            placeholder="Filtrar por local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CharacterSelect value={character} onChange={setCharacter} emptyLabel="Todos os personagens" withNone />
        </div>
        <HuntTable hunts={filtered} />
      </div>
    </>
  )
}
