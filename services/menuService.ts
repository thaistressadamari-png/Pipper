
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
    onSnapshot
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

export const initializeFirebaseData = async () => {
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
        const batch = writeBatch(db);
        batch.set(storeInfoDoc, initialStoreInfo);
        batch.set(categoriesDoc, { names: [{ name: 'Pronta entrega', isArchived: false }] });
        batch.set(countersDoc, { orderNumber: 1000 }); 
        await batch.commit();
    }
};

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

export const getMenu = async (): Promise<{ products: Product[], categories: CategoryMetadata[] }> => {
    const productsQuery = query(productsCollection);
    const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(productsQuery),
        getDoc(categoriesDoc)
    ]);
    const products: Product[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Product) } as Product));
    const categories = (categoriesSnapshot.data() as { names: CategoryMetadata[] })?.names || [];
    return { products, categories };
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Pedido não encontrado");
        transaction.update(orderRef, { status, updatedAt: serverTimestamp() });
    });
};

export const processOrderCheckout = async (orderId: string, deliveryFee: number, paymentLink: string, shouldNotifyTelegram: boolean = false): Promise<void> => {
    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Pedido não encontrado");
        transaction.update(orderRef, {
            deliveryFee,
            paymentLink,
            status: 'pending_payment' as const,
            updatedAt: serverTimestamp()
        });
    });
};

export const addOrder = async (
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'>, 
    saveAddress: boolean = true,
    shouldNotifyTelegram: boolean = false
): Promise<Order> => {
    const orderRef = doc(collection(db, 'orders'));
    const counterRef = doc(db, 'metadata', 'counters');
    
    const result = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const counterData = counterDoc.data() as any;
        const newOrderNumber = counterDoc.exists() ? counterData.orderNumber + 1 : 1001;
        const now = Timestamp.now();
        const fullOrderData = {
            ...orderData,
            orderNumber: newOrderNumber,
            status: 'new' as const,
            inventoryReduced: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        transaction.set(counterRef, { orderNumber: newOrderNumber }, { merge: true });
        transaction.set(orderRef, fullOrderData);
        return { ...fullOrderData, id: orderRef.id, createdAt: now, updatedAt: now } as Order;
    });

    if (shouldNotifyTelegram) {
        const cleanOrder = JSON.parse(JSON.stringify(result));
        fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: cleanOrder }),
        }).catch(err => console.error("Erro Telegram:", err));
    }

    return result;
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Order) } as Order));
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const snap = await getDoc(doc(ordersCollection, orderId));
    return snap.exists() ? { id: snap.id, ...(snap.data() as Order) } as Order : null;
};

export const getClient = async (whatsapp: string): Promise<Client | null> => {
    const rawWhatsapp = whatsapp.replace(/\D/g, '');
    const q = query(clientsCollection, where('whatsapp', '==', rawWhatsapp));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as Client) } as Client;
};

export const removeClientAddress = async (clientId: string, address: DeliveryInfo['address']): Promise<void> => {
    await updateDoc(doc(clientsCollection, clientId), { 
        addresses: arrayRemove(address) 
    });
};

export const getOrdersByWhatsapp = async (whatsapp: string): Promise<Order[]> => {
    const raw = whatsapp.replace(/\D/g, '');
    if (!raw) return [];
    
    // Gera as variações de formatação para buscar no banco
    const formatted11 = raw.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    const formatted10 = raw.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    
    // Lista de termos para busca (limpo + formatos possíveis)
    const searchTerms = [raw, formatted11, formatted10].filter((v, i, a) => a.indexOf(v) === i);

    const q = query(ordersCollection, where('customer.whatsapp', 'in', searchTerms));
    const snap = await getDocs(q);
    
    // Filtra para remover finalizados e arquivados da visão do cliente
    return snap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Order) } as Order))
        .filter(order => order.status !== 'completed' && order.status !== 'archived')
        .sort((a,b) => b.orderNumber - a.orderNumber);
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

export const subscribeToNewOrders = (callback: (count: number, addedOrders: Order[]) => void) => {
    const q = query(ordersCollection, where('status', '==', 'new'));
    return onSnapshot(q, (snapshot) => {
        const addedOrders: Order[] = [];
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                addedOrders.push({ id: change.doc.id, ...change.doc.data() } as Order);
            }
        });
        callback(snapshot.size, addedOrders);
    });
};

export const getOrdersByDateRange = async (start: Date, end: Date): Promise<Order[]> => {
    const q = query(ordersCollection, where('createdAt', '>=', start), where('createdAt', '<=', end));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Order) } as Order));
};

export const getVisitCountByDateRange = async (start: Date, end: Date): Promise<number> => {
    const q = query(dailyVisitsCollection, where(documentId(), '>=', start.toISOString().split('T')[0]), where(documentId(), '<=', end.toISOString().split('T')[0]));
    const snap = await getDocs(q);
    let total = 0;
    snap.forEach(d => total += (d.data() as { count: number }).count || 0);
    return total;
};

export const updateOrderPaymentLink = (id: string, link: string) => updateDoc(doc(db, 'orders', id), { paymentLink: link });

export const addCategory = async (name: string): Promise<CategoryMetadata[]> => {
    const snap = await getDoc(categoriesDoc);
    const cats = (snap.data() as { names: CategoryMetadata[] })?.names || [];
    if (!cats.find((c: CategoryMetadata) => c.name === name)) {
        const updated = [...cats, { name, isArchived: false }];
        await setDoc(categoriesDoc, { names: updated });
        return updated;
    }
    return cats;
};

export const deleteCategory = async (name: string): Promise<CategoryMetadata[]> => {
    const snap = await getDoc(categoriesDoc);
    const cats = (snap.data() as { names: CategoryMetadata[] })?.names || [];
    const filtered = cats.filter((c: CategoryMetadata) => c.name !== name);
    await setDoc(categoriesDoc, { names: filtered });
    return filtered;
};

export const updateCategoryOrder = (order: any) => setDoc(categoriesDoc, { names: order });

export const toggleCategoriesArchive = async (names: string[], archive: boolean) => {
    const snap = await getDoc(categoriesDoc);
    const updated = ((snap.data() as { names: any[] })?.names || []).map((c: any) => names.includes(c.name) ? { ...c, isArchived: archive } : c);
    await setDoc(categoriesDoc, { names: updated });
    return updated;
};

export const getClients = async () => {
    const snap = await getDocs(query(clientsCollection, orderBy('name')));
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Client) } as Client));
};

export const updateClient = (id: string, data: any) => updateDoc(doc(clientsCollection, id), data);

export const deleteClient = (id: string) => deleteDoc(doc(clientsCollection, id));

export const getOrdersByClientId = async (id: string) => {
    const q = query(ordersCollection, where('customer.name', '==', id));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Order) } as Order));
};
