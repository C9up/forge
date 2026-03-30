# @c9up/forge

CLI tools for the Ream framework. Code generators, migrations, diagnostics.

## Usage

```bash
forge make:controller order Order    # → app/modules/order/controllers/OrderController.ts
forge make:service order Payment     # → app/modules/order/services/PaymentService.ts
forge make:entity order OrderItem    # → app/modules/order/entities/OrderItem.ts
forge make:validator order CreateOrder
forge make:provider Stripe
forge make:migration create_orders_table
forge doctor
forge inspect app/modules/order/controllers/OrderController.ts
```

## License

MIT
