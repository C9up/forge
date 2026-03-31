/**
 * Codemods API — programmatic modification of project files.
 *
 * Used by package configure hooks to auto-setup packages.
 *
 * @implements FR85, FR86, FR87
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export interface CodemodsContext {
  /** Project root directory. */
  root: string
  /** Logger for user feedback. */
  logger: { info: (msg: string) => void; warn: (msg: string) => void }
}

/**
 * Codemods — modify project files programmatically.
 */
export class Codemods {
  private root: string
  private logger: { info: (msg: string) => void; warn: (msg: string) => void }

  constructor(ctx: CodemodsContext) {
    this.root = ctx.root
    this.logger = ctx.logger
  }

  /**
   * Update reamrc.ts — add a provider or preload import.
   */
  updateReamrc(callback: (rc: ReamrcEditor) => void): void {
    const rcPath = path.join(this.root, 'reamrc.ts')
    if (!fs.existsSync(rcPath)) {
      this.logger.warn('reamrc.ts not found — creating one')
      fs.writeFileSync(rcPath, `import { defineConfig } from '@c9up/ream'\n\nexport default defineConfig({\n  providers: [],\n  preloads: [],\n})\n`)
    }

    let content = fs.readFileSync(rcPath, 'utf-8')
    const editor = new ReamrcEditor(content)
    callback(editor)
    content = editor.toString()
    fs.writeFileSync(rcPath, content)
    this.logger.info(`Updated reamrc.ts`)
  }

  /**
   * Add environment variables to .env file.
   */
  addEnvVariables(vars: Record<string, string>): void {
    const envPath = path.join(this.root, '.env')
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

    for (const [key, value] of Object.entries(vars)) {
      const keyPattern = new RegExp(`^${key}=`, 'm')
      if (!keyPattern.test(content)) {
        content += `${key}=${value}\n`
      }
    }

    fs.writeFileSync(envPath, content)
    this.logger.info(`Updated .env with ${Object.keys(vars).length} variable(s)`)
  }

  /**
   * Add dependencies to package.json.
   */
  addDependencies(deps: Record<string, string>, dev = false): void {
    const pkgPath = path.join(this.root, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      this.logger.warn('package.json not found')
      return
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const key = dev ? 'devDependencies' : 'dependencies'
    pkg[key] = { ...(pkg[key] ?? {}), ...deps }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    this.logger.info(`Added ${Object.keys(deps).length} ${dev ? 'dev ' : ''}dependency(ies)`)
  }

  /**
   * Generate a file from a stub template.
   * Does NOT overwrite existing files unless force=true.
   */
  makeFromStub(stubContent: string, outputPath: string, data: Record<string, string> = {}, force = false): void {
    const fullPath = path.resolve(this.root, outputPath)

    // Path traversal guard — refuse to write outside project root
    if (!fullPath.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error(`[FORGE_PATH_TRAVERSAL] Refusing to write outside project root: ${outputPath}`)
    }

    if (fs.existsSync(fullPath) && !force) {
      this.logger.warn(`${outputPath} already exists — skipping (use --force to overwrite)`)
      return
    }

    // Template interpolation: {{key}} → value (key escaped for safe RegExp)
    let content = stubContent
    for (const [key, value] of Object.entries(data)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      content = content.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), value)
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content)
    this.logger.info(`Created ${outputPath}`)
  }

  /**
   * Update tsconfig.json — add compiler options or paths.
   */
  updateTsConfig(callback: (config: Record<string, unknown>) => void): void {
    const tsPath = path.join(this.root, 'tsconfig.json')
    if (!fs.existsSync(tsPath)) {
      this.logger.warn('tsconfig.json not found')
      return
    }

    const config = JSON.parse(fs.readFileSync(tsPath, 'utf-8'))
    callback(config)
    fs.writeFileSync(tsPath, JSON.stringify(config, null, 2) + '\n')
    this.logger.info('Updated tsconfig.json')
  }
}

/**
 * Helper to edit reamrc.ts content.
 */
export class ReamrcEditor {
  private content: string

  constructor(content: string) {
    this.content = content
  }

  /** Add a provider import to the providers array. */
  addProvider(importPath: string): this {
    if (this.content.includes(importPath)) return this

    // Insert before the closing ] of providers array
    this.content = this.content.replace(
      /(providers:\s*\[)([\s\S]*?)(\])/,
      (match, open, body, close) => {
        const entry = `\n    () => import('${importPath}'),`
        return `${open}${body}${entry}\n  ${close}`
      },
    )
    return this
  }

  /** Add a preload import to the preloads array. */
  addPreload(importPath: string): this {
    if (this.content.includes(importPath)) return this

    this.content = this.content.replace(
      /(preloads:\s*\[)([\s\S]*?)(\])/,
      (match, open, body, close) => {
        const entry = `\n    () => import('${importPath}'),`
        return `${open}${body}${entry}\n  ${close}`
      },
    )
    return this
  }

  toString(): string {
    return this.content
  }
}
