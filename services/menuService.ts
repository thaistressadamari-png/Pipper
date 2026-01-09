
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
            'https://scontent-gru2-1.cdninstagram.com/v/t51.82787-15/568687263_17863976997484929_5284925856057137730_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=109&ig_cache_key=Mzc0ODYyMjc2ODcyOTYwNTMwMQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkzOS5zZHIuQzMifQ%3D%3D&_nc_ohc=LGJvpaUKsUEQ7kNvwHojFYL&_nc_oc=AdlVR90a3YunQVz_qoXIblrLI7Hxh28uaUTpWsp0_wNVewCnIartcTlCOoiYk6h4BdNsHKfbZSqeXzOuDldtW4wC&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-gru2-1.cdninstagram.com&_nc_gid=6GTsgzv_44AdzNUeARsR1w&oh=00_Afd4BCxN8DeqfTH0utwiTXvmyuSB2GuJsiKK2aD_kZ6jIA&oe=6907E725',
            'https://scontent-gru2-1.cdninstagram.com/v/t51.82787-15/569164657_17863977012484929_6894387260249410332_n.jpg?stp=dst-jpg_e35_p1080x1080_tt6&_nc_cat=109&ig_cache_key=Mzc0ODYyMjc2ODUxMTUwOTg4Mg%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkzOS5zZHIuQzMifQ%3D%3D&_nc_ohc=H5v7SlcXJQoQ7kNvwFUF0yb&_nc_oc=AdlXcRPtQJOJ_SjHJoXezrG99PP4nZcvVCcG0G1wUces3n2A0GY0BFMKdkbqf1iMuT9GbMbZGAW7fu7JoXNnYrbi&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-gru2-1.cdninstagram.com&_nc_gid=6GTsgzv_44AdzNUeARsR1w&oh=00_AfdIKcXuOheLQPAbYagCD2fuYb1-H6zPApU29SANusNfUg&oe=6907F573',
            'https://scontent-gru2-2.cdninstagram.com/v/t51.82787-15/568204909_17863977015484929_4996385737063293423_n.jpg?stp=dst-jpg_e35_p640x640_sh0.08_tt6&_nc_cat=102&ig_cache_key=Mzc0ODYyMjc2ODQ4NjI5MDM4NQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkzOS5zZHIuQzMifQ%3D%3D&_nc_ohc=a91GhC40dyAQ7kNvwG88O-Y&_nc_oc=AdklRuWUChWRrmTyNoVHFcY0rJCLiy3P_EJklhNBUVbBaCM6C4sJCR8nRCnw2ZCrAoDU8vcQ0lDc-f4UQYgzxJII&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-gru2-2.cdninstagram.com&_nc_gid=6GTsgzv_44AdzNUeARsR1w&oh=00_AffyAHJHX7yJqtLyK04pRV48sqb9692Cqc4RO1uBpgIkBg&oe=6908090C'
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

// Helper to normalize category data correctly
// Enhanced to handle fragmented strings (0: "B", 1: "e"...) and unified fields
const normalizeCategories = (rawData: any): CategoryMetadata[] => {
    if (!rawData) return [];
    
    // Combine names and items if both exist to avoid missing data
    const listToProcess = [
        ...(Array.isArray(rawData.names) ? rawData.names : []),
        ...(Array.isArray(rawData.items) ? rawData.items : [])
    ];

    if (listToProcess.length === 0 && typeof rawData === 'object') {
        // If rawData itself is an array of objects
        if (Array.isArray(rawData)) return normalizeArray(rawData);
    }

    return normalizeArray(listToProcess);
};

