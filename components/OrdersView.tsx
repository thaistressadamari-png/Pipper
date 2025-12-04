
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order } from '../types';
import { getOrders, updateOrderStatus, updateOrderDeliveryFee, updateOrderPaymentLink } from '../services/menuService';
import { SearchIcon } from './IconComponents';
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

    // Calculate counts for each status
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
            // Update fee and link first, if they changed.
            const updates: Promise<void>[] = [];
            if (deliveryFee !== (order.deliveryFee || 0)) {
                updates.push(updateOrderDeliveryFee(order.id, deliveryFee));
            }
            if (paymentLink !== (order.paymentLink || '')) {
                updates.push(updateOrderPaymentLink(order.id, paymentLink));
            }
            if (updates.length > 0) {
                await Promise.all(updates);
            }

            // Send notification with potentially updated info
            await fetch('/api/notify-delivery-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: { ...order, deliveryFee, paymentLink } }),
            });

            // Finally, update status and refetch
            await updateOrderStatus(order.id, 'pending_payment');
            fetchOrders();
        } catch (e) {
            console.error("Failed to process checkout action", e);
            alert("Erro ao processar o checkout do pedido.");
        }
    };
    
    const tabs: { key: Order['status']; label: string; showCount: boolean }[] = [
        { key: 'new', label: 'Novos', showCount: true },
        { key: 'pending_payment', label: 'Pagamento Pendente', showCount: true },
        { key: 'confirmed', label: 'Confirmados', showCount: true },
        { key: 'shipped', label: 'Enviado', showCount: true },
        { key: 'completed', label: 'Finalizados', showCount: false },
        { key: 'archived', label: 'Arquivados', showCount: false },
    ];

    const getTabLabel = (tab: typeof tabs[0]) => {
        if (tab.showCount && statusCounts[tab.key] > 0) {
            return `${tab.label} (${statusCounts[tab.key]})`;
        }
        return tab.label;
    };

    return (
        <div className="space-y-6">
            <div className={`bg-white p-4 rounded-lg shadow-sm space-y-4 ${selectedOrder ? 'hidden sm:block' : 'block'}`}>
                 <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nº do pedido ou nome..."
                        className="w-full bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                
                {/* Mobile: Custom Styled Dropdown Select */}
                <div className="sm:hidden">
                    <label htmlFor="status-tabs" className="sr-only">Selecione o status</label>
                    <div className="relative">
                        <select
                            id="status-tabs"
                            className="block w-full appearance-none bg-white border border-gray-300 hover:border-brand-primary px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-700 font-medium transition-colors cursor-pointer"
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as Order['status'])}
                        >
                            {tabs.map((tab) => (
                                <option key={tab.key} value={tab.key}>
                                    {getTabLabel(tab)}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Desktop: Horizontal Tabs */}
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
                                {tab.label}
                                {tab.showCount && statusCounts[tab.key] > 0 && (
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
                <p className="text-center text-gray-500 py-8">Carregando pedidos...</p>
            ) : error ? (
                <p className="text-center text-red-500 py-8">{error}</p>
            ) : (
                <div className={`space-y-4 ${selectedOrder ? 'hidden sm:block' : 'block'}`}>
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onCardClick={setSelectedOrder}
                            />
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-8 bg-white rounded-lg border border-dashed border-gray-300">
                            <p>Nenhum pedido nesta categoria.</p>
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
