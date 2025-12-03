
import React, { useState } from 'react';
import { XIcon, ArrowLeftIcon } from './IconComponents';
import { getOrdersByWhatsapp } from '../services/menuService';
import type { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (order: Order) => void;
}

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose, onTrackOrder }) => {
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [whatsapp, setWhatsapp] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    onClose();
    // Reset state after transition ends
    setTimeout(() => {
        setStep('input');
        setWhatsapp('');
        setOrders([]);
        setError('');
    }, 300);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) {
      setError('Por favor, digite seu número de WhatsApp.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const foundOrders = await getOrdersByWhatsapp(whatsapp);
      setOrders(foundOrders);
      setStep('results');
    } catch (err) {
      setError('Ocorreu um erro ao buscar seus pedidos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusPill = (status: Order['status']) => {
    const styles = {
        new: 'bg-yellow-100 text-yellow-800',
        pending_payment: 'bg-orange-100 text-orange-800',
        confirmed: 'bg-blue-100 text-blue-800',
        shipped: 'bg-indigo-100 text-indigo-800',
        completed: 'bg-green-100 text-green-800',
        archived: 'bg-gray-100 text-gray-800',
    };
    const text = {
        new: 'Recebido',
        pending_payment: 'Pendente',
        confirmed: 'Em Preparo',
        shipped: 'Enviado',
        completed: 'Finalizado',
        archived: 'Arquivado'
    }
    return <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${styles[status] || styles.new}`}>{text[status] || text.new}</span>;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 flex items-center justify-center p-4 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
                {step === 'results' && (
                    <button onClick={() => setStep('input')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                )}
                <h2 className="text-lg font-bold text-brand-text">Acompanhe seu Pedido</h2>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100">
              <XIcon className="w-5 h-5 text-gray-600" />
            </button>
          </header>
          
          <div className="overflow-y-auto p-6">
            {step === 'input' ? (
              <form onSubmit={handleSearch} className="space-y-4">
                <p className="text-sm text-gray-600">Para encontrar seus pedidos em andamento, digite o número de WhatsApp (com DDD) que você usou na compra.</p>
                <div>
                  <label htmlFor="whatsapp-tracker" className="block text-sm font-medium text-brand-text-light">
                    Seu WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="whatsapp-tracker"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                    placeholder="(11) 91234-5678"
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                >
                  {isLoading ? 'Buscando...' : 'Buscar Pedidos'}
                </button>
              </form>
            ) : (
                <div className="space-y-4">
                    {orders.length > 0 ? (
                        orders.map(order => (
                            <button 
                              key={order.id} 
                              onClick={() => onTrackOrder(order)}
                              className="w-full text-left bg-gray-50 hover:bg-gray-100 p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-brand-primary">Pedido #{order.orderNumber}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Data de Entrega: {new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    {statusPill(order.status)}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <p className="font-semibold text-gray-700">Nenhum pedido em andamento encontrado.</p>
                            <p className="text-sm text-gray-500 mt-2">Verifique o número digitado ou faça um novo pedido em nosso cardápio!</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderTrackingModal;
