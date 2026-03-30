import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { Inspector } from '../../src/Inspector.js'

describe('forge > Inspector', () => {
  const inspector = new Inspector()

  it('inspects Warden decorators on controller', () => {
    class OrderController {
      async create() {}
      async list() {}
    }

    // Set metadata manually (esbuild doesn't support emitDecoratorMetadata)
    Reflect.defineMetadata(Symbol.for('warden:guard'), ['jwt'], OrderController.prototype, 'create')
    Reflect.defineMetadata(Symbol.for('warden:permission'), ['orders.create'], OrderController.prototype, 'create')
    Reflect.defineMetadata(Symbol.for('warden:role'), ['admin'], OrderController.prototype, 'create')
    Reflect.defineMetadata(Symbol.for('warden:guard'), ['jwt', 'session'], OrderController.prototype, 'list')

    const result = inspector.inspect(OrderController)
    expect(result.className).toBe('OrderController')
    expect(result.guards.create).toEqual(['jwt'])
    expect(result.guards.list).toEqual(['jwt', 'session'])
    expect(result.permissions.create).toEqual(['orders.create'])
    expect(result.roles.create).toEqual(['admin'])
  })

  it('inspects Atlas entity metadata', () => {
    class Order {
      id!: string
    }

    Reflect.defineMetadata(Symbol.for('atlas:entity'), { tableName: 'orders' }, Order)
    Reflect.defineMetadata(Symbol.for('atlas:columns'), [
      { propertyKey: 'id' },
      { propertyKey: 'status' },
      { propertyKey: 'total' },
    ], Order)
    Reflect.defineMetadata(Symbol.for('atlas:primary'), 'id', Order)
    Reflect.defineMetadata(Symbol.for('atlas:relations'), [
      { propertyKey: 'items', type: 'hasMany' },
    ], Order)

    const result = inspector.inspect(Order)
    expect(result.entity).toBeDefined()
    expect(result.entity!.tableName).toBe('orders')
    expect(result.entity!.columns).toEqual(['id', 'status', 'total'])
    expect(result.entity!.primaryKey).toBe('id')
    expect(result.entity!.relations).toEqual(['items (hasMany)'])
  })

  it('returns empty metadata for undecorated class', () => {
    class PlainClass {
      doStuff() {}
    }

    const result = inspector.inspect(PlainClass)
    expect(result.className).toBe('PlainClass')
    expect(Object.keys(result.guards)).toHaveLength(0)
    expect(Object.keys(result.permissions)).toHaveLength(0)
    expect(result.entity).toBeUndefined()
  })

  it('formats output for terminal', () => {
    class TestCtrl {
      async test() {}
    }
    Reflect.defineMetadata(Symbol.for('warden:guard'), ['jwt'], TestCtrl.prototype, 'test')

    const result = inspector.inspect(TestCtrl)
    const output = inspector.format(result)
    expect(output).toContain('Inspecting: TestCtrl')
    expect(output).toContain('Guards:')
    expect(output).toContain('test() → jwt')
  })

  it('formats empty class gracefully', () => {
    class Empty {}
    const result = inspector.inspect(Empty)
    const output = inspector.format(result)
    expect(output).toContain('No decorator metadata found')
  })
})
