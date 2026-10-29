import { useData } from '../context/DataContext.jsx'

// Valor especial usado nos filtros para "hunts sem personagem"
export const NO_CHARACTER = '__none__'

// eslint-disable-next-line react-refresh/only-export-components
export function filterByCharacter(hunts, characterId) {
  if (!characterId) return hunts
  if (characterId === NO_CHARACTER) return hunts.filter((h) => !h.characterId)
  return hunts.filter((h) => h.characterId === characterId)
}

// emptyLabel: texto da opção vazia ("Todos os personagens", "Sem personagem"...)
// withNone: adiciona a opção de filtrar hunts sem personagem
export default function CharacterSelect({ value, onChange, emptyLabel = 'Sem personagem', withNone = false, className = '', ...rest }) {
  const { characters } = useData()
  const sorted = [...characters].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <select className={`input ${className}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{emptyLabel}</option>
      {withNone && <option value={NO_CHARACTER}>Sem personagem</option>}
      {sorted.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{c.level ? ` (lv ${c.level})` : ''}
        </option>
      ))}
    </select>
  )
}
