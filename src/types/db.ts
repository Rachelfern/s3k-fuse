export interface Business {
  id: string;
  name: string;
  whatsapp_number: string | null;
  currency: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

export type ConversationStatus = "active" | "closed";

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  status: ConversationStatus;
  created_at: string;
}

export type MessageRole = "customer" | "assistant" | "system";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export type CartStatus = "active" | "ordered";

export interface Cart {
  id: string;
  business_id: string;
  customer_id: string;
  conversation_id: string | null;
  status: CartStatus;
  created_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";

export interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  cart_id: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface CartItemWithProduct extends CartItem {
  product: Product;
}

export interface CartWithItems extends Cart {
  items: CartItemWithProduct[];
}
