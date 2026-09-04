import { ProductRepository } from './ProductRepository.js';
import { CustomerRepository } from './CustomerRepository.js';
import { CartRepository } from './CartRepository.js';
import { OrderRepository } from './OrderRepository.js';
import { PaymentRepository } from './PaymentRepository.js';
import { RevenueRepository } from './RevenueRepository.js';
import { AuditRepository } from './AuditRepository.js';
import { ExternalProductRepository } from './ExternalProductRepository.js';

export * from './types.js';
export {
  ProductRepository,
  CustomerRepository,
  CartRepository,
  OrderRepository,
  PaymentRepository,
  RevenueRepository,
  AuditRepository,
  ExternalProductRepository
};

export const productRepository = new ProductRepository();
export const customerRepository = new CustomerRepository();
export const cartRepository = new CartRepository();
export const orderRepository = new OrderRepository();
export const paymentRepository = new PaymentRepository();
export const revenueRepository = new RevenueRepository();
export const auditRepository = new AuditRepository();
export const externalProductRepository = new ExternalProductRepository();
