import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CartItem, StoreInfoData, OrderItem, CustomerInfo, DeliveryInfo, Order } from '../types';
import { ArrowLeftIcon, CalendarIcon } from './IconComponents';
import Calendar from './Calendar';
import { addOrder } from '../services/menuService';
import { getStoreStatus } from '../utils';

interface CheckoutPageProps {
  cartItems: CartItem[];
  storeInfo: StoreInfoData | null;
  onNavigateBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, storeInfo, onNavigateBack, onOrderSuccess }) => {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    whatsapp: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [error, setError] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const numberInputRef = useRef<HTMLInputElement>(null);
  
  const minDate = useMemo(() => {
    const maxLeadTime = Math.max(0, ...cartItems.map(item => item.leadTimeDays || 0));
    const { isOpen } = getStoreStatus(storeInfo);

    const date = new Date();
    // Adjust for timezone offset to prevent issues with date boundaries
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    let leadTimeOffset = maxLeadTime;

    // Special handling for same-day items
    if (maxLeadTime === 0 && !isOpen) {
        // If all items are for immediate delivery but the store is closed,
        // the earliest delivery is tomorrow.
        leadTimeOffset = 1;
    }

    if (leadTimeOffset > 0) {
        date.setDate(date.getDate() + leadTimeOffset);
    }
    
    return date.toISOString().split('T')[0];
  }, [cartItems, storeInfo]);

  useEffect(() => {
    if (storeInfo?.paymentMethods?.online?.length > 0) {
      setPaymentMethod(storeInfo.paymentMethods.online[0]);
    }
    setDeliveryDate(minDate);
  }, [storeInfo, minDate]);
  
  const handleDateSelect = (date: string) => {
    setDeliveryDate(date);
    setIsCalendarOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };
  
    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // remove non-digits
        if (value.length > 8) value = value.slice(0, 8);
        
        // Apply mask 99999-999
        if (value.length > 5) {
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        setCustomerInfo(prev => ({ ...prev, cep: value }));
        setCepError(''); // clear error on change
    };

    const handleCepBlur = async () => {
        const cep = customerInfo.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
            if (customerInfo.cep.length > 0) { // only show error if user typed something
                setCepError('CEP inválido.');
            }
            return;
        }

        setIsFetchingCep(true);
        setCepError('');
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Erro na busca do CEP.');
            
            const data = await response.json();
            if (data.erro) {
                throw new Error('CEP não encontrado.');
            }

            setCustomerInfo(prev => ({
                ...prev,
                street: data.logradouro,
                neighborhood: data.bairro,
            }));

            numberInputRef.current?.focus();

        } catch (err: any) {
            setCepError(err.message || 'Não foi possível buscar o CEP.');
        } finally {
            setIsFetchingCep(false);
        }
    };
  
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation checks
    if (!customerInfo.name.trim() || !customerInfo.whatsapp.trim()) {
        setError('Por favor, preencha seu nome e WhatsApp.');
        return;
    }
    if (!deliveryDate) {
        setError('Por favor, selecione uma data para entrega.');
        return;
    }
    const addressFields = { cep: customerInfo.cep, street: customerInfo.street, number: customerInfo.number, neighborhood: customerInfo.neighborhood };
    for (const [key, value] of Object.entries(addressFields)) {
        if (typeof value === 'string' && !value.trim()) {
            setError('Por favor, preencha todos os campos de endereço, incluindo o CEP.');
            return;
        }
    }
     if (!paymentMethod) {
        setError('Por favor, selecione uma forma de pagamento.');
        return;
    }

    setIsSubmitting(true);

    const rawWhatsapp = customerInfo.whatsapp.replace(/\D/g, '');
    const finalWhatsapp = rawWhatsapp.startsWith('55') ? rawWhatsapp : `55${rawWhatsapp}`;

    const orderCustomerInfo: CustomerInfo = {
        name: customerInfo.name,
        whatsapp: finalWhatsapp,
    };

    const orderAddress: DeliveryInfo['address'] = {
        cep: customerInfo.cep,
        street: customerInfo.street,
        number: customerInfo.number,
        neighborhood: customerInfo.neighborhood,
    };

    if (customerInfo.complement && customerInfo.complement.trim() !== '') {
        orderAddress.complement = customerInfo.complement.trim();
    }

    const orderDeliveryInfo: DeliveryInfo = {
        type: 'delivery',
        address: orderAddress
    };

    const orderItems: OrderItem[] = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        observations: item.observations,
    }));

    try {
        const newOrder = await addOrder({
            customer: orderCustomerInfo,
            delivery: orderDeliveryInfo,
            items: orderItems,
            total: total,
            paymentMethod: paymentMethod,
            deliveryDate: deliveryDate
        });
        onOrderSuccess(newOrder);
    } catch(err) {
        console.error("Failed to save order:", err);
        setError("Não foi possível salvar seu pedido. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-900 disabled:bg-gray-50";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-100 mr-2">
            <ArrowLeftIcon className="h-6 w-6 text-brand-text" />
          </button>
          <h1 className="text-xl font-bold text-brand-text">Finalizar Pedido</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold text-brand-text mb-4">Seus Dados</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-brand-text-light">Nome e sobrenome</label>
                        <input type="text" name="name" id="name" value={customerInfo.name} onChange={handleChange} className={inputStyles} required />
                    </div>
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-brand-text-light">WhatsApp (com DDD)</label>
                        <input type="tel" name="whatsapp" id="whatsapp" value={customerInfo.whatsapp} onChange={handleChange} className={inputStyles} placeholder="11912345678" required />
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold text-brand-text mb-4">Endereço de Entrega</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="cep" className="block text-sm font-medium text-brand-text-light">CEP</label>
                        <input
                            type="tel"
                            name="cep"
                            id="cep"
                            value={customerInfo.cep}
                            onChange={handleCepChange}
                            onBlur={handleCepBlur}
                            className={inputStyles}
                            placeholder="00000-000"
                            maxLength={9}
                            required
                        />
                        {isFetchingCep && <p className="text-xs text-gray-500 mt-1">Buscando endereço...</p>}
                        {cepError && <p className="text-xs text-red-600 mt-1">{cepError}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="street" className="block text-sm font-medium text-brand-text-light">Rua / Avenida</label>
                            <input type="text" name="street" id="street" value={customerInfo.street} onChange={handleChange} className={inputStyles} required disabled={isFetchingCep} />
                        </div>
                        <div>
                            <label htmlFor="number" className="block text-sm font-medium text-brand-text-light">Número</label>
                            <input type="text" name="number" id="number" ref={numberInputRef} value={customerInfo.number} onChange={handleChange} className={inputStyles} required disabled={isFetchingCep} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="neighborhood" className="block text-sm font-medium text-brand-text-light">Bairro</label>
                        <input type="text" name="neighborhood" id="neighborhood" value={customerInfo.neighborhood} onChange={handleChange} className={inputStyles} required disabled={isFetchingCep}/>
                    </div>
                    <div>
                        <label htmlFor="complement" className="block text-sm font-medium text-brand-text-light">Complemento (Opcional)</label>
                        <input type="text" name="complement" id="complement" value={customerInfo.complement} onChange={handleChange} className={inputStyles} placeholder="Apto, bloco, casa, etc." disabled={isFetchingCep}/>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold text-brand-text mb-4">Agendar Data</h2>
                <div className="relative">
                    <label htmlFor="deliveryDate" className="block text-sm font-medium text-brand-text-light">Escolha a data de entrega</label>
                    <button
                        type="button"
                        id="deliveryDate"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`${inputStyles} text-left w-full flex justify-between items-center`}
                    >
                        <span>{formatDisplayDate(deliveryDate) || 'Selecione uma data'}</span>
                        <CalendarIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    {isCalendarOpen && (
                       <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsCalendarOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 z-20 w-full sm:w-auto">
                            <Calendar
                                selectedDate={deliveryDate}
                                minDate={minDate}
                                onDateSelect={handleDateSelect}
                            />
                        </div>
                       </>
                    )}
                </div>
            </div>


            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold text-brand-text mb-4">Forma de Pagamento</h2>
                <div className="space-y-3">
                    {storeInfo?.paymentMethods?.online?.map(method => (
                        <label key={method} className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:bg-brand-secondary has-[:checked]:border-brand-primary">
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value={method}
                                checked={paymentMethod === method}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="h-4 w-4 text-brand-primary focus:ring-brand-primary"
                            />
                            <span className="ml-3 text-sm font-medium text-brand-text">{method}</span>
                        </label>
                    ))}
                </div>
            </div>
            
            {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

            <div className="bg-white p-4 rounded-lg shadow sticky bottom-4">
                 <div className="flex justify-between items-center text-lg font-bold text-brand-text mb-1">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                </div>
                <p className="text-right text-xs text-gray-500 mb-3">+ taxa de envio (a confirmar)</p>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-500 text-white font-bold py-3 rounded-lg text-lg hover:bg-green-600 transition-colors duration-300 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
                </button>
            </div>
        </form>
      </main>
    </div>
  );
};

export default CheckoutPage;