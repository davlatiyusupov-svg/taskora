/*
  # Market Sniper Database Schema

  1. New Tables
    - `products`
      - `product_id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `marketplace` (text)
      - `old_price` (decimal)
      - `new_price` (decimal)
      - `discount_percent` (decimal, calculated)
      - `image_urls` (text array)
      - `marketplace_link` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `admins`
      - `admin_id` (uuid, primary key)
      - `username` (text)
      - `password_hash` (text, optional)
      - `telegram_id` (text, optional)
      - `role` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access and public product reading
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  marketplace text NOT NULL,
  old_price decimal(10,2) NOT NULL,
  new_price decimal(10,2) NOT NULL,
  discount_percent decimal(5,2) GENERATED ALWAYS AS (
    ROUND(((old_price - new_price) / old_price * 100)::numeric, 2)
  ) STORED,
  image_urls text[] NOT NULL DEFAULT '{}',
  marketplace_link text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  admin_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text,
  telegram_id text UNIQUE,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can read active products"
  ON products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admin_id = auth.uid()
    )
  );

-- Admins policies
CREATE POLICY "Admins can read admin data"
  ON admins
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

-- Insert default admin (username: admin, password: admin123)
INSERT INTO admins (username, password_hash) VALUES 
('admin', '$2b$10$K7Zy1b1Zy1b1Zy1b1Zy1buHO8vJ9XQjWxYzQjWxYzQjWxYzQjWxY2')
ON CONFLICT (username) DO NOTHING;

-- Update trigger for products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE
ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();