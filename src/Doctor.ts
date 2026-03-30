/**
 * Forge Doctor — pre-flight environment checks.
 *
 * @implements FR62
 */

import * as fs from 'node:fs'
import { createRequire } from 'node:module'

export interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  fix?: string
}

/**
 * Runs environment health checks.
 */
export class Doctor {
  /** Run all checks. */
  check(): CheckResult[] {
    return [
      this.checkNodeVersion(),
      this.checkNapiBinaries(),
      this.checkEnvFile(),
      this.checkReamrc(),
      this.checkPackageJson(),
      this.checkTsConfig(),
    ]
  }

  /** Check Node.js version >= 22. */
  checkNodeVersion(): CheckResult {
    const version = process.version
    const major = Number.parseInt(version.slice(1).split('.')[0], 10)

    if (major >= 22) {
      return { name: 'Node.js version', status: 'pass', message: `${version} (>= 22 required)` }
    }
    if (major >= 20) {
      return {
        name: 'Node.js version',
        status: 'warn',
        message: `${version} — Node.js 22+ recommended for NAPI stability`,
        fix: 'Install Node.js 22 LTS: https://nodejs.org/',
      }
    }
    return {
      name: 'Node.js version',
      status: 'fail',
      message: `${version} — Node.js 22+ required`,
      fix: 'Install Node.js 22 LTS: https://nodejs.org/',
    }
  }

  /** Check NAPI binary exists. */
  checkNapiBinaries(): CheckResult {
    try {
      const esmRequire = createRequire(import.meta.url)
      esmRequire.resolve('@c9up/pulsar')
      return { name: 'NAPI binaries', status: 'pass', message: '@c9up/pulsar native module found' }
    } catch {
      return {
        name: 'NAPI binaries',
        status: 'warn',
        message: '@c9up/pulsar not installed or not loadable (optional)',
        fix: 'Install with: pnpm add @c9up/pulsar',
      }
    }
  }

  /** Check .env file exists. */
  checkEnvFile(): CheckResult {
    if (fs.existsSync('.env')) {
      return { name: '.env file', status: 'pass', message: '.env file found' }
    }
    return {
      name: '.env file',
      status: 'warn',
      message: '.env file not found',
      fix: 'Create a .env file with your environment variables. See docs for template.',
    }
  }

  /** Check reamrc.ts exists. */
  checkReamrc(): CheckResult {
    if (fs.existsSync('reamrc.ts')) {
      return { name: 'reamrc', status: 'pass', message: 'reamrc.ts found' }
    }
    if (fs.existsSync('reamrc.js')) {
      return { name: 'reamrc', status: 'pass', message: 'reamrc.js found' }
    }
    return {
      name: 'reamrc',
      status: 'warn',
      message: 'reamrc.ts not found — using toolkit mode',
    }
  }

  /** Check package.json exists and has @c9up/ream. */
  checkPackageJson(): CheckResult {
    if (!fs.existsSync('package.json')) {
      return {
        name: 'package.json',
        status: 'fail',
        message: 'package.json not found',
        fix: 'Run: pnpm init',
      }
    }

    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps['@c9up/ream']) {
        return { name: 'package.json', status: 'pass', message: `@c9up/ream ${deps['@c9up/ream']}` }
      }
      return {
        name: 'package.json',
        status: 'warn',
        message: '@c9up/ream not found in dependencies',
        fix: 'Run: pnpm add @c9up/ream',
      }
    } catch {
      return {
        name: 'package.json',
        status: 'fail',
        message: 'package.json is invalid JSON',
        fix: 'Fix syntax errors in package.json',
      }
    }
  }

  /** Check tsconfig.json has required settings. */
  checkTsConfig(): CheckResult {
    if (!fs.existsSync('tsconfig.json')) {
      return {
        name: 'tsconfig.json',
        status: 'warn',
        message: 'tsconfig.json not found',
        fix: 'Create tsconfig.json with experimentalDecorators and emitDecoratorMetadata enabled',
      }
    }

    try {
      const raw = fs.readFileSync('tsconfig.json', 'utf-8')
      const hasDecorators = raw.includes('experimentalDecorators')
      const hasMetadata = raw.includes('emitDecoratorMetadata')

      if (hasDecorators && hasMetadata) {
        return { name: 'tsconfig.json', status: 'pass', message: 'Decorators enabled' }
      }
      const missing = []
      if (!hasDecorators) missing.push('experimentalDecorators')
      if (!hasMetadata) missing.push('emitDecoratorMetadata')
      return {
        name: 'tsconfig.json',
        status: 'warn',
        message: `Missing: ${missing.join(', ')}`,
        fix: `Add ${missing.join(' and ')} to compilerOptions`,
      }
    } catch {
      return {
        name: 'tsconfig.json',
        status: 'fail',
        message: 'tsconfig.json is invalid',
        fix: 'Fix syntax errors in tsconfig.json',
      }
    }
  }

  /** Format results for terminal output. */
  format(results: CheckResult[]): string {
    const lines: string[] = ['\n  Forge Doctor\n']

    for (const r of results) {
      const icon = r.status === 'pass' ? '[OK]' : r.status === 'warn' ? '[!!]' : '[XX]'
      lines.push(`  ${icon} ${r.name}: ${r.message}`)
      if (r.fix) {
        lines.push(`      Fix: ${r.fix}`)
      }
    }

    const passed = results.filter((r) => r.status === 'pass').length
    const warns = results.filter((r) => r.status === 'warn').length
    const fails = results.filter((r) => r.status === 'fail').length
    lines.push(`\n  ${passed} passed, ${warns} warnings, ${fails} failed\n`)

    return lines.join('\n')
  }
}
