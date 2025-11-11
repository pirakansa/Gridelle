// File Header: Login bundle entry point responsible for mounting the login view.
import React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './pages/login/App'
import './utils/Global.scss'
import { LocaleProvider } from './utils/i18n'

// Function Header: Mounts the login page React tree into the root DOM node.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
)
