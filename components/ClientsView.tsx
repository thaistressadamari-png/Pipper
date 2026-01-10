import React, { useState, useEffect, useMemo } from 'react';
import type { Client, Order, DeliveryInfo } from '../types';
import { getClients, deleteClient, updateClient, getOrdersByClientId, removeClientAddress, syncClientStats } from '../services/menuService';
import { SearchIcon, UsersIcon, TrashIcon, CalendarIcon, ShoppingBagIcon, ChevronRightIcon, XIcon, ArrowLeftIcon, MapPinIcon, SpinnerIcon } from './IconComponents';

const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const maskPhone = (v: string) => {
    return v.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15);
};

const formatWhatsapp = (clientId: string = '') => {
    if (clientId.startsWith('manual-') || clientId === '00000000000') {
        return <span className="text-gray-400 italic">Venda Manual / Balcão</span>;
    }
    return maskPhone(clientId);
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Status que permitem que o cliente seja LISTADO no CRM (Incluindo pending_payment para novos clientes aparecerem)
const VISIBLE_CLIENT_STATUSES = ['new', 'pending_payment', 'confirmed', 'shipped', 'completed'];
// Status que efetivamente contam para o faturamento (Total Gasto)
const REVENUE_ORDER_STATUSES = ['confirmed', 'shipped', 'completed'];

const ConfirmModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    isDanger?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", isDanger = true }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-slide-in-up">
                <div className={`w-16 h-16 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-brand-secondary text-brand-primary'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <TrashIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-brand-text">{title}</h3>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">{message}</p>
                <div className="mt-8 flex flex-col gap-3">
                    <button 
                        onClick={onConfirm} 
                        className={`w-full py-3 ${isDanger ? 'bg-red-600' : 'bg-brand-primary'} text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform`}
                    >
                        {confirmText}
                    </button>
                    <button 
                        onClick={onCancel} 
                        className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditClientModal: React.FC<{ 
    client: Client; 
    onClose: () => void; 
    onSave: (id: string, data: Partial<Client>) => Promise<void> 
}> = ({ client, onClose, onSave }) => {
    const [name, setName] = useState(client.name);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return alert("Nome é obrigatório");
        setIsSaving(true);
        await onSave(client.id, { name: name.trim() });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-slide-in-up">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Editar Cliente</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 bg-brand-primary text-white rounded-lg font-bold disabled:opacity-50">
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClientDetailModal: React.FC<{ 
    client: Client; 
    onClose: () => void;
    onAddressRemoved: () => void;
}> = ({ client, onClose, onAddressRemoved }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [addrToDelete, setAddrToDelete] = useState<DeliveryInfo['address'] | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getOrdersByClientId(client.id);
            setOrders(data);
            setIsLoading(false);
        };
        load();
    }, [client.id]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    const months = [
        { v: 1, n: 'Janeiro' }, { v: 2, n: 'Fevereiro' }, { v: 3, n: 'Março' },
        { v: 4, n: 'Abril' }, { v: 5, n: 'Maio' }, { v: 6, n: 'Junho' },
        { v: 7, n: 'Julho' }, { v: 8, n: 'Agosto' }, { v: 9, n: 'Setembro' },
        { v: 10, n: 'Outubro' }, { v: 11, n: 'Novembro' }, { v: 12, n: 'Dezembro' }
    ];

    const revenueOrders = useMemo(() => {
        return orders.filter(o => REVENUE_ORDER_STATUSES.includes(o.status));
    }, [orders]);

    const filteredRevenueOrders = useMemo(() => {
        return revenueOrders.filter(o => {
            if (!o.createdAt || !o.createdAt.toDate) return false;
            const date = o.createdAt.toDate();
            return date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth;
        });
    }, [revenueOrders, filterYear, filterMonth]);

    const topProducts = useMemo(() => {
        const counts: Record<string, { name: string, qty: number }> = {};
        revenueOrders.forEach(o => {
            o.items.forEach(item => {
                const key = `${item.name}-${item.option || ''}`;
                if (!counts[key]) counts[key] = { name: item.name, qty: 0 };
                counts[key].qty += item.quantity;
            });
        });
        return Object.values(counts).sort((a,b) => b.qty - a.qty).slice(0, 5);
    }, [revenueOrders]);

    const monthTotal = filteredRevenueOrders.reduce((acc, o) => acc + (o.total || 0) + (o.deliveryFee || 0), 0);

    const handleConfirmAddressRemove = async () => {
        if (!addrToDelete) return;
        await removeClientAddress(client.id, addrToDelete);
        setAddrToDelete(null);
        onAddressRemoved();
    };

    return (
        <div className="fixed inset-0 bg-white z-[90] flex flex-col md:inset-x-4 md:inset-y-4 md:rounded-2xl md:shadow-2xl overflow-hidden animate-slide-in-up">
            <header className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeftIcon className="w-6 h-6"/></button>
                    <div>
                        <h2 className="font-bold text-xl text-brand-text">{client.name}</h2>
                        <p className="text-xs text-gray-500">{formatWhatsapp(client.id)}</p>
                    </div>
                </div>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-gray-100 rounded-full"><XIcon className="w-6 h-6"/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 max-w-4xl mx-auto w-full no-scrollbar">
                <section className="bg-gray-50 p-4 rounded-xl flex flex-wrap gap-4 items-end border border-gray-100">
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mês</label>
                        <select 
                            value={filterMonth} 
                            onChange={e => setFilterMonth(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border bg-white text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ano</label>
                        <select 
                            value={filterYear} 
                            onChange={e => setFilterYear(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border bg-white text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col items-end">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Faturamento Confirmado</p>
                        <p className="text-2xl font-black text-brand-primary">{formatPrice(monthTotal)}</p>
                    </div>
                </section>

                {isLoading ? (
                    <div className="text-center py-20"><p className="animate-pulse text-gray-400 font-bold">Acessando histórico de pedidos...</p></div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <ShoppingBagIcon className="w-5 h-5 text-brand-primary"/>
                                    Produtos Mais Comprados
                                </h3>
                                {topProducts.length > 0 ? (
                                    <div className="space-y-4">
                                        {topProducts.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg">
                                                <span className="text-gray-700 font-medium">{p.name}</span>
                                                <span className="bg-brand-secondary text-brand-primary px-2 py-0.5 rounded-full font-bold text-xs">
                                                    {p.qty} un
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sem vendas confirmadas para este cliente.</p>
                                )}
                            </section>

                            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <MapPinIcon className="w-5 h-5 text-brand-primary"/>
                                    Endereços Cadastrados
                                </h3>
                                <div className="space-y-3">
                                    {client.addresses?.length > 0 ? client.addresses.map((addr, i) => (
                                        <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg group">
                                            <div className="text-xs text-gray-600">
                                                <p className="font-bold text-brand-text">{addr.street}, {addr.number}</p>
                                                <p>{addr.neighborhood} - {addr.cep}</p>
                                            </div>
                                            <button 
                                                onClick={() => setAddrToDelete(addr)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )) : <p className="text-sm text-gray-400">Nenhum endereço salvo.</p>}
                                </div>
                            </section>
                        </div>

                        <section>
                            <h3 className="font-bold text-gray-800 mb-4 px-1">Histórico de Pedidos Pagos</h3>
                            <div className="space-y-3">
                                {filteredRevenueOrders.length > 0 ? filteredRevenueOrders.map(o => (
                                    <div key={o.id} className="bg-white border p-4 rounded-xl shadow-sm group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[10px] font-bold text-brand-primary bg-brand-secondary px-1.5 py-0.5 rounded">#{o.orderNumber}</span>
                                                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(o.createdAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-brand-text">{formatPrice((o.total || 0) + (o.deliveryFee || 0))}</p>
                                                <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 rounded">Pedido Pago</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 line-clamp-2 mt-2">
                                            {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-sm text-gray-400">Nenhum pedido pago neste mês.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>

            <ConfirmModal 
                isOpen={!!addrToDelete}
                title="Excluir Endereço?"
                message="Deseja remover este endereço dos favoritos deste cliente?"
                confirmText="Excluir Endereço"
                onConfirm={handleConfirmAddressRemove}
                onCancel={() => setAddrToDelete(null)}
            />
        </div>
    );
};

const ClientCard: React.FC<{ 
    client: Client; 
    onEdit: (c: Client) => void; 
    onDelete: (c: Client) => void;
    onView: (c: Client) => void;
}> = ({ client, onEdit, onDelete, onView }) => {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md flex flex-col group">
            <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-grow cursor-pointer" onClick={() => onView(client)}>
                    <h3 className="text-lg font-bold text-brand-text truncate pr-2 group-hover:text-brand-primary transition-colors">{client.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                        {formatWhatsapp(client.id)}
                    </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onEdit(client)}
                        className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-secondary/30 rounded-lg"
                        title="Editar Nome"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button 
                        onClick={() => onDelete(client)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Excluir Cliente"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Total Gasto</p>
                    <p className="text-sm font-bold text-brand-text">{formatPrice(client.totalSpent)}</p>
                </div>
                <div className="flex-1 bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Pedidos Pagos</p>
                    <p className="text-sm font-bold text-brand-text">{client.totalOrders || 0}</p>
                </div>
            </div>

            <button 
                onClick={() => onView(client)}
                className="mt-4 w-full py-2 bg-brand-secondary/40 text-brand-primary text-xs font-bold rounded-lg hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2"
            >
                Ver Detalhes & Histórico
                <ChevronRightIcon className="w-3 h-3" />
            </button>
        </div>
    );
};

const ClientsView: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await getClients();
        setClients(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadClients();
    }, []);

    const filteredClients = useMemo(() => {
        return clients.filter(c => 
            c.name.toLowerCase().includes(search.toLowerCase()) || 
            c.id.includes(search.replace(/\D/g, ''))
        );
    }, [clients, search]);

    const handleSaveClient = async (id: string, data: Partial<Client>) => {
        await updateClient(id, data);
        setEditingClient(null);
        loadClients();
    };

    const handleDeleteClient = async () => {
        if (!clientToDelete) return;
        await deleteClient(clientToDelete.id);
        setClientToDelete(null);
        loadClients();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar por nome ou WhatsApp..."
                        className="w-full bg-gray-50 border-transparent rounded-full py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="flex-shrink-0 px-4 py-2 bg-brand-secondary/30 rounded-lg text-xs font-bold text-brand-primary uppercase flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    {clients.length} Clientes Base
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-48 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2 mb-8"></div>
                            <div className="flex gap-2">
                                <div className="h-10 bg-gray-50 rounded flex-1"></div>
                                <div className="h-10 bg-gray-50 rounded flex-1"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard 
                            key={client.id} 
                            client={client} 
                            onEdit={setEditingClient} 
                            onDelete={setClientToDelete}
                            onView={setViewingClient}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhum cliente encontrado.</p>
                </div>
            )}

            {editingClient && (
                <EditClientModal 
                    client={editingClient} 
                    onClose={() => setEditingClient(null)} 
                    onSave={handleSaveClient} 
                />
            )}

            {viewingClient && (
                <ClientDetailModal 
                    client={viewingClient} 
                    onClose={() => setViewingClient(null)}
                    onAddressRemoved={loadClients}
                />
            )}

            <ConfirmModal 
                isOpen={!!clientToDelete}
                title="Excluir Cliente?"
                message="Deseja apagar os dados deste cliente? Isso NÃO apagará os pedidos dele no banco de dados, apenas o cadastro no CRM."
                confirmText="Excluir Cliente"
                onConfirm={handleDeleteClient}
                onCancel={() => setClientToDelete(null)}
            />
        </div>
    );
};

export default ClientsView;