import React, { useState, useEffect, useMemo } from 'react';
import type { Client } from '../types';
import { getClients } from '../services/menuService';
import { SearchIcon } from './IconComponents';

const ClientsView: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            setIsLoading(true);
            try {
                const fetchedClients = await getClients();
                setClients(fetchedClients);
            } catch (err) {
                setError('Falha ao carregar os clientes.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, []);
    
    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.id.includes(searchQuery)
        );
    }, [clients, searchQuery]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    
    const formatPrice = (price: number) => {
        return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (isLoading) return <p>Carregando clientes...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
                 <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome ou WhatsApp..."
                        className="w-full bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
            </div>

            {filteredClients.length > 0 ? (
                <>
                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredClients.map(client => (
                            <div key={client.id} className="bg-white p-4 rounded-lg shadow">
                                <p className="font-bold text-brand-text">{client.name}</p>
                                <p className="text-sm text-gray-500 mt-1">{client.id}</p>
                                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-gray-500">Pedidos</p>
                                        <p className="font-semibold text-brand-text">{client.totalOrders}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Gasto Total</p>
                                        <p className="font-semibold text-brand-text">{formatPrice(client.totalSpent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Último Pedido</p>
                                        <p className="font-semibold text-brand-text text-xs">{formatTimestamp(client.lastOrderDate)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Nome</th>
                                        <th scope="col" className="px-6 py-3">WhatsApp</th>
                                        <th scope="col" className="px-6 py-3">Último Pedido</th>
                                        <th scope="col" className="px-6 py-3">Total Pedidos</th>
                                        <th scope="col" className="px-6 py-3">Total Gasto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map(client => (
                                        <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
                                            <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{client.name}</td>
                                            <td className="px-6 py-4">{client.id}</td>
                                            <td className="px-6 py-4">{formatTimestamp(client.lastOrderDate)}</td>
                                            <td className="px-6 py-4">{client.totalOrders}</td>
                                            <td className="px-6 py-4 font-medium text-brand-text">{formatPrice(client.totalSpent)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                 <div className="bg-white rounded-lg shadow text-center p-8">
                    <p className="text-gray-500">Nenhum cliente encontrado.</p>
                </div>
            )}
        </div>
    );
};

export default ClientsView;