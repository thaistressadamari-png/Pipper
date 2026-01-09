
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    orderBy,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    where,
    Timestamp,
    increment,
    runTransaction,
    documentId,
} from "firebase/firestore";
import { db } from '../firebase';
import type { Product, StoreInfoData, Order, Client, DeliveryInfo, CategoryMetadata } from '../types';

// Collection references
const productsCollection = collection(db, 'products');
const ordersCollection = collection(db, 'orders');
const clientsCollection = collection(db, 'clients');
const dailyVisitsCollection = collection(db, 'dailyVisits');

const storeInfoDoc = doc(db, 'store', 'info');
const categoriesDoc = doc(db, 'metadata', 'categories');
const siteStatsDoc = doc(db, 'metadata', 'siteStats');
const countersDoc = doc(db, 'metadata', 'counters');

const initialMenuData: Omit<Product, 'id'>[] = [
    {
        name: 'Brownie de chocolate',
        description: 'Brownie artesanal com textura perfeita — crocante por fora e irresistivelmente macio por dentro. Feito com chocolate de alta qualidade e ingredientes selecionados, é a sobremesa ideal para qualquer momento.',
        price: 12.00,
        category: 'Pronta entrega',
        imageUrls: [
            'https://i.pinimg.com/736x/11/e7/73/11-e7-730c7cee3108dc7c39e3a79787aa.jpg'
        ],
        leadTimeDays: 0,
    },
    {
        name: 'Devil’s Food Cake',
        description: 'Feito com uma massa intensa e molhadinha de chocolate 100% cacau. Recheado e coberto com blend de chocolate nobre nacional de alta qualidade.\n\nUm bolo que reúne toda cremosidade e a potência do chocolate em uma única mordida.\n\nO Devil’s Food Cake é um grande querido por aqui.',
        price: 280.00,
        category: 'Bolos - Sob Encomenda',
        imageUrls: [
            'https://scontent-gru2-1.cdninstagram.com/v/t51.82787-15/568687263_17863976997484929_5284925856057137730_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=109&ig_cache_key=Mzc0ODYyMjc2ODcyOTYwNTMwMQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkzOS5zZHIuQzMifQ%3D%3D&_nc_ohc=LGJvpaUKsUEQ7kNvwHojFYL&_nc_oc=AdlVR90a3YunQVz_qoXIblrLI7Hxh28uaUTpWsp0_wNVewCnIartcTlCOoiYk6h4BdNsHKfbZSqeXzOuDldtW4wC&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-gru2-1.cdninstagram.com&_nc_gid=6GTsgzv_44AdzNUeARsR1w&oh=00_Afd4BCxN8DeqfTH0utwiTXvmyuSB2GuJsiKK2aD_kZ6jIA&oe=6907E725'
        ],
        leadTimeDays: 5,
    },
];

const initialStoreInfo: StoreInfoData = {
    name: 'Pipper Confeitaria',
    logoUrl: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
    hours: '90-100min',
    coverImageUrl: 'https://delicious.com.br/wp-content/uploads/2020/10/DSC_0183.jpg',
    operatingHours: [
        { day: 'TER', time: '11:00 às 17:00' },
        { day: 'QUA', time: '11:00 às 17:00' },
        { day: 'QUI', time: '11:00 às 17:00' },
        { day: 'SEX', time: '11:00 às 17:00' },
        { day: 'SÁB', time: '11:00 às 17:00' },
    ],
    paymentMethods: {
        online: ['Cartão de crédito', 'Pix']
    },
    whatsappNumber: '5511943591371',
};

const initialCategories: CategoryMetadata[] = [
    { name: 'Bolos - Sob Encomenda', isArchived: false },
    { name: 'Pronta entrega', isArchived: false }
];

const normalizeCategories = (rawData: any): CategoryMetadata[] => {
    if (!rawData) return [];
    const listToProcess = [
        ...(Array.isArray(rawData.names) ? rawData.names : []),
        ...(Array.isArray(rawData.items) ? rawData.items : [])
    ];
    if (listToProcess.length === 0 && typeof rawData === 'object') {
        if (Array.isArray(rawData)) return normalizeArray(rawData);
    }
    return normalizeArray(listToProcess);
};

const normalizeArray = (arr: any[]): CategoryMetadata[] => {
    const seenNames = new Set<string>();
    const result: CategoryMetadata[] = [];
    arr.forEach((cat: any) => {
        let name = '';
        let isArchived = false;
        if (typeof cat === 'string') {
            name = cat;
        } else if (cat && typeof cat === 'object') {
            name = cat.name || '';
            isArchived = !!cat.isArchived;
        }
        const trimmedName = name.trim();
        if (trimmedName && !seenNames.has(trimmedName)) {
            result.push({ name: trimmedName, isArchived });
            seenNames.add(trimmedName);
        }
    });
    return result;
};

