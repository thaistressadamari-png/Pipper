
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

const productsCollection = collection(db, 'products');
const ordersCollection = collection(db, 'orders');
const clientsCollection = collection(db, 'clients');
const dailyVisitsCollection = collection(db, 'dailyVisits');

const storeInfoDoc = doc(db, 'store', 'info');
const categoriesDoc = doc(db, 'metadata', 'categories');
const countersDoc = doc(db, 'metadata', 'counters');

const initialMenuData: Omit<Product, 'id'>[] = [
    {
        name: 'Brownie de chocolate',
        description: 'Brownie artesanal com textura perfeita.',
        price: 12.00,
        category: 'Pronta entrega',
        imageUrls: ['https://i.pinimg.com/736x/11/e7/73/11-e7-730c7cee3108dc7c39e3a79787aa.jpg'],
        leadTimeDays: 0,
        inventoryEnabled: true,
        inventoryQuantity: 20
    }
];

const initialStoreInfo: StoreInfoData = {
    name: 'Pipper Confeitaria',
    logoUrl: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
    hours: '90-100min',
    coverImageUrl: 'https://delicious.com.br/wp-content/uploads/2020/10/DSC_0183.jpg',
    operatingHours: [
        { day: 'SEG', time: '11:00 às 17:00' },
        { day: 'TER', time: '11:00 às 17:00' },
        { day: 'QUA', time: '11:00 às 17:00' },
        { day: 'QUI', time: '11:00 às 17:00' },
        { day: 'SEX', time: '11:00 às 17:00' },
    ],
    paymentMethods: { online: ['Pix', 'Cartão de crédito'] },
    whatsappNumber: '5511943591371',
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
        batch.set(categoriesDoc, { names: [{ name: 'Pronta entrega', isArchived: false }] });
        batch.set(countersDoc, { orderNumber: 1000 }); 
        await batch.commit();
    }
};

const deductInventory = async (transaction: any, orderData: Order, orderRef: any) => {
    // READ phase
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const currentOrderData = orderSnap.data();
    if (currentOrderData?.inventoryReduced === true) return;

    const updates: { ref: any, newQty: number }[] = [];
    for (const item of orderData.items) {
        const pRef = doc(db, 'products', item.id);
        const pSnap = await transaction.get(pRef);
        if (pSnap.exists()) {
            const pData = pSnap.data() as Product;
            if (pData.inventoryEnabled) {
                const currentQty = pData.inventoryQuantity || 0;
                updates.push({ ref: pRef, newQty: Math.max(0, currentQty - item.quantity) });
            }
        }
    }

    // WRITE phase
    for (const up of updates) {
        transaction.update(up.ref, { inventoryQuantity: up.newQty });
    }
    transaction.update(orderRef, { inventoryReduced: true });
};

const returnInventory = async (transaction: any, orderData: Order, orderRef: any) => {
    // READ phase
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const currentOrderData = orderSnap.data();
    if (currentOrderData?.inventoryReduced === false) return;

    const updates: { ref: any, qty: number }[] = [];
    for (const item of orderData.items) {
        const pRef = doc(db, 'products', item.id);
        const pSnap = await transaction.get(pRef);
        if (pSnap.exists()) {
            const pData = pSnap.data() as Product;
            if (pData.inventoryEnabled) {
                updates.push({ ref: pRef, qty: item.quantity });
            }
        }
    }

    // WRITE phase
    for (const up of updates) {
        transaction.update(up.ref, { inventoryQuantity: increment(up.qty) });
    }
    transaction.update(orderRef, { inventoryReduced: false });
};

export const getMenu = async (): Promise<{ products: Product[], categories: CategoryMetadata[] }> => {
    const productsQuery = query(productsCollection);
    const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(productsQuery),
        getDoc(categoriesDoc)
    ]);
    const products: Product[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const categories = categoriesSnapshot.data()?.names || [];
    return { products, categories };
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Pedido não encontrado");
        const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;

        const statusThatRequireInventoryDeduction = ['pending_payment', 'confirmed', 'shipped', 'completed'];
        
        // Firestore Transactions: All reads must be done before any writes.
        // We pass the transaction and let internal functions handle their reads first.
        if (statusThatRequireInventoryDeduction.includes(status)) {
            await deductInventory(transaction, orderData, orderRef);
        } else if (status === 'archived') {
            await returnInventory(transaction, orderData, orderRef);
        }

        // Final WRITE
        transaction.update(orderRef, { status, updatedAt: serverTimestamp() });
    });
};

