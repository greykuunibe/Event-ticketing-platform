type EnvKey = keyof NodeJS.ProcessEnv | string

interface EnvOptions {
  defaultValue?: string
  required?: boolean
}

/**
 * Reads an environment variable at runtime to avoid Next.js compile-time injection.
 * Throws if the variable is missing and no fallback is provided.
 */
export function getServerEnv(key: EnvKey, options: EnvOptions = {}): string {
  const value = process.env[key as keyof NodeJS.ProcessEnv]

  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (options.defaultValue !== undefined) {
    return options.defaultValue
  }

  if (options.required === false) {
    return ''
  }

  throw new Error(`Missing required environment variable: ${key}`)
}

/**
 * Reads an optional environment variable without throwing when missing.
 */
export function getOptionalServerEnv(key: EnvKey, defaultValue?: string): string | undefined {
  const value = process.env[key as keyof NodeJS.ProcessEnv]
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  return defaultValue
}
