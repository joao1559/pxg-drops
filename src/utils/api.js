async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Erro ${res.status} em ${method} ${path}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  load: () => request('GET', '/data'),
  importAll: (data) => request('POST', '/import', data),
  save: (collection, doc) => request('PUT', `/${collection}/${encodeURIComponent(doc.id)}`, doc),
  remove: (collection, id) => request('DELETE', `/${collection}/${encodeURIComponent(id)}`),
}
