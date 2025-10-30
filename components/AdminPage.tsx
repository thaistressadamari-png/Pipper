import React, { useState, useEffect } from 'react';
import type { Product, StoreInfoData, Order, Client } from '../types';
import DashboardView from './DashboardView';
import ProductsView from './ProductsView';
import StoreInfoView from './StoreInfoView';
import OrdersView from './OrdersView';
import ClientsView from './ClientsView';
import { listenToOrders } from '../services/menuService';
import { DashboardIcon, BoxIcon, StoreIcon, MenuIcon, XIcon, ClipboardListIcon, UsersIcon } from './IconComponents';

interface AdminPageProps {
  products: Product[];
  categories: string[];
  storeInfo: StoreInfoData | null;
  onAddProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (productData: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateStoreInfo: (storeInfoData: StoreInfoData) => Promise<void>;
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onUpdateCategoryOrder: (newOrder: string[]) => Promise<void>;
  onRequestPermission: () => Promise<NotificationPermission>;
  onNavigateBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = (props) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'products' | 'store' | 'orders' | 'clients'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    // Real-time listener for new orders. Subscribes only once on component mount.
    const unsubscribe = listenToOrders((snapshot) => {
        let newOrderCount = 0;
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const newOrder = change.doc.data() as Order;
                
                // Play sound for the new order
                const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
                audio.play().catch(e => console.error("Error playing sound:", e));

                // Send a real push notification
                if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        // Fix: The 'vibrate' property is valid but may not be in the project's TS definitions. Cast to 'any' to bypass the type error.
                        registration.showNotification('Novo Pedido Recebido!', {
                            body: `Pedido #${newOrder.orderNumber} de ${newOrder.customer.name}`,
                            icon: '/favicon.ico',
                            badge: '/favicon.ico',
                            tag: `new-order-${newOrder.id}`,
                            vibrate: [200, 100, 200],
                        } as any);
                    });
                }
            }
        });

        // Update the count based on the whole snapshot
        newOrderCount = snapshot.size;
        setNewOrdersCount(newOrderCount);
        
        if (newOrderCount > 0) {
            document.title = `(${newOrderCount}) Novo Pedido! - Admin`;
        } else {
            document.title = 'Admin - Pipper Confeitaria';
        }
    });

    // Cleanup: Unsubscribe when the component unmounts and reset the title.
    return () => {
        unsubscribe();
        document.title = 'Pipper Confeitaria';
    };
  }, []); // Empty dependency array ensures this effect runs only once.


  const handleNavClick = (view: 'dashboard' | 'products' | 'store' | 'orders' | 'clients') => {
    setActiveView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
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
      case 'store':
        return <StoreInfoView {...props} />;
      case 'orders':
        return <OrdersView onRequestPermission={props.onRequestPermission} />;
      case 'clients':
        return <ClientsView />;
      default:
        return <DashboardView products={props.products} />;
    }
  };

  const sidebarContent = (
      <>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-brand-text">Admin</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 md:hidden text-gray-500">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button onClick={() => handleNavClick('dashboard')} className={navItemClasses('dashboard')}>
            <DashboardIcon className={navIconClasses('dashboard')} />
            Dashboard
          </button>
          <button onClick={() => handleNavClick('orders')} className={navItemClasses('orders')}>
            <ClipboardListIcon className={navIconClasses('orders')} />
            Pedidos
            {newOrdersCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {newOrdersCount}
                </span>
            )}
          </button>
          <button onClick={() => handleNavClick('clients')} className={navItemClasses('clients')}>
            <UsersIcon className={navIconClasses('clients')} />
            Clientes
          </button>
          <button onClick={() => handleNavClick('products')} className={navItemClasses('products')}>
            <BoxIcon className={navIconClasses('products')} />
            Produtos
          </button>
          <button onClick={() => handleNavClick('store')} className={navItemClasses('store')}>
            <StoreIcon className={navIconClasses('store')} />
            Loja
          </button>
        </nav>
      </>
  );
  
  const getPageTitle = () => {
    switch(activeView) {
        case 'dashboard': return 'Dashboard';
        case 'products': return 'Gerenciar Produtos';
        case 'store': return 'Informações da Loja';
        case 'orders': return 'Gerenciar Pedidos';
        case 'clients': return 'Clientes';
        default: return 'Admin';
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile backdrop */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"></div>}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      <div className="flex-grow flex flex-col">
        <header className="bg-white shadow-sm h-16 flex-shrink-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
                <div className="flex items-center">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 mr-2 text-gray-600">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold text-brand-text capitalize">{getPageTitle()}</h2>
                </div>
                <button onClick={props.onNavigateBack} className="text-sm font-medium text-brand-primary hover:underline">
                    &larr; Voltar ao cardápio
                </button>
            </div>
        </header>
        <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;