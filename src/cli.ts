#!/usr/bin/env node

/**
 * Forge CLI — ream forge make:service OrderService
 *
 * @implements FR60, FR61, FR62, FR63
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { Generator } from './Generator.js'
import { MigrationRunner } from './MigrationRunner.js'
import { Doctor } from './Doctor.js'
import { Inspector } from './Inspector.js'
import type { GeneratorType } from './Generator.js'

const MAKE_COMMANDS: Record<string, GeneratorType> = {
  'make:service': 'service',
  'make:entity': 'entity',
  'make:provider': 'provider',
  'make:controller': 'controller',
  'make:validator': 'validator',
  'make:migration': 'migration',
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const name = args[1]

  if (!command || command === 'help' || command === '--help') {
    printHelp()
    return
  }

  // Doctor command
  if (command === 'doctor') {
    const doctor = new Doctor()
    const results = doctor.check()
    process.stdout.write(doctor.format(results))
    const fails = results.filter((r) => r.status === 'fail').length
    if (fails > 0) process.exit(1)
    return
  }

  // Inspect command
  if (command === 'inspect') {
    if (!name) {
      process.stderr.write('Usage: forge inspect <file-path>\n')
      process.stderr.write('  Example: forge inspect app/modules/order/controllers/OrderController.ts\n')
      process.exit(1)
    }
    const inspector = new Inspector()
    try {
      const mod = await import(path.resolve(name))
      const exported = Object.values(mod).filter((v): v is Function => typeof v === 'function')
      if (exported.length === 0) {
        process.stderr.write(`No exported classes found in ${name}\n`)
        process.exit(1)
      }
      for (const cls of exported) {
        const result = inspector.inspect(cls)
        process.stdout.write(inspector.format(result))
      }
    } catch (err) {
      process.stderr.write(`Failed to load ${name}: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exit(1)
    }
    return
  }

  // Migration commands
  if (command === 'migrate:status') {
    const runner = new MigrationRunner()
    const statuses = runner.status()
    if (statuses.length === 0) {
      process.stdout.write('No migrations found.\n')
      return
    }
    for (const s of statuses) {
      const icon = s.status === 'applied' ? '[OK]' : '[..]'
      process.stdout.write(`  ${icon} ${s.name}\n`)
    }
    return
  }

  // Make commands
  const generatorType = MAKE_COMMANDS[command]
  if (!generatorType) {
    process.stderr.write(`Unknown command: ${command}\n`)
    process.stderr.write('Run "forge help" for available commands.\n')
    process.exit(1)
  }

  const generator = new Generator()

  // provider and migration don't need a module
  if (generatorType === 'provider' || generatorType === 'migration') {
    if (!name) {
      process.stderr.write(`Usage: forge ${command} <Name>\n`)
      process.exit(1)
    }
    const file = generator.generate(generatorType, '', name)
    const fullPath = path.resolve(file.path)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, file.content)
    process.stdout.write(`Created: ${file.path}\n`)
    return
  }

  // Other types need module + name
  const moduleName = name
  const className = args[2]

  if (!moduleName || !className) {
    process.stderr.write(`Usage: forge ${command} <module> <Name>\n`)
    process.stderr.write(`  Example: forge ${command} order Order\n`)
    process.exit(1)
  }

  const file = generator.generate(generatorType, moduleName, className)
  const fullPath = path.resolve(file.path)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, file.content)

  process.stdout.write(`Created: ${file.path}\n`)
}

function printHelp() {
  process.stdout.write(`
Forge — Ream CLI

Usage:
  forge <command> [Name]

Generator Commands:
  make:service <module> <Name>      Generate a service class
  make:entity <module> <Name>       Generate an entity with decorators
  make:controller <module> <Name>   Generate a controller with CRUD methods
  make:validator <module> <Name>    Generate a validation schema
  make:provider <Name>              Generate a provider (project-level)
  make:migration <Name>             Generate a database migration

Migration Commands:
  migrate:status   Show migration status

Diagnostics:
  doctor           Run environment health checks
  inspect <file>   Inspect decorator metadata on exported classes

Examples:
  forge make:controller order Order   → app/modules/order/controllers/OrderController.ts
  forge make:service order Payment    → app/modules/order/services/PaymentService.ts
  forge make:entity order Order       → app/modules/order/entities/Order.ts
  forge make:validator order CreateOrder → app/modules/order/validators/CreateOrderValidator.ts
  forge make:provider Stripe          → providers/StripeProvider.ts
  forge make:migration create_orders_table
  forge doctor
  forge inspect app/modules/order/controllers/OrderController.ts
`)
}

main()
