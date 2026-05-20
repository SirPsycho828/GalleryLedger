import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { processQueue } from '@/lib/uploadQueue'

// Process any queued uploads from previous sessions
processQueue()

// Console branding
console.log(
  '%c' + [
    '  ┌──────────────────────────────────┐',
    '  │  ╔═╗ ╔═╗ ╦   ╦   ╔═╗ ╦═╗ ╦ ╦  │',
    '  │  ║ ╦ ╠═╣ ║   ║   ╠═  ╠╦╝ ╚╦╝  │',
    '  │  ╚═╝ ╩ ╩ ╩═╝ ╩═╝ ╚═╝ ╩╚   ╩   │',
    '  │       ╦   ╔═╗ ╔═╗ ╔═╗ ╔═╗ ╦═╗  │',
    '  │       ║   ╠═  ║ ║ ║ ╦ ╠═  ╠╦╝  │',
    '  │       ╩═╝ ╚═╝ ╚═╝ ╚═╝ ╚═╝ ╩╚   │',
    '  └──────────────────────────────────┘',
  ].join('\n'),
  'color: #B8956A; font-family: monospace; font-size: 12px;'
)
console.log('%cEvery masterpiece deserves a paper trail.', 'color: #8B7355; font-size: 12px; font-style: italic;')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
