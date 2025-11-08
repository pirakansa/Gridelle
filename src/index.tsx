// Index landing bundle entry point responsible for mounting the index view.
import React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './pages/index/App'
import './utils/Global.scss'

/**
 * Mounts the index landing page into the root DOM container.
 */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
