import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import { getOrders, updateOrderStatus, updateOrderDeliveryFee } from '../services/menuService';
import { SearchIcon } from './IconComponents';

type StatusFilter = 'all' | 'new' | 'confirmed' | 'completed' | 'archived';

const OrdersView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('new');
    const [searchQuery, setSearchQuery] = useState('');
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
        let tempOrders = orders;

        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase().trim();
            const numericQuery = lowercasedQuery.replace(/\D/g, '');

            tempOrders = tempOrders.filter(o => {
                const matchesOrderNumber = o.orderNumber.toString().includes(lowercasedQuery);
                const matchesCustomerName = o.customer.name.toLowerCase().includes(lowercasedQuery);
                const matchesWhatsapp = o.customer.whatsapp.includes(numericQuery);
                return matchesOrderNumber || matchesCustomerName || matchesWhatsapp;
            });
        }

        if (statusFilter !== 'all') {
            tempOrders = tempOrders.filter(o => o.status === statusFilter);
        }

        setFilteredOrders(tempOrders);
    }, [orders, statusFilter, searchQuery]);
    
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
    
    const handleDeliveryFeeUpdate = async (orderId: string, fee: number) => {
        await updateOrderDeliveryFee(orderId, fee);
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, deliveryFee: fee, total: o.total } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, deliveryFee: fee } : null);
        }
    };

    const statusPill = (status: Order['status']) => {
        const styles = {
            new: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            archived: 'bg-gray-100 text-gray-800',
        };
        const text = {
            new: 'Novo',
            confirmed: 'Confirmado',
            completed: 'Finalizado',
            archived: 'Arquivado'
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
      const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee ? String(order.deliveryFee) : '');
      const [isSavingFee, setIsSavingFee] = useState(false);
      const [isNotifying, setIsNotifying] = useState(false);
      const [notificationMessage, setNotificationMessage] = useState('');

      const feeAsNumber = parseFloat(deliveryFee) || 0;
      const totalWithFee = order.total + (order.deliveryFee || feeAsNumber);

      const handleSaveFee = async () => {
          setIsSavingFee(true);
          setNotificationMessage('');
          try {
              await handleDeliveryFeeUpdate(order.id, feeAsNumber);
              setNotificationMessage('Valor do frete salvo com sucesso!');
          } catch (err) {
              setNotificationMessage('Erro ao salvar o valor do frete.');
          } finally {
              setIsSavingFee(false);
              setTimeout(() => setNotificationMessage(''), 3000);
          }
      };

      const handleNotifyTelegram = async () => {
          const feeToNotify = order.deliveryFee ?? feeAsNumber;
          if (feeToNotify <= 0 && deliveryFee === '') {
              alert("Por favor, adicione e salve um valor de frete antes de notificar.");
              return;
          }
          
          setIsNotifying(true);
          setNotificationMessage('');
          
          try {
              const response = await fetch('/api/notify-delivery-fee', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      order: { ...order, deliveryFee: feeToNotify }
                  }),
              });
              
              if (!response.ok) throw new Error('Falha ao enviar notificação');

              setNotificationMessage('Link de notificação enviado para o Telegram!');
          } catch (error) {
              console.error('Falha ao notificar no Telegram:', error);
              setNotificationMessage('Erro ao enviar notificação.');
          } finally {
              setIsNotifying(false);
              setTimeout(() => setNotificationMessage(''), 3000);
          }
      };


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

                <div className="border-t pt-4 space-y-2">
                    <label htmlFor="deliveryFee" className="font-bold">Valor do Envio (R$)</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="deliveryFee"
                            type="number"
                            step="0.01"
                            value={deliveryFee}
                            onChange={(e) => setDeliveryFee(e.target.value)}
                            className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                            placeholder="Ex: 15.50"
                        />
                        <button
                            onClick={handleSaveFee}
                            disabled={isSavingFee}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {isSavingFee ? 'Salvando...' : 'Salvar Frete'}
                        </button>
                    </div>
                </div>

                <div className="space-y-1 text-right border-t pt-4">
                    <div className="flex justify-between font-medium text-gray-600">
                        <span>Subtotal:</span>
                        <span>{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-600">
                        <span>Envio:</span>
                        <span>{formatPrice(order.deliveryFee || feeAsNumber)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl text-brand-primary">
                        <span>Total Final:</span>
                        <span>{formatPrice(totalWithFee)}</span>
                    </div>
                </div>

                {notificationMessage && <p className="text-center text-sm text-green-600 font-semibold">{notificationMessage}</p>}
            </div>
            <div className="p-4 border-t mt-auto flex justify-between items-center flex-wrap gap-2">
                <div>
                    {(order.status === 'new' || order.status === 'confirmed') && (
                        <button
                            onClick={() => {
                                handleStatusChange(order.id, 'archived');
                                onClose();
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                        >
                            Arquivar (Não Pago)
                        </button>
                    )}
                </div>
                <div className="flex justify-end gap-2 flex-wrap">
                    <button
                        onClick={handleNotifyTelegram}
                        disabled={isNotifying}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50"
                    >
                        {isNotifying ? 'Gerando...' : 'Notificar Frete no Telegram'}
                    </button>
                    {order.status === 'new' && <button onClick={() => handleStatusChange(order.id, 'confirmed')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Confirmar Pedido</button>}
                    {order.status === 'confirmed' && <button onClick={() => handleStatusChange(order.id, 'completed')} className="px-4 py-2 bg-green-500 text-white rounded-lg">Finalizar Pedido</button>}
                </div>
            </div>
          </div>
        </div>
      );
    }

    if (isLoading) return <p>Carregando pedidos...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                 <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nº do pedido, nome ou WhatsApp..."
                        className="w-full bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterButton filter="new" label="Novos" />
                    <FilterButton filter="confirmed" label="Confirmados" />
                    <FilterButton filter="completed" label="Finalizados" />
                    <FilterButton filter="archived" label="Arquivados" />
                    <FilterButton filter="all" label="Todos" />
                </div>
            </div>

            {filteredOrders.length > 0 ? (
                <>
                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-lg shadow active:bg-gray-50 transition-colors" onClick={() => setSelectedOrder(order)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-brand-primary">#{order.orderNumber}</p>
                                        <p className="text-gray-800 mt-1">{order.customer.name}</p>
                                    </div>
                                    {statusPill(order.status)}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                                    <span className="text-gray-500">
                                        Entrega: {new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="font-bold text-brand-text">
                                        {(order.total + (order.deliveryFee || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                                            <td className="px-6 py-4">{(order.total + (order.deliveryFee || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                            <td className="px-6 py-4">{statusPill(order.status)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setSelectedOrder(order)} className="font-medium text-brand-primary hover:underline">Ver</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-lg shadow text-center p-8">
                    <p className="text-gray-500">Nenhum pedido encontrado com este status.</p>
                </div>
            )}
            
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default OrdersView;