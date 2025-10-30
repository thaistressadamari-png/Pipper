import React, { useMemo } from 'react';
import { ClockIcon } from './IconComponents';
import type { StoreInfoData } from '../types';

interface StoreInfoProps {
    storeInfo: StoreInfoData | null;
    isLoading: boolean;
    onOpenModal: () => void;
}

const StoreInfo: React.FC<StoreInfoProps> = ({ storeInfo, isLoading, onOpenModal }) => {
    const { status } = useMemo(() => {
        if (!storeInfo) return { status: { isOpen: false, text: 'Fechado - Agendar pedido' }};
        
        const now = new Date();
        const daysMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dayName = daysMap[now.getDay()];

        const todayHours = storeInfo.operatingHours.find(h => h.day.toUpperCase() === dayName);

        if (!todayHours) {
            return { status: { isOpen: false, text: 'Fechado - Agendar pedido' }};
        }

        const timeParts = todayHours.time.match(/(\d{2}):(\d{2}) às (\d{2}):(\d{2})/);
        if (!timeParts) {
            return { status: { isOpen: false, text: 'Fechado - Agendar pedido' }};
        }

        const [, startHour, startMinute, endHour, endMinute] = timeParts.map(p => parseInt(p));

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);

        const isOpenNow = now >= startTime && now <= endTime;
        const statusText = isOpenNow ? 'Aberto' : 'Fechado - Agendar pedido';

        return { status: { isOpen: isOpenNow, text: statusText }};

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
                    <a href="#" onClick={(e) => { e.preventDefault(); onOpenModal(); }} className="text-brand-primary font-medium hover:underline">Ver mais</a>
                </div>
            </div>
        </div>
    );
}

export default StoreInfo;