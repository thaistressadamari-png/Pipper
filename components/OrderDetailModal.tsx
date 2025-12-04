
import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import { XIcon, ArrowLeftIcon } from './IconComponents';

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

    // Helper for buttons to ensure consistent styling
    const ActionBtn = ({ onClick, colorClass, children }: { onClick: () => void, colorClass: string, children: React.ReactNode }) => (
        <button 
            onClick={onClick} 
            disabled={isSubmitting} 
            className={`w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${colorClass}`}
        >
            {children}
        </button>
    );

    const actionButtons = () => {
        switch (order.status) {
            case 'new':
                return (
                    <>
                        <ActionBtn onClick={handleCheckoutClick} colorClass="text-white bg-green-600 hover:bg-green-700">
                            Checkout
                        </ActionBtn>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} colorClass="text-gray-700 bg-gray-100 hover:bg-gray-200">
                            Arquivar
                        </ActionBtn>
                    </>
                );
            case 'pending_payment':
                return (
                    <>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'confirmed'))} colorClass="text-white bg-blue-600 hover:bg-blue-700">
                            Confirmar Pagamento
                        </ActionBtn>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} colorClass="text-gray-700 bg-gray-100 hover:bg-gray-200">
                            Arquivar
                        </ActionBtn>
                    </>
                );
            case 'confirmed':
                return (
                    <>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'shipped'))} colorClass="text-white bg-indigo-600 hover:bg-indigo-700">
                            Enviar Entrega
                        </ActionBtn>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} colorClass="text-gray-700 bg-gray-100 hover:bg-gray-200">
                            Arquivar
                        </ActionBtn>
                    </>
                );
            case 'shipped':
                return (
                    <>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'completed'))} colorClass="text-white bg-green-600 hover:bg-green-700">
                            Finalizar Pedido
                        </ActionBtn>
                        <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} colorClass="text-gray-700 bg-gray-100 hover:bg-gray-200">
                            Arquivar
                        </ActionBtn>
                    </>
                );
            case 'completed':
                return (
                    <ActionBtn onClick={() => handleActionClick(() => onStatusUpdate(order.id, 'archived'))} colorClass="text-gray-700 bg-gray-100 hover:bg-gray-200">
                        Arquivar
                    </ActionBtn>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
                    <div className="p-6 space-y-6">
                        <header className="flex items-center justify-between border-b pb-4">
                            <div>
                                <p className="text-xs font-bold text-brand-primary uppercase tracking-wide">Pedido #{order.orderNumber}</p>
                                <h3 className="text-lg font-bold text-brand-text truncate max-w-[250px]">{order.customer?.name}</h3>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                                <XIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        </header>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <h4 className="font-bold text-sm text-gray-700 mb-2">Itens do Pedido</h4>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    {order.items?.map((item, index) => (
                                        <li key={index} className="flex justify-between items-start">
                                            <span>
                                                <span className="font-bold text-gray-800">{item.quantity}x</span> {item.name}
                                                {item.option && <span className="text-gray-500 text-xs block">{item.option}</span>}
                                                {item.observations && <span className="text-amber-600 text-xs block italic bg-amber-50 px-1 rounded mt-0.5">Obs: {item.observations}</span>}
                                            </span>
                                            <span className="font-medium text-gray-900 whitespace-nowrap">
                                                {formatPrice(item.price * item.quantity)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-bold text-xs text-gray-400 uppercase mb-1">Cliente</h4>
                                    <p className="text-sm font-medium text-gray-800">{order.customer?.name}</p>
                                    <a href={`tel:${order.customer?.whatsapp}`} className="text-sm text-brand-primary hover:underline">{order.customer?.whatsapp}</a>
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs text-gray-400 uppercase mb-1">Pagamento</h4>
                                    <p className="text-sm font-medium text-gray-800">{order.paymentMethod}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <h4 className="font-bold text-xs text-gray-400 uppercase mb-1">Entrega</h4>
                                    <p className="text-sm text-gray-800 leading-snug bg-blue-50 p-2 rounded border border-blue-100">
                                        {order.delivery?.address ? `${order.delivery.address.street}, ${order.delivery.address.number}` : 'Endereço não informado'}
                                        <br/>
                                        {order.delivery?.address?.neighborhood}
                                        {order.delivery?.address?.complement && ` - ${order.delivery.address.complement}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Agendado para: <span className="font-semibold text-gray-700">{formatDisplayDate(order.deliveryDate)}</span></p>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <label htmlFor={`deliveryFee-${order.id}`} className="text-sm font-bold text-gray-700 min-w-[120px]">Taxa de Entrega:</label>
                                    <div className="relative flex-grow">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                        <input
                                            id={`deliveryFee-${order.id}`}
                                            type="number"
                                            step="0.01"
                                            value={deliveryFee}
                                            onChange={(e) => setDeliveryFee(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm font-medium"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                    <label htmlFor={`paymentLink-${order.id}`} className="text-sm font-bold text-gray-700">Link de Pagamento:</label>
                                    <input
                                        id={`paymentLink-${order.id}`}
                                        type="url"
                                        value={paymentLink}
                                        onChange={(e) => setPaymentLink(e.target.value)}
                                        onBlur={handleLinkBlur}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm text-gray-600"
                                        placeholder="Cole o link aqui"
                                    />
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg space-y-1 mt-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(order.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Frete</span>
                                        <span>{formatPrice(parseFloat(deliveryFee || '0'))}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-brand-text border-t border-gray-200 pt-2 mt-1">
                                        <span>Total</span>
                                        <span>{formatPrice(totalWithFee)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
                            {actionButtons()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OrderDetailModal;
