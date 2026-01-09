
import React, { useState, useEffect, useMemo } from 'react';
import type { Client, Order, DeliveryInfo } from '../types';
import { getClients, deleteClient, updateClient, getOrdersByClientId, removeClientAddress, syncClientStats } from '../services/menuService';
import { SearchIcon, UsersIcon, TrashIcon, CalendarIcon, ShoppingBagIcon, ChevronRightIcon, XIcon, ArrowLeftIcon, MapPinIcon, SpinnerIcon } from './IconComponents';

const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Máscara rigorosa de telefone (XX) XXXXX-XXXX
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

// REGRA DE OURO: Apenas estes status contam como venda/faturamento
const VALID_ORDER_STATUSES = ['confirmed', 'shipped', 'completed'];

// --- COMPONENTE DE MODAL DE CONFIRMAÇÃO ---
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
            // Sincroniza estatísticas antes de carregar detalhes para garantir que 
            // pedidos deletados foram removidos do resumo do cliente
            await syncClientStats(client.id);
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

    const validOrders = useMemo(() => {
        return orders.filter(o => VALID_ORDER_STATUSES.includes(o.status));
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return validOrders.filter(o => {
            if (!o.createdAt || !o.createdAt.toDate) return false;
            const date = o.createdAt.toDate();
            return date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth;
        });
    }, [validOrders, filterYear, filterMonth]);

    const topProducts = useMemo(() => {
        const counts: Record<string, { name: string, qty: number }> = {};
        validOrders.forEach(o => {
            o.items.forEach(item => {
                const key = `${item.name}-${item.option || ''}`;
                if (!counts[key]) counts[key] = { name: item.name, qty: 0 };
                counts[key].qty += item.quantity;
            });
        });
        return Object.values(counts).sort((a,b) => b.qty - a.qty).slice(0, 5);
    }, [validOrders]);

    const monthTotal = filteredOrders.reduce((acc, o) => acc + (o.total || 0) + (o.deliveryFee || 0), 0);

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
                                {filteredOrders.length > 0 ? filteredOrders.map(o => (
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
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button 
                        onClick={() => onDelete(client)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pedidos Pagos</p>
                    <p className="text-sm font-bold text-gray-700">{client.totalOrders}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Faturamento</p>
                    <p className="text-sm font-bold text-brand-primary">{formatPrice(client.totalSpent)}</p>
                </div>
            </div>

            <button 
                onClick={() => onView(client)}
                className="mt-5 w-full py-2.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-brand-secondary hover:text-brand-primary transition-colors flex items-center justify-center gap-2"
            >
                Ver Histórico Completo
                <ChevronRightIcon className="w-3 h-3"/>
            </button>
        </div>
    );
};

const ClientsView: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [detailedClient, setDetailedClient] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const data = await getClients();
            // Para cada cliente, vamos sincronizar as estatísticas ao carregar o CRM pela primeira vez
            // para limpar dados de pedidos apagados
            const syncPromises = data.map(c => syncClientStats(c.id));
            await Promise.all(syncPromises);
            
            // Recarregar os dados após a sincronização
            const syncedData = await getClients();
            setClients(syncedData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);
    
    const handleUpdate = async (id: string, data: Partial<Client>) => {
        await updateClient(id, data);
        setEditingClient(null);
        fetchClients();
    };

    const handleConfirmDeleteClient = async () => {
        if (!clientToDelete) return;
        setIsProcessing(true);
        try {
            const rawId = clientToDelete.id.replace(/\D/g, '') || clientToDelete.id;
            await deleteClient(rawId);
            setClientToDelete(null);
            fetchClients();
        } catch (e) {
            alert("Erro ao excluir cliente.");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredClients = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const queryClean = query.replace(/\D/g, '');

        return clients.filter(client =>
            client.name.toLowerCase().includes(query) ||
            client.id.includes(queryClean)
        );
    }, [clients, searchQuery]);

    if (isLoading) return <div className="text-center py-20 text-gray-400 animate-pulse font-bold">Carregando CRM...</div>;

    return (
        <div className="space-y-6 relative">
            {isProcessing && (
                <div className="fixed inset-0 bg-white/50 z-[200] flex items-center justify-center">
                    <SpinnerIcon className="w-10 h-10 text-brand-primary" />
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome ou WhatsApp..."
                        className="w-full bg-gray-50 border-transparent rounded-full py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="hidden sm:flex items-center gap-2 text-gray-400 text-sm font-bold">
                    <UsersIcon className="w-5 h-5"/>
                    <span>{clients.length} Clientes</span>
                </div>
            </div>

            {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard 
                            key={client.id} 
                            client={client} 
                            onEdit={setEditingClient} 
                            onDelete={(c) => setClientToDelete(c)}
                            onView={setDetailedClient}
                        />
                    ))}
                </div>
            ) : (
                 <div className="bg-white rounded-xl shadow-sm text-center p-20 border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">Nenhum cliente encontrado.</p>
                </div>
            )}

            {editingClient && (
                <EditClientModal 
                    client={editingClient} 
                    onClose={() => setEditingClient(null)} 
                    onSave={handleUpdate} 
                />
            )}

            {detailedClient && (
                <ClientDetailModal 
                    client={detailedClient} 
                    onClose={() => setDetailedClient(null)} 
                    onAddressRemoved={fetchClients}
                />
            )}

            <ConfirmModal 
                isOpen={!!clientToDelete}
                title="Excluir Cliente?"
                message={`Deseja remover ${clientToDelete?.name} do CRM? O histórico de pedidos será mantido, mas o cadastro rápido será apagado.`}
                confirmText="Excluir Cadastro"
                onConfirm={handleConfirmDeleteClient}
                onCancel={() => setClientToDelete(null)}
            />
        </div>
    );
};

export default ClientsView;