const normalizeArray = (arr: any[]): CategoryMetadata[] => {
    const result: CategoryMetadata[] = [];
    const seenNames = new Set<string>();

    arr.forEach((cat: any) => {
        let name = '';
        let isArchived = false;

        if (typeof cat === 'string') {
            name = cat;
        } else if (cat && typeof cat === 'object') {
            // Check for fragmented string (0: "B", 1: "e"...)
            if (cat[0] !== undefined && cat[1] !== undefined) {
                let reconstructed = '';
                let i = 0;
                while (cat[i] !== undefined) {
                    reconstructed += cat[i];
                    i++;
                }
                name = reconstructed;
                isArchived = !!cat.isArchived;
            } else {
                name = cat.name || '';
                isArchived = !!cat.isArchived;
            }
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
        console.log("Database is empty, initializing with default data...");
        const batch = writeBatch(db);

        initialMenuData.forEach((product, index) => {
            const productRef = doc(productsCollection);
            batch.set(productRef, { 
                ...product, 
                createdAt: new Date(Date.now() - index * 1000) 
            });
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
    
    const products: Product[] = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Product));

    products.sort((a, b) => {
        const getTime = (p: Product) => {
            const date = p.createdAt;
            if (!date) return 0;
            if (typeof date.toMillis === 'function') return date.toMillis();
            if (date instanceof Date) return date.getTime();
            if (typeof date.seconds === 'number') return date.seconds * 1000;
            return 0;
        };
        return getTime(b) - getTime(a);
    });

    const categoriesData = categoriesSnapshot.data();
    // Normalize using the enhanced function that unifies names/items and fixes fragments
    const categories = normalizeCategories(categoriesData);

    return { products, categories };
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const dataWithTimestamp = {
        ...productData,
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(productsCollection, dataWithTimestamp);
    return { ...productData, id: docRef.id };
};

export const updateProduct = async (updatedProduct: Product): Promise<Product> => {
    const productRef = doc(db, 'products', updatedProduct.id);
    const { id, ...dataToUpdate } = updatedProduct;
    await updateDoc(productRef, dataToUpdate);
    return updatedProduct;
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productRef = doc(db, 'products', productId);
    return deleteDoc(productRef);
};

export const getStoreInfo = async (): Promise<StoreInfoData> => {
    const docSnap = await getDoc(storeInfoDoc);
    if (docSnap.exists()) {
        return docSnap.data() as StoreInfoData;
    } else {
        throw new Error("Store info not found!");
    }
};

export const updateStoreInfo = (newStoreInfo: StoreInfoData): Promise<StoreInfoData> => {
    return setDoc(storeInfoDoc, newStoreInfo, { merge: true }).then(() => newStoreInfo);
};

export const addCategory = async (categoryName: string): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    const current = normalizeCategories(docSnap.data());
    const newCat: CategoryMetadata = { name: categoryName.trim(), isArchived: false };
    
    if (!current.some(c => c.name === newCat.name)) {
        const updated = [...current, newCat];
        // Save in a single standardized field 'names' and clear the messy 'items'
        await setDoc(categoriesDoc, { names: updated, items: [] });
        return updated;
    }
    return current;
};

export const deleteCategory = async (categoryName: string): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    if (docSnap.exists()) {
        const current = normalizeCategories(docSnap.data());
        const filtered = current.filter(c => c.name !== categoryName);
        await setDoc(categoriesDoc, { names: filtered, items: [] });
        return filtered;
    }
    return [];
};

export const updateCategoryOrder = async (newOrder: CategoryMetadata[]): Promise<void> => {
    await setDoc(categoriesDoc, { names: newOrder, items: [] });
};

export const toggleCategoriesArchive = async (categoryNames: string[], archive: boolean): Promise<CategoryMetadata[]> => {
    const docSnap = await getDoc(categoriesDoc);
    if (docSnap.exists()) {
        const current = normalizeCategories(docSnap.data());
        const updated = current.map(cat => {
            if (categoryNames.includes(cat.name)) {
                return { ...cat, isArchived: archive };
            }
            return cat;
        });
        await setDoc(categoriesDoc, { names: updated, items: [] });
        return updated;
    }
    return [];
};

export const getClient = async (whatsapp: string): Promise<Client | null> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    const clientRef = doc(clientsCollection, rawWhatsapp);
    const clientDoc = await getDoc(clientRef);
    if (clientDoc.exists()) {
        return clientDoc.data() as Client;
    }
    return null;
};

export const removeClientAddress = async (whatsapp: string, address: DeliveryInfo['address']): Promise<void> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    const clientRef = doc(clientsCollection, rawWhatsapp);
    await updateDoc(clientRef, {
        addresses: arrayRemove(address)
    });
};

