

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

// Order related types for Dashboard
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  option?: string;
}

export interface CustomerInfo {
    name: string;
    whatsapp: string;
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

export interface Order {
    id: string;
    orderNumber: number;
    status: 'new' | 'pending_payment' | 'confirmed' | 'shipped' | 'completed' | 'archived';
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    customer: CustomerInfo;
    delivery: DeliveryInfo;
    items: OrderItem[];
    total: number;
    deliveryFee?: number;
    paymentLink?: string;
    paymentMethod: string;
    deliveryDate: string; // YYYY-MM-DD
}

export interface Client {
    id: string; // WhatsApp number, used as document ID
    name: string;
    firstOrderDate: any;
    lastOrderDate: any;
    totalOrders: number;
    totalSpent: number;
    addresses: DeliveryInfo['address'][];
    orderIds: string[];
}