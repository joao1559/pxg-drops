import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Hunts from './pages/Hunts.jsx'
import HuntForm from './pages/HuntForm.jsx'
import HuntDetail from './pages/HuntDetail.jsx'
import Items from './pages/Items.jsx'
import ImportHunt from './pages/ImportHunt.jsx'
import Characters from './pages/Characters.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="hunts" element={<Hunts />} />
        <Route path="hunts/import" element={<ImportHunt />} />
        <Route path="hunts/new" element={<HuntForm />} />
        <Route path="hunts/:id" element={<HuntDetail />} />
        <Route path="hunts/:id/edit" element={<HuntForm />} />
        <Route path="items" element={<Items />} />
        <Route path="characters" element={<Characters />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
