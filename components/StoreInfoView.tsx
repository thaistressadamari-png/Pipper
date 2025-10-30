import React, { useState, useEffect } from 'react';
import type { StoreInfoData, OperatingHours } from '../types';
import { TrashIcon } from './IconComponents';

interface StoreInfoViewProps {
  storeInfo: StoreInfoData | null;
  categories: string[];
  onUpdateStoreInfo: (storeInfoData: StoreInfoData) => Promise<void>;
}

const StoreInfoView: React.FC<StoreInfoViewProps> = ({ storeInfo, categories, onUpdateStoreInfo }) => {
  const [storeInfoForm, setStoreInfoForm] = useState<StoreInfoData | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newPickupLocation, setNewPickupLocation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialStoreInfo = storeInfo ? JSON.parse(JSON.stringify(storeInfo)) : null;
    if (initialStoreInfo) {
        if (!initialStoreInfo.paymentMethods) {
            initialStoreInfo.paymentMethods = { online: [] };
        }
        if (!initialStoreInfo.pickupLocations) {
            initialStoreInfo.pickupLocations = [];
        }
        if (!initialStoreInfo.deliveryCategories) {
            initialStoreInfo.deliveryCategories = [];
        }
    }
    setStoreInfoForm(initialStoreInfo);
  }, [storeInfo]);
  
  const handleStoreInfoFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!storeInfoForm) return;
    const { name, value } = e.target;
    setStoreInfoForm(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const addPaymentMethod = () => {
    if (!newPaymentMethod.trim() || !storeInfoForm) return;
    setStoreInfoForm(prev => {
        if (!prev) return null;
        const currentOnlineMethods = prev.paymentMethods?.online || [];
        const updatedOnlineMethods = [...currentOnlineMethods, newPaymentMethod.trim()];
        const updatedPaymentMethods = {
            ...(prev.paymentMethods || {}),
            online: updatedOnlineMethods
        };
        return { ...prev, paymentMethods: updatedPaymentMethods };
    });
    setNewPaymentMethod('');
  };

  const removePaymentMethod = (indexToRemove: number) => {
      if (!storeInfoForm) return;
      setStoreInfoForm(prev => {
          if (!prev) return null;
          const currentOnlineMethods = prev.paymentMethods?.online || [];
          const updatedOnlineMethods = currentOnlineMethods.filter((_, index) => index !== indexToRemove);
          const updatedPaymentMethods = {
              ...(prev.paymentMethods || {}),
              online: updatedOnlineMethods
          };
          return { ...prev, paymentMethods: updatedPaymentMethods };
      });
  };

   const addPickupLocation = () => {
    if (!newPickupLocation.trim() || !storeInfoForm) return;
    setStoreInfoForm(prev => {
      if (!prev) return null;
      const updatedLocations = [...(prev.pickupLocations || []), newPickupLocation.trim()];
      return { ...prev, pickupLocations: updatedLocations };
    });
    setNewPickupLocation('');
  };

  const removePickupLocation = (indexToRemove: number) => {
    if (!storeInfoForm) return;
    setStoreInfoForm(prev => {
      if (!prev) return null;
      const updatedLocations = (prev.pickupLocations || []).filter((_, index) => index !== indexToRemove);
      return { ...prev, pickupLocations: updatedLocations };
    });
  };
  
   const handleDeliveryCategoryChange = (categoryName: string) => {
    if (!storeInfoForm) return;
    setStoreInfoForm(prev => {
      if (!prev) return null;
      const currentCategories = prev.deliveryCategories || [];
      const newCategories = currentCategories.includes(categoryName)
        ? currentCategories.filter(c => c !== categoryName)
        : [...currentCategories, categoryName];
      return { ...prev, deliveryCategories: newCategories };
    });
  };

  const handleOperatingHoursChange = (index: number, field: keyof OperatingHours, value: string) => {
    if (!storeInfoForm) return;
    const updatedHours = [...storeInfoForm.operatingHours];
    updatedHours[index] = { ...updatedHours[index], [field]: value };
    setStoreInfoForm(prev => prev ? { ...prev, operatingHours: updatedHours } : null);
  };

  const addOperatingHour = () => {
      if (!storeInfoForm) return;
      const newHours: OperatingHours[] = [...storeInfoForm.operatingHours, { day: '', time: '' }];
      setStoreInfoForm(prev => prev ? { ...prev, operatingHours: newHours } : null);
  };

  const removeOperatingHour = (index: number) => {
      if (!storeInfoForm) return;
      const updatedHours = storeInfoForm.operatingHours.filter((_, i) => i !== index);
      setStoreInfoForm(prev => prev ? { ...prev, operatingHours: updatedHours } : null);
  };

  const handleStoreInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeInfoForm) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
        await onUpdateStoreInfo(storeInfoForm);
        setMessage({ type: 'success', text: 'Informações da loja atualizadas com sucesso!' });
    } catch (error) {
        setMessage({ type: 'error', text: 'Erro ao atualizar as informações.' });
    } finally {
        setIsSubmitting(false);
        setTimeout(() => setMessage(null), 5000);
    }
  };
  
  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-900";

  if (!storeInfoForm) {
      return <div>Carregando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
        <h2 className="text-2xl font-bold text-brand-text mb-6">Informações da Loja</h2>
        <form onSubmit={handleStoreInfoSubmit} className="space-y-6">
            <div>
                <label htmlFor="store-name" className="block text-sm font-medium text-brand-text-light">Nome da Confeitaria</label>
                <input type="text" name="name" id="store-name" value={storeInfoForm.name} onChange={handleStoreInfoFormChange} className={inputStyles} required />
            </div>
            <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-brand-text-light">URL do Logo</label>
                <input type="url" name="logoUrl" id="logoUrl" value={storeInfoForm.logoUrl} onChange={handleStoreInfoFormChange} className={inputStyles} required placeholder="https://.../logo.svg"/>
            </div>
            <div>
                <label htmlFor="coverImageUrl" className="block text-sm font-medium text-brand-text-light">URL da Imagem de Capa</label>
                <input type="url" name="coverImageUrl" id="coverImageUrl" value={storeInfoForm.coverImageUrl} onChange={handleStoreInfoFormChange} className={inputStyles} required placeholder="https://.../cover.jpg"/>
            </div>
            <div>
                <label htmlFor="hours" className="block text-sm font-medium text-brand-text-light">Tempo de Entrega</label>
                <input type="text" name="hours" id="hours" value={storeInfoForm.hours} onChange={handleStoreInfoFormChange} className={inputStyles} required placeholder="Ex: 90-100min"/>
            </div>
                <div>
                <label className="block text-sm font-medium text-brand-text-light">Categorias com Delivery</label>
                <div className="mt-2 space-y-2 p-3 border border-gray-200 rounded-md">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`delivery-cat-${cat}`}
                                checked={storeInfoForm.deliveryCategories?.includes(cat) ?? false}
                                onChange={() => handleDeliveryCategoryChange(cat)}
                                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                            />
                            <label htmlFor={`delivery-cat-${cat}`} className="ml-3 text-sm text-gray-700">{cat}</label>
                        </div>
                    ))}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-brand-text-light">Horário de Funcionamento (Detalhado)</label>
                <div className="space-y-2 mt-1">
                    {storeInfoForm.operatingHours.map((hour, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" placeholder="Dia (Ex: TER)" value={hour.day} onChange={(e) => handleOperatingHoursChange(index, 'day', e.target.value)} className={inputStyles + ' w-1/3'} />
                            <input type="text" placeholder="Horário (Ex: 11:00 às 18:00)" value={hour.time} onChange={(e) => handleOperatingHoursChange(index, 'time', e.target.value)} className={inputStyles + ' flex-grow'} />
                            <button type="button" onClick={() => removeOperatingHour(index)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addOperatingHour} className="mt-2 text-sm font-medium text-brand-primary hover:underline">
                    + Adicionar horário
                </button>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-brand-text-light">Formas de Pagamento Online</label>
                <div className="space-y-2 mt-1">
                    {storeInfoForm.paymentMethods?.online.map((method, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <span className="text-sm text-gray-800">{method}</span>
                            <button type="button" onClick={() => removePaymentMethod(index)} className="p-1 text-gray-400 hover:text-red-600">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="text" 
                        value={newPaymentMethod} 
                        onChange={(e) => setNewPaymentMethod(e.target.value)} 
                        className={inputStyles + ' flex-grow'} 
                        placeholder="Adicionar novo método" 
                    />
                    <button type="button" onClick={addPaymentMethod} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark">Adicionar</button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-text-light">Pontos de Retirada</label>
                <div className="space-y-2 mt-1">
                    {storeInfoForm.pickupLocations?.map((location, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <span className="text-sm text-gray-800">{location}</span>
                            <button type="button" onClick={() => removePickupLocation(index)} className="p-1 text-gray-400 hover:text-red-600">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="text" 
                        value={newPickupLocation} 
                        onChange={(e) => setNewPickupLocation(e.target.value)} 
                        className={inputStyles + ' flex-grow'} 
                        placeholder="Adicionar novo ponto de retirada" 
                    />
                    <button type="button" onClick={addPickupLocation} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark">Adicionar</button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}
            <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {isSubmitting ? 'Salvando...' : 'Salvar Informações'}
                </button>
            </div>
        </form>
    </div>
  );
};

export default StoreInfoView;
