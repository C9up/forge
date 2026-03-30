/**
 * Forge Inspector — introspects decorator metadata on classes.
 *
 * @implements FR63
 */

import 'reflect-metadata'

export interface InspectionResult {
  className: string
  guards: Record<string, string[]>
  permissions: Record<string, string[]>
  roles: Record<string, string[]>
  entity?: { tableName: string; columns: string[]; primaryKey?: string; relations: string[] }
}

const GUARD_KEY = Symbol.for('warden:guard')
const PERM_KEY = Symbol.for('warden:permission')
const ROLE_KEY = Symbol.for('warden:role')

/**
 * Inspects decorator metadata on a class for debugging and DX.
 */
export class Inspector {
  /** Inspect a class and return all decorator metadata. */
  inspect(target: Function): InspectionResult {
    const result: InspectionResult = {
      className: target.name,
      guards: {},
      permissions: {},
      roles: {},
    }

    // Inspect Warden decorators on prototype methods
    const prototype = target.prototype
    if (prototype) {
      const methods = Object.getOwnPropertyNames(prototype).filter((m) => m !== 'constructor')

      for (const method of methods) {
        const guardMeta = Reflect.getOwnMetadata(GUARD_KEY, prototype, method)
        if (guardMeta) result.guards[method] = guardMeta

        const permMeta = Reflect.getOwnMetadata(PERM_KEY, prototype, method)
        if (permMeta) result.permissions[method] = permMeta

        const roleMeta = Reflect.getOwnMetadata(ROLE_KEY, prototype, method)
        if (roleMeta) result.roles[method] = roleMeta
      }
    }

    // Inspect Atlas entity decorators
    const entityMeta = Reflect.getMetadata(Symbol.for('atlas:entity'), target)
    if (entityMeta) {
      const columns: Array<{ propertyKey: string }> = Reflect.getMetadata(Symbol.for('atlas:columns'), target) ?? []
      const primaryKey: string | undefined = Reflect.getMetadata(Symbol.for('atlas:primary'), target)
      const relations: Array<{ propertyKey: string; type: string }> = Reflect.getMetadata(Symbol.for('atlas:relations'), target) ?? []

      result.entity = {
        tableName: entityMeta.tableName,
        columns: columns.map((c) => c.propertyKey),
        primaryKey,
        relations: relations.map((r) => `${r.propertyKey} (${r.type})`),
      }
    }

    return result
  }

  /** Format inspection result for terminal output. */
  format(result: InspectionResult): string {
    const lines: string[] = [`\n  Inspecting: ${result.className}\n`]

    if (result.entity) {
      lines.push('  Entity:')
      lines.push(`    Table: ${result.entity.tableName}`)
      lines.push(`    Primary Key: ${result.entity.primaryKey ?? 'none'}`)
      lines.push(`    Columns: ${result.entity.columns.join(', ')}`)
      if (result.entity.relations.length > 0) {
        lines.push(`    Relations: ${result.entity.relations.join(', ')}`)
      }
    }

    const guardEntries = Object.entries(result.guards)
    if (guardEntries.length > 0) {
      lines.push('\n  Guards:')
      for (const [method, strategies] of guardEntries) {
        lines.push(`    ${method}() → ${strategies.join(', ')}`)
      }
    }

    const permEntries = Object.entries(result.permissions)
    if (permEntries.length > 0) {
      lines.push('\n  Permissions:')
      for (const [method, perms] of permEntries) {
        lines.push(`    ${method}() → ${perms.join(', ')}`)
      }
    }

    const roleEntries = Object.entries(result.roles)
    if (roleEntries.length > 0) {
      lines.push('\n  Roles:')
      for (const [method, roles] of roleEntries) {
        lines.push(`    ${method}() → ${roles.join(', ')}`)
      }
    }

    if (!result.entity && guardEntries.length === 0 && permEntries.length === 0 && roleEntries.length === 0) {
      lines.push('  No decorator metadata found.')
    }

    lines.push('')
    return lines.join('\n')
  }
}
