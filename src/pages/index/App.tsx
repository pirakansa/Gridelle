// Entry page component presenting the Gridelle landing logo.
import React from 'react'
import styles from './index.module.scss'
import logoUrl from '../../assets/logo.jpg'
import { useI18n } from '../../utils/i18n'

/**
 * Renders the index landing page, centering the Gridelle logo in preparation
 * for the upcoming authentication flow.
 */
const App: React.FC = () => {
  const { select } = useI18n()
  const loginLinkLabel = select('Gridelleログインページへ移動', 'Go to the Gridelle login page')
  const logoAltText = select('Gridelle ロゴ', 'Gridelle logo')

  return (
    <main className={styles.root}>
      <a className={styles.logoLink} href="/login.html" aria-label={loginLinkLabel}>
        <img
          className={styles.logoImage}
          src={logoUrl}
          alt={logoAltText}
          width={360}
          height={360}
          loading="lazy"
        />
      </a>
    </main>
  )
}

export default App
