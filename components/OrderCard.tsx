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
        new: { text: 'Novo', color: 'bg-yellow-400' },
        pending_payment: { text: 'Pendente', color: 'bg-orange-400' },
        confirmed: { text: 'Confirmado', color: 'bg-blue-500' },
        completed: { text: 'Finalizado', color: 'bg-green-500' },
        archived: { text: 'Arquivado', color: 'bg-gray-400' },
    };

    return (
        <button
            onClick={() => onCardClick(order)}
            className="w-full text-left bg-white rounded-lg shadow transition-shadow duration-200 hover:shadow-md p-4"
        >
            <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                    <p className="font-bold text-brand-primary">Pedido #{order.orderNumber}</p>
                    <p className="text-lg font-semibold text-brand-text">{order.customer?.name || 'Cliente não informado'}</p>
                    <p className="text-sm text-gray-500">{formatTimestamp(order.createdAt)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-brand-text">{formatPrice(totalWithFee)}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`w-3 h-3 rounded-full ${statusInfo[order.status]?.color || 'bg-gray-400'}`}></span>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} item(s)</p>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default OrderCard;