export const initializeFirebaseData = async () => {
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
        const batch = writeBatch(db);
        initialMenuData.forEach((product, index) => {
            const productRef = doc(productsCollection);
            batch.set(productRef, { ...product, createdAt: new Date(Date.now() - index * 1000) });
        });
        batch.set(storeInfoDoc, initialStoreInfo);
        batch.set(categoriesDoc, { names: initialCategories });
        batch.set(countersDoc, { orderNumber: 1000 }); 
        await batch.commit();
    }
};

export const getMenu = async (): Promise<{ products: Product[], categories: CategoryMetadata[] }> => {
    const productsQuery = query(productsCollection);
    const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(productsQuery),
        getDoc(categoriesDoc)
    ]);
    const products: Product[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const categories = normalizeCategories(categoriesSnapshot.data());
    return { products, categories };
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const docRef = await addDoc(productsCollection, { ...productData, createdAt: serverTimestamp() });
    return { ...productData, id: docRef.id };
};

export const updateProduct = async (updatedProduct: Product): Promise<Product> => {
    const productRef = doc(db, 'products', updatedProduct.id);
    const { id, ...dataToUpdate } = updatedProduct;
    await updateDoc(productRef, dataToUpdate);
    return updatedProduct;
};

export const deleteProduct = (productId: string): Promise<void> => {
    return deleteDoc(doc(db, 'products', productId));
};

export const getStoreInfo = async (): Promise<StoreInfoData> => {
    const docSnap = await getDoc(storeInfoDoc);
    if (docSnap.exists()) return docSnap.data() as StoreInfoData;
    throw new Error("Store info not found!");
};

export const updateStoreInfo = (newStoreInfo: StoreInfoData): Promise<StoreInfoData> => {
    return setDoc(storeInfoDoc, newStoreInfo, { merge: true }).then(() => newStoreInfo);
};

export const addCategory = async (categoryName: string): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    const current = normalizeCategories(docSnap.data());
    if (!current.some(c => c.name === categoryName.trim())) {
        const updated = [...current, { name: categoryName.trim(), isArchived: false }];
        await setDoc(categoriesDoc, { names: updated });
        return updated;
    }
    return current;
};

export const deleteCategory = async (categoryName: string): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    const current = normalizeCategories(docSnap?.data());
    const filtered = current.filter(c => c.name !== categoryName);
    await setDoc(categoriesDoc, { names: filtered });
    return filtered;
};

export const updateCategoryOrder = async (newOrder: CategoryMetadata[]): Promise<void> => {
    await setDoc(categoriesDoc, { names: newOrder });
};

export const toggleCategoriesArchive = async (categoryNames: string[], archive: boolean): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    const current = normalizeCategories(docSnap.data());
    const updated = current.map(cat => categoryNames.includes(cat.name) ? { ...cat, isArchived: archive } : cat);
    await setDoc(categoriesDoc, { names: updated });
    return updated;
};

export const getClients = async (): Promise<Client[]> => {
    const q = query(clientsCollection, orderBy('lastOrderDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};

export const getClient = async (whatsapp: string): Promise<Client | null> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    const clientDoc = await getDoc(doc(clientsCollection, rawWhatsapp));
    if (clientDoc.exists()) return { id: clientDoc.id, ...clientDoc.data() } as Client;
    return null;
};

export const updateClient = async (clientId: string, data: Partial<Client>): Promise<void> => {
    await updateDoc(doc(clientsCollection, clientId), data);
};

export const deleteClient = async (clientId: string): Promise<void> => {
    await deleteDoc(doc(clientsCollection, clientId));
};

export const removeClientAddress = async (whatsapp: string, address: DeliveryInfo['address']): Promise<void> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    await updateDoc(doc(clientsCollection, rawWhatsapp), { addresses: arrayRemove(address) });
};

const updateClientOnOrder = async (order: Order, saveAddress: boolean) => {
    const rawWhatsapp = order.customer.whatsapp.replace(/\D/g, '');
    let clientId = rawWhatsapp || '00000000000';
    if (clientId === '00000000000') {
        clientId = `manual-${order.customer.name.toLowerCase().replace(/\s+/g, '-')}`;
    }
    const clientRef = doc(clientsCollection, clientId);
    const clientDoc = await getDoc(clientRef);
    const now = serverTimestamp();
    const addressUpdate = saveAddress ? { addresses: arrayUnion(order.delivery.address) } : {};

    if (clientDoc.exists()) {
        await updateDoc(clientRef, {
            name: order.customer.name,
            lastOrderDate: now,
            totalOrders: increment(1),
            totalSpent: increment(order.total),
            orderIds: arrayUnion(order.id),
            ...addressUpdate
        });
    } else {
        const newClient: Client = {
            id: clientId,
            name: order.customer.name,
            firstOrderDate: now,
            lastOrderDate: now,
            totalOrders: 1,
            totalSpent: order.total,
            addresses: saveAddress ? [order.delivery.address] : [],
            orderIds: [order.id]
        };
        await setDoc(clientRef, newClient);
    }
};

/**
 * Recalculates client statistics based on valid orders existing in the orders collection.
 * This ensures consistency after orders are manually deleted.
 */
export const syncClientStats = async (clientId: string): Promise<void> => {
    const q = query(ordersCollection, where('customer.whatsapp', '==', clientId.replace(/\D/g, '')));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => doc.data() as Order);
    
    // Consider only valid statuses for spent/count stats
    const validOrders = orders.filter(o => ['confirmed', 'shipped', 'completed'].includes(o.status));
    
    const totalSpent = validOrders.reduce((sum, o) => sum + (o.total || 0) + (o.deliveryFee || 0), 0);
    const totalOrders = validOrders.length;
    const orderIds = querySnapshot.docs.map(doc => doc.id);

    const clientRef = doc(clientsCollection, clientId);
    await updateDoc(clientRef, {
        totalSpent,
        totalOrders,
        orderIds
    });
};

