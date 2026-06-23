export type SenderType = "customer" | "admin" | "system";
export type CartStatus = "active" | "converted" | "abandoned";
export type OrderStatus =
  | "new"
  | "payment_pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "verified" | "failed";
export type PaymentMethod = "upi" | "card" | "cod";
export type ShipmentStatus =
  | "awaiting_payment"
  | "assigned"
  | "packed"
  | "in_transit"
  | "delivered";
export type UserRole = "admin" | "customer";

export type Business = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  business_id: string | null;
  name_en: string;
  name_hi: string | null;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  business_id: string | null;
  phone: string;
  name: string | null;
  address: string | null;
  order_count: number;
  total_spent: number;
  consent_given: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  unread_count: number;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string | null;
  sender_type: SenderType;
  content: string;
  intent: string | null;
  was_ai_drafted: boolean;
  created_at: string;
};

export type Cart = {
  id: string;
  customer_id: string | null;
  conversation_id: string | null;
  status: CartStatus;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string | null;
  product_id: string | null;
  quantity: number;
  price_snapshot: number;
};

export type Order = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  cart_id: string | null;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  payment_utr: string | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  delivery_courier: string | null;
  tracking_id: string | null;
  shipment_status: ShipmentStatus;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Partial row returned by orders.select('total_amount') */
export type OrderRevenueRow = Pick<Order, "total_amount">;

/** Row shape for orders joined with customers in admin dashboard */
export type OrderWithCustomerRow = {
  id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  customers: Pick<Customer, "name" | "phone"> | null;
};

export type InventoryAuditLog = {
  id: string;
  product_id: string;
  product_name: string;
  previous_stock: number;
  quantity_sold: number;
  new_stock: number;
  order_id: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          business_id?: string | null;
          name_en: string;
          name_hi?: string | null;
          description?: string | null;
          category?: string;
          price: number;
          stock?: number;
          image_url?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          name_en?: string;
          name_hi?: string | null;
          description?: string | null;
          category?: string;
          price?: number;
          stock?: number;
          image_url?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: Customer;
        Insert: {
          id?: string;
          business_id?: string | null;
          phone: string;
          name?: string | null;
          address?: string | null;
          order_count?: number;
          total_spent?: number;
          consent_given?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          phone?: string;
          name?: string | null;
          address?: string | null;
          order_count?: number;
          total_spent?: number;
          consent_given?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: Conversation;
        Insert: {
          id?: string;
          business_id?: string | null;
          customer_id?: string | null;
          unread_count?: number;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          customer_id?: string | null;
          unread_count?: number;
          last_message_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey";
            columns: ["business_id"];
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: Message;
        Insert: {
          id?: string;
          conversation_id?: string | null;
          sender_type: SenderType;
          content: string;
          intent?: string | null;
          was_ai_drafted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          sender_type?: SenderType;
          content?: string;
          intent?: string | null;
          was_ai_drafted?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: Cart;
        Insert: {
          id?: string;
          customer_id?: string | null;
          conversation_id?: string | null;
          status?: CartStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          conversation_id?: string | null;
          status?: CartStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carts_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: CartItem;
        Insert: {
          id?: string;
          cart_id?: string | null;
          product_id?: string | null;
          quantity: number;
          price_snapshot: number;
        };
        Update: {
          id?: string;
          cart_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          price_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          business_id?: string | null;
          customer_id?: string | null;
          cart_id?: string | null;
          status?: OrderStatus;
          total_amount: number;
          delivery_fee?: number;
          payment_utr?: string | null;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          delivery_courier?: string | null;
          tracking_id?: string | null;
          shipment_status?: ShipmentStatus;
          delivery_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          customer_id?: string | null;
          cart_id?: string | null;
          status?: OrderStatus;
          total_amount?: number;
          delivery_fee?: number;
          payment_utr?: string | null;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          delivery_courier?: string | null;
          tracking_id?: string | null;
          shipment_status?: ShipmentStatus;
          delivery_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey";
            columns: ["business_id"];
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_cart_id_fkey";
            columns: ["cart_id"];
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_audit_log: {
        Row: InventoryAuditLog;
        Insert: {
          id?: string;
          product_id: string;
          product_name: string;
          previous_stock: number;
          quantity_sold: number;
          new_stock: number;
          order_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          product_name?: string;
          previous_stock?: number;
          quantity_sold?: number;
          new_stock?: number;
          order_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_audit_log_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_audit_log_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      deduct_inventory_for_order: {
        Args: {
          p_order_id: string;
          p_items: { product_id: string; quantity: number }[];
        };
        Returns: undefined;
      };
    };
  };
};
