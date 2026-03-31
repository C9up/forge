import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runConfigure } from '../../src/Configure.js'

const TEST_DIR = '/tmp/forge-configure-test'

describe('forge > configure', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true })
    // Create minimal project structure
    fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test-app', dependencies: {} }))
    fs.writeFileSync(path.join(TEST_DIR, 'reamrc.ts'), `import { defineConfig } from '@c9up/ream'\n\nexport default defineConfig({\n  providers: [],\n  preloads: [],\n})\n`)
  })

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('configures @c9up/atlas — creates config, updates env and reamrc', async () => {
    const result = await runConfigure('@c9up/atlas', { root: TEST_DIR })
    expect(result.success).toBe(true)

    // Config file created
    expect(fs.existsSync(path.join(TEST_DIR, 'config/atlas.ts'))).toBe(true)
    const config = fs.readFileSync(path.join(TEST_DIR, 'config/atlas.ts'), 'utf-8')
    expect(config).toContain('connection')
    expect(config).toContain('postgres')

    // Env vars added
    const env = fs.readFileSync(path.join(TEST_DIR, '.env'), 'utf-8')
    expect(env).toContain('DB_HOST=localhost')

    // Provider registered in reamrc
    const rc = fs.readFileSync(path.join(TEST_DIR, 'reamrc.ts'), 'utf-8')
    expect(rc).toContain('AtlasProvider')
  })

  it('configures @c9up/warden — creates config with JWT settings', async () => {
    const result = await runConfigure('@c9up/warden', { root: TEST_DIR })
    expect(result.success).toBe(true)

    expect(fs.existsSync(path.join(TEST_DIR, 'config/warden.ts'))).toBe(true)
    const env = fs.readFileSync(path.join(TEST_DIR, '.env'), 'utf-8')
    expect(env).toContain('JWT_SECRET')
  })

  it('configures @c9up/tailwind — creates tailwind + postcss configs', async () => {
    const result = await runConfigure('@c9up/tailwind', { root: TEST_DIR })
    expect(result.success).toBe(true)

    expect(fs.existsSync(path.join(TEST_DIR, 'tailwind.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(TEST_DIR, 'postcss.config.js'))).toBe(true)
    expect(fs.existsSync(path.join(TEST_DIR, 'resources/css/app.css'))).toBe(true)

    const tailwind = fs.readFileSync(path.join(TEST_DIR, 'tailwind.config.ts'), 'utf-8')
    expect(tailwind).toContain('content')
    expect(tailwind).toContain('plugins')

    const pkg = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'package.json'), 'utf-8'))
    expect(pkg.devDependencies.tailwindcss).toBeDefined()
  })

  it('configures @c9up/spectrum — creates log config', async () => {
    const result = await runConfigure('@c9up/spectrum', { root: TEST_DIR })
    expect(result.success).toBe(true)
    expect(fs.existsSync(path.join(TEST_DIR, 'config/spectrum.ts'))).toBe(true)
  })

  it('configures @c9up/pulsar — creates bus config', async () => {
    const result = await runConfigure('@c9up/pulsar', { root: TEST_DIR })
    expect(result.success).toBe(true)
    expect(fs.existsSync(path.join(TEST_DIR, 'config/pulsar.ts'))).toBe(true)
  })

  it('fails for unknown package', async () => {
    const result = await runConfigure('@c9up/nonexistent', { root: TEST_DIR })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No configure hook')
  })

  it('does not overwrite existing config files', async () => {
    fs.mkdirSync(path.join(TEST_DIR, 'config'), { recursive: true })
    fs.writeFileSync(path.join(TEST_DIR, 'config/atlas.ts'), 'my custom config')

    await runConfigure('@c9up/atlas', { root: TEST_DIR })

    // Original file preserved
    expect(fs.readFileSync(path.join(TEST_DIR, 'config/atlas.ts'), 'utf-8')).toBe('my custom config')
  })
})
