import type { StoreInfoData } from './types';

export function getStoreStatus(storeInfo: StoreInfoData | null) {
  if (!storeInfo?.operatingHours) {
    return { isOpen: false, text: 'Fechado - Agendar pedido' };
  }

  const now = new Date();
  const daysMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const dayName = daysMap[now.getDay()];

  const todayHours = storeInfo.operatingHours.find(h => h.day.toUpperCase() === dayName);

  if (!todayHours?.time) {
    return { isOpen: false, text: 'Fechado - Agendar pedido' };
  }

  // More robust regex to handle variations like "11:00-18:00" or "11:00 as 18:00"
  const timeParts = todayHours.time.match(/(\d{1,2}):(\d{2})\s*(?:às|as|-)\s*(\d{1,2}):(\d{2})/i);
  if (!timeParts) {
    return { isOpen: false, text: 'Fechado - Agendar pedido' };
  }

  const [, startHour, startMinute, endHour, endMinute] = timeParts.map(p => parseInt(p, 10));

  if ([startHour, startMinute, endHour, endMinute].some(isNaN)) {
     return { isOpen: false, text: 'Fechado - Agendar pedido' };
  }

  const startTime = new Date();
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date();
  endTime.setHours(endHour, endMinute, 0, 0);

  const isOpenNow = now >= startTime && now <= endTime;
  const statusText = isOpenNow ? 'Aberto' : 'Fechado - Agendar pedido';
  
  return { isOpen: isOpenNow, text: statusText };
}
