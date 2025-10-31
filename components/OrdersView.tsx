import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order } from '../types';
import { getOrders, updateOrderStatus, updateOrderDeliveryFee, updateOrderPaymentLink } from '../services/menuService';
import { SearchIcon } from './IconComponents';

const OrderCard: React.FC<{
    order: Order;
    onStatusUpdate: (orderId: string, status: Order['status']) => Promise<void>;
    onDeliveryFeeUpdate: (orderId: string, deliveryFee: number) => Promise<void>;
    onPaymentLinkUpdate: (orderId: string, paymentLink: string) => Promise<void>;
}> = ({ order, onStatusUpdate, onDeliveryFeeUpdate, onPaymentLinkUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState<string>(order.deliveryFee?.toString() || '');
    const [paymentLink, setPaymentLink] = useState<string>(order.paymentLink || '');
    const [isFeeSubmitting, setIsFeeSubmitting] = useState(false);
    const [isLinkSubmitting, setIsLinkSubmitting] = useState(false);

    const formatPrice = (price: number) => (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleString('pt-BR');
    };
    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
    };

    const handleFeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fee = parseFloat(deliveryFee);
        if (isNaN(fee)) return;
        setIsFeeSubmitting(true);
        await onDeliveryFeeUpdate(order.id, fee);
        setIsFeeSubmitting(false);
    };
    
    const handleLinkBlur = async () => {
        if (paymentLink.trim() !== (order.paymentLink || '')) {
            setIsLinkSubmitting(true);
            await onPaymentLinkUpdate(order.id, paymentLink.trim());
            setIsLinkSubmitting(false);
        }
    };

    const totalWithFee = (order.total || 0) + (order.deliveryFee || 0);

    const actionButtons = () => {
        switch (order.status) {
            case 'new':
                return (
                    <>
                        <button onClick={() => onStatusUpdate(order.id, 'confirmed')} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Confirmar</button>
                        <button onClick={() => onStatusUpdate(order.id, 'archived')} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Arquivar</button>
                    </>
                );
            case 'confirmed':
                return (
                    <>
                        <button onClick={() => onStatusUpdate(order.id, 'completed')} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Finalizar</button>
                        <button onClick={() => onStatusUpdate(order.id, 'archived')} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Arquivar</button>
                    </>
                );
            case 'completed':
                return <button onClick={() => onStatusUpdate(order.id, 'archived')} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Arquivar</button>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow transition-shadow duration-200 hover:shadow-md">
            <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                        <p className="font-bold text-brand-primary">Pedido #{order.orderNumber}</p>
                        <p className="text-lg font-semibold text-brand-text">{order.customer?.name || 'Cliente não informado'}</p>
                        <p className="text-sm text-gray-500">{formatTimestamp(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-brand-text">{formatPrice(totalWithFee)}</p>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} item(s)</p>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="border-t p-4 space-y-4 bg-gray-50/50">
                    <div>
                        <h4 className="font-semibold text-brand-text">Itens</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                            {order.items?.map(item => (
                                <li key={item.id}>{item.quantity}x {item.name} {item.observations && `(${item.observations})`}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-text">Cliente</h4>
                        <p className="text-sm text-gray-600">{order.customer?.name || 'Não informado'}</p>
                        <p className="text-sm text-gray-600">{order.customer?.whatsapp || 'Não informado'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-text">Entrega</h4>
                        <p className="text-sm text-gray-600">
                            {order.delivery?.address ? `${order.delivery.address.street}, ${order.delivery.address.number} - ${order.delivery.address.neighborhood}` : 'Endereço não informado'}
                            {order.delivery?.address?.complement && `, ${order.delivery.address.complement}`}
                        </p>
                        <p className="text-sm text-gray-600">Data Agendada: {formatDisplayDate(order.deliveryDate)}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-brand-text">Pagamento</h4>
                        <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                    </div>
                    <div className="border-t pt-4">
                         <form onSubmit={handleFeeSubmit} className="flex flex-wrap items-center gap-2">
                            <label htmlFor={`deliveryFee-${order.id}`} className="text-sm font-medium text-brand-text-light">Taxa de Entrega:</label>
                            <input
                                id={`deliveryFee-${order.id}`}
                                type="number"
                                step="0.01"
                                value={deliveryFee}
                                onChange={(e) => setDeliveryFee(e.target.value)}
                                className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 text-sm"
                                placeholder="R$"
                            />
                            <button type="submit" disabled={isFeeSubmitting} className="px-3 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary-dark disabled:opacity-50">
                                {isFeeSubmitting ? 'Enviando...' : 'Enviar'}
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-1">"Enviar" a taxa irá notificar o admin no Telegram para confirmar o pedido com o cliente.</p>
                    </div>
                    <div className="pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <label htmlFor={`paymentLink-${order.id}`} className="text-sm font-medium text-brand-text-light">Link de Pagamento:</label>
                            <input
                                id={`paymentLink-${order.id}`}
                                type="url"
                                value={paymentLink}
                                onChange={(e) => setPaymentLink(e.target.value)}
                                onBlur={handleLinkBlur}
                                className="flex-grow px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 text-sm"
                                placeholder="https://..."
                                disabled={isLinkSubmitting}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">O link será salvo automaticamente e incluído na mensagem de resumo ao enviar a taxa de entrega.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                        {actionButtons()}
                    </div>
                </div>
            )}
        </div>
    );
};


const OrdersView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Order['status']>('new');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
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

    const handleDeliveryFeeUpdate = async (orderId: string, deliveryFee: number) => {
        try {
            await updateOrderDeliveryFee(orderId, deliveryFee);
            const updatedOrder = orders.find(o => o.id === orderId);
            
            if (updatedOrder) {
                await fetch('/api/notify-delivery-fee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: { ...updatedOrder, deliveryFee } }),
                });
            }
            fetchOrders();
            
        } catch (e) {
            console.error("Failed to update delivery fee", e);
            alert("Erro ao atualizar a taxa de entrega.");
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
    
    const tabs: { key: Order['status']; label: string }[] = [
        { key: 'new', label: 'Novos' },
        { key: 'confirmed', label: 'Confirmados' },
        { key: 'completed', label: 'Finalizados' },
        { key: 'archived', label: 'Arquivados' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
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
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`whitespace-nowrap px-1 py-3 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
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
                <div className="space-y-4">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onStatusUpdate={handleStatusUpdate}
                                onDeliveryFeeUpdate={handleDeliveryFeeUpdate}
                                onPaymentLinkUpdate={handlePaymentLinkUpdate}
                            />
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <p>Nenhum pedido encontrado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrdersView;