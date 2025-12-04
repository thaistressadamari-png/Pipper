
import React, { useEffect, useState } from 'react';
import type { Order } from '../types';
import { subscribeToOrder } from '../services/menuService';
import { BikeIcon, CheckCircleIcon, ChefHatIcon, ClockIcon, ChevronRightIcon } from './IconComponents';

interface ActiveOrderBannerProps {
    orderId: string;
    onViewOrder: (order: Order) => void;
}

const ActiveOrderBanner: React.FC<ActiveOrderBannerProps> = ({ orderId, onViewOrder }) => {
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (!orderId) return;
        
        const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
            // Only update if order exists and is not archived
            if (updatedOrder && updatedOrder.status !== 'archived') {
                setOrder(updatedOrder);
            } else {
                setOrder(null);
            }
        });

        return () => unsubscribe();
    }, [orderId]);

    if (!order) return null;

    const getStatusConfig = (status: Order['status']) => {
        switch (status) {
            case 'new':
            case 'pending_payment':
                return {
                    text: 'Pedido Recebido',
                    icon: <ClockIcon className="w-5 h-5 text-yellow-600" />,
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    textCol: 'text-yellow-800'
                };
            case 'confirmed':
                return {
                    text: 'Em Preparo',
                    icon: <ChefHatIcon className="w-5 h-5 text-green-600" />,
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    textCol: 'text-green-800'
                };
            case 'shipped':
                return {
                    text: 'Saiu para Entrega',
                    icon: <BikeIcon className="w-5 h-5 text-indigo-600" />,
                    bg: 'bg-indigo-50',
                    border: 'border-indigo-200',
                    textCol: 'text-indigo-800'
                };
            case 'completed':
                return {
                    text: 'Finalizado',
                    icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
                    bg: 'bg-green-100',
                    border: 'border-green-300',
                    textCol: 'text-green-900'
                };
            default:
                return {
                    text: 'Atualizado',
                    icon: <ClockIcon className="w-5 h-5" />,
                    bg: 'bg-gray-50',
                    border: 'border-gray-200',
                    textCol: 'text-gray-800'
                };
        }
    };

    const config = getStatusConfig(order.status);

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-sm animate-fade-in-down">
            <style>{`.animate-fade-in-down { animation: fadeInDown 0.5s ease-out; } @keyframes fadeInDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
            <button
                onClick={() => onViewOrder(order)}
                className={`w-full flex items-center justify-between p-3 rounded-full shadow-lg border backdrop-blur-sm ${config.bg} ${config.border}`}
            >
                <div className="flex items-center gap-3 pl-1">
                    <div className="bg-white p-1.5 rounded-full shadow-sm">
                        {config.icon}
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedido #{order.orderNumber}</p>
                        <p className={`font-bold ${config.textCol}`}>{config.text}</p>
                    </div>
                </div>
                <div className="bg-white/50 p-1.5 rounded-full">
                    <ChevronRightIcon className={`w-5 h-5 ${config.textCol}`} />
                </div>
            </button>
        </div>
    );
};

export default ActiveOrderBanner;
