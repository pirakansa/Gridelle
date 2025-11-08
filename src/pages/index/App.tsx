// Entry page component presenting the Gridelle landing logo.
import React from 'react'
import styles from './index.module.scss'
import logoUrl from '../../assets/logo.jpg'

/**
 * Renders the index landing page, centering the Gridelle logo in preparation
 * for the upcoming authentication flow.
 */
const App: React.FC = () => (
  <main className={styles.root}>
    <div
      className={styles.logoContainer}
      role="img"
      aria-label="Gridelle logo"
      style={{ background: `url(${logoUrl}) center / cover no-repeat` }}
    />
  </main>
)

export default App
