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
}

export interface CartItem extends Product {
  quantity: number;
  observations?: string;
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
    pickupLocations?: string[];
    deliveryCategories?: string[];
}

// Order related types for Dashboard
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CustomerInfo {
    name: string;
    whatsapp: string;
}

export interface DeliveryInfo {
    type: 'delivery' | 'pickup';
    address?: {
        cep: string;
        street: string;
        number: string;
        neighborhood: string;
        complement?: string;
    };
    pickupLocation?: string;
}

export interface Order {
    id: string;
    createdAt: any; // Firestore Timestamp
    customer: CustomerInfo;
    delivery: DeliveryInfo;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    deliveryDate: string; // YYYY-MM-DD
}
