import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import { getOrders, updateOrderStatus } from '../services/menuService';

type StatusFilter = 'all' | 'new' | 'confirmed' | 'completed';

const OrdersView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('new');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const fetchedOrders = await getOrders();
                setOrders(fetchedOrders);
            } catch (err) {
                setError('Falha ao carregar os pedidos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, []);

    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredOrders(orders);
        } else {
            setFilteredOrders(orders.filter(o => o.status === statusFilter));
        }
    }, [orders, statusFilter]);
    
    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => prev ? {...prev, status: newStatus} : null);
            }
        } catch (err) {
            alert('Falha ao atualizar o status do pedido.');
        }
    };
    
    const statusPill = (status: Order['status']) => {
        const styles = {
            new: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
        };
        const text = {
            new: 'Novo',
            confirmed: 'Confirmado',
            completed: 'Finalizado'
        }
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
    };
    
    const FilterButton: React.FC<{ filter: StatusFilter, label: string }> = ({ filter, label }) => (
        <button
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${statusFilter === filter ? 'bg-brand-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
            {label}
        </button>
    );

    const OrderDetailModal: React.FC<{ order: Order, onClose: () => void }> = ({ order, onClose }) => {
      const formatPrice = (price: number) => price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-bold text-brand-text">Detalhes do Pedido #{order.orderNumber}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">&times;</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
                <p><strong>Status:</strong> {statusPill(order.status)}</p>
                <p><strong>Cliente:</strong> {order.customer.name}</p>
                <p><strong>WhatsApp:</strong> {order.customer.whatsapp}</p>
                <p><strong>Data de Entrega:</strong> {new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                <p><strong>Endereço:</strong> {`${order.delivery.address.street}, ${order.delivery.address.number} - ${order.delivery.address.neighborhood}`}</p>
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Itens:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {order.items.map(item => <li key={item.id}>{item.quantity}x {item.name}</li>)}
                    </ul>
                </div>
                <p className="font-bold text-right text-lg">Total: {formatPrice(order.total)}</p>
            </div>
            <div className="p-4 border-t mt-auto flex justify-end gap-2">
                 {order.status === 'new' && <button onClick={() => handleStatusChange(order.id, 'confirmed')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Marcar como Confirmado</button>}
                 {order.status === 'confirmed' && <button onClick={() => handleStatusChange(order.id, 'completed')} className="px-4 py-2 bg-green-500 text-white rounded-lg">Marcar como Finalizado</button>}
            </div>
          </div>
        </div>
      );
    }

    if (isLoading) return <p>Carregando pedidos...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-2">
                <FilterButton filter="new" label="Novos" />
                <FilterButton filter="confirmed" label="Confirmados" />
                <FilterButton filter="completed" label="Finalizados" />
                <FilterButton filter="all" label="Todos" />
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">#</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Data Entrega</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-bold text-brand-primary whitespace-nowrap">#{order.orderNumber}</th>
                                    <td className="px-6 py-4">{order.customer.name}</td>
                                    <td className="px-6 py-4">{new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4">{order.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                    <td className="px-6 py-4">{statusPill(order.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setSelectedOrder(order)} className="font-medium text-brand-primary hover:underline">Ver</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredOrders.length === 0 && <p className="text-center p-8 text-gray-500">Nenhum pedido encontrado com este status.</p>}
            </div>
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default OrdersView;