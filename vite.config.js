import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { api } from './server/api.js'

if (existsSync('atlas-credentials.env')) process.loadEnvFile('atlas-credentials.env')

// Em dev a API do MongoDB roda dentro do próprio servidor do Vite, em /api
const mongoApi = () => ({
  name: 'pxg-mongo-api',
  configureServer(server) {
    server.middlewares.use('/api', api)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mongoApi()],
})
