import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useViewerStore } from './store/useViewerStore'

// Apply the saved theme before the first paint so the page doesn't flash.
document.documentElement.dataset.theme = useViewerStore.getState().theme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
