
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CartItem, StoreInfoData, Order, OrderItem, CustomerInfo, DeliveryInfo } from '../types';
import { ArrowLeftIcon, CalendarIcon, SpinnerIcon } from './IconComponents';
import { addOrder } from '../services/menuService';
import Calendar from './Calendar';

interface CheckoutPageProps {
  cartItems: CartItem[];
  storeInfo: StoreInfoData | null;
  onNavigateBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

const PhoneConfirmationModal: React.FC<{
    isOpen: boolean;
    onConfirm: () => void;
    onCorrect: () => void;
    phoneNumber: string;
}> = ({ isOpen, onConfirm, onCorrect, phoneNumber }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center animate-fade-in-up">
                <style>{`.animate-fade-in-up { animation: fadeInUp 0.3s ease-out; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <h3 className="text-lg font-bold text-brand-text">Confirmar o número de telefone</h3>
                <p className="text-2xl font-bold text-brand-primary my-4">{phoneNumber}</p>
                <p className="text-gray-600">Este número está correto?</p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={onCorrect} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Corrigir
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark">
                        Sim, está correto
                    </button>
                </div>
            </div>
        </div>
    );
};


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
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const [calendarPosition, setCalendarPosition] = useState<'bottom' | 'top'>('bottom');

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
    if (!formData.deliveryDate) {
      setFormData(prev => ({ ...prev, deliveryDate: minDate }));
    }
  }, [minDate, formData.deliveryDate]);
  
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const maskWhatsapp = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15); // (XX) XXXXX-XXXX
  };

  const maskCep = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .slice(0, 9); // XXXXX-XXX
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
        setFormData(prev => ({ ...prev, [name]: maskWhatsapp(value) }));
    } else if (name === 'cep') {
        setFormData(prev => ({ ...prev, [name]: maskCep(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear error for the field being edited
    if (formErrors[name]) {
        setFormErrors(prev => ({...prev, [name]: ''}));
    }
  };
  
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedCep = maskCep(e.target.value);
    const cep = maskedCep.replace(/\D/g, '');

    setFormData(prev => ({ ...prev, cep: maskedCep }));
    
    if (formErrors.cep) {
        setFormErrors(prev => ({...prev, cep: ''}));
    }
    if (formErrors.street) {
        setFormErrors(prev => ({...prev, street: ''}));
    }
    if (formErrors.neighborhood) {
        setFormErrors(prev => ({...prev, neighborhood: ''}));
    }


    if (cep.length !== 8) {
      setCepError('');
      if (e.target.value.length < formData.cep.length) {
          setFormData(prev => ({ ...prev, street: '', neighborhood: '' }));
      }
      return;
    }

    setIsCepLoading(true);
    setCepError('');
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('CEP not found');
        const data = await response.json();
        if (data.erro) {
            throw new Error('CEP não encontrado.');
        }
        setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
        }));
        document.getElementById('number')?.focus();
    } catch (err) {
        setCepError('CEP não encontrado. Por favor, preencha o endereço manualmente.');
        setFormData(prev => ({ ...prev, street: '', neighborhood: '' }));
    } finally {
        setIsCepLoading(false);
    }
  };
  
  const handleCalendarToggle = () => {
    if (!isCalendarOpen && calendarButtonRef.current) {
        const rect = calendarButtonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const calendarHeight = 400; // Estimated height of the calendar component
        if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
            setCalendarPosition('top');
        } else {
            setCalendarPosition('bottom');
        }
    }
    setIsCalendarOpen(!isCalendarOpen);
  };
  
  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, deliveryDate: date }));
    setIsCalendarOpen(false);
  }
  
  const handleWhatsappBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawPhone = e.target.value.replace(/\D/g, '');
    if (rawPhone.length === 11) {
        setIsPhoneModalOpen(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const { name, whatsapp, cep, street, number, neighborhood, deliveryDate, paymentMethod } = formData;
    const rawWhatsapp = whatsapp.replace(/\D/g, '');

    if (!name.trim()) newErrors.name = "Preencha este campo.";
    if (!rawWhatsapp) {
        newErrors.whatsapp = "Preencha este campo.";
    } else if (rawWhatsapp.length !== 11) {
        newErrors.whatsapp = "Preencha este campo.";
    }
    if (!cep.trim()) newErrors.cep = "Preencha este campo.";
    if (!street.trim()) newErrors.street = "Preencha este campo.";
    if (!number.trim()) newErrors.number = "Preencha este campo.";
    if (!neighborhood.trim()) newErrors.neighborhood = "Preencha este campo.";
    if (!deliveryDate) newErrors.deliveryDate = "Selecione uma data.";
    if (!paymentMethod) newErrors.paymentMethod = "Selecione um método.";

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
            option: item.selectedOption?.name, // Pass the option name
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
        
        onOrderSuccess(newOrder);

    } catch (err) {
        setFormErrors({ form: 'Ocorreu um erro ao finalizar o pedido. Tente novamente.' });
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const getBorderColor = (field: keyof typeof formData) => {
    return formErrors[field] ? 'border-red-500' : 'border-gray-300';
  }
  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm";

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
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-brand-text">Informações de Contato</h2>
                        <div className="mt-4 space-y-4">
                             <div>
                                <label htmlFor="name" className="block text-sm font-medium text-brand-text-light">Nome e sobrenome</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className={`${inputStyles} ${getBorderColor('name')}`} required />
                                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="whatsapp" className="block text-sm font-medium text-brand-text-light">WhatsApp (com DDD)</label>
                                <input 
                                    type="tel" 
                                    name="whatsapp" 
                                    id="whatsapp"
                                    ref={whatsappInputRef}
                                    value={formData.whatsapp} 
                                    onChange={handleInputChange}
                                    onBlur={handleWhatsappBlur}
                                    className={`${inputStyles} ${getBorderColor('whatsapp')}`}
                                    placeholder="(11) 91234-5678" 
                                    required 
                                />
                                {formErrors.whatsapp && <p className="text-xs text-red-500 mt-1">{formErrors.whatsapp}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h2 className="text-xl font-bold text-brand-text">Endereço de Entrega</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                             <div className="sm:col-span-1">
                                <label htmlFor="cep" className="block text-sm font-medium text-brand-text-light">CEP</label>
                                <div className="relative">
                                    <input type="tel" inputMode="numeric" pattern="\d{5}-\d{3}" title="Formato do CEP: 00000-000" name="cep" id="cep" value={formData.cep} onChange={handleCepChange} className={`${inputStyles} ${getBorderColor('cep')}`} required disabled={isCepLoading} />
                                    {isCepLoading && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <SpinnerIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                                {formErrors.cep && <p className="text-xs text-red-500 mt-1">{formErrors.cep}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="street" className="block text-sm font-medium text-brand-text-light">Rua / Avenida</label>
                                <input type="text" name="street" id="street" value={formData.street} onChange={handleInputChange} className={`${inputStyles} ${getBorderColor('street')}`} required />
                                {formErrors.street && <p className="text-xs text-red-500 mt-1">{formErrors.street}</p>}
                            </div>
                            <div className="sm:col-span-1">
                                <label htmlFor="number" className="block text-sm font-medium text-brand-text-light">Número</label>
                                <input type="text" name="number" id="number" value={formData.number} onChange={handleInputChange} className={`${inputStyles} ${getBorderColor('number')}`} required />
                                {formErrors.number && <p className="text-xs text-red-500 mt-1">{formErrors.number}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="neighborhood" className="block text-sm font-medium text-brand-text-light">Bairro</label>
                                <input type="text" name="neighborhood" id="neighborhood" value={formData.neighborhood} onChange={handleInputChange} className={`${inputStyles} ${getBorderColor('neighborhood')}`} required />
                                {formErrors.neighborhood && <p className="text-xs text-red-500 mt-1">{formErrors.neighborhood}</p>}
                            </div>
                             <div className="sm:col-span-3">
                                <label htmlFor="complement" className="block text-sm font-medium text-brand-text-light">Complemento (Opcional)</label>
                                <input type="text" name="complement" id="complement" value={formData.complement} onChange={handleInputChange} className={inputStyles} placeholder="Apto, bloco, casa, etc." />
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h2 className="text-xl font-bold text-brand-text">Data da Entrega</h2>
                         {minLeadTime > 0 && (
                            <p className="text-sm text-gray-500 mt-1">O prazo mínimo para este pedido é de {minLeadTime} dia(s).</p>
                         )}
                        <div className="mt-4 relative">
                            <button
                                ref={calendarButtonRef}
                                type="button"
                                onClick={handleCalendarToggle}
                                className="w-full sm:w-auto flex items-center gap-2 text-left px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            >
                                <CalendarIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <span className="text-sm text-gray-500">Data selecionada</span>
                                    <p className="font-medium text-brand-text">{new Date(formData.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </button>
                            {formErrors.deliveryDate && <p className="text-xs text-red-500 mt-1">{formErrors.deliveryDate}</p>}
                             {isCalendarOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsCalendarOpen(false)}></div>
                                    <div className={`absolute left-0 z-20 ${calendarPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                                        <Calendar minDate={minDate} selectedDate={formData.deliveryDate} onDateSelect={handleDateSelect} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow space-y-6 sticky top-24">
                    <div>
                        <h2 className="text-xl font-bold text-brand-text mb-4">Forma de Pagamento</h2>
                        <div className="space-y-2">
                             {storeInfo?.paymentMethods?.online.map(method => (
                                <label key={method} className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-brand-secondary has-[:checked]:border-brand-primary">
                                    <input type="radio" name="paymentMethod" value={method} checked={formData.paymentMethod === method} onChange={handleInputChange} className="h-4 w-4 text-brand-primary focus:ring-brand-primary"/>
                                    <span className="ml-3 font-medium text-brand-text">{method}</span>
                                </label>
                            ))}
                        </div>
                        {formErrors.paymentMethod && <p className="text-xs text-red-500 mt-1">{formErrors.paymentMethod}</p>}
                    </div>
                    <div className="border-t pt-4 space-y-2">
                        <h2 className="text-xl font-bold text-brand-text">Resumo do Pedido</h2>
                        <div className="space-y-2 border-b pb-4">
                            {cartItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        {item.quantity}x {item.name}
                                        {item.selectedOption && <span className="text-xs block text-gray-400">({item.selectedOption.name})</span>}
                                    </span>
                                    <span className="text-gray-800 font-medium">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between font-bold text-lg text-brand-text pt-2">
                            <span>Subtotal</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            + taxa de envio
                        </div>
                    </div>

                     {formErrors.form && <p className="text-sm text-red-600 text-center">{formErrors.form}</p>}
                    <button type="submit" disabled={isSubmitting || isCepLoading} className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg text-lg hover:bg-brand-primary-dark transition-colors duration-300 disabled:opacity-50">
                        {isSubmitting ? 'Finalizando...' : 'Finalizar Pedido'}
                    </button>
                </div>
            </form>
        </main>
        <PhoneConfirmationModal
            isOpen={isPhoneModalOpen}
            phoneNumber={formData.whatsapp}
            onConfirm={() => setIsPhoneModalOpen(false)}
            onCorrect={() => {
                setIsPhoneModalOpen(false);
                whatsappInputRef.current?.focus();
            }}
        />
    </div>
  );
};

export default CheckoutPage;
