-- S3K Fuse MVP schema
-- Run in Supabase SQL Editor. No enums, RLS, triggers, or indexes.

create extension if not exists "pgcrypto";

-- businesses
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

-- products
create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  stock integer not null default 99 check (stock >= 0),
  created_at timestamptz not null default now()
);

-- customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  phone text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

-- conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- carts
create table carts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- cart_items
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  cart_id uuid not null references carts (id) on delete cascade,
  status text not null default 'pending',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- seed (UUIDs must match src/lib/demo.ts)
insert into businesses (id, name, whatsapp_number, currency) values
  ('a1000000-0000-4000-8000-000000000001', 'S3K Dhaba', '+919876543210', 'INR');

insert into products (id, business_id, name, description, price, stock) values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Rajma Chawal',        'Comforting kidney beans with steamed rice',         120.00, 99),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Dal Fry',             'Slow-cooked yellow lentils with tempered spices',    90.00, 99),
  ('a2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Paneer Butter Masala', 'Cottage cheese in rich tomato-butter gravy',       180.00, 99),
  ('a2000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'Butter Naan',         'Soft tandoor bread brushed with butter',             40.00, 99),
  ('a2000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'Mango Lassi',         'Chilled yogurt drink with ripe mango',               60.00, 99);
