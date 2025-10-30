import React, { useState, useEffect, useMemo } from 'react';
import type { CartItem, StoreInfoData, Order, OrderItem, CustomerInfo, DeliveryInfo } from '../types';
import { ArrowLeftIcon, CreditCardIcon, PixIcon, CalendarIcon } from './IconComponents';
import { addOrder } from '../services/menuService';
import Calendar from './Calendar';

interface CheckoutPageProps {
  cartItems: CartItem[];
  storeInfo: StoreInfoData | null;
  onNavigateBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, storeInfo, onNavigateBack, onOrderSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    deliveryDate: '',
    paymentMethod: storeInfo?.paymentMethods?.online[0] || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  
  const minLeadTime = useMemo(() => {
    return cartItems.reduce((max, item) => Math.max(max, item.leadTimeDays || 0), 0);
  }, [cartItems]);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + minLeadTime);
    return date.toISOString().split('T')[0];
  }, [minLeadTime]);

  useEffect(() => {
    // Set default delivery date if not set
    if (!formData.deliveryDate) {
      setFormData(prev => ({ ...prev, deliveryDate: minDate }));
    }
  }, [minDate, formData.deliveryDate]);
  
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, deliveryDate: date }));
    setIsCalendarOpen(false);
  }

  const validateForm = (): boolean => {
    for (const key in formData) {
        if (key !== 'complement' && !formData[key as keyof typeof formData]) {
            setError(`O campo ${key} é obrigatório.`);
            return false;
        }
    }
    // Basic validation for whatsapp (must contain numbers)
    if (!/\d/.test(formData.whatsapp)) {
        setError('Número de WhatsApp inválido.');
        return false;
    }
    setError('');
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
        const orderItems: OrderItem[] = cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            observations: item.observations,
        }));
        
        const customer: CustomerInfo = {
            name: formData.name,
            whatsapp: formData.whatsapp.replace(/\D/g, ''),
        };

        const delivery: DeliveryInfo = {
            type: 'delivery',
            address: {
                cep: formData.cep,
                street: formData.street,
                number: formData.number,
                neighborhood: formData.neighborhood,
                complement: formData.complement,
            }
        };

        const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'> = {
            customer,
            delivery,
            items: orderItems,
            total,
            paymentMethod: formData.paymentMethod,
            deliveryDate: formData.deliveryDate,
        };
        
        const newOrder = await addOrder(orderData);

        // Dispara a notificação para o Telegram via Vercel Serverless Function
        // Esta é uma chamada "fire-and-forget", não bloqueia a UI do usuário.
        fetch('/api/notify-telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newOrder),
        }).catch(error => {
            // Apenas loga o erro no console para debugging, não mostra ao usuário.
            console.error('Falha ao enviar notificação para o Telegram:', error);
        });

        onOrderSuccess(newOrder);

    } catch (err) {
        setError('Ocorreu um erro ao finalizar o pedido. Tente novamente.');
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm";

  if (cartItems.length === 0) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <h1 className="text-2xl font-bold text-center text-brand-text mb-2">Seu carrinho está vazio</h1>
            <button onClick={onNavigateBack} className="mt-6 text-sm text-brand-primary hover:underline">
                &larr; Voltar ao cardápio
            </button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
                <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeftIcon className="w-6 h-6 text-brand-text" />
                </button>
                <h1 className="text-lg font-bold text-brand-text ml-4">Finalizar Pedido</h1>
            </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-brand-text">Informações de Contato</h2>
                        <div className="mt-4 space-y-4">
                             <div>
                                <label htmlFor="name" className="block text-sm font-medium text-brand-text-light">Nome completo</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className={inputStyles} required />
                            </div>
                            <div>
                                <label htmlFor="whatsapp" className="block text-sm font-medium text-brand-text-light">WhatsApp (com DDD)</label>
                                <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className={inputStyles} placeholder="(11) 91234-5678" required />
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h2 className="text-xl font-bold text-brand-text">Endereço de Entrega</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                             <div className="sm:col-span-1">
                                <label htmlFor="cep" className="block text-sm font-medium text-brand-text-light">CEP</label>
                                <input type="text" name="cep" id="cep" value={formData.cep} onChange={handleInputChange} className={inputStyles} required />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="street" className="block text-sm font-medium text-brand-text-light">Rua / Avenida</label>
                                <input type="text" name="street" id="street" value={formData.street} onChange={handleInputChange} className={inputStyles} required />
                            </div>
                            <div className="sm:col-span-1">
                                <label htmlFor="number" className="block text-sm font-medium text-brand-text-light">Número</label>
                                <input type="text" name="number" id="number" value={formData.number} onChange={handleInputChange} className={inputStyles} required />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="neighborhood" className="block text-sm font-medium text-brand-text-light">Bairro</label>
                                <input type="text" name="neighborhood" id="neighborhood" value={formData.neighborhood} onChange={handleInputChange} className={inputStyles} required />
                            </div>
                             <div className="sm:col-span-3">
                                <label htmlFor="complement" className="block text-sm font-medium text-brand-text-light">Complemento (Opcional)</label>
                                <input type="text" name="complement" id="complement" value={formData.complement} onChange={handleInputChange} className={inputStyles} placeholder="Apto, bloco, casa, etc." />
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h2 className="text-xl font-bold text-brand-text">Data da Entrega</h2>
                         <p className="text-sm text-gray-500 mt-1">O prazo mínimo para este pedido é de {minLeadTime} dia(s).</p>
                        <div className="mt-4 relative">
                            <button type="button" onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="w-full sm:w-auto flex items-center gap-2 text-left px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                                <CalendarIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <span className="text-sm text-gray-500">Data selecionada</span>
                                    <p className="font-medium text-brand-text">{new Date(formData.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </button>
                             {isCalendarOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsCalendarOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 z-20">
                                        <Calendar minDate={minDate} selectedDate={formData.deliveryDate} onDateSelect={handleDateSelect} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow space-y-4 sticky top-24">
                    <h2 className="text-xl font-bold text-brand-text">Resumo do Pedido</h2>
                    <div className="space-y-2 border-b pb-4">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                                <span className="text-gray-800 font-medium">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between font-bold text-lg text-brand-text">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                     <div>
                        <h3 className="text-md font-bold text-brand-text mt-4 mb-2">Forma de Pagamento</h3>
                        <div className="space-y-2">
                             {storeInfo?.paymentMethods?.online.map(method => (
                                <label key={method} className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-brand-secondary has-[:checked]:border-brand-primary">
                                    <input type="radio" name="paymentMethod" value={method} checked={formData.paymentMethod === method} onChange={handleInputChange} className="h-4 w-4 text-brand-primary focus:ring-brand-primary"/>
                                    <span className="ml-3 font-medium text-brand-text">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-brand-primary text-white font-bold py-3 rounded-lg text-lg hover:bg-brand-primary-dark transition-colors duration-300 disabled:opacity-50">
                        {isSubmitting ? 'Finalizando...' : 'Finalizar Pedido'}
                    </button>
                </div>
            </form>
        </main>
    </div>
  );
};

export default CheckoutPage;