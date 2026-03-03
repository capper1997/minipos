-- Database Setup SQL Script for Mini POS
-- Run this in your Supabase SQL Editor

-- 1. Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_sale DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for products (allow all operations for authenticated users)
CREATE POLICY "Allow all for authenticated users on products" ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Create policies for sales
CREATE POLICY "Allow all for authenticated users on sales" ON sales
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Create policies for sale_items
CREATE POLICY "Allow all for authenticated users on sale_items" ON sale_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Insert sample products (prices in PKR/Rs.)
INSERT INTO products (name, price, stock_quantity, category) VALUES
  ('Coffee', 150, 100, 'Beverages'),
  ('Tea', 80, 100, 'Beverages'),
  ('Sandwich', 250, 50, 'Food'),
  ('Burger', 350, 30, 'Food'),
  ('Fries', 150, 80, 'Food'),
  ('Cold Drink', 100, 100, 'Beverages'),
  ('Salad', 300, 25, 'Food'),
  ('Pizza Slice', 400, 40, 'Food'),
  ('Water', 50, 100, 'Beverages'),
  ('Pakora', 120, 50, 'Snacks'),
  ('Samosa', 80, 50, 'Snacks'),
  ('Biryani', 450, 30, 'Food')
ON CONFLICT DO NOTHING;

-- Done!
