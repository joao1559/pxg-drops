import dns from 'node:dns'
import express from 'express'
import { MongoClient } from 'mongodb'
import { seedItems } from '../src/data/seedItems.js'

// API de persistência no MongoDB.
// Cada coleção guarda os documentos com _id = id usado no front.

const COLLECTIONS = ['items', 'hunts', 'characters']

// No Windows o Node às vezes não lê o DNS do sistema e usa só 127.0.0.1, o que quebra
// a busca SRV do "mongodb+srv://". Nesse caso usa DNS públicos (ou MONGODB_DNS_SERVERS).
if (process.env.MONGODB_DNS_SERVERS || dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) {
  dns.setServers((process.env.MONGODB_DNS_SERVERS || '1.1.1.1,8.8.8.8').split(','))
}

let dbPromise = null
function getDb() {
  if (!process.env.MONGO_MONGODB_URI) throw new Error('MONGO_MONGODB_URI não definida (veja atlas-credentials.env)')
  dbPromise ??= new MongoClient(process.env.MONGO_MONGODB_URI)
    .connect()
    .then((client) => client.db(process.env.MONGODB_DB || 'pxg-drops'))
    .catch((err) => {
      dbPromise = null // tenta reconectar na próxima requisição
      throw err
    })
  return dbPromise
}

const toDoc = (obj) => ({ ...obj, _id: obj.id })
const fromDoc = ({ _id, ...rest }) => ({ ...rest, id: _id })

async function readAll(db) {
  const [items, hunts, characters] = await Promise.all(
    COLLECTIONS.map((name) => db.collection(name).find().toArray()),
  )
  return { items: items.map(fromDoc), hunts: hunts.map(fromDoc), characters: characters.map(fromDoc) }
}

async function replaceAll(db, data) {
  for (const name of COLLECTIONS) {
    const col = db.collection(name)
    await col.deleteMany({})
    const docs = (data[name] ?? []).filter((d) => d?.id).map(toDoc)
    if (docs.length) await col.insertMany(docs)
  }
}

export const api = express()
api.use(express.json({ limit: '20mb' }))

// Banco vazio: empty=true para o front decidir se migra dados do localStorage
api.get('/data', async (req, res) => {
  const db = await getDb()
  const data = await readAll(db)
  const empty = !data.items.length && !data.hunts.length && !data.characters.length
  res.json({ ...data, empty, seedItems: empty ? seedItems : undefined })
})

// Substitui todos os dados (importação de backup / migração do localStorage)
api.post('/import', async (req, res) => {
  const data = req.body
  if (!Array.isArray(data?.items) || !Array.isArray(data?.hunts)) {
    return res.status(400).json({ error: 'Arquivo inválido' })
  }
  const db = await getDb()
  await replaceAll(db, data)
  res.json(await readAll(db))
})

for (const name of COLLECTIONS) {
  api.put(`/${name}/:id`, async (req, res) => {
    const doc = toDoc({ ...req.body, id: req.params.id })
    const db = await getDb()
    await db.collection(name).replaceOne({ _id: doc._id }, doc, { upsert: true })
    res.json(fromDoc(doc))
  })
}

api.delete('/items/:id', async (req, res) => {
  const db = await getDb()
  await db.collection('items').deleteOne({ _id: req.params.id })
  res.status(204).end()
})

api.delete('/hunts/:id', async (req, res) => {
  const db = await getDb()
  await db.collection('hunts').deleteOne({ _id: req.params.id })
  res.status(204).end()
})

// Hunts do personagem excluído ficam sem personagem
api.delete('/characters/:id', async (req, res) => {
  const db = await getDb()
  await db.collection('characters').deleteOne({ _id: req.params.id })
  await db.collection('hunts').updateMany({ characterId: req.params.id }, { $set: { characterId: null } })
  res.status(204).end()
})

// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  console.error('[api]', err)
  res.status(500).json({ error: err.message })
})
