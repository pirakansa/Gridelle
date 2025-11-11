// File Header: Acts as a thin wrapper that selects the login App variant at build time.
import type { ComponentType } from 'react'

type LoginAppModule = {
  default: ComponentType
}

import { getConfiguredLoginVariant, LOGIN_APP_DEFAULT_VARIANT } from '../../services/auth/loginVariant'

const loginAppModules = import.meta.glob<LoginAppModule>('./App.*.tsx', {
  eager: true,
})

const loginAppVariants = new Map<string, ComponentType>()

/**
 * Function Header: Extracts the variant key part from the matched module path.
 * @param {string} modulePath Resolved module path emitted by Vite's glob import.
 * @returns {string | null} Variant key (e.g. "firebase") when parseable.
 */
function extractVariantName(modulePath: string): string | null {
  const match = modulePath.match(/App\.([^.]+)\.tsx$/)
  return match ? match[1] : null
}

for (const [modulePath, module] of Object.entries(loginAppModules)) {
  const variantName = extractVariantName(modulePath)
  if (!variantName || !module?.default) {
    continue
  }
  loginAppVariants.set(variantName, module.default)
}

const configuredVariant = getConfiguredLoginVariant()
const resolvedVariant =
  loginAppVariants.get(configuredVariant) ?? loginAppVariants.get(LOGIN_APP_DEFAULT_VARIANT)

if (!resolvedVariant) {
  throw new Error('No login app variants are available. Ensure App.<variant>.tsx exists.')
}

const LoginApp: ComponentType = resolvedVariant

export default LoginApp
