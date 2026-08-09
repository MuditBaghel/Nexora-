import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export const customerSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Mobile must be a valid 10-digit Indian number'),
  email: z.string().email('Invalid email address'),
  business_name: z.string().min(1, 'Business name is required').max(255),
  gst_number: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
    .optional()
    .nullable()
    .or(z.literal('')),
  customer_type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().default(''),
});

export const customerUpdateSchema = customerSchema.partial();

export const customerQuerySchema = paginationSchema.extend({
  customer_type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
});

export const followupSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const productSchema = z.object({
  product_name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(100),
  category: z.string().min(1, 'Category is required').max(100),
  unit_price: z.coerce.number().min(0, 'Unit price must be non-negative'),
  current_stock: z.coerce.number().int().min(0).default(0),
  minimum_stock: z.coerce.number().int().min(0).default(0),
  warehouse_location: z.string().min(1, 'Warehouse location is required').max(255),
});

export const productUpdateSchema = productSchema.partial();

export const productQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  low_stock: z.enum(['true', 'false']).optional(),
});

export const stockMovementSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
  movement_type: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'Reason is required'),
});

export const stockMovementQuerySchema = paginationSchema.extend({
  product_id: z.string().uuid().optional(),
  movement_type: z.enum(['IN', 'OUT']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const challanItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
});

export const challanSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
});

export const challanQuerySchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});