export const processOrderCheckout = async (orderId: string, deliveryFee: number, paymentLink: string): Promise<void> => {
    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Pedido não encontrado");
        const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;

        const clientId = orderData.customer.whatsapp.replace(/\D/g, '');
        const clientRef = doc(db, 'clients', clientId);
        const clientSnap = await transaction.get(clientRef);

        // All reads for inventory
        await deductInventory(transaction, orderData, orderRef);

        // Writes for client
        const address = orderData.delivery.address;
        if (!clientSnap.exists()) {
            transaction.set(clientRef, {
                id: clientId,
                name: orderData.customer.name,
                firstOrderDate: serverTimestamp(),
                lastOrderDate: serverTimestamp(),
                totalOrders: 0,
                totalSpent: 0,
                addresses: [address],
                orderIds: [orderData.id]
            });
        } else {
            const clientData = clientSnap.data();
            const currentAddresses = clientData.addresses || [];
            const isNewAddress = !currentAddresses.some((a: any) => 
                a.cep === address.cep && a.number === address.number
            );
            transaction.update(clientRef, {
                lastOrderDate: serverTimestamp(),
                orderIds: arrayUnion(orderData.id),
                addresses: isNewAddress ? arrayUnion(address) : currentAddresses
            });
        }

        // Final WRITE for order
        transaction.update(orderRef, {
            deliveryFee,
            paymentLink,
            status: 'pending_payment',
            updatedAt: serverTimestamp()
        });
    });
};

export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'>, saveAddress: boolean = true): Promise<Order> => {
    const orderRef = doc(collection(db, 'orders'));
    const counterRef = doc(db, 'metadata', 'counters');
    const clientId = orderData.customer.whatsapp.replace(/\D/g, '');
    const clientRef = doc(db, 'clients', clientId);

    return await runTransaction(db, async (transaction) => {
        // READS
        const counterDoc = await transaction.get(counterRef);
        const clientSnap = await transaction.get(clientRef);
        
        const newOrderNumber = counterDoc.exists() ? counterDoc.data().orderNumber + 1 : 1001;
        const now = Timestamp.now();
        const fullOrderData = {
            ...orderData,
            orderNumber: newOrderNumber,
            status: 'new' as const,
            inventoryReduced: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // WRITES
        transaction.set(counterRef, { orderNumber: newOrderNumber }, { merge: true });
        transaction.set(orderRef, fullOrderData);

        if (saveAddress) {
            const address = orderData.delivery.address;
            if (!clientSnap.exists()) {
                transaction.set(clientRef, {
                    id: clientId,
                    name: orderData.customer.name,
                    firstOrderDate: serverTimestamp(),
                    lastOrderDate: serverTimestamp(),
                    totalOrders: 0,
                    totalSpent: 0,
                    addresses: [address],
                    orderIds: [orderRef.id]
                });
            } else {
                const clientData = clientSnap.data();
                const currentAddresses = clientData.addresses || [];
                const isNewAddress = !currentAddresses.some((a: any) => 
                    a.cep === address.cep && a.number === address.number
                );
                transaction.update(clientRef, {
                    lastOrderDate: serverTimestamp(),
                    orderIds: arrayUnion(orderRef.id),
                    addresses: isNewAddress ? arrayUnion(address) : currentAddresses
                });
            }
        }

        return { ...fullOrderData, id: orderRef.id, createdAt: now, updatedAt: now } as Order;
    });
};

export const getStoreInfo = async (): Promise<StoreInfoData> => {
    const docSnap = await getDoc(storeInfoDoc);
    return docSnap.data() as StoreInfoData;
};

export const updateStoreInfo = (newStoreInfo: StoreInfoData): Promise<StoreInfoData> => {
    return setDoc(storeInfoDoc, newStoreInfo, { merge: true }).then(() => newStoreInfo);
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const docRef = await addDoc(productsCollection, { ...productData, createdAt: serverTimestamp() });
    return { ...productData, id: docRef.id };
};

export const updateProduct = async (updatedProduct: Product): Promise<Product> => {
    const { id, ...data } = updatedProduct;
    await updateDoc(doc(db, 'products', id), data);
    return updatedProduct;
};

