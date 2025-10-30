import React, { useMemo } from 'react';
import type { StoreInfoData } from '../types';
import { ClockIcon, XIcon, TruckIcon } from './IconComponents';
import { getStoreStatus } from '../utils';

interface StoreInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeInfo: StoreInfoData | null;
}

const StoreInfoModal: React.FC<StoreInfoModalProps> = ({ isOpen, onClose, storeInfo }) => {

  const { status, currentDayName } = useMemo(() => {
    const statusResult = getStoreStatus(storeInfo);
    
    const now = new Date();
    const daysMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const dayName = daysMap[now.getDay()];

    const finalStatusText = statusResult.isOpen ? 'Aberto Agora' : statusResult.text;

    return { status: { ...statusResult, text: finalStatusText }, currentDayName: dayName };

  }, [storeInfo]);
  
  if (!storeInfo) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 flex items-center justify-center p-4 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-info-title"
      >
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-colors z-20"
                aria-label="Fechar"
            >
                <XIcon className="w-5 h-5"/>
            </button>
            
            <div className="overflow-y-auto no-scrollbar">
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url('${storeInfo.coverImageUrl}')` }}></div>

                <div className="flex flex-col items-center -mt-12 z-10">
                    <img 
                        src={storeInfo.logoUrl}
                        alt={`${storeInfo.name} Logo`} 
                        className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg object-cover"
                    />
                    <h1 id="store-info-title" className="mt-4 text-2xl font-bold text-brand-text capitalize">{storeInfo.name}</h1>
                    <div className="mt-2 flex items-center space-x-2 text-sm text-brand-text-light">
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                        <span>{storeInfo.hours}</span>
                    </div>
                </div>
                    
                <div className="px-6 pb-6 pt-6">

                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <h2 className="text-lg font-bold text-brand-text">Opções de Atendimento</h2>
                        <div className="mt-3 space-y-3">
                            <div className="border border-gray-200 rounded-lg p-4 flex items-center space-x-4">
                                <TruckIcon className="w-6 h-6 text-brand-text"/>
                                <div>
                                    <p className="font-semibold text-brand-text">Entrega (Delivery)</p>
                                    <p className="text-sm text-gray-500">Todos os pedidos são entregues no seu endereço.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-brand-text">Horário de funcionamento</h2>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status.text}</span>
                        </div>
                        <ul className="mt-4 space-y-2 text-brand-text-light">
                            {storeInfo.operatingHours.map(item => (
                                <li key={item.day} className={`flex justify-between ${item.day.toUpperCase() === currentDayName ? 'font-bold text-brand-text' : ''}`}>
                                    <span>{item.day}</span>
                                    <span>{item.time}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {storeInfo.paymentMethods?.online?.length > 0 && (
                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <h2 className="text-lg font-bold text-brand-text">Formas de Pagamento</h2>
                            <div className="mt-3">
                                <p className="text-sm font-medium text-brand-text mb-2">Pagamento online:</p>
                                <div className="flex flex-wrap gap-2">
                                    {storeInfo.paymentMethods.online.map(method => (
                                        <div key={method} className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-2">
                                            <span>{method}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default StoreInfoModal;
