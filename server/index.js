// Servidor de produção: API + build estático do Vite (rode `npm run build` antes)
import express from 'express'
import { fileURLToPath } from 'node:url'
import { api } from './api.js'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const port = Number(process.env.PORT) || 3000

const app = express()
app.use('/api', api)
app.use(express.static(dist))
// SPA: qualquer outra rota devolve o index.html
app.use((req, res) => res.sendFile('index.html', { root: dist }))

app.listen(port, () => console.log(`PXG Drops em http://localhost:${port}`))
