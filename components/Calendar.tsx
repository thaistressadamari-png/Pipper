import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface CalendarProps {
  selectedDate?: string; // YYYY-MM-DD
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  minDate: string; // YYYY-MM-DD
  onDateSelect?: (date: string) => void;
  onRangeSelect?: (start: string, end: string) => void;
  mode?: 'single' | 'range';
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  startDate = null,
  endDate = null,
  minDate,
  onDateSelect,
  onRangeSelect,
  mode = 'single',
}) => {
  const initialDisplayDate = new Date(((mode === 'single' ? selectedDate : startDate) || minDate) + 'T00:00:00');
  const [displayDate, setDisplayDate] = useState(initialDisplayDate);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const selected = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const start = startDate ? new Date(startDate + 'T00:00:00') : null;
  const end = endDate ? new Date(endDate + 'T00:00:00') : null;
  const minimum = new Date(minDate + 'T00:00:00');

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    if (mode === 'single' && onDateSelect) {
        onDateSelect(dateString);
    } else if (mode === 'range' && onRangeSelect) {
        if (!start || (start && end)) { // No start date, or range is complete
            onRangeSelect(dateString, ''); // Start new range
        } else if (start && !end) { // Start date is set, now set end date
            if (date < start) {
                onRangeSelect(dateString, start.toISOString().split('T')[0]); // New start is earlier
            } else {
                onRangeSelect(start.toISOString().split('T')[0], dateString); // Complete the range
            }
        }
    }
  };

  const changeMonth = (amount: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };
  
  const lastDayOfPrevMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 0);
  const isPrevMonthDisabled = lastDayOfPrevMonth < minimum;

  const monthYearFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const month = displayDate.getMonth();
  const year = displayDate.getFullYear();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`blank-${i}`} className="w-10 h-10"></div>);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isDisabled = date < minimum;

    const isSelected = mode === 'single' && selected && selected.getTime() === date.getTime();
    const isStartDate = mode === 'range' && start && start.getTime() === date.getTime();
    const isEndDate = mode === 'range' && end && end.getTime() === date.getTime();
    
    let isInRange = false;
    if (mode === 'range' && start && !end && hoveredDate) { // Hovering to select end date
        isInRange = (date > start && date <= hoveredDate) || (date < start && date >= hoveredDate);
    } else if (mode === 'range' && start && end) { // Range is selected
        isInRange = date > start && date < end;
    }
    
    let baseClasses = 'w-10 h-10 flex items-center justify-center transition-colors duration-200 text-sm';
    let stateClasses = '';
    
    if (isDisabled) {
        stateClasses = ' text-gray-300 cursor-not-allowed';
    } else if (isStartDate || isEndDate) {
        stateClasses = ' bg-brand-primary text-white font-bold rounded-full';
    } else if (isSelected) {
        stateClasses = ' bg-brand-primary text-white font-bold rounded-full';
    } else if (isInRange) {
        stateClasses = ' bg-brand-secondary text-brand-primary';
    } else {
        stateClasses = ' text-gray-700 hover:bg-brand-secondary rounded-full cursor-pointer';
    }

    cells.push(
      <button 
        key={day} 
        type="button"
        className={baseClasses + stateClasses} 
        onClick={() => !isDisabled && handleDateClick(date)}
        onMouseEnter={() => !isDisabled && setHoveredDate(date)}
        onMouseLeave={() => setHoveredDate(null)}
        disabled={isDisabled}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-lg animate-fade-in-up">
        <style>{`.animate-fade-in-up { animation: fadeInUp 0.3s ease-out; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={() => changeMonth(-1)} disabled={isPrevMonthDisabled} className="p-2 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h3 className="font-bold capitalize text-brand-text">{monthYearFormat.format(displayDate)}</h3>
        <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full text-gray-600 hover:bg-gray-100">
            <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-medium mb-2">
        {weekdays.map((day, i) => <div key={i} className="w-10 h-10 flex items-center justify-center">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 justify-items-center gap-y-1">
        {cells}
      </div>
    </div>
  );
};

export default Calendar;