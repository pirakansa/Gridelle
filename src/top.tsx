// Top page bundle entry point responsible for mounting the splash view.
import React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './pages/top/App'
import './utils/Global.scss'

// Render the top page application inside the root container.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
