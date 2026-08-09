export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  available?: number;
  requested?: number;
}

export interface Customer {
  id: string;
  customer_name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number: string | null;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  follow_up_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Followup {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string;
  created_by: string;
  created_at: string;
  created_by_name?: string;
}

export interface Product {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  minimum_stock: number;
  warehouse_location: string;
  is_low_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: 'IN' | 'OUT';
  reason: string;
  created_by: string;
  created_at: string;
  product_name?: string;
  sku?: string;
  created_by_name?: string;
}

export interface ChallanItem {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total?: number;
  created_at: string;
}

export interface Challan {
  id: string;
  challan_number: string;
  customer_id: string;
  total_quantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  created_by: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  business_name?: string;
  created_by_name?: string;
  items?: ChallanItem[];
  total_amount?: number;
}

export interface LowStockItem {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  warehouse_location: string;
}

export interface FollowupDue {
  id: string;
  customer_name: string;
  mobile: string;
  status: string;
  follow_up_date: string;
}

export interface TopCustomer {
  id: string;
  customer_name: string;
  business_name: string;
  total_amount: number;
  challan_count: number;
}

export interface DashboardStats {
  total_customers: number;
  total_products: number;
  low_stock_products: number;
  pending_followups: number;
  total_challans: number;
  confirmed_challans: number;
  month_revenue: number;
  stock_value: number;
  recent_challans: Challan[];
  recent_stock_movements: StockMovement[];
  low_stock_items: LowStockItem[];
  followups_due: FollowupDue[];
  top_customers: TopCustomer[];
}
