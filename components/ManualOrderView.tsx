
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, StoreInfoData, Order, Client, ProductOption, DeliveryInfo, OrderItem } from '../types';
import { getClient, addOrder, addProduct, addCategory, getClients } from '../services/menuService';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, SpinnerIcon, MapPinIcon, CheckCircleIcon, ChevronRightIcon, XIcon, CalendarIcon, UsersIcon } from './IconComponents';
import Calendar from './Calendar';

interface ManualOrderViewProps {
  products: Product[];
  storeInfo: StoreInfoData | null;
  onOrderCreated: () => void;
}

const maskPhone = (v: string) => {
    return v.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15);
};

const CategorySearchSelect: React.FC<{
    categories: string[];
    value: string;
    onChange: (val: string) => void;
}> = ({ categories, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return categories.filter(c => c.toLowerCase().includes(lowerSearch));
    }, [categories, search]);

    const showCreateOption = search.trim() !== '' && !categories.some(c => c.toLowerCase() === search.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-left shadow-sm focus:ring-2 focus:ring-brand-primary outline-none"
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {value || 'Selecione ou digite...'}
                </span>
                <ChevronRightIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-slide-in-up">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar ou criar..."
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-brand-primary outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => { onChange(cat); setIsOpen(false); setSearch(''); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-brand-secondary/30 transition-colors flex items-center justify-between text-gray-900"
                            >
                                {cat}
                                {value === cat && <CheckCircleIcon className="w-4 h-4 text-brand-primary" />}
                            </button>
                        ))}
                        {showCreateOption && (
                            <button
                                type="button"
                                onClick={() => { onChange(search); setIsOpen(false); setSearch(''); }}
                                className="w-full text-left px-4 py-3 text-sm bg-brand-primary/5 text-brand-primary font-bold hover:bg-brand-primary/10 transition-colors"
                            >
                                <span className="block text-[10px] uppercase opacity-60">Nova Categoria:</span>
                                + {search}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EditPriceModal: React.FC<{
    itemName: string;
    currentPrice: number;
    onSave: (newPrice: number) => void;
    onClose: () => void;
}> = ({ itemName, currentPrice, onSave, onClose }) => {
    const [price, setPrice] = useState(currentPrice.toString().replace('.', ','));
    
    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-in-up">
                <header className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Alterar Preço</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">{itemName}</p>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                        <input
                            autoFocus
                            type="text"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg font-bold text-xl bg-white text-gray-900 outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <button
                        onClick={() => {
                            const val = parseFloat(price.replace(',', '.'));
                            if (!isNaN(val)) onSave(val);
                            else alert("Valor inválido");
                        }}
                        className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg shadow-lg hover:bg-brand-primary-dark transition-all"
                    >
                        Salvar Novo Preço
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManualOrderView: React.FC<ManualOrderViewProps> = ({ products, storeInfo, onOrderCreated }) => {
  const [customerData, setCustomerData] = useState({
    whatsapp: '',
    name: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    deliveryDate: new Date().toISOString().split('T')[0],
  });

  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState(storeInfo?.paymentMethods?.online[0] || 'Pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'Diversos', saveToMenu: false });
  const [priceEditingIdx, setPriceEditingIdx] = useState<number | null>(null);

  // Client Search Feature
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientSearchDropdownOpen, setClientSearchDropdownOpen] = useState(false);
  const clientSearchContainerRef = useRef<HTMLDivElement>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const formatPrice = (price: number) => price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    // Load all clients for searching
    getClients().then(setAllClients);
  }, []);

  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const paymentOptions = useMemo(() => {
    if (storeInfo?.paymentMethods?.online && storeInfo.paymentMethods.online.length > 0) {
      return storeInfo.paymentMethods.online;
    }
    return ['Pix', 'Cartão de crédito', 'Dinheiro'];
  }, [storeInfo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
      if (clientSearchContainerRef.current && !clientSearchContainerRef.current.contains(event.target as Node)) {
        setClientSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNoWhatsapp = () => {
    setCustomerData(prev => ({ ...prev, whatsapp: maskPhone('00000000000') }));
    setTimeout(() => {
        nameInputRef.current?.focus();
    }, 100);
  };

  const handleWhatsappBlur = async () => {
    const raw = customerData.whatsapp.replace(/\D/g, '');
    if (raw === '00000000000' || !raw) return;

    if (raw.length >= 10) {
      setIsSearchingClient(true);
      try {
        const client = await getClient(raw);
        if (client) {
          setFoundClient(client);
          setCustomerData(prev => ({ ...prev, name: client.name || prev.name }));
        }
      } catch (e) {
        console.error("Error searching client", e);
      } finally {
        setIsSearchingClient(false);
      }
    }
  };

  const selectSavedAddress = (addr: DeliveryInfo['address']) => {
    setCustomerData(prev => ({
      ...prev,
      cep: addr.cep,
      street: addr.street,
      number: addr.number,
      neighborhood: addr.neighborhood,
      complement: addr.complement || '',
    }));
  };

  const selectClient = (client: Client) => {
      setFoundClient(client);
      setCustomerData(prev => ({
          ...prev,
          name: client.name,
          whatsapp: maskPhone(client.whatsapp || '00000000000'),
      }));
      setClientSearchDropdownOpen(false);
  };

  const filteredClients = useMemo(() => {
      const query = customerData.name.toLowerCase().trim();
      if (!query || query.length < 2) return [];
      return allClients.filter(c => c.name.toLowerCase().includes(query)).slice(0, 5);
  }, [allClients, customerData.name]);

  const addItem = (product: Product | { id: string, name: string, price: number }, option?: ProductOption) => {
    const price = option ? option.price : product.price;
    const optionName = option ? option.name : '';
    
    setSelectedItems(prev => {
      const existingIdx = prev.findIndex(item => item.id === product.id && item.option === optionName);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
        return next;
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price,
        quantity: 1,
        option: optionName,
        observations: ''
      }];
    });
  };

  const handleAddCustomItem = async () => {
    if (!customItem.name || !customItem.price) return;
    const priceNum = parseFloat(customItem.price);
    let productId = `custom-${Date.now()}`;
    if (customItem.saveToMenu) {
        try {
            if (!existingCategories.includes(customItem.category)) await addCategory(customItem.category);
            const newProd = await addProduct({
                name: customItem.name,
                description: 'Adicionado via pedido manual',
                price: priceNum,
                category: customItem.category,
                imageUrls: [],
                leadTimeDays: 0
            });
            productId = newProd.id;
        } catch (e) { console.error("Erro ao salvar produto no cardápio", e); }
    }
    addItem({ id: productId, name: customItem.name, price: priceNum });
    setCustomItem({ name: '', price: '', category: 'Diversos', saveToMenu: false });
    setShowCustomItemForm(false);
  };

  const updateItemQty = (idx: number, delta: number) => {
    setSelectedItems(prev => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], quantity: newQty };
      return next;
    });
  };

  const saveEditedPrice = (newPrice: number) => {
      if (priceEditingIdx === null) return;
      setSelectedItems(prev => {
          const next = [...prev];
          next[priceEditingIdx] = { ...next[priceEditingIdx], price: newPrice };
          return next;
      });
      setPriceEditingIdx(null);
  };

  const filteredProductsBySearch = useMemo(() => {
    if (!searchProduct) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()));
  }, [products, searchProduct]);

  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal + parseFloat(deliveryFee || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.name.trim() || !customerData.whatsapp.trim()) {
        return alert("Nome e WhatsApp são obrigatórios!");
    }
    if (selectedItems.length === 0) return alert("Adicione pelo menos um item");
    
    setIsSubmitting(true);
    try {
      const orderData: any = {
        customer: {
          name: customerData.name.trim(),
          whatsapp: customerData.whatsapp.replace(/\D/g, ''),
        },
        delivery: {
          type: 'delivery',
          address: {
            cep: customerData.cep || '00000-000',
            street: customerData.street || 'Venda Balcão',
            number: customerData.number || 'SN',
            neighborhood: customerData.neighborhood || 'Loja',
            complement: customerData.complement || '',
          }
        },
        items: selectedItems,
        total: subtotal,
        deliveryFee: parseFloat(deliveryFee || '0'),
        paymentMethod,
        deliveryDate: customerData.deliveryDate,
      };
      await addOrder(orderData, true);
      alert("Venda lançada com sucesso!");
      onOrderCreated();
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o pedido. Tente novamente.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-20">
      {priceEditingIdx !== null && (
          <EditPriceModal 
            itemName={selectedItems[priceEditingIdx].name}
            currentPrice={selectedItems[priceEditingIdx].price}
            onSave={saveEditedPrice}
            onClose={() => setPriceEditingIdx(null)}
          />
      )}

      <div className="space-y-6">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-brand-primary rounded-full"></span>
            Dados do Cliente
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={clientSearchContainerRef}>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={customerData.name}
                      onChange={e => {
                          setCustomerData({ ...customerData, name: e.target.value });
                          setClientSearchDropdownOpen(true);
                      }}
                      onFocus={() => setClientSearchDropdownOpen(true)}
                      placeholder="Ex: João Silva"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none"
                      required
                    />
                    {clientSearchDropdownOpen && filteredClients.length > 0 && (
                        <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-slide-in-up">
                            <p className="px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">Sugestões de Clientes</p>
                            {filteredClients.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => selectClient(c)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-brand-secondary/30 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-brand-secondary/50 flex items-center justify-center flex-shrink-0">
                                        <UsersIcon className="w-4 h-4 text-brand-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-brand-text truncate">{c.name}</p>
                                        <p className="text-xs text-gray-500">{c.whatsapp ? maskPhone(c.whatsapp) : 'Sem número'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase">WhatsApp <span className="text-red-500">*</span></label>
                    <button 
                        type="button" 
                        onClick={handleNoWhatsapp}
                        className="text-[10px] font-bold text-brand-primary hover:underline bg-brand-secondary/40 px-2 py-0.5 rounded"
                    >
                        Sem número
                    </button>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={customerData.whatsapp}
                    onChange={e => setCustomerData({ ...customerData, whatsapp: maskPhone(e.target.value) })}
                    onBlur={handleWhatsappBlur}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  />
                  {isSearchingClient && <SpinnerIcon className="absolute right-3 top-2.5 w-4 h-4 text-brand-primary" />}
                </div>
              </div>
            </div>

            {foundClient && foundClient.addresses && foundClient.addresses.length > 0 && (
              <div className="bg-brand-secondary/20 p-3 rounded-lg border border-brand-secondary/30 animate-fade-in">
                <p className="text-xs font-bold text-brand-primary mb-2 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Usar endereço salvo
                </p>
                <div className="flex flex-wrap gap-2">
                  {foundClient.addresses.map((addr, i) => (
                    <button key={i} type="button" onClick={() => selectSavedAddress(addr)} className="text-[10px] bg-white border border-brand-secondary/50 px-2 py-1 rounded hover:bg-brand-secondary transition-colors font-medium shadow-sm text-gray-900">
                      {addr.street}, {addr.number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Agendamento & Entrega</h4>
              <div className="space-y-4">
                <div className="relative" ref={calendarRef}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Entrega</label>
                    <button
                        type="button"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-brand-primary outline-none"
                    >
                        <span>{new Date(customerData.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })}</span>
                        <CalendarIcon className="w-5 h-5 text-gray-400" />
                    </button>
                    {isCalendarOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2">
                            <Calendar
                                selectedDate={customerData.deliveryDate}
                                minDate={new Date().toISOString().split('T')[0]}
                                onDateSelect={(date) => {
                                    setCustomerData({ ...customerData, deliveryDate: date });
                                    setIsCalendarOpen(false);
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                        <input type="text" value={customerData.cep} onChange={e => setCustomerData({ ...customerData, cep: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="00000-000" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logradouro / Rua</label>
                        <input type="text" value={customerData.street} onChange={e => setCustomerData({ ...customerData, street: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ex: Av. Paulista" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                        <input type="text" value={customerData.number} onChange={e => setCustomerData({ ...customerData, number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ex: 123" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                        <input type="text" value={customerData.neighborhood} onChange={e => setCustomerData({ ...customerData, neighborhood: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ex: Centro" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Complemento</label>
                    <input type="text" value={customerData.complement} onChange={e => setCustomerData({ ...customerData, complement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ex: Apto 101, Bloco A" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-brand-accent rounded-full"></span>
            Itens no Pedido
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
            {selectedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 italic text-sm">Adicione produtos &rarr;</p>
              </div>
            ) : (
              selectedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand-primary/20 transition-colors">
                  <div className="min-w-0 flex-grow">
                    <p className="font-bold text-brand-text text-sm truncate">{item.name}</p>
                    {item.option && <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{item.option}</p>}
                    <button type="button" onClick={() => setPriceEditingIdx(idx)} className="text-xs font-bold text-brand-primary bg-brand-secondary/30 px-2 py-0.5 rounded-full mt-1.5 hover:bg-brand-primary hover:text-white transition-all inline-flex items-center gap-1 shadow-sm">
                      {formatPrice(item.price)}
                      <span className="text-[10px] opacity-70 italic">✎ Alterar</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                      <button type="button" onClick={() => updateItemQty(idx, -1)} className="p-1 px-2 hover:bg-gray-100 text-gray-600"><MinusIcon className="w-3 h-3" /></button>
                      <span className="px-3 text-xs font-bold text-brand-text">{item.quantity}</span>
                      <button type="button" onClick={() => updateItemQty(idx, 1)} className="p-1 px-2 hover:bg-gray-100 text-gray-600"><PlusIcon className="w-3 h-3" /></button>
                    </div>
                    <button type="button" onClick={() => updateItemQty(idx, -999)} className="text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 gap-2">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar no cardápio..."
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <button 
                type="button" 
                onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                className={`flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-sm ${
                    showCustomItemForm ? 'bg-red-500 text-white' : 'bg-brand-primary text-white hover:bg-brand-primary-dark'
                }`}
              >
                {showCustomItemForm ? 'Fechar' : '+ Avulso'}
              </button>
          </div>

          {showCustomItemForm && (
              <div className="bg-gray-50 p-5 rounded-xl border border-brand-primary/20 mb-4 animate-slide-in-up shadow-inner">
                  <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-brand-primary rounded-full"></div>
                    Lançar Produto Avulso
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Item</label>
                        <input type="text" placeholder="Ex: Bolo de Pote Extra" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Unitário</label>
                        <input type="number" placeholder="0,00" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm shadow-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <CategorySearchSelect categories={existingCategories} value={customItem.category} onChange={(val) => setCustomItem({...customItem, category: val})} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-brand-secondary/10 transition-colors shadow-sm">
                            <input type="checkbox" checked={customItem.saveToMenu} onChange={e => setCustomItem({...customItem, saveToMenu: e.target.checked})} className="w-5 h-5 text-brand-primary rounded border-gray-300 focus:ring-brand-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-700 uppercase">Gravar no Cardápio Fixo</span>
                                <span className="text-[10px] text-gray-400">Ficará visível para os clientes no site.</span>
                            </div>
                        </label>
                      </div>
                  </div>
                  <button type="button" onClick={handleAddCustomItem} disabled={!customItem.name || !customItem.price} className="w-full mt-5 bg-brand-accent text-brand-primary py-3 rounded-lg text-sm font-black uppercase tracking-widest shadow-md hover:brightness-105 transition-all disabled:opacity-50">
                      Adicionar Item Avulso
                  </button>
              </div>
          )}

          <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
            {filteredProductsBySearch.map(p => (
              <div key={p.id} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:border-brand-primary/30 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-brand-text uppercase opacity-90">{p.name}</h4>
                    {!p.options || p.options.length === 0 ? (
                        <span className="text-sm font-black text-brand-primary">{formatPrice(p.price)}</span>
                    ) : null}
                </div>
                
                {p.options && p.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {p.options.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => addItem(p, opt)}
                                className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-brand-primary hover:text-white transition-all group"
                            >
                                <span className="text-xs font-bold text-gray-600 group-hover:text-white">{opt.name}</span>
                                <span className="text-xs font-black text-brand-primary group-hover:text-white">{formatPrice(opt.price)}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <button 
                        onClick={() => addItem(p)}
                        className="mt-2 w-full py-2 bg-brand-secondary/30 text-brand-primary rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all"
                    >
                        Adicionar
                    </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-brand-primary animate-fade-in">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold text-gray-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-500">Taxa de Entrega</span>
              <div className="relative w-32">
                <span className="absolute left-2 top-1.5 text-xs text-gray-400">R$</span>
                <input type="number" step="0.5" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-lg bg-white text-brand-primary text-sm text-right font-black focus:ring-2 focus:ring-brand-primary outline-none shadow-inner" />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-lg font-bold text-brand-text uppercase tracking-tight">Total Geral</span>
              <span className="text-3xl font-black text-brand-primary drop-shadow-sm">{formatPrice(total)}</span>
            </div>
            <div className="pt-4 border-t border-gray-50">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Forma de Pagamento</label>
              <div className="flex flex-wrap gap-2">
                {paymentOptions.map(option => (
                  <button key={option} type="button" onClick={() => setPaymentMethod(option)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${paymentMethod === option ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary'}`}>
                    {paymentMethod === option && <CheckCircleIcon className="w-3 h-3" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting || selectedItems.length === 0} className="w-full bg-brand-primary text-white font-black py-4 rounded-xl text-lg shadow-xl hover:bg-brand-primary-dark hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4">
              {isSubmitting ? <SpinnerIcon className="w-6 h-6" /> : (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-brand-accent" />
                  FINALIZAR VENDA
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManualOrderView;