export const deleteProduct = (productId: string): Promise<void> => {
    return deleteDoc(doc(db, 'products', productId));
};

export const getOrders = async (): Promise<Order[]> => {
    const q = query(ordersCollection, orderBy('orderNumber', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const snap = await getDoc(doc(ordersCollection, orderId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Order : null;
};

export const getClient = async (whatsapp: string): Promise<Client | null> => {
    const snap = await getDoc(doc(clientsCollection, whatsapp.replace(/\D/g, '')));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Client : null;
};

export const removeClientAddress = async (whatsapp: string, address: DeliveryInfo['address']): Promise<void> => {
    await updateDoc(doc(clientsCollection, whatsapp.replace(/\D/g, '')), { 
        addresses: arrayRemove(address) 
    });
};

export const getOrdersByWhatsapp = async (whatsapp: string): Promise<Order[]> => {
    const q = query(ordersCollection, where('customer.whatsapp', '==', whatsapp.replace(/\D/g, '')));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => b.orderNumber - a.orderNumber);
};

export const incrementVisitCount = async (): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    await setDoc(doc(dailyVisitsCollection, today), { count: increment(1) }, { merge: true });
};

export const getNewOrdersCount = async (): Promise<number> => {
    const q = query(ordersCollection, where('status', '==', 'new'));
    const snap = await getDocs(q);
    return snap.size;
};

export const getOrdersByDateRange = async (start: Date, end: Date): Promise<Order[]> => {
    const q = query(ordersCollection, where('createdAt', '>=', start), where('createdAt', '<=', end));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getVisitCountByDateRange = async (start: Date, end: Date): Promise<number> => {
    const q = query(dailyVisitsCollection, where(documentId(), '>=', start.toISOString().split('T')[0]), where(documentId(), '<=', end.toISOString().split('T')[0]));
    const snap = await getDocs(q);
    let total = 0;
    snap.forEach(d => total += d.data().count || 0);
    return total;
};

export const updateOrderPaymentLink = (id: string, link: string) => updateDoc(doc(db, 'orders', id), { paymentLink: link });

export const addCategory = async (name: string) => {
    const snap = await getDoc(categoriesDoc);
    const cats = snap.data()?.names || [];
    if (!cats.find((c: any) => c.name === name)) {
        const updated = [...cats, { name, isArchived: false }];
        await setDoc(categoriesDoc, { names: updated });
    }
};

export const deleteCategory = async (name: string) => {
    const snap = await getDoc(categoriesDoc);
    const filtered = (snap.data()?.names || []).filter((c: any) => c.name !== name);
    await setDoc(categoriesDoc, { names: filtered });
};

export const updateCategoryOrder = (order: any) => setDoc(categoriesDoc, { names: order });

export const toggleCategoriesArchive = async (names: string[], archive: boolean) => {
    const snap = await getDoc(categoriesDoc);
    const updated = (snap.data()?.names || []).map((c: any) => names.includes(c.name) ? { ...c, isArchived: archive } : c);
    await setDoc(categoriesDoc, { names: updated });
    return updated;
};

export const getClients = async () => {
    const snap = await getDocs(query(clientsCollection, orderBy('name')));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};

export const updateClient = (id: string, data: any) => updateDoc(doc(clientsCollection, id), data);

export const deleteClient = (id: string) => deleteDoc(doc(clientsCollection, id));

export const getOrdersByClientId = async (id: string) => {
    const q = query(ordersCollection, where('customer.whatsapp', '==', id.replace(/\D/g, '')));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const syncClientStats = async (id: string) => {
    const clientId = id.replace(/\D/g, '');
    const ordersSnap = await getDocs(query(ordersCollection, where('customer.whatsapp', '==', clientId)));
    
    const revenueStatuses = ['confirmed', 'shipped', 'completed'];
    const validOrders = ordersSnap.docs
        .map(d => d.data() as Order)
        .filter(o => revenueStatuses.includes(o.status));
    
    const totalSpent = validOrders.reduce((acc, o) => acc + (o.total || 0) + (o.deliveryFee || 0), 0);
    const totalOrders = validOrders.length;

    await updateDoc(doc(db, 'clients', clientId), {
        totalSpent,
        totalOrders,
        lastUpdated: serverTimestamp()
    });
};
