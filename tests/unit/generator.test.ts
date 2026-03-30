import { describe, expect, it } from 'vitest'
import { Generator } from '../../src/Generator.js'

describe('forge > Generator', () => {
  const gen = new Generator()

  describe('make:service', () => {
    it('generates in module services directory', () => {
      const file = gen.generate('service', 'order', 'Order')
      expect(file.path).toBe('app/modules/order/services/OrderService.ts')
    })

    it('generates with @Service decorator and CRUD methods', () => {
      const file = gen.generate('service', 'order', 'Order')
      expect(file.content).toContain("@Service()")
      expect(file.content).toContain("class OrderService")
      expect(file.content).toContain("import { Service } from '@c9up/ream'")
      expect(file.content).toContain('findAll')
      expect(file.content).toContain('findById')
      expect(file.content).toContain('create')
      expect(file.content).toContain('update')
      expect(file.content).toContain('delete')
    })

    it('appends Service suffix if missing', () => {
      const file = gen.generate('service', 'payment', 'Payment')
      expect(file.path).toBe('app/modules/payment/services/PaymentService.ts')
      expect(file.content).toContain('class PaymentService')
    })

    it('does not double-suffix', () => {
      const file = gen.generate('service', 'order', 'OrderService')
      expect(file.content).toContain('class OrderService')
      expect(file.content).not.toContain('class OrderServiceService')
    })
  })

  describe('make:entity', () => {
    it('generates in module entities directory', () => {
      const file = gen.generate('entity', 'order', 'Order')
      expect(file.path).toBe('app/modules/order/entities/Order.ts')
    })

    it('generates with Atlas decorators', () => {
      const file = gen.generate('entity', 'order', 'Order')
      expect(file.content).toContain("@Entity('orders')")
      expect(file.content).toContain('@PrimaryKey() id!: string')
      expect(file.content).toContain('extends BaseEntity')
      expect(file.content).toContain("import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'")
    })

    it('generates snake_case table name for multi-word entities', () => {
      const file = gen.generate('entity', 'order', 'OrderItem')
      expect(file.content).toContain("@Entity('order_items')")
    })
  })

  describe('make:controller', () => {
    it('generates in module controllers directory', () => {
      const file = gen.generate('controller', 'toto', 'Order')
      expect(file.path).toBe('app/modules/toto/controllers/OrderController.ts')
    })

    it('generates with CRUD methods', () => {
      const file = gen.generate('controller', 'order', 'Order')
      expect(file.content).toContain('class OrderController')
      expect(file.content).toContain('async index')
      expect(file.content).toContain('async show')
      expect(file.content).toContain('async store')
      expect(file.content).toContain('async update')
      expect(file.content).toContain('async destroy')
    })

    it('does not double-suffix', () => {
      const file = gen.generate('controller', 'order', 'OrderController')
      expect(file.content).toContain('class OrderController')
      expect(file.content).not.toContain('class OrderControllerController')
    })
  })

  describe('make:validator', () => {
    it('generates in module validators directory', () => {
      const file = gen.generate('validator', 'order', 'CreateOrder')
      expect(file.path).toBe('app/modules/order/validators/CreateOrderValidator.ts')
    })

    it('generates with Rune schema', () => {
      const file = gen.generate('validator', 'order', 'CreateOrder')
      expect(file.content).toContain("import { rules, schema } from '@c9up/rune'")
      expect(file.content).toContain('CreateOrderValidator = schema(')
    })
  })

  describe('make:provider', () => {
    it('generates at providers/ root (not in modules)', () => {
      const file = gen.generate('provider', '', 'Stripe')
      expect(file.path).toBe('providers/StripeProvider.ts')
    })

    it('generates with lifecycle hooks', () => {
      const file = gen.generate('provider', '', 'Stripe')
      expect(file.content).toContain('class StripeProvider extends Provider')
      expect(file.content).toContain('register()')
      expect(file.content).toContain('async boot()')
      expect(file.content).toContain('async ready()')
      expect(file.content).toContain('async shutdown()')
    })
  })

  describe('make:migration', () => {
    it('generates timestamped migration file', () => {
      const file = gen.generate('migration', '', 'create_orders_table')
      expect(file.path).toMatch(/^database\/migrations\/\d{14}_create_orders_table\.ts$/)
      expect(file.content).toContain('async function up()')
      expect(file.content).toContain('async function down()')
    })
  })

  describe('unknown type', () => {
    it('throws on unknown generator type', () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      expect(() => gen.generate('unknown' as any, 'mod', 'Foo')).toThrow('FORGE_UNKNOWN_TYPE')
    })
  })
})
