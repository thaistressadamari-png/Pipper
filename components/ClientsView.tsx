
import React, { useState, useEffect, useMemo } from 'react';
import type { Client, Order } from '../types';
import { getOrders } from '../services/menuService';
import { SearchIcon } from './IconComponents';

const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatWhatsapp = (rawNumber: string = '') => {
    return rawNumber
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2');
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getRelativeTime = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return '';
    const lastOrderDate = timestamp.toDate();
    const now = new Date();

    lastOrderDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - lastOrderDate.getTime();
    if (diffTime < 0) return ''; // Future date

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'hoje';
    } else if (diffDays === 1) {
        return 'ontem';
    } else {
        return `há ${diffDays} dias`;
    }
};

const ClientCard: React.FC<{ client: Client }> = ({ client }) => {
    const averageTicket = client.totalOrders > 0 ? client.totalSpent / client.totalOrders : 0;
    const lastOrderDate = formatTimestamp(client.lastOrderDate);
    const relativeTime = getRelativeTime(client.lastOrderDate);

    return (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100 transition-shadow hover:shadow-lg">
            <h3 className="text-lg font-bold text-brand-text truncate">{client.name}</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p><span className="font-medium text-gray-500">WhatsApp:</span> {formatWhatsapp(client.id)}</p>
                <p><span className="font-medium text-gray-500">Total de Pedidos (Pagos):</span> {client.totalOrders}</p>
                <p><span className="font-medium text-gray-500">Total Gasto:</span> {formatPrice(client.totalSpent)}</p>
                <p><span className="font-medium text-gray-500">Ticket Médio:</span> {formatPrice(averageTicket)}</p>
                <p><span className="font-medium text-gray-500">Último Pedido Pago:</span> {client.lastOrderDate ? `${lastOrderDate} (${relativeTime})` : 'Nenhum'}</p>
            </div>
        </div>
    );
};


const ClientsView: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            setIsLoading(true);
            try {
                // Fetch all orders to calculate stats dynamically
                const allOrders = await getOrders();
                
                // Group orders by client
                const clientMap = new Map<string, Client>();
                
                // Sort orders by date descending to easily find the last order
                allOrders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return dateB - dateA;
                });

                allOrders.forEach(order => {
                    if (!order.customer || !order.customer.whatsapp) return;
                    
                    const whatsapp = order.customer.whatsapp.replace(/\D/g, '');
                    if (!whatsapp) return;

                    if (!clientMap.has(whatsapp)) {
                        clientMap.set(whatsapp, {
                            id: whatsapp,
                            name: order.customer.name,
                            firstOrderDate: null, 
                            lastOrderDate: null,
                            totalOrders: 0,
                            totalSpent: 0,
                            addresses: [], // Not used in view
                            orderIds: []
                        });
                    }

                    const client = clientMap.get(whatsapp)!;
                    
                    // Only consider Paid orders for stats
                    // Paid statuses: confirmed, shipped, completed
                    const isPaid = ['confirmed', 'shipped', 'completed'].includes(order.status);

                    if (isPaid) {
                        client.totalOrders += 1;
                        // Include delivery fee in total spent
                        client.totalSpent += (order.total || 0) + (order.deliveryFee || 0);
                        client.orderIds.push(order.id);
                        
                        // Since we traverse descending, the first paid order we see is the last one
                        if (!client.lastOrderDate) {
                            client.lastOrderDate = order.createdAt;
                        }
                    }
                    
                    // Always update name to the most recent one used
                    // Since orders are sorted desc, the first time we see the client it is their most recent order
                    // But we might want to check if the name is not empty
                    if (order.customer.name && client.name !== order.customer.name) {
                         // This simple assignment will keep the name from the *first order processed* (newest) 
                         // because we created the client entry with the first order we encountered.
                         // So we don't need to do anything else unless we want specific logic.
                    }
                });

                const fetchedClients = Array.from(clientMap.values());
                
                // Optional: Filter out clients with 0 paid orders?
                // The request says "show only paid orders info". 
                // If a client has 0 paid orders, showing 0 is correct.
                
                setClients(fetchedClients);
            } catch (err) {
                console.error(err);
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
            client.id.includes(searchQuery.replace(/\D/g, ''))
        );
    }, [clients, searchQuery]);

    if (isLoading) return <p className="text-center text-gray-500 py-8">Carregando clientes...</p>;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map(client => (
                        <ClientCard key={client.id} client={client} />
                    ))}
                </div>
            ) : (
                 <div className="bg-white rounded-lg shadow text-center p-8">
                    <p className="text-gray-500">Nenhum cliente encontrado.</p>
                </div>
            )}
        </div>
    );
};

export default ClientsView;
