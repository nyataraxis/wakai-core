import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'

const UPDATE_INTERVAL_MS = 60 * 60 * 1000

registerSW({
  onRegistered: (registration) => {
    if (registration) {
      setInterval(() => registration.update(), UPDATE_INTERVAL_MS)
    }
  }
})

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
