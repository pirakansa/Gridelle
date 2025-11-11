// File Header: Presents an authentication-free login experience for offline environments.
import React from 'react'
import styles from './login.module.scss'
import LanguageToggleButton from '../../components/atom/LanguageToggleButton'
import { useI18n } from '../../utils/i18n'
import { redirectToTop } from '../../utils/navigation'

// Function Header: Renders the offline login landing with a direct entry action.
export default function OfflineLoginApp(): React.ReactElement {
  const { select } = useI18n()
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false)
  const appVersion = React.useMemo<string>(() => import.meta.env.VITE_APP_VERSION ?? '0.0.0', [])

  const handleEnter = React.useCallback(() => {
    if (isNavigating) {
      return
    }
    setIsNavigating(true)
    redirectToTop()
  }, [isNavigating])

  return (
    <div className={styles.root}>
      <div className={styles.card} data-testid="login-card" data-login-mode="offline">
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{select('Gridelle オフラインモード', 'Gridelle Offline Mode')}</h1>
            <LanguageToggleButton />
          </div>
          <p className={styles.description}>
            {select(
              'この環境では認証は不要です。そのまま Gridelle を利用できます。',
              'Authentication is disabled in this environment. Continue to Gridelle directly.',
            )}
          </p>
          <p className={styles.abilityNote}>
            {select(
              '一部の GitHub 連携機能は利用できません。',
              'Some GitHub integration features remain unavailable.',
            )}
          </p>
        </header>
        <section className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleEnter}
            disabled={isNavigating}
          >
            {select('Gridelle を起動', 'Launch Gridelle')}
          </button>
        </section>
        <section className={styles.detailsBlock}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{select('アプリケーションバージョン', 'Application version')}</span>
            <span className={styles.metaValue} data-testid="app-version">
              {appVersion}
            </span>
          </div>
        </section>
        <footer className={styles.footer}>
          <a className={styles.link} href="/index.html">
            {select('トップへ戻る', 'Back to landing page')}
          </a>
        </footer>
      </div>
    </div>
  )
}
