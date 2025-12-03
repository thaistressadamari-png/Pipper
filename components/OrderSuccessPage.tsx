
import React, { useState } from 'react';
import type { Order, StoreInfoData } from '../types';
import { ArrowLeftIcon, ClockIcon, WhatsappIcon, CheckCircleIcon, ChefHatIcon, BikeIcon, XIcon } from './IconComponents';

interface OrderSuccessPageProps {
  order: Order | null;
  storeInfo: StoreInfoData | null;
  onNavigateBack: () => void;
}

interface StepProps {
    isActive: boolean;
    isCompleted: boolean;
    isLast: boolean;
    icon: React.ReactNode;
    title: string;
}

const TrackingStep: React.FC<StepProps> = ({ isActive, isCompleted, isLast, icon, title }) => {
    // Determine colors based on status logic from parent (which maps to active/completed)
    // The request was: "as etapas estão todas em 'laranja' mas para preparo e envio pode ser em verde."
    // Here we define styles dynamically.
    
    let bubbleClass = 'bg-gray-100 text-gray-400';
    let textClass = 'text-gray-400';
    let lineClass = 'bg-gray-200';

    if (isActive) {
        bubbleClass = 'bg-green-100 text-green-600'; // Active is Green
        textClass = 'text-gray-900';
    } else if (isCompleted) {
        bubbleClass = 'bg-green-100 text-green-600'; // Completed is Green
        textClass = 'text-gray-800';
        lineClass = 'bg-green-200';
    }
    
    // Override specifically for the first step (Pending) to stay orange if active, or green if done?
    // User asked "preparo e envio pode ser em verde". Pending implies before prep.
    // However, usually completed steps are green. Let's stick to green for active/completed for consistency with the request.

    return (
        <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors duration-300 ${bubbleClass}`}>
                    {isCompleted && !isActive ? <CheckCircleIcon className="w-6 h-6" /> : icon}
                </div>
                {!isLast && (
                    <div className={`w-0.5 flex-grow my-2 transition-colors duration-300 ${lineClass}`} style={{ minHeight: '40px' }}></div>
                )}
            </div>
            <div className="pt-2 pb-8">
                <h3 className={`font-semibold text-lg transition-colors duration-300 ${textClass}`}>
                    {title}
                </h3>
            </div>
        </div>
    );
};

const OrderDetailsModal: React.FC<{ order: Order; isOpen: boolean; onClose: () => void }> = ({ order, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Detalhes do Pedido</h3>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.name}</span>
                            <span className="font-medium">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    ))}
                    {order.deliveryFee ? (
                         <div className="flex justify-between text-sm text-gray-600 pt-2 border-t">
                            <span>Taxa de entrega</span>
                            <span>{order.deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between font-bold pt-2 border-t mt-2">
                        <span>Total</span>
                        <span>{(order.total + (order.deliveryFee || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ order, storeInfo, onNavigateBack }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!order || !storeInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <p className="text-gray-500 mb-6">Não foi possível carregar o pedido.</p>
        <button
          onClick={onNavigateBack}
          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg"
        >
          Voltar
        </button>
      </div>
    );
  }

  // Determine active step
  // 1: New/Pending (Pedido pendente)
  // 2: Confirmed (Preparo)
  // 3: Shipped (Envio/Saiu para entrega)
  // 4: Completed (Finalizado/Entregue)
  const getStepStatus = () => {
    if (order.status === 'completed' || order.status === 'archived') return 4;
    if (order.status === 'shipped') return 3;
    if (order.status === 'confirmed') return 2;
    return 1; // 'new' or 'pending_payment'
  };

  const activeStep = getStepStatus();

  // Header Banner Content
  const getBannerContent = () => {
      if (activeStep === 1) {
          return {
              title: "Pedido enviado!",
              subtitle: "Aguardando a confirmação da loja",
              icon: <ClockIcon className="w-8 h-8 animate-pulse" />,
              colorClass: "bg-gray-800 text-white"
          };
      }
      if (activeStep === 2) {
           return {
              title: "Pedido em preparo!",
              subtitle: "Estamos caprichando no seu pedido",
              icon: <ChefHatIcon className="w-8 h-8" />,
              colorClass: "bg-green-500 text-white" // Changed to Green as requested ("preparo... pode ser em verde")
          };
      }
      if (activeStep === 3) {
           return {
              title: "Saiu para entrega!",
              subtitle: "Logo chega aí",
              icon: <BikeIcon className="w-8 h-8" />,
              colorClass: "bg-green-600 text-white" // Green for shipped
          };
      }
      // activeStep 4 (Completed)
      return {
          title: "Pedido Entregue!",
          subtitle: "Obrigado pela preferência",
          icon: <CheckCircleIcon className="w-8 h-8" />,
          colorClass: "bg-green-700 text-white"
      };
  };

  const banner = getBannerContent();
  const totalPrice = (order.total || 0) + (order.deliveryFee || 0);

  const whatsappMessage = `Olá! Gostaria de falar sobre o pedido #${order.orderNumber}.`;
  const whatsappUrl = `https://wa.me/${storeInfo.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={onNavigateBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 ml-2">Acompanhamento de pedidos</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 max-w-lg">
        
        {/* Status Banner */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex items-center gap-4 border border-gray-100">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${banner.colorClass}`}>
                {banner.icon}
            </div>
            <div>
                <h2 className="font-bold text-lg text-gray-900">{banner.title}</h2>
                <p className="text-gray-500 text-sm">{banner.subtitle}</p>
            </div>
        </div>

        {/* Timeline */}
        <div className="pl-4">
            <TrackingStep 
                title={activeStep === 1 ? "Pedido pendente..." : "Pedido recebido"}
                isActive={activeStep === 1}
                isCompleted={activeStep > 1}
                isLast={false}
                icon={<ClockIcon className="w-5 h-5" />}
            />
            <TrackingStep 
                title="Preparo"
                isActive={activeStep === 2}
                isCompleted={activeStep > 2}
                isLast={false}
                icon={<ChefHatIcon className="w-5 h-5" />}
            />
            <TrackingStep 
                title="Envio"
                isActive={activeStep === 3}
                isCompleted={activeStep > 3} // Only completed when delivered
                isLast={true}
                icon={<BikeIcon className="w-5 h-5" />}
            />
        </div>

      </main>

      {/* Bottom Store Card */}
      <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0 safe-area-bottom">
        <div className="container mx-auto max-w-lg">
            <div className="border border-gray-100 rounded-lg shadow-sm p-4 mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <img src={storeInfo.logoUrl} alt={storeInfo.name} className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                    <div className="flex-grow">
                        <h3 className="font-bold text-gray-900">{storeInfo.name}</h3>
                        <p className="text-sm text-gray-500">#{order.orderNumber.toString().padStart(4, '0')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total:</p>
                        <p className="text-sm font-bold text-gray-900">{formatPrice(totalPrice)}</p>
                        {order.deliveryFee === undefined && (
                            <p className="text-xs text-gray-400">+ taxa de envio</p>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <WhatsappIcon className="w-5 h-5 text-green-600" />
                        Iniciar conversa
                    </a>
                    <button 
                        onClick={() => setIsDetailsOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Ver pedido
                    </button>
                </div>
            </div>
        </div>
      </div>

      <OrderDetailsModal 
        order={order} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </div>
  );
};

const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default OrderSuccessPage;
