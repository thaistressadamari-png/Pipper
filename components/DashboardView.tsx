import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Product, Order } from '../types';
import { getOrdersByDateRange, getVisitCountByDateRange } from '../services/menuService';
import { CalendarIcon } from './IconComponents';
import Calendar from './Calendar';

interface DashboardViewProps {
  products: Product[];
}

const StatCard: React.FC<{ title: string; value: string; note?: string }> = ({ title, value, note }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-bold text-brand-text">{value}</p>
        {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
);

const DateRangePicker: React.FC<{ 
    label: string; 
    onRangeChange: (start: Date, end: Date) => void 
}> = ({ label, onRangeChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);

    const handleRangeSelect = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
        if (start && end) {
            const startDateObj = new Date(start + 'T00:00:00');
            const endDateObj = new Date(end + 'T23:59:59');
            onRangeChange(startDateObj, endDateObj);
            setIsOpen(false);
        }
    };
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm text-gray-900 font-medium flex items-center gap-2"
            >
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span>{label}</span>
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 z-20">
                        <Calendar
                            mode="range"
                            minDate="2020-01-01"
                            startDate={startDate}
                            endDate={endDate}
                            onRangeSelect={handleRangeSelect}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ products }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [chartOrders, setChartOrders] = useState<Order[]>([]);
    const [visitCount, setVisitCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRangeLabel, setDateRangeLabel] = useState('Últimos 30 dias');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const setDateRange = useCallback((label: string, days?: number, customRange?: { start: Date, end: Date }) => {
        setIsLoading(true);
        setError(null);
        setDateRangeLabel(label);
        
        const end = customRange ? customRange.end : new Date();
        const start = customRange ? customRange.start : new Date();
        
        if (days !== undefined) {
          start.setDate(start.getDate() - days);
        } 
        
        if (days === 0) { // Today
          start.setHours(0, 0, 0, 0);
        }

        Promise.all([
            getOrdersByDateRange(start, end),
            getVisitCountByDateRange(start, end)
        ]).then(([fetchedOrders, fetchedVisits]) => {
            setOrders(fetchedOrders);
            setVisitCount(fetchedVisits);
        }).catch(() => {
            setError("Falha ao buscar dados do dashboard.");
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        // Initial fetch for stats (last 30 days)
        setDateRange('Últimos 30 dias', 30);

        // Fetch for chart (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);
        
        getOrdersByDateRange(sixMonthsAgo, new Date())
            .then(setChartOrders)
            .catch(() => setError("Falha ao buscar dados do gráfico."));

    }, [setDateRange]);
    
    const productsById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const stats = useMemo(() => {
        const confirmedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'completed');
        
        const revenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const newOrdersCount = confirmedOrders.length;

        const productCounts = new Map<string, { name: string; count: number; imageUrl: string }>();
        confirmedOrders.forEach(order => {
            if (!Array.isArray(order.items)) return;

            order.items.forEach(item => {
                if (!item || !item.id || !item.name) return;
                
                const productInfo = productsById.get(item.id);
                const imageUrl = productInfo?.imageUrls?.[0] || 'https://via.placeholder.com/150';

                const existing = productCounts.get(item.id) || { name: item.name, count: 0, imageUrl };
                const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0;
                productCounts.set(item.id, { ...existing, count: existing.count + quantity });
            });
        });

        const topProducts = Array.from(productCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
            
        return { revenue, newOrdersCount, topProducts };
    }, [orders, productsById]);


    const { monthlyChartData, yAxisMax } = useMemo(() => {
        const confirmedChartOrders = chartOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
        const data = new Map<string, { revenue: number, monthLabel: string }>();
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('pt-BR', { month: 'short' });
            data.set(monthKey, { revenue: 0, monthLabel });
        }

        confirmedChartOrders.forEach(order => {
            if (!order.createdAt || typeof order.createdAt.toDate !== 'function') {
                console.warn('Skipping order with invalid createdAt field:', order.id);
                return;
            }
            const orderDate = order.createdAt.toDate();
            if (isNaN(orderDate.getTime())) return;

            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

            if (data.has(monthKey)) {
                const current = data.get(monthKey)!;
                data.set(monthKey, { 
                    ...current, 
                    revenue: current.revenue + (order.total || 0) 
                });
            }
        });
        
        const calculatedData = Array.from(data.entries()).map(([key, value]) => ({...value, key}));
        const maxRevenue = Math.max(...calculatedData.map(d => d.revenue));
        
        const calculatedYAxisMax = maxRevenue > 0 ? Math.ceil(maxRevenue / 50) * 50 : 100;

        return { monthlyChartData: calculatedData, yAxisMax: calculatedYAxisMax };
    }, [chartOrders]);

    const formatCurrency = (value: number) => {
      if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
      }
      return `R$ ${value.toFixed(0)}`;
    };

    const yAxisLabels = useMemo(() => {
        if (yAxisMax === 0) return ['R$ 0'];
        return [
            formatCurrency(yAxisMax),
            formatCurrency(yAxisMax * 0.75),
            formatCurrency(yAxisMax * 0.5),
            formatCurrency(yAxisMax * 0.25),
            'R$ 0'
        ];
    }, [yAxisMax]);
    
    const handleRangeChange = (start: Date, end: Date) => {
      const label = `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
      setDateRange(label, undefined, { start, end });
    };

    const dropdownOptions = [
      { label: 'Hoje', days: 0 },
      { label: 'Últimos 7 dias', days: 7 },
      { label: 'Últimos 30 dias', days: 30 },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-end items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm text-gray-900 font-medium"
                    >
                        {dateRangeLabel}
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            {dropdownOptions.map(opt => (
                                <button key={opt.label} onClick={() => { setDateRange(opt.label, opt.days); setIsDropdownOpen(false); }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <DateRangePicker label="Período Personalizado" onRangeChange={handleRangeChange} />
            </div>

            {isLoading ? (
                <div className="text-center text-gray-500">Carregando dados...</div>
            ) : error ? (
                <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Faturamento Confirmado" value={stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} note="Apenas pedidos confirmados/finalizados" />
                        <StatCard title="Pedidos Confirmados" value={String(stats.newOrdersCount)} note="Apenas pedidos confirmados/finalizados" />
                        <StatCard title="Visitas no Período" value={visitCount.toLocaleString('pt-BR')} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-bold text-brand-text mb-4">Faturamento Confirmado (Últimos 6 meses)</h3>
                            <div className="h-72 flex gap-4">
                                <div className="flex flex-col justify-between text-right text-xs font-medium text-gray-400">
                                    {yAxisLabels.map(label => <span key={label}>{label}</span>)}
                                </div>
                                <div className="flex-grow flex justify-around gap-2 border-b border-l border-gray-200 pl-2">
                                    {monthlyChartData.map(data => (
                                        <div key={data.key} className="flex flex-col justify-end text-center w-full flex-grow pt-5">
                                            {data.revenue > 0 && (
                                                <span className="text-xs md:text-sm font-semibold text-brand-primary mb-1 whitespace-nowrap">
                                                    {data.revenue.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0,
                                                    })}
                                                </span>
                                            )}
                                            <div 
                                                className="w-full bg-brand-secondary rounded-t-md hover:bg-brand-primary/80 transition-colors"
                                                style={{ height: yAxisMax > 0 ? `${(data.revenue / yAxisMax) * 100}%` : '0%' }}
                                                title={data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            ></div>
                                            <span className="text-xs font-medium text-gray-500 mt-2 uppercase">{data.monthLabel}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-bold text-brand-text mb-4">Produtos Mais Populares (Confirmados)</h3>
                            {stats.topProducts.length > 0 ? (
                                <ul className="space-y-6">
                                    {stats.topProducts.map((product, index) => (
                                        <li key={product.name + index} className="flex items-center gap-5">
                                             <span className="text-2xl font-bold text-gray-300 w-8 text-center">{index + 1}</span>
                                            <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-bold text-brand-text text-lg leading-tight">{product.name}</p>
                                                <p className="text-base text-gray-500">{product.count} {product.count === 1 ? 'unidade' : 'unidades'}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-8">Nenhum pedido confirmado para este período.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardView;