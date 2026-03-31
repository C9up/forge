/**
 * Configure — execute a package's configure hook.
 *
 * Usage: forge configure @c9up/atlas
 *
 * @implements FR84, FR88
 */

import * as path from 'node:path'
import { Codemods } from './Codemods.js'

export interface ConfigureHook {
  (codemods: Codemods): Promise<void> | void
}

export interface ConfigureResult {
  success: boolean
  package: string
  error?: string
}

/**
 * Run the configure hook for a package.
 *
 * Looks for a `configure` export in the package's main entry point.
 */
export async function runConfigure(packageName: string, options?: { root?: string; force?: boolean }): Promise<ConfigureResult> {
  const root = options?.root ?? process.cwd()
  const logger = {
    info: (msg: string) => process.stdout.write(`  [+] ${msg}\n`),
    warn: (msg: string) => process.stdout.write(`  [!] ${msg}\n`),
  }

  // Validate package name format — prevent path traversal
  const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  if (!NPM_NAME_RE.test(packageName)) {
    return {
      success: false,
      package: packageName,
      error: `Invalid package name: '${packageName}'. Must be a valid npm package name.`,
    }
  }

  process.stdout.write(`\n  Configuring ${packageName}...\n\n`)

  try {
    let configureHook: ConfigureHook | undefined

    // First: check built-in hooks (no import needed)
    configureHook = getBuiltinConfigureHook(packageName)

    // Second: try importing the package's configure export
    if (!configureHook) {
      try {
        const mod = await import(packageName)
        configureHook = mod.configure
      } catch {
        // Package not importable — no hook found
      }
    }

    if (!configureHook) {
      return {
        success: false,
        package: packageName,
        error: `No configure hook found in ${packageName}. The package must export a 'configure' function.`,
      }
    }

    const codemods = new Codemods({ root, logger })
    await configureHook(codemods)

    process.stdout.write(`\n  Done! ${packageName} configured.\n\n`)
    return { success: true, package: packageName }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    process.stderr.write(`\n  Error configuring ${packageName}: ${error}\n\n`)
    return { success: false, package: packageName, error }
  }
}

/**
 * Built-in configure hooks for @c9up/* packages.
 */
function getBuiltinConfigureHook(packageName: string): ConfigureHook | undefined {
  const hooks: Record<string, ConfigureHook> = {
    '@c9up/atlas': (codemods) => {
      codemods.updateReamrc((rc) => rc.addProvider('#providers/AtlasProvider.js'))
      codemods.addEnvVariables({
        DB_CONNECTION: 'postgres',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_DATABASE: 'ream',
        DB_USER: 'postgres',
        DB_PASSWORD: 'secret',
      })
      codemods.makeFromStub(
        `import { defineConfig, env } from '@c9up/ream'\n\nexport default defineConfig({\n  connection: env('DB_CONNECTION', '{{driver}}'),\n  connections: {\n    postgres: {\n      host: env('DB_HOST', 'localhost'),\n      port: Number(env('DB_PORT', '5432')),\n      database: env('DB_DATABASE', 'ream'),\n    },\n  },\n})\n`,
        'config/atlas.ts',
        { driver: 'postgres' },
      )
    },

    '@c9up/warden': (codemods) => {
      codemods.updateReamrc((rc) => rc.addProvider('#providers/AuthProvider.js'))
      codemods.addEnvVariables({
        JWT_SECRET: 'change-me-to-a-random-32-byte-secret',
        JWT_EXPIRY: '3600',
      })
      codemods.makeFromStub(
        `import { defineConfig, env } from '@c9up/ream'\n\nexport default defineConfig({\n  defaultStrategy: 'jwt',\n  jwt: {\n    secret: env('JWT_SECRET'),\n    expiry: Number(env('JWT_EXPIRY', '3600')),\n  },\n})\n`,
        'config/warden.ts',
      )
    },

    '@c9up/spectrum': (codemods) => {
      codemods.updateReamrc((rc) => rc.addProvider('#providers/LogProvider.js'))
      codemods.makeFromStub(
        `import { defineConfig, env } from '@c9up/ream'\n\nexport default defineConfig({\n  level: env('LOG_LEVEL', 'info'),\n  channels: ['console'],\n})\n`,
        'config/spectrum.ts',
      )
    },

    '@c9up/pulsar': (codemods) => {
      codemods.updateReamrc((rc) => rc.addProvider('#providers/BusProvider.js'))
      codemods.makeFromStub(
        `import { defineConfig } from '@c9up/ream'\n\nexport default defineConfig({\n  store: 'memory',\n  retries: 3,\n})\n`,
        'config/pulsar.ts',
      )
    },

    '@c9up/tailwind': (codemods) => {
      codemods.addDependencies({
        tailwindcss: '^4',
        postcss: '^8',
        autoprefixer: '^10',
      }, true)
      codemods.makeFromStub(
        `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./app/**/*.{ts,tsx,vue,svelte}', './resources/**/*.{html,ts,tsx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}\n`,
        'tailwind.config.ts',
      )
      codemods.makeFromStub(
        `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}\n`,
        'postcss.config.js',
      )
      codemods.makeFromStub(
        `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
        'resources/css/app.css',
      )
    },
  }

  return hooks[packageName]
}
