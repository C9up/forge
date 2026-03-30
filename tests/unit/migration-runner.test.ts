import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MigrationRunner } from '../../src/MigrationRunner.js'

const TEST_DIR = '/tmp/forge-test-migrations'

describe('forge > MigrationRunner', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('discovers migration files sorted by timestamp', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_create_orders.ts'), 'export async function up() {}')
    fs.writeFileSync(path.join(TEST_DIR, '20260329120100_create_users.ts'), 'export async function up() {}')

    const runner = new MigrationRunner(TEST_DIR)
    const files = runner.discover()

    expect(files).toHaveLength(2)
    expect(files[0].name).toBe('20260329120000_create_orders')
    expect(files[1].name).toBe('20260329120100_create_users')
    expect(files[0].timestamp).toBe('20260329120000')
  })

  it('returns empty array if directory does not exist', () => {
    const runner = new MigrationRunner('/tmp/nonexistent-migrations')
    expect(runner.discover()).toEqual([])
  })

  it('tracks applied migrations', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_create_orders.ts'), '')

    const runner = new MigrationRunner(TEST_DIR)
    expect(runner.appliedCount()).toBe(0)

    runner.markApplied('20260329120000_create_orders')
    expect(runner.appliedCount()).toBe(1)

    const statuses = runner.status()
    expect(statuses[0].status).toBe('applied')
  })

  it('identifies pending migrations', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_create_orders.ts'), '')
    fs.writeFileSync(path.join(TEST_DIR, '20260329120100_create_users.ts'), '')

    const runner = new MigrationRunner(TEST_DIR)
    runner.markApplied('20260329120000_create_orders')

    const pending = runner.pending()
    expect(pending).toHaveLength(1)
    expect(pending[0].name).toBe('20260329120100_create_users')
  })

  it('supports rollback via markRolledBack', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_create_orders.ts'), '')

    const runner = new MigrationRunner(TEST_DIR)
    runner.markApplied('20260329120000_create_orders')
    expect(runner.appliedCount()).toBe(1)

    runner.markRolledBack('20260329120000_create_orders')
    expect(runner.appliedCount()).toBe(0)
    expect(runner.pending()).toHaveLength(1)
  })

  it('returns last applied migration', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_a.ts'), '')
    fs.writeFileSync(path.join(TEST_DIR, '20260329120100_b.ts'), '')

    const runner = new MigrationRunner(TEST_DIR)
    runner.markApplied('20260329120000_a')
    runner.markApplied('20260329120100_b')

    expect(runner.lastApplied()).toBe('20260329120100_b')
  })

  it('ignores non-ts/js files', () => {
    fs.writeFileSync(path.join(TEST_DIR, '20260329120000_a.ts'), '')
    fs.writeFileSync(path.join(TEST_DIR, 'readme.md'), '')
    fs.writeFileSync(path.join(TEST_DIR, '.gitkeep'), '')

    const runner = new MigrationRunner(TEST_DIR)
    expect(runner.discover()).toHaveLength(1)
  })
})
