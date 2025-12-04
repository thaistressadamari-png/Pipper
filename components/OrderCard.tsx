
import React from 'react';
import type { Order } from '../types';

interface OrderCardProps {
    order: Order;
    onCardClick: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onCardClick }) => {
    const formatPrice = (price: number) => (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    const totalWithFee = (order.total || 0) + (order.deliveryFee || 0);

    const statusInfo: { [key in Order['status']]: { text: string; color: string } } = {
        new: { text: 'Novo', color: 'bg-yellow-100 text-yellow-800' },
        pending_payment: { text: 'Pendente', color: 'bg-orange-100 text-orange-800' },
        confirmed: { text: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
        shipped: { text: 'Enviado', color: 'bg-indigo-100 text-indigo-800' },
        completed: { text: 'Finalizado', color: 'bg-green-100 text-green-800' },
        archived: { text: 'Arquivado', color: 'bg-gray-100 text-gray-800' },
    };

    // Construct item summary string
    const itemsSummary = order.items.map(item => {
        const optionText = item.option ? `(${item.option})` : '';
        return `${item.quantity}x ${item.name} ${optionText}`;
    }).join(', ');

    return (
        <button
            onClick={() => onCardClick(order)}
            className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-4 group"
        >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                {/* Left Side (Mobile: Top) */}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start sm:block">
                        <p className="font-bold text-brand-primary text-sm">#{order.orderNumber}</p>
                        <span className={`sm:hidden px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {statusInfo[order.status]?.text || order.status}
                        </span>
                    </div>
                    
                    <p className="text-lg font-bold text-brand-text mt-1 leading-tight truncate">
                        {order.customer?.name || 'Cliente não informado'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        {formatTimestamp(order.createdAt)}
                    </p>

                    {/* Order Summary */}
                    <div className="mt-2 bg-gray-50 rounded p-2 border border-gray-100 group-hover:bg-brand-secondary/10 transition-colors">
                        <p className="text-sm text-gray-600 line-clamp-2 leading-snug">
                            <span className="font-medium text-gray-700">Resumo: </span>
                            {itemsSummary}
                        </p>
                    </div>
                </div>

                {/* Right Side (Mobile: Bottom / Separated) */}
                <div className="pt-3 border-t border-gray-100 sm:pt-0 sm:border-t-0 sm:text-right flex flex-row sm:flex-col justify-between items-center sm:items-end flex-shrink-0">
                    
                    <div className="flex items-center gap-2 sm:justify-end sm:order-2 mt-1">
                        <span className={`hidden sm:inline-block px-2 py-0.5 rounded text-xs font-bold ${statusInfo[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {statusInfo[order.status]?.text || order.status}
                        </span>
                        <p className="text-xs text-gray-400">{order.items?.length || 0} item(s)</p>
                    </div>

                    <p className="text-xl font-bold text-brand-text sm:order-1 order-last">
                        {formatPrice(totalWithFee)}
                    </p>
                </div>
            </div>
        </button>
    );
};

export default OrderCard;
