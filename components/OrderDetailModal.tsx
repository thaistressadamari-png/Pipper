import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import { XIcon } from './IconComponents';

interface OrderDetailModalProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (orderId: string, status: Order['status']) => Promise<void>;
    onCheckoutAction: (order: Order, deliveryFee: number, paymentLink: string) => Promise<void>;
    onPaymentLinkUpdate: (orderId: string, paymentLink: string) => Promise<void>;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose, onStatusUpdate, onCheckoutAction, onPaymentLinkUpdate }) => {
    const [deliveryFee, setDeliveryFee] = useState<string>('');
    const [paymentLink, setPaymentLink] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (order) {
            setDeliveryFee(order.deliveryFee?.toString() || '');
            setPaymentLink(order.paymentLink || '');
        }
    }, [order]);

    if (!isOpen || !order) return null;

    const formatPrice = (price: number) => (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
    };
    
    const handleLinkBlur = async () => {
        if (paymentLink.trim() !== (order.paymentLink || '')) {
            await onPaymentLinkUpdate(order.id, paymentLink.trim());
        }
    };
    
    const handleActionClick = async (action: () => Promise<void>) => {
        setIsSubmitting(true);
        await action();
        setIsSubmitting(false);
        onClose();
    };

    const handleCheckoutClick = async () => {
        const fee = parseFloat(deliveryFee);
        if (isNaN(fee)) {
            alert("Por favor, insira uma taxa de entrega válida.");
            return;
        }
        await handleActionClick(() => onCheckoutAction(order, fee, paymentLink));
    };

    const totalWithFee = (order.total || 0) + parseFloat(deliveryFee || '0');

    const actionButtons = () => {
        switch (order.status) {
            case 'new':
                return (
                    <>
                        <button onClick={handleCheckoutClick} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">Checkout</button>
                        <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Arquivar</button>
                    </>
                );
            case 'pending_payment':
                return (
                    <>
                        <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'confirmed'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">Confirmar Pagamento</button>
                        <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Arquivar</button>
                    </>
                );
            case 'confirmed':
                return (
                    <>
                        <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'completed'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">Finalizar</button>
                        <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Arquivar</button>
                    </>
                );
            case 'completed':
                return <button onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Arquivar</button>;
            default:
                return null;
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
                    <header className="flex items-center justify-between p-4 border-b">
                        <div>
                            <p className="font-bold text-brand-primary">Pedido #{order.orderNumber}</p>
                            <h3 className="text-xl font-bold text-brand-text">{order.customer?.name}</h3>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                          <XIcon className="w-5 h-5 text-gray-600" />
                        </button>
                    </header>
                    <main className="overflow-y-auto p-4 space-y-4">
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
                            <p className="text-sm text-gray-600 mb-2">{order.paymentMethod}</p>
                            <div className="text-sm border-t pt-2 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium text-gray-800">{formatPrice(order.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Frete</span>
                                    <span className="font-medium text-gray-800">{formatPrice(parseFloat(deliveryFee || '0'))}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg text-brand-text mt-2 pt-2 border-t">
                                    <span>Total</span>
                                    <span>{formatPrice(totalWithFee)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t pt-4">
                             <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                        </div>
                        <div className="pt-2">
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
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">O link será salvo automaticamente ao sair do campo e incluído na mensagem de checkout.</p>
                        </div>
                    </main>
                    <footer className="flex flex-wrap items-center justify-end gap-2 border-t p-4 bg-gray-50">
                        {actionButtons()}
                    </footer>
                </div>
            </div>
        </>
    );
};

export default OrderDetailModal;