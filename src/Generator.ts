/**
 * Forge Generator — generates code files following Ream conventions.
 *
 * @implements FR60
 */

export type GeneratorType = 'service' | 'entity' | 'provider' | 'controller' | 'validator' | 'migration'

export interface GeneratedFile {
  path: string
  content: string
}

/** Map generator type to subdirectory inside the module. */
const TYPE_DIRS: Record<string, string> = {
  service: 'services',
  entity: 'entities',
  controller: 'controllers',
  validator: 'validators',
}

/**
 * Code generator following Ream conventions.
 *
 * Usage: forge make:<type> <module> <Name>
 *   forge make:controller order Order → app/modules/order/controllers/OrderController.ts
 *   forge make:entity order Order     → app/modules/order/entities/Order.ts
 *   forge make:service order Payment  → app/modules/order/services/PaymentService.ts
 */
export class Generator {
  /** Generate a file based on type, module, and name. */
  generate(type: GeneratorType, module: string, name: string): GeneratedFile {
    switch (type) {
      case 'service':
        return this.generateService(module, name)
      case 'entity':
        return this.generateEntity(module, name)
      case 'provider':
        return this.generateProvider(name)
      case 'controller':
        return this.generateController(module, name)
      case 'validator':
        return this.generateValidator(module, name)
      case 'migration':
        return this.generateMigration(name)
      default:
        throw new Error(`[FORGE_UNKNOWN_TYPE] Unknown generator type: ${type}`)
    }
  }

  /** Ensure the class name has the correct suffix. */
  private ensureSuffix(name: string, suffix: string): string {
    return name.endsWith(suffix) ? name : `${name}${suffix}`
  }

  /** Generate a service file. */
  private generateService(module: string, name: string): GeneratedFile {
    const className = this.ensureSuffix(name, 'Service')

    return {
      path: `app/modules/${module}/${TYPE_DIRS.service}/${className}.ts`,
      content: `import { Service } from '@c9up/ream'

@Service()
export class ${className} {
  async findAll() {
    // TODO: implement
    return []
  }

  async findById(id: string) {
    // TODO: implement
    return null
  }

  async create(data: Record<string, unknown>) {
    // TODO: implement
    return data
  }

  async update(id: string, data: Record<string, unknown>) {
    // TODO: implement
    return { id, ...data }
  }

  async delete(id: string) {
    // TODO: implement
    return { id }
  }
}
`,
    }
  }

  /** Generate an entity file. */
  private generateEntity(module: string, name: string): GeneratedFile {
    const className = name
    const tableName = name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's'

    return {
      path: `app/modules/${module}/${TYPE_DIRS.entity}/${className}.ts`,
      content: `import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('${tableName}')
export class ${className} extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() createdAt!: string
  @Column() updatedAt!: string
}
`,
    }
  }

  /** Generate a provider file (providers live at project root, not in modules). */
  private generateProvider(name: string): GeneratedFile {
    const className = this.ensureSuffix(name, 'Provider')

    return {
      path: `providers/${className}.ts`,
      content: `import { Provider } from '@c9up/ream'

export default class ${className} extends Provider {
  register() {
    // Register bindings in the container
  }

  async boot() {
    // Connect and verify
  }

  async start() {
    // Runs before HTTP server starts — warm caches, health checks
  }

  async ready() {
    // Application operational
  }

  async shutdown() {
    // Cleanup
  }
}
`,
    }
  }

  /** Generate a controller file. */
  private generateController(module: string, name: string): GeneratedFile {
    const className = this.ensureSuffix(name, 'Controller')

    return {
      path: `app/modules/${module}/${TYPE_DIRS.controller}/${className}.ts`,
      content: `export class ${className} {
  async index(ctx: { response: { status: number; headers: Record<string, string>; body: string } }) {
    ctx.response.headers['content-type'] = 'application/json'
    ctx.response.body = JSON.stringify([])
  }

  async show(ctx: { params: Record<string, string>; response: { status: number; headers: Record<string, string>; body: string } }) {
    const { id } = ctx.params
    ctx.response.headers['content-type'] = 'application/json'
    ctx.response.body = JSON.stringify({ id })
  }

  async store(ctx: { request: { body: string }; response: { status: number; headers: Record<string, string>; body: string } }) {
    ctx.response.status = 201
    ctx.response.headers['content-type'] = 'application/json'
    ctx.response.body = JSON.stringify({ created: true })
  }

  async update(ctx: { params: Record<string, string>; request: { body: string }; response: { status: number; headers: Record<string, string>; body: string } }) {
    const { id } = ctx.params
    ctx.response.headers['content-type'] = 'application/json'
    ctx.response.body = JSON.stringify({ id, updated: true })
  }

  async destroy(ctx: { params: Record<string, string>; response: { status: number; headers: Record<string, string>; body: string } }) {
    const { id } = ctx.params
    ctx.response.status = 204
    ctx.response.body = ''
  }
}
`,
    }
  }

  /** Generate a validator file. */
  private generateValidator(module: string, name: string): GeneratedFile {
    const className = this.ensureSuffix(name, 'Validator')

    return {
      path: `app/modules/${module}/${TYPE_DIRS.validator}/${className}.ts`,
      content: `import { rules, schema } from '@c9up/rune'

export const ${className} = schema({
  // Define validation rules
  // name: rules.string().min(1).max(255),
  // email: rules.string().email(),
})
`,
    }
  }

  /** Generate a migration file (migrations live at project root, not in modules). */
  private generateMigration(name: string): GeneratedFile {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)
    const snakeName = name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')

    return {
      path: `database/migrations/${timestamp}_${snakeName}.ts`,
      content: `export async function up() {
  // TODO: implement migration
}

export async function down() {
  // TODO: implement rollback
}
`,
    }
  }
}
