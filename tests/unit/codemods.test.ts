import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Codemods, ReamrcEditor } from '../../src/Codemods.js'

const TEST_DIR = '/tmp/forge-codemods-test'
const logger = { info: () => {}, warn: () => {} }

describe('forge > Codemods', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('addEnvVariables creates .env if missing', () => {
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.addEnvVariables({ DB_HOST: 'localhost', DB_PORT: '5432' })

    const content = fs.readFileSync(path.join(TEST_DIR, '.env'), 'utf-8')
    expect(content).toContain('DB_HOST=localhost')
    expect(content).toContain('DB_PORT=5432')
  })

  it('addEnvVariables does not duplicate existing vars', () => {
    fs.writeFileSync(path.join(TEST_DIR, '.env'), 'DB_HOST=myhost\n')
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.addEnvVariables({ DB_HOST: 'localhost', DB_PORT: '5432' })

    const content = fs.readFileSync(path.join(TEST_DIR, '.env'), 'utf-8')
    expect(content).toContain('DB_HOST=myhost') // original preserved
    expect(content).toContain('DB_PORT=5432') // new one added
    expect(content.match(/DB_HOST/g)?.length).toBe(1) // no duplicate
  })

  it('addDependencies updates package.json', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }))
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.addDependencies({ pg: '^8' })

    const pkg = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'package.json'), 'utf-8'))
    expect(pkg.dependencies.pg).toBe('^8')
  })

  it('addDependencies with dev flag', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test' }))
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.addDependencies({ tailwindcss: '^4' }, true)

    const pkg = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'package.json'), 'utf-8'))
    expect(pkg.devDependencies.tailwindcss).toBe('^4')
  })

  it('makeFromStub creates file with interpolation', () => {
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.makeFromStub('driver = {{driver}}\nhost = {{host}}', 'config/db.ts', { driver: 'postgres', host: 'localhost' })

    const content = fs.readFileSync(path.join(TEST_DIR, 'config/db.ts'), 'utf-8')
    expect(content).toBe('driver = postgres\nhost = localhost')
  })

  it('makeFromStub does not overwrite existing file', () => {
    fs.mkdirSync(path.join(TEST_DIR, 'config'), { recursive: true })
    fs.writeFileSync(path.join(TEST_DIR, 'config/db.ts'), 'original')
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.makeFromStub('new content', 'config/db.ts')

    expect(fs.readFileSync(path.join(TEST_DIR, 'config/db.ts'), 'utf-8')).toBe('original')
  })

  it('makeFromStub overwrites with force', () => {
    fs.mkdirSync(path.join(TEST_DIR, 'config'), { recursive: true })
    fs.writeFileSync(path.join(TEST_DIR, 'config/db.ts'), 'original')
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.makeFromStub('new content', 'config/db.ts', {}, true)

    expect(fs.readFileSync(path.join(TEST_DIR, 'config/db.ts'), 'utf-8')).toBe('new content')
  })

  it('updateReamrc creates reamrc.ts if missing', () => {
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.updateReamrc((rc) => rc.addProvider('@c9up/atlas'))

    const content = fs.readFileSync(path.join(TEST_DIR, 'reamrc.ts'), 'utf-8')
    expect(content).toContain("import('@c9up/atlas')")
    expect(content).toContain('providers')
  })

  it('updateReamrc adds provider to existing file', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'reamrc.ts'), `import { defineConfig } from '@c9up/ream'\n\nexport default defineConfig({\n  providers: [\n    () => import('#providers/AppProvider.js'),\n  ],\n  preloads: [],\n})\n`)
    const codemods = new Codemods({ root: TEST_DIR, logger })
    codemods.updateReamrc((rc) => rc.addProvider('@c9up/atlas'))

    const content = fs.readFileSync(path.join(TEST_DIR, 'reamrc.ts'), 'utf-8')
    expect(content).toContain("import('@c9up/atlas')")
    expect(content).toContain("import('#providers/AppProvider.js')") // original preserved
  })
})

describe('forge > ReamrcEditor', () => {
  it('addProvider inserts into providers array', () => {
    const editor = new ReamrcEditor(`export default defineConfig({\n  providers: [\n    () => import('#providers/App.js'),\n  ],\n  preloads: [],\n})`)
    editor.addProvider('@c9up/atlas')
    const result = editor.toString()
    expect(result).toContain("import('@c9up/atlas')")
  })

  it('addProvider does not duplicate', () => {
    const editor = new ReamrcEditor(`providers: [\n    () => import('@c9up/atlas'),\n  ]`)
    editor.addProvider('@c9up/atlas')
    expect(editor.toString().match(/@c9up\/atlas/g)?.length).toBe(1)
  })

  it('addPreload inserts into preloads array', () => {
    const editor = new ReamrcEditor(`preloads: [\n  ]`)
    editor.addPreload('#start/routes.js')
    expect(editor.toString()).toContain("import('#start/routes.js')")
  })
})