export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'>, saveAddress: boolean = true): Promise<Order> => {
    let newOrder: Order | null = null;
    await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'metadata', 'counters');
        const counterDoc = await transaction.get(counterRef);
        const newOrderNumber = counterDoc.exists() ? counterDoc.data().orderNumber + 1 : 1001;
        transaction.set(counterRef, { orderNumber: newOrderNumber }, { merge: true });
        const orderRef = doc(collection(db, 'orders'));
        const now = serverTimestamp();
        const fullOrderData = {
            ...orderData,
            customer: { ...orderData.customer, whatsapp: orderData.customer.whatsapp.replace(/\D/g, '') },
            orderNumber: newOrderNumber,
            status: 'new' as const,
            createdAt: now,
            updatedAt: now,
        };
        transaction.set(orderRef, fullOrderData);
        newOrder = { ...fullOrderData, id: orderRef.id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
    });
    if (!newOrder) throw new Error("Failed to create order.");
    await updateClientOnOrder(newOrder, saveAddress);
    return newOrder;
};

export const getOrders = async (): Promise<Order[]> => {
    const q = query(ordersCollection, orderBy('orderNumber', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const orderDoc = await getDoc(doc(ordersCollection, orderId));
    if (orderDoc.exists()) return { id: orderDoc.id, ...orderDoc.data() } as Order;
    return null;
};

export const getOrdersByClientId = async (clientId: string): Promise<Order[]> => {
    let q;
    // To avoid requiring a composite index on (customer.whatsapp, createdAt),
    // we fetch by whatsapp and sort client-side.
    if (clientId.startsWith('manual-')) {
        q = query(ordersCollection, where('customer.whatsapp', '==', '00000000000'));
    } else {
        q = query(ordersCollection, where('customer.whatsapp', '==', clientId));
    }
    
    const querySnapshot = await getDocs(q);
    let orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // Perform filtering and sorting client-side to prevent "Index required" errors
    if (clientId.startsWith('manual-')) {
        const targetName = clientId.replace('manual-', '').replace(/-/g, ' ');
        orders = orders.filter(o => o.customer.name.toLowerCase() === targetName);
    }
    
    // Sort by createdAt descending
    orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });

    return orders;
};

export const getOrdersByDateRange = async (startDate: Date, endDate: Date): Promise<Order[]> => {
    const q = query(ordersCollection, where('createdAt', '>=', startDate), where('createdAt', '<=', endDate), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const updateOrderStatus = (orderId: string, status: Order['status']): Promise<void> => {
    return updateDoc(doc(ordersCollection, orderId), { status, updatedAt: serverTimestamp() });
};

export const incrementVisitCount = async (): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    await setDoc(doc(dailyVisitsCollection, today), { count: increment(1) }, { merge: true });
};

export const getVisitCountByDateRange = async (startDate: Date, endDate: Date): Promise<number> => {
    const q = query(dailyVisitsCollection, where(documentId(), '>=', startDate.toISOString().split('T')[0]), where(documentId(), '<=', endDate.toISOString().split('T')[0]));
    const querySnapshot = await getDocs(q);
    let total = 0;
    querySnapshot.forEach(doc => { total += doc.data().count || 0; });
    return total;
};

export const getNewOrdersCount = async (): Promise<number> => {
    const q = query(ordersCollection, where('status', '==', 'new'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
};

export const updateOrderDeliveryFee = (orderId: string, deliveryFee: number): Promise<void> => {
    return updateDoc(doc(ordersCollection, orderId), { deliveryFee, updatedAt: serverTimestamp() });
};

export const updateOrderPaymentLink = (orderId: string, paymentLink: string): Promise<void> => {
    return updateDoc(doc(ordersCollection, orderId), { paymentLink, updatedAt: serverTimestamp() });
};

export const getOrdersByWhatsapp = async (whatsapp: string): Promise<Order[]> => {
    const raw = whatsapp.replace(/\D/g, '');
    const q = query(ordersCollection, where('customer.whatsapp', '==', raw));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => b.orderNumber - a.orderNumber);
};