const updateClientOnOrder = async (order: Order, saveAddress: boolean) => {
    const rawWhatsapp = order.customer.whatsapp.replace(/\D/g, '');
    const clientRef = doc(clientsCollection, rawWhatsapp);
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
            id: rawWhatsapp,
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

export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'>, saveAddress: boolean = true): Promise<Order> => {
    let newOrder: Order | null = null;
    await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'metadata', 'counters');
        const counterDoc = await transaction.get(counterRef);

        const newOrderNumber = counterDoc.exists()
            ? counterDoc.data().orderNumber + 1
            : 1001;

        transaction.set(counterRef, { orderNumber: newOrderNumber }, { merge: true });
        
        const orderRef = doc(collection(db, 'orders'));

        const now = serverTimestamp();
        const fullOrderData: Omit<Order, 'id'> = {
            ...orderData,
            customer: {
                ...orderData.customer,
                whatsapp: orderData.customer.whatsapp.replace(/\D/g, '')
            },
            orderNumber: newOrderNumber,
            status: 'new',
            createdAt: now,
            updatedAt: now,
        };
        
        transaction.set(orderRef, fullOrderData);
        newOrder = { 
            ...fullOrderData, 
            id: orderRef.id, 
            createdAt: Timestamp.now(), 
            updatedAt: Timestamp.now() 
        };
    });

    if (!newOrder) {
        throw new Error("Failed to create order.");
    }

    await updateClientOnOrder(newOrder, saveAddress);
    
    try {
        fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: newOrder }),
        }).catch(error => {
            console.error("Failed to send new order notification:", error);
        });
    } catch (e) {
        console.error("Error setting up new order notification fetch:", e);
    }
    
    return newOrder;
};

export const getOrders = async (): Promise<Order[]> => {
    const q = query(ordersCollection, orderBy('orderNumber', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Order));
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const orderRef = doc(ordersCollection, orderId);
    const orderDoc = await getDoc(orderRef);
    if (orderDoc.exists()) {
        return { id: orderDoc.id, ...orderDoc.data() } as Order;
    }
    return null;
};

export const getOrdersByDateRange = async (startDate: Date, endDate: Date): Promise<Order[]> => {
    const q = query(
        ordersCollection,
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Order));
};

export const getNewOrdersCount = async (): Promise<number> => {
    try {
        const q = query(ordersCollection, where('status', '==', 'new'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error("Error fetching new orders count:", error);
        return 0;
    }
};

export const updateOrderStatus = (orderId: string, status: Order['status']): Promise<void> => {
    const orderRef = doc(ordersCollection, orderId);
    return updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp(),
    });
};

export const updateOrderDeliveryFee = (orderId: string, deliveryFee: number): Promise<void> => {
    const orderRef = doc(ordersCollection, orderId);
    return updateDoc(orderRef, {
        deliveryFee,
        updatedAt: serverTimestamp(),
    });
};

export const updateOrderPaymentLink = (orderId: string, paymentLink: string): Promise<void> => {
    const orderRef = doc(ordersCollection, orderId);
    return updateDoc(orderRef, {
        paymentLink,
        updatedAt: serverTimestamp(),
    });
};

export const getClients = async (): Promise<Client[]> => {
    const q = query(clientsCollection, orderBy('lastOrderDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Client);
};

export const getOrdersByWhatsapp = async (whatsapp: string): Promise<Order[]> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    let formattedWhatsapp = rawWhatsapp;
    if (rawWhatsapp.length === 11) {
        formattedWhatsapp = rawWhatsapp.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (rawWhatsapp.length === 10) {
        formattedWhatsapp = rawWhatsapp.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    const statuses = ['new', 'pending_payment', 'confirmed', 'shipped', 'completed'];

    const q1 = query(
        ordersCollection,
        where('customer.whatsapp', '==', rawWhatsapp),
        where('status', 'in', statuses)
    );

    let q2 = null;
    if (formattedWhatsapp !== rawWhatsapp) {
        q2 = query(
            ordersCollection,
            where('customer.whatsapp', '==', formattedWhatsapp),
            where('status', 'in', statuses)
        );
    }
    
    const promises = [getDocs(q1)];
    if (q2) promises.push(getDocs(q2));

    const snapshots = await Promise.all(promises);
    const orderMap = new Map<string, Order>();
    
    snapshots.forEach(snap => {
        snap.docs.forEach(doc => {
            orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
        });
    });

    const orders = Array.from(orderMap.values());
    orders.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
    return orders;
};


export const incrementVisitCount = async (): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const dailyVisitRef = doc(dailyVisitsCollection, today);
    await setDoc(dailyVisitRef, { count: increment(1) }, { merge: true });
};


export const getVisitCountByDateRange = async (startDate: Date, endDate: Date): Promise<number> => {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const q = query(
        dailyVisitsCollection,
        where(documentId(), '>=', startStr),
        where(documentId(), '<=', endStr)
    );
    const querySnapshot = await getDocs(q);
    let totalVisits = 0;
    querySnapshot.forEach(doc => {
        totalVisits += doc.data().count || 0;
    });
    return totalVisits;
};
