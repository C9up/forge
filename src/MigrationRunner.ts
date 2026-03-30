/**
 * Migration Runner — manages database migration execution.
 *
 * @implements FR61
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export interface MigrationFile {
  name: string
  path: string
  timestamp: string
}

export interface MigrationStatus {
  name: string
  status: 'pending' | 'applied'
  appliedAt?: string
}

/**
 * Manages migration file discovery, ordering, and status tracking.
 * Actual DB execution is deferred to when Atlas has a real DB driver.
 */
export class MigrationRunner {
  private migrationsDir: string
  private applied: Map<string, string> = new Map() // name → ISO timestamp
  private applyOrder: string[] = [] // insertion order for rollback

  constructor(migrationsDir = 'database/migrations') {
    this.migrationsDir = migrationsDir
  }

  /** Discover migration files sorted by timestamp. */
  discover(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return []
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
      .sort() // Timestamp prefix ensures correct order

    return files.map((f) => ({
      name: f.replace(/\.(ts|js)$/, ''),
      path: path.join(this.migrationsDir, f),
      timestamp: f.substring(0, 14),
    }))
  }

  /** Get status of all migrations. */
  status(): MigrationStatus[] {
    const migrations = this.discover()
    return migrations.map((m) => ({
      name: m.name,
      status: this.applied.has(m.name) ? 'applied' as const : 'pending' as const,
      appliedAt: this.applied.get(m.name),
    }))
  }

  /** Get pending migrations (not yet applied). */
  pending(): MigrationFile[] {
    return this.discover().filter((m) => !this.applied.has(m.name))
  }

  /** Mark a migration as applied. */
  markApplied(name: string): void {
    this.applied.set(name, new Date().toISOString())
    this.applyOrder.push(name)
  }

  /** Mark a migration as rolled back. */
  markRolledBack(name: string): void {
    this.applied.delete(name)
    this.applyOrder = this.applyOrder.filter((n) => n !== name)
  }

  /** Get applied migration count. */
  appliedCount(): number {
    return this.applied.size
  }

  /** Get the last applied migration (by apply order, not filesystem order). */
  lastApplied(): string | undefined {
    return this.applyOrder.at(-1)
  }
}
