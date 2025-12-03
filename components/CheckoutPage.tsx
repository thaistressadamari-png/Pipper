

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CartItem, StoreInfoData, Order, DeliveryInfo } from '../types';
import { ArrowLeftIcon, CalendarIcon, SpinnerIcon, XIcon, CheckCircleIcon, TrashIcon, MapPinIcon } from './IconComponents';
import { addOrder, getClient, removeClientAddress } from '../services/menuService';
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

const AddressDeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center animate-fade-in-up">
                <h3 className="text-lg font-bold text-brand-text">Excluir Endereço</h3>
                <p className="text-gray-600 my-4">Tem certeza que deseja remover este endereço da sua lista?</p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                        Sim, excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

const SavedAddressesModal: React.FC<{
    isOpen: boolean;
    addresses: DeliveryInfo['address'][];
    onSelect: (address: DeliveryInfo['address']) => void;
    onClose: () => void;
    onDelete: (address: DeliveryInfo['address']) => void;
}> = ({ isOpen, addresses, onSelect, onClose, onDelete }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col animate-fade-in-up">
                <div className="p-4 border-b flex justify-between items-center">
                     <h3 className="text-lg font-bold text-brand-text">Endereços Salvos</h3>
                     <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-400"/></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-3">
                    {addresses.length === 0 ? (
                        <p className="text-center text-gray-500">Nenhum endereço salvo encontrado.</p>
                    ) : (
                        <>
                        <p className="text-sm text-gray-600 mb-2">Selecione um endereço para preencher:</p>
                        {addresses.map((addr, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <button 
                                    onClick={() => onSelect(addr)}
                                    className="flex-grow text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-brand-primary transition-all group relative"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-brand-primary"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-brand-text">{addr.street}, {addr.number}</p>
                                            <p className="text-sm text-gray-600">{addr.neighborhood} - {addr.cep}</p>
                                            {addr.complement && <p className="text-xs text-gray-500 mt-1">{addr.complement}</p>}
                                        </div>
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(addr); }}
                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remover endereço"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        </>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 text-center">
                    <button onClick={onClose} className="text-sm text-brand-primary font-medium hover:underline">
                        Usar um novo endereço
                    </button>
                </div>
            </div>
        </div>
    );
};


const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, storeInfo, onNavigateBack, onOrderSuccess }) => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
  const [saveAddress, setSaveAddress] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  
  // Address search state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [foundAddresses, setFoundAddresses] = useState<DeliveryInfo['address'][]>([]);
  const [addressToDelete, setAddressToDelete] = useState<DeliveryInfo['address'] | null>(null);

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

  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, deliveryDate: date }));
    setIsCalendarOpen(false);
  };
  
  const toggleCalendar = () => {
      if (!isCalendarOpen && calendarButtonRef.current) {
          const rect = calendarButtonRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const spaceBelow = windowHeight - rect.bottom;
          if (spaceBelow < 350) { // Approx height of calendar
              setCalendarPosition('top');
          } else {
              setCalendarPosition('bottom');
          }
      }
      setIsCalendarOpen(!isCalendarOpen);
  };

  const checkClient = async (whatsapp: string) => {
      const client = await getClient(whatsapp);
      if (client) {
          setFormData(prev => ({ ...prev, name: client.name }));
          if (client.addresses && client.addresses.length > 0) {
              setFoundAddresses(client.addresses);
              setIsAddressModalOpen(true);
          }
      }
  };

  const handleSelectAddress = (address: DeliveryInfo['address']) => {
      setFormData(prev => ({
          ...prev,
          cep: address.cep,
          street: address.street,
          number: address.number,
          neighborhood: address.neighborhood,
          complement: address.complement || '',
      }));
      setIsAddressModalOpen(false);
  };

  const handleDeleteAddress = (address: DeliveryInfo['address']) => {
      setAddressToDelete(address);
  };

  const confirmDeleteAddress = async () => {
      if (!addressToDelete) return;
      try {
          await removeClientAddress(formData.whatsapp, addressToDelete);
          setFoundAddresses(prev => prev.filter(addr => addr !== addressToDelete));
      } catch (error) {
          console.error("Failed to delete address", error);
          alert("Erro ao excluir endereço.");
      } finally {
          setAddressToDelete(null);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};
    if (!formData.name) errors.name = 'Nome é obrigatório';
    if (!formData.whatsapp || formData.whatsapp.length < 14) errors.whatsapp = 'WhatsApp válido é obrigatório';
    if (!formData.cep || formData.cep.length < 9) errors.cep = 'CEP válido é obrigatório';
    if (!formData.street) errors.street = 'Rua é obrigatória';
    if (!formData.number) errors.number = 'Número é obrigatório';
    if (!formData.neighborhood) errors.neighborhood = 'Bairro é obrigatório';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.keys(errors)[0];
      const element = document.getElementById(firstError);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
        const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'status'> = {
            customer: {
                name: formData.name,
                whatsapp: formData.whatsapp,
            },
            delivery: {
                type: 'delivery',
                address: {
                    cep: formData.cep,
                    street: formData.street,
                    number: formData.number,
                    neighborhood: formData.neighborhood,
                    complement: formData.complement,
                }
            },
            items: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                observations: item.observations,
                option: item.selectedOption?.name
            })),
            total: total,
            paymentMethod: formData.paymentMethod,
            deliveryDate: formData.deliveryDate
        };

        const newOrder = await addOrder(orderData, saveAddress);
        onOrderSuccess(newOrder);

    } catch (error) {
        console.error("Error submitting order:", error);
        alert("Ocorreu um erro ao enviar seu pedido. Por favor, tente novamente.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center">
            <button onClick={onNavigateBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 ml-2">Finalizar Pedido</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Identification */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-brand-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="text-lg font-bold text-brand-text">Seus Dados</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-brand-text-light">WhatsApp (com DDD)</label>
                        <input
                            ref={whatsappInputRef}
                            type="tel"
                            name="whatsapp"
                            id="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleInputChange}
                            onBlur={() => {
                                if (formData.whatsapp.length >= 14) {
                                    setIsPhoneModalOpen(true);
                                }
                            }}
                            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.whatsapp ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                        />
                        {formErrors.whatsapp && <p className="mt-1 text-sm text-red-500">{formErrors.whatsapp}</p>}
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-brand-text-light">Nome Completo</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Seu nome"
                        />
                         {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
                    </div>
                </div>
            </section>

             {/* 2. Delivery Address */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                        <h2 className="text-lg font-bold text-brand-text">Entrega</h2>
                    </div>
                </div>
                
                {foundAddresses.length > 0 && (
                    <div className="mb-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsAddressModalOpen(true)}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-white text-brand-primary border border-brand-secondary/50 text-sm font-semibold rounded-full hover:bg-brand-secondary hover:border-brand-secondary transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
                        >
                            <MapPinIcon className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform duration-300" />
                            <span>Meus endereços salvos</span>
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                     <div>
                        <label htmlFor="cep" className="block text-sm font-medium text-brand-text-light">CEP</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="cep"
                                id="cep"
                                value={formData.cep}
                                onChange={handleCepChange}
                                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.cep ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="00000-000"
                                maxLength={9}
                                required
                                disabled={isCepLoading}
                            />
                             {isCepLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <SpinnerIcon className="w-5 h-5 text-brand-primary" />
                                </div>
                            )}
                        </div>
                         {cepError && <p className="mt-1 text-sm text-red-500">{cepError}</p>}
                         {formErrors.cep && <p className="mt-1 text-sm text-red-500">{formErrors.cep}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="street" className="block text-sm font-medium text-brand-text-light">Rua</label>
                            <input
                                type="text"
                                name="street"
                                id="street"
                                value={formData.street}
                                onChange={handleInputChange}
                                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.street ? 'border-red-500' : 'border-gray-300'}`}
                                required
                            />
                            {formErrors.street && <p className="mt-1 text-sm text-red-500">{formErrors.street}</p>}
                        </div>
                        <div>
                             <label htmlFor="number" className="block text-sm font-medium text-brand-text-light">Número</label>
                            <input
                                type="text"
                                name="number"
                                id="number"
                                value={formData.number}
                                onChange={handleInputChange}
                                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.number ? 'border-red-500' : 'border-gray-300'}`}
                                required
                            />
                             {formErrors.number && <p className="mt-1 text-sm text-red-500">{formErrors.number}</p>}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="neighborhood" className="block text-sm font-medium text-brand-text-light">Bairro</label>
                        <input
                            type="text"
                            name="neighborhood"
                            id="neighborhood"
                            value={formData.neighborhood}
                            onChange={handleInputChange}
                             className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm ${formErrors.neighborhood ? 'border-red-500' : 'border-gray-300'}`}
                            required
                        />
                         {formErrors.neighborhood && <p className="mt-1 text-sm text-red-500">{formErrors.neighborhood}</p>}
                    </div>
                     <div>
                        <label htmlFor="complement" className="block text-sm font-medium text-brand-text-light">Complemento (Opcional)</label>
                        <input
                            type="text"
                            name="complement"
                            id="complement"
                            value={formData.complement}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                        />
                    </div>
                     <div className="flex items-center mt-2">
                        <input
                            id="save-address"
                            name="save-address"
                            type="checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                        />
                        <label htmlFor="save-address" className="ml-2 block text-sm text-gray-900">
                            Salvar este endereço para futuras compras
                        </label>
                    </div>
                </div>
            </section>

             {/* 3. Delivery Date */}
             <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 relative">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-brand-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <h2 className="text-lg font-bold text-brand-text">Data de Entrega</h2>
                </div>
                 <div>
                     <label className="block text-sm font-medium text-brand-text-light mb-1">Selecione a data</label>
                     <div className="relative">
                        <button
                            ref={calendarButtonRef}
                            type="button"
                            onClick={toggleCalendar}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <span>{new Date(formData.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                        </button>
                        {isCalendarOpen && (
                             <div className={`absolute z-20 left-0 right-0 ${calendarPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                <Calendar
                                    selectedDate={formData.deliveryDate}
                                    minDate={minDate}
                                    onDateSelect={handleDateSelect}
                                />
                             </div>
                        )}
                     </div>
                     <p className="mt-2 text-xs text-gray-500">
                        {minLeadTime > 0 ? `Este pedido requer no mínimo ${minLeadTime} dias de antecedência.` : 'Disponível para pronta entrega (sujeito a disponibilidade).'}
                     </p>
                 </div>
            </section>

             {/* 4. Payment */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="bg-brand-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <h2 className="text-lg font-bold text-brand-text">Pagamento</h2>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-brand-text-light mb-2">Forma de Pagamento</label>
                     <div className="space-y-2">
                         {storeInfo?.paymentMethods?.online.map((method) => (
                             <label key={method} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === method ? 'border-brand-primary bg-brand-secondary/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                                 <input
                                     type="radio"
                                     name="paymentMethod"
                                     value={method}
                                     checked={formData.paymentMethod === method}
                                     onChange={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                     className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300"
                                 />
                                 <span className="ml-3 block text-sm font-medium text-gray-700">
                                     {method}
                                 </span>
                             </label>
                         ))}
                     </div>
                 </div>
            </section>

             {/* Order Summary */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-brand-text mb-4">Resumo do Pedido</h2>
                <div className="space-y-3 mb-4">
                    {cartItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.name} {item.selectedOption ? `(${item.selectedOption.name})` : ''}</span>
                            <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-xl font-bold text-brand-text">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                     <p className="text-xs text-gray-500 mt-1 text-right">* Taxa de entrega calculada após confirmação.</p>
                </div>
            </section>
            
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-primary text-white font-bold py-4 rounded-lg text-lg shadow-lg hover:bg-brand-primary-dark transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isSubmitting ? (
                    <>
                         <SpinnerIcon className="w-6 h-6 mr-2" />
                         Enviando Pedido...
                    </>
                ) : (
                    'Enviar Pedido pelo WhatsApp'
                )}
            </button>

        </form>
      </main>
      
      <PhoneConfirmationModal
        isOpen={isPhoneModalOpen}
        phoneNumber={formData.whatsapp}
        onCorrect={() => {
            setIsPhoneModalOpen(false);
            setTimeout(() => whatsappInputRef.current?.focus(), 100);
        }}
        onConfirm={() => {
            setIsPhoneModalOpen(false);
            checkClient(formData.whatsapp);
        }}
      />
      
      <SavedAddressesModal 
          isOpen={isAddressModalOpen}
          addresses={foundAddresses}
          onSelect={handleSelectAddress}
          onDelete={handleDeleteAddress}
          onClose={() => setIsAddressModalOpen(false)}
      />

      <AddressDeleteConfirmationModal
          isOpen={!!addressToDelete}
          onCancel={() => setAddressToDelete(null)}
          onConfirm={confirmDeleteAddress}
      />
    </div>
    </>
  );
};

export default CheckoutPage;
