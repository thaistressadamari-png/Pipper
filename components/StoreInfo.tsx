import React, { useMemo } from 'react';
import { ClockIcon } from './IconComponents';
import type { StoreInfoData } from '../types';
import { getStoreStatus } from '../utils';

interface StoreInfoProps {
    storeInfo: StoreInfoData | null;
    isLoading: boolean;
    onOpenModal: () => void;
    onOpenOrderTracker: () => void;
}

const StoreInfo: React.FC<StoreInfoProps> = ({ storeInfo, isLoading, onOpenModal, onOpenOrderTracker }) => {
    const { status } = useMemo(() => {
        const statusResult = getStoreStatus(storeInfo);
        return { status: statusResult };
    }, [storeInfo]);
    
    if (isLoading || !storeInfo) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
                <div className="relative">
                    <div className="h-48 rounded-lg bg-gray-200"></div>
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-300 shadow-md"></div>
                    </div>
                </div>
                <div className="text-center pt-14 pb-6">
                    <div className="h-7 bg-gray-300 rounded w-1/2 mx-auto"></div>
                    <div className="mt-3 h-6 bg-gray-200 rounded-full w-20 mx-auto"></div>
                    <div className="mt-4 h-5 bg-gray-200 rounded w-1/3 mx-auto"></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative">
                <div className="h-48 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url('${storeInfo.coverImageUrl}')` }}>
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                    <img 
                        src={storeInfo.logoUrl}
                        alt={`${storeInfo.name} Logo`} 
                        onClick={onOpenModal}
                        className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md object-cover cursor-pointer"
                    />
                </div>
            </div>
            <div className="text-center pt-14 pb-6">
                <h1 onClick={onOpenModal} className="text-2xl font-bold text-brand-text cursor-pointer">{storeInfo.name}</h1>
                <div className="mt-2" onClick={onOpenModal}>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full cursor-pointer ${status.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status.text}
                    </span>
                </div>
                <div className="mt-3 flex items-center justify-center space-x-4 text-sm text-brand-text-light">
                    <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{storeInfo.hours}</span>
                    </div>
                    <span>•</span>
                    <button onClick={onOpenModal} className="text-brand-primary font-medium hover:underline">Ver mais</button>
                    <span>•</span>
                    <button onClick={onOpenOrderTracker} className="text-brand-primary font-medium hover:underline">Meus Pedidos</button>
                </div>
            </div>
        </div>
    );
}

export default StoreInfo;