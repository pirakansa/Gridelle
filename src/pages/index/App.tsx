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
    <a
      className={styles.logoLink}
      href="/top.html"
      aria-label="Gridelleトップページへ移動"
    >
      <img
        className={styles.logoImage}
        src={logoUrl}
        alt="Gridelle ロゴ"
        width={360}
        height={360}
        loading="lazy"
      />
    </a>
  </main>
)

export default App
