// Simple test server for EXIT System
// This bypasses wrangler authentication issues during development

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './dist/_worker.js'

const port = 3000

// Serve static files from dist directory
// Override serveStatic to use Node.js version
const testApp = app

console.log(`🚀 EXIT System Test Server starting on port ${port}...`)

serve({
  fetch: testApp.fetch,
  port
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`)
  console.log(`📱 Public URL: https://3000-${process.env.SANDBOX_ID}.sandbox.novita.ai`)
})
