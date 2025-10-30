import React from 'react';
import type { Order, StoreInfoData } from '../types';

interface OrderSuccessPageProps {
  order: Order | null;
  storeInfo: StoreInfoData | null;
  onNavigateBack: () => void;
}

const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ order, storeInfo, onNavigateBack }) => {

  if (!order || !storeInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h1 className="text-2xl font-bold text-brand-text mb-4">Ocorreu um erro</h1>
        <p className="text-brand-text-light mb-6">Não foi possível carregar os detalhes do seu pedido.</p>
        <button
          onClick={onNavigateBack}
          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-dark transition-colors"
        >
          Voltar ao Cardápio
        </button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  const incorrectInfoMessage = `Olá, ${storeInfo.name}! Acabei de fazer o pedido #${order.orderNumber} e notei que meu nome ou número de WhatsApp podem estar incorretos. Poderiam verificar para mim, por favor?`;
  const whatsappUrl = `https://wa.me/${storeInfo.whatsappNumber}?text=${encodeURIComponent(incorrectInfoMessage)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <h1 className="text-xl font-bold text-brand-text">Pedido Confirmado!</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-brand-text mt-4">Obrigado pela sua compra!</h2>
            <p className="text-brand-text-light mt-2">Seu pedido foi recebido com sucesso e já está sendo preparado pela nossa equipe.</p>
            
            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm text-gray-600">Número do Pedido:</p>
                <p className="text-2xl font-bold text-brand-primary">#{order.orderNumber}</p>
            </div>

            <div className="mt-6 text-left border-t pt-6">
                <h3 className="font-bold text-brand-text mb-4">Resumo da Compra</h3>
                <div className="space-y-2 text-sm text-gray-700">
                    {order.items.map(item => (
                        <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between font-bold text-brand-text mt-4 pt-4 border-t">
                    <span>Total:</span>
                    <span>{formatPrice(order.total)}</span>
                </div>
            </div>

            <div className="mt-6 text-left border-t pt-6">
                <h3 className="font-bold text-brand-text mb-2">Próximos Passos</h3>
                <p className="text-sm text-brand-text-light">
                    Nossa equipe entrará em contato com você pelo WhatsApp <strong className="text-brand-text">{order.customer.whatsapp}</strong> para confirmar os detalhes do pagamento e da entrega, agendada para <strong className="text-brand-text">{formatDisplayDate(order.deliveryDate)}</strong>.
                </p>
                
                <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg">
                    <p>
                        Seu nome ou número de WhatsApp estão incorretos? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-yellow-900">Clique aqui para nos avisar</a> e corrigir rapidamente.
                    </p>
                </div>
            </div>

        </div>
        <div className="text-center mt-8">
            <button
              onClick={onNavigateBack}
              className="px-8 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-dark transition-colors"
            >
              &larr; Voltar ao Cardápio
            </button>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccessPage;