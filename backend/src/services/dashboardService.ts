import { query, queryOne } from '../db/pool';

export async function getDashboardStats() {
  const [
    customerCount,
    productCount,
    lowStockCount,
    pendingFollowups,
    totalChallans,
    confirmedChallans,
    monthRevenue,
    stockValue,
    recentChallans,
    recentMovements,
    lowStockItems,
    followupsDue,
    topCustomers,
  ] = await Promise.all([
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM customers'),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM products'),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM products WHERE current_stock <= minimum_stock'
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM customers
       WHERE follow_up_date IS NOT NULL AND follow_up_date <= CURRENT_DATE + INTERVAL '7 days'
       AND status != 'INACTIVE'`
    ),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM challans'),
    queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM challans WHERE status = 'CONFIRMED'"
    ),
    queryOne<{ amount: number }>(
      `SELECT COALESCE(SUM(ci.quantity * ci.unit_price_snapshot), 0)::float8 as amount
       FROM challan_items ci
       JOIN challans c ON c.id = ci.challan_id
       WHERE c.status = 'CONFIRMED' AND c.created_at >= date_trunc('month', CURRENT_DATE)`
    ),
    queryOne<{ value: number }>(
      `SELECT COALESCE(SUM(current_stock * unit_price), 0)::float8 as value FROM products`
    ),
    query(
      `SELECT c.*, cu.customer_name, u.name as created_by_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC LIMIT 5`
    ),
    query(
      `SELECT sm.*, p.product_name, p.sku, u.name as created_by_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN users u ON u.id = sm.created_by
       ORDER BY sm.created_at DESC LIMIT 5`
    ),
    query(
      `SELECT id, product_name, sku, category, current_stock, minimum_stock, warehouse_location
       FROM products
       WHERE current_stock <= minimum_stock
       ORDER BY (current_stock - minimum_stock) ASC, product_name ASC
       LIMIT 10`
    ),
    query(
      `SELECT cu.id, cu.customer_name, cu.mobile, cu.status, cu.follow_up_date
       FROM customers cu
       WHERE cu.follow_up_date IS NOT NULL
         AND cu.follow_up_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND cu.status != 'INACTIVE'
       ORDER BY cu.follow_up_date ASC
       LIMIT 10`
    ),
    query(
      `SELECT cu.id, cu.customer_name, cu.business_name,
              COALESCE(SUM(ci.quantity * ci.unit_price_snapshot), 0)::float8 as total_amount,
              COUNT(DISTINCT c.id)::int as challan_count
       FROM challans c
       JOIN challan_items ci ON ci.challan_id = c.id
       JOIN customers cu ON cu.id = c.customer_id
       WHERE c.status = 'CONFIRMED'
       GROUP BY cu.id, cu.customer_name, cu.business_name
       ORDER BY total_amount DESC
       LIMIT 5`
    ),
  ]);

  return {
    total_customers: parseInt(customerCount?.count ?? '0', 10),
    total_products: parseInt(productCount?.count ?? '0', 10),
    low_stock_products: parseInt(lowStockCount?.count ?? '0', 10),
    pending_followups: parseInt(pendingFollowups?.count ?? '0', 10),
    total_challans: parseInt(totalChallans?.count ?? '0', 10),
    confirmed_challans: parseInt(confirmedChallans?.count ?? '0', 10),
    month_revenue: monthRevenue?.amount ?? 0,
    stock_value: stockValue?.value ?? 0,
    recent_challans: recentChallans,
    recent_stock_movements: recentMovements,
    low_stock_items: lowStockItems,
    followups_due: followupsDue,
    top_customers: topCustomers,
  };
}
