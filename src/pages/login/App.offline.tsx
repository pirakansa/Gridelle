// File Header: Presents an authentication-free login experience with optional GitHub token entry.
import React from 'react'
import styles from './login.module.scss'
import LanguageToggleButton from '../../components/atom/LanguageToggleButton'
import { useI18n } from '../../utils/i18n'
import { useLoginController } from './hooks/useLoginController'
import type { AuthLoginOption } from '../../services/auth'

// Function Header: Renders the offline login UI with guest and token options.
export default function OfflineLoginApp(): React.ReactElement {
  const { select } = useI18n()
  const {
    statusMessage,
    errorMessage,
    loginMode,
    loginModeLabel,
    canUseOctokit,
    isBusy,
    isLoggedIn,
    loginOptions,
    handleLoginOption,
    handleLogout,
    handleClearStorage,
    handleNavigateTop,
    appVersion,
  } = useLoginController()

  const guestOption = React.useMemo<AuthLoginOption | undefined>(
    () => loginOptions.find((option) => option.type === 'guest'),
    [loginOptions],
  )
  const tokenOption = React.useMemo<AuthLoginOption | undefined>(
    () => loginOptions.find((option) => option.type === 'token'),
    [loginOptions],
  )

  const [tokenValue, setTokenValue] = React.useState<string>('')

  const handleTokenInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTokenValue(event.currentTarget.value)
  }, [])

  const handleGuestLogin = React.useCallback(() => {
    if (!guestOption) {
      console.warn('Guest login option is not available in offline mode.')
      return
    }
    void handleLoginOption(guestOption.id)
  }, [guestOption, handleLoginOption])

  const handleTokenLogin = React.useCallback(() => {
    if (!tokenOption) {
      console.warn('Token login option is not available in offline mode.')
      return
    }
    void handleLoginOption(tokenOption.id, tokenValue)
  }, [handleLoginOption, tokenOption, tokenValue])

  const isTokenButtonDisabled =
    isBusy || !tokenOption || tokenValue.trim().length === 0 || Boolean(loginMode && loginMode !== 'guest')

  return (
    <div className={styles.root}>
      <div
        className={styles.card}
        data-testid="login-card"
        data-login-mode={loginMode ?? 'none'}
        data-can-octokit={canUseOctokit ? 'true' : 'false'}
      >
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{select('Gridelle ログイン', 'Gridelle Login')}</h1>
            <LanguageToggleButton />
          </div>
          <p className={styles.description}>
            {select(
              '認証不要で Gridelle を利用できます。GitHub 連携を行う場合は PAT を入力してください。',
              'Use Gridelle without authentication. Provide a GitHub personal access token to enable repository features.',
            )}
          </p>
          {isLoggedIn && (
            <>
              <p className={styles.description}>
                {select('現在のログインモード', 'Current login mode')}: {loginModeLabel}
              </p>
              <p className={styles.abilityNote} data-can-octokit={canUseOctokit ? 'true' : 'false'}>
                {canUseOctokit
                  ? select('GitHub連携機能を利用できます。', 'GitHub integration features are available.')
                  : select(
                      'GitHub連携にはパーソナルアクセストークンを入力してください。',
                      'Enter a GitHub personal access token to unlock repository integration.',
                    )}
              </p>
            </>
          )}
        </header>

        <section className={styles.actions}>
          {!isLoggedIn && (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleGuestLogin}
                disabled={isBusy || !guestOption}
              >
                {select('認証不要モードで利用', 'Continue without authentication')}
              </button>
              <div className={styles.optionRow}>
                <input
                  type="password"
                  className={styles.tokenInput}
                  placeholder={select(
                    'GitHub パーソナルアクセストークンを入力',
                    'Enter your GitHub personal access token',
                  )}
                  value={tokenValue}
                  onChange={handleTokenInputChange}
                  disabled={isBusy}
                />
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={handleTokenLogin}
                  disabled={isTokenButtonDisabled}
                >
                  {select('GitHub トークンでログイン', 'Sign in with GitHub token')}
                </button>
              </div>
            </>
          )}

          {isLoggedIn && (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleNavigateTop}
                disabled={isBusy}
              >
                {select('トップページに進む', 'Go to the top page')}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleLogout}
                disabled={isBusy}
              >
                {select('ログアウト', 'Log out')}
              </button>
            </>
          )}
        </section>

        <section className={styles.detailsBlock}>
          <p className={styles.status}>{statusMessage}</p>
          {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          <h2 className={styles.detailsTitle}>{select('セッションとキャッシュ', 'Sessions and cache')}</h2>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{select('アプリケーションバージョン', 'Application version')}</span>
            <span className={styles.metaValue} data-testid="app-version">
              {appVersion}
            </span>
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleClearStorage}
            disabled={isBusy}
            data-testid="clear-storage-button"
          >
            {select('セッション・キャッシュを削除', 'Clear sessions and cache')}
          </button>
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
