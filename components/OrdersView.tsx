
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order } from '../types';
import { getOrders, updateOrderStatus, updateOrderPaymentLink, processOrderCheckout } from '../services/menuService';
// Added SpinnerIcon to imports
import { SearchIcon, ClockIcon, ChefHatIcon, BikeIcon, CheckCircleIcon, ClipboardListIcon, SpinnerIcon } from './IconComponents';
import OrderCard from './OrderCard';
import OrderDetailModal from './OrderDetailModal';

const OrdersView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Order['status']>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            const fetchedOrders = await getOrders();
            setOrders(fetchedOrders);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar os pedidos.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const statusCounts = useMemo(() => {
        const counts = {
            new: 0,
            pending_payment: 0,
            confirmed: 0,
            shipped: 0,
            completed: 0,
            archived: 0
        };
        orders.forEach(o => {
            if (Object.prototype.hasOwnProperty.call(counts, o.status)) {
                counts[o.status]++;
            }
        });
        return counts;
    }, [orders]);
    
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesTab = order.status === activeTab;
            if (!matchesTab) return false;

            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;

            const matchesQuery = 
                (order.orderNumber?.toString() || '').includes(query) ||
                (order.customer?.name || '').toLowerCase().includes(query);
            
            return matchesQuery;
        });
    }, [orders, activeTab, searchQuery]);

    const handleStatusUpdate = async (orderId: string, status: Order['status']) => {
        try {
            await updateOrderStatus(orderId, status);
            fetchOrders();
        } catch (e) {
            console.error("Failed to update status", e);
            alert("Erro ao atualizar o status do pedido.");
        }
    };

    const handlePaymentLinkUpdate = async (orderId: string, paymentLink: string) => {
        try {
            await updateOrderPaymentLink(orderId, paymentLink);
            fetchOrders();
        } catch (e) {
            console.error("Failed to update payment link", e);
            alert("Erro ao atualizar o link de pagamento.");
        }
    };
    
    const handleCheckoutAction = async (order: Order, deliveryFee: number, paymentLink: string) => {
        try {
            const isManualOrder = order.customer.whatsapp === '00000000000';
            await processOrderCheckout(order.id, deliveryFee, paymentLink, !isManualOrder);
            fetchOrders();
        } catch (e: any) {
            console.error("Failed to process checkout action", e);
            alert(e.message || "Erro ao processar o checkout do pedido.");
        }
    };
    
    const tabs: { key: Order['status']; label: string; icon: React.ReactNode; color: string }[] = [
        { key: 'new', label: 'Novos', icon: <ClockIcon className="w-4 h-4" />, color: 'bg-yellow-500' },
        { key: 'pending_payment', label: 'Pagamento', icon: <ClipboardListIcon className="w-4 h-4" />, color: 'bg-orange-500' },
        { key: 'confirmed', label: 'Preparo', icon: <ChefHatIcon className="w-4 h-4" />, color: 'bg-blue-500' },
        { key: 'shipped', label: 'Enviado', icon: <BikeIcon className="w-4 h-4" />, color: 'bg-indigo-500' },
        { key: 'completed', label: 'Feitos', icon: <CheckCircleIcon className="w-4 h-4" />, color: 'bg-green-500' },
        { key: 'archived', label: 'Arquivo', icon: <SearchIcon className="w-4 h-4" />, color: 'bg-gray-500' },
    ];

    return (
        <div className="space-y-6">
            <div className={`bg-white p-4 rounded-xl shadow-sm space-y-4 ${selectedOrder ? 'hidden sm:block' : 'block'}`}>
                 <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nº do pedido ou nome..."
                        className="w-full bg-gray-50 border-transparent rounded-full py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                
                {/* Mobile Triage Menu (Pills Style) */}
                <div className="sm:hidden -mx-4 px-4 overflow-x-auto no-scrollbar">
                    <div className="flex space-x-2 pb-1">
                        {tabs.map((tab) => {
                            const count = statusCounts[tab.key];
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all duration-200 relative ${
                                        isActive 
                                        ? 'bg-brand-primary text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    <span className={isActive ? 'text-white' : 'text-gray-400'}>{tab.icon}</span>
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black shadow-sm ${
                                            isActive ? 'bg-white text-brand-primary' : `${tab.color} text-white`
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden sm:block border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`whitespace-nowrap px-3 py-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                                    activeTab === tab.key
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span className="opacity-70">{tab.icon}</span>
                                {tab.label}
                                {statusCounts[tab.key] > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        activeTab === tab.key ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {statusCounts[tab.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <SpinnerIcon className="w-10 h-10 text-brand-primary" />
                    <p className="text-gray-400 mt-4 font-bold text-sm animate-pulse">Sincronizando pedidos...</p>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-10 bg-red-50 rounded-xl border border-red-100 mx-4">
                    {error}
                </div>
            ) : (
                <div className={`space-y-4 px-1 ${selectedOrder ? 'hidden sm:block' : 'block'}`}>
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onCardClick={setSelectedOrder}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ClipboardListIcon className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-medium">Nenhum pedido em "{tabs.find(t => t.key === activeTab)?.label}"</p>
                            {searchQuery && <p className="text-xs text-gray-300 mt-1">Tente remover os filtros de busca</p>}
                        </div>
                    )}
                </div>
            )}

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onCheckoutAction={handleCheckoutAction}
                    onPaymentLinkUpdate={handlePaymentLinkUpdate}
                />
            )}
        </div>
    );
};

export default OrdersView;
