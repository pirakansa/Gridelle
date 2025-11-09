// File Header: Centralizes navigation helpers for consistent redirects across the app.

/**
 * Redirects the browser to the top page entry point.
 */
export function redirectToTop(): void {
  window.location.replace('/top.html')
}

/**
 * Redirects the browser to the login page.
 */
export function redirectToLogin(): void {
  window.location.replace('/login.html')
}
