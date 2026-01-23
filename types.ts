
export interface ProductOption {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  promotionalTag?: string;
  category: string;
  imageUrls: string[];
  leadTimeDays: number;
  options?: ProductOption[];
  createdAt?: any;
  inventoryEnabled?: boolean;
  inventoryQuantity?: number;
}

export interface CategoryMetadata {
  name: string;
  isArchived: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  observations?: string;
  selectedOption?: ProductOption;
}

export interface OperatingHours {
  day: string;
  time: string;
}

export interface StoreInfoData {
    name: string;
    logoUrl: string;
    hours: string; // delivery time
    coverImageUrl: string;
    operatingHours: OperatingHours[];
    paymentMethods: {
        online: string[];
    };
    whatsappNumber?: string;
}

export interface DeliveryInfo {
  type: 'delivery';
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
  };
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  option?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  customer: {
    name: string;
    whatsapp: string;
  };
  delivery: DeliveryInfo;
  items: OrderItem[];
  total: number;
  deliveryFee?: number;
  paymentMethod: string;
  paymentLink?: string;
  deliveryDate: string;
  status: 'new' | 'pending_payment' | 'confirmed' | 'shipped' | 'completed' | 'archived';
  createdAt: any;
  updatedAt: any;
}

// Added 'whatsapp' and 'needsSync' to Client interface to fix reported errors in ClientsView.tsx
export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  firstOrderDate: any;
  lastOrderDate: any;
  totalOrders: number;
  totalSpent: number;
  addresses: DeliveryInfo['address'][];
  orderIds: string[];
  observations?: string;
  birthday?: string;
  needsSync?: boolean;
}
