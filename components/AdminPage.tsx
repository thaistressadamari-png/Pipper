
import React, { useState, useEffect, useRef } from 'react';
import type { Product, StoreInfoData, Order, Client, CategoryMetadata } from '../types';
import DashboardView from './DashboardView';
import ProductsView from './ProductsView';
import StoreInfoView from './StoreInfoView';
import OrdersView from './OrdersView';
import ClientsView from './ClientsView';
import ManualOrderView from './ManualOrderView';
import InventoryView from './InventoryView';
import { DashboardIcon, BoxIcon, StoreIcon, MenuIcon, XIcon, ClipboardListIcon, UsersIcon, PlusIcon, SpinnerIcon } from './IconComponents';
import { getNewOrdersCount, subscribeToNewOrders } from '../services/menuService';

interface AdminPageProps {
  products: Product[];
  categories: CategoryMetadata[];
  storeInfo: StoreInfoData | null;
  onAddProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (productData: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateStoreInfo: (storeInfoData: StoreInfoData) => Promise<void>;
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onUpdateCategoryOrder: (newOrder: CategoryMetadata[]) => Promise<void>;
  onToggleCategoriesArchive: (categoryNames: string[], archive: boolean) => Promise<void>;
  onNavigateBack: () => void;
  onLogout: () => void;
  onRefreshData?: () => Promise<void>;
}

const AdminPage: React.FC<AdminPageProps> = (props) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'products' | 'inventory' | 'store' | 'orders' | 'clients' | 'manual_order'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const hasNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
    }
  }, [activeView]);

  // Gerenciamento de Notificações e Badges - EXCLUSIVO ADMIN
  useEffect(() => {
    // Subscrever a novos pedidos para tempo real (Badge e Notificação)
    const unsubscribe = subscribeToNewOrders((count, newOrder) => {
        setNewOrdersCount(count);

        // 1. Atualizar App Badge (ícone da tela de início do iOS/Android)
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                (navigator as any).setAppBadge(count).catch(console.error);
            } else {
                (navigator as any).clearAppBadge().catch(console.error);
            }
        }

        // 2. Exibir Notificação Local (Banner) para novos pedidos detectados
        if (newOrder && !hasNotifiedRef.current.has(newOrder.id)) {
            hasNotifiedRef.current.add(newOrder.id);
            
            if ("Notification" in window && Notification.permission === "granted") {
                const n = new Notification("Novo Pedido Recebido! 🍰", {
                    body: `Pedido #${newOrder.orderNumber} de ${newOrder.customer.name}`,
                    icon: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
                    badge: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
                    tag: 'new-order', // Evita múltiplas notificações iguais
                });
                
                n.onclick = () => {
                    window.focus();
                    setActiveView('orders');
                };

                // Tocar som de alerta (opcional, mas recomendado para admin)
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.play().catch(() => {});
            }
        }
    });

    return () => {
        unsubscribe();
        if ('clearAppBadge' in navigator) {
            (navigator as any).clearAppBadge().catch(console.error);
        }
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
    }
  };

  const handleNavClick = async (view: 'dashboard' | 'products' | 'inventory' | 'store' | 'orders' | 'clients' | 'manual_order') => {
    setActiveView(view);
    setIsSidebarOpen(false);
    
    if (view === 'inventory' && props.onRefreshData) {
        setIsRefreshing(true);
        try {
            await props.onRefreshData();
        } finally {
            setIsRefreshing(false);
        }
    }
  };
  
  const navItemClasses = (viewName: typeof activeView) => 
    `flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors relative ${
      activeView === viewName 
        ? 'bg-brand-primary text-white' 
        : 'text-gray-600 hover:bg-gray-200'
    }`;
  
  const navIconClasses = (viewName: typeof activeView) => 
      `w-5 h-5 mr-3 ${activeView === viewName ? 'text-white' : 'text-gray-500'}`;

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView products={props.products} />;
      case 'products':
        return <ProductsView {...props} />;
      case 'inventory':
        return <InventoryView products={props.products} onUpdateProduct={props.onUpdateProduct} onRefresh={props.onRefreshData} />;
      case 'store':
        return <StoreInfoView {...props} />;
      case 'orders':
        return <OrdersView />;
      case 'clients':
        return <ClientsView />;
      case 'manual_order':
        return <ManualOrderView products={props.products} storeInfo={props.storeInfo} onOrderCreated={() => setActiveView('orders')} />;
      default:
        return <DashboardView products={props.products} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex">
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"></div>}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-brand-text">Admin</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 md:hidden text-gray-500">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-1">
          <button onClick={() => handleNavClick('dashboard')} className={navItemClasses('dashboard')}>
            <DashboardIcon className={navIconClasses('dashboard')} />
            Dashboard
          </button>
          
          <button onClick={() => handleNavClick('manual_order')} className={`${navItemClasses('manual_order')} bg-brand-accent/10 text-brand-accent border border-brand-accent/20 mb-2`}>
            <PlusIcon className={`${navIconClasses('manual_order')} !text-brand-accent`} />
            Novo Pedido
          </button>

          <button onClick={() => handleNavClick('orders')} className={navItemClasses('orders')}>
            <ClipboardListIcon className={navIconClasses('orders')} />
            Pedidos
            {newOrdersCount > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {newOrdersCount}
                </span>
            )}
          </button>
          <button onClick={() => handleNavClick('clients')} className={navItemClasses('clients')}>
            <UsersIcon className={navIconClasses('clients')} />
            Clientes
          </button>
          <div className="pt-2 pb-1 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catálogo</div>
          <button onClick={() => handleNavClick('products')} className={navItemClasses('products')}>
            <BoxIcon className={navIconClasses('products')} />
            Produtos
          </button>
          <button onClick={() => handleNavClick('inventory')} className={navItemClasses('inventory')}>
            <svg xmlns="http://www.w3.org/2000/svg" className={navIconClasses('inventory')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Estoque
          </button>
          <button onClick={() => handleNavClick('store')} className={navItemClasses('store')}>
            <StoreIcon className={navIconClasses('store')} />
            Loja
          </button>
        </nav>

        {/* Botão de Notificações - Visível apenas se necessário */}
        {notificationStatus === 'default' && (
          <div className="px-4 mb-2">
            <button 
                onClick={requestNotificationPermission}
                className="w-full py-2 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-orange-200 hover:bg-orange-200 transition-colors"
            >
                🔔 Ativar Alertas no iPhone
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-200">
            <button onClick={props.onLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
            </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0">
        <header className="bg-white shadow-sm h-16 flex-shrink-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center gap-4">
                <div className="flex items-center min-w-0">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 mr-2 text-gray-600">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-xl font-bold text-brand-text capitalize truncate">
                            {activeView === 'dashboard' ? 'Dashboard' : 
                             activeView === 'products' ? 'Produtos' :
                             activeView === 'inventory' ? 'Estoque' :
                             activeView === 'orders' ? 'Pedidos' :
                             activeView === 'clients' ? 'Clientes' :
                             activeView === 'manual_order' ? 'Novo Pedido' : 'Admin'}
                        </h2>
                        {isRefreshing && <SpinnerIcon className="w-4 h-4 text-brand-primary" />}
                    </div>
                </div>
                <button onClick={props.onNavigateBack} className="text-sm font-medium text-brand-primary hover:underline whitespace-nowrap">
                    &larr; Voltar ao cardápio
                </button>
            </div>
        </header>
        <main ref={mainContentRef} className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
