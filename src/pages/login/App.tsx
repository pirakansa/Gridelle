// File Header: Page-level component implementing the login experience with Firebase-backed flows.
import React from 'react'
import styles from './login.module.scss'
import { useLoginController } from './hooks/useLoginController'

// Function Header: Renders the login UI and binds it to the shared login controller hook.
export default function App(): React.ReactElement {
  const {
    statusMessage,
    errorMessage,
    loginMode,
    loginModeLabel,
    canUseOctokit,
    isBusy,
    isLoggedIn,
    handleGithubLogin,
    handleGuestLogin,
    handleLogout,
    handleClearStorage,
    handleNavigateTop,
    appVersion,
  } = useLoginController()

  return (
    <div className={styles.root}>
      <div
        className={styles.card}
        data-testid="login-card"
        data-login-mode={loginMode ?? 'none'}
        data-can-octokit={canUseOctokit ? 'true' : 'false'}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>Gridelle ログイン</h1>
          <p className={styles.description}>
            GitHub アカウントまたはゲストとしてログインして Gridelle を利用できます。
          </p>
          {isLoggedIn && (
            <p className={styles.description}>現在のログインモード: {loginModeLabel}</p>
          )}
          {isLoggedIn && (
            <p className={styles.abilityNote} data-can-octokit={canUseOctokit ? 'true' : 'false'}>
              {canUseOctokit
                ? 'GitHub連携機能を利用できます。'
                : 'GitHub連携機能を利用するには GitHub でログインしてください。'}
            </p>
          )}
        </header>
        <section className={styles.actions}>
          {!isLoggedIn && (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleGithubLogin}
                disabled={isBusy}
              >
                GitHub でログイン
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleGuestLogin}
                disabled={isBusy}
              >
                ゲストでログイン
              </button>
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
                トップページに進む
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleLogout}
                disabled={isBusy}
              >
                ログアウト
              </button>
            </>
          )}
        </section>
        <section className={styles.detailsBlock}>
          <p className={styles.status}>{statusMessage}</p>
          {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          <h2 className={styles.detailsTitle}>セッションとキャッシュ</h2>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>アプリケーションバージョン</span>
            <span className={styles.metaValue} data-testid="app-version">{appVersion}</span>
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleClearStorage}
            disabled={isBusy}
            data-testid="clear-storage-button"
          >
            セッション・キャッシュを削除
          </button>
        </section>
        <footer className={styles.footer}>
          <a className={styles.link} href="/index.html">
            トップへ戻る
          </a>
          <a
            className={styles.link}
            href="https://github.com/login"
            target="_blank"
            rel="noreferrer"
          >
            GitHub サインアップ
          </a>
        </footer>
      </div>
    </div>
  )
}
