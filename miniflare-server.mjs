import { Miniflare } from 'miniflare'
import { readFileSync } from 'fs'

const mf = new Miniflare({
  scriptPath: './dist/_worker.js',
  modules: true,
  d1Databases: ['DB'],
  r2Buckets: ['R2'],
  host: '0.0.0.0',
  port: 3000,
  liveReload: true
})

console.log('🚀 Miniflare server starting...')
console.log('✅ Server running at http://localhost:3000')
