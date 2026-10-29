// Serverless Function da Vercel: recebe todas as rotas /api/* (ver vercel.json)
import express from 'express'
import { api } from '../server/api.js'

const app = express()
app.use('/api', api)

export default app
