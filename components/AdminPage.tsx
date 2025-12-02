import React, { useState, useEffect } from 'react';
import type { Product, StoreInfoData, Order, Client } from '../types';
import DashboardView from './DashboardView';
import ProductsView from './ProductsView';
import StoreInfoView from './StoreInfoView';
import OrdersView from './OrdersView';
import ClientsView from './ClientsView';
import { DashboardIcon, BoxIcon, StoreIcon, MenuIcon, XIcon, ClipboardListIcon, UsersIcon } from './IconComponents';
import { getNewOrdersCount } from '../services/menuService';

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
  onNavigateBack: () => void;
  onLogout: () => void;
}

const AdminPage: React.FC<AdminPageProps> = (props) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'products' | 'store' | 'orders' | 'clients'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
        try {
            const count = await getNewOrdersCount();
            setNewOrdersCount(count);
        } catch (error) {
            console.error("Failed to fetch new orders count:", error);
        }
    };

    fetchCount();
    const intervalId = setInterval(fetchCount, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

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
        return <OrdersView />;
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
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
        <div className="p-4 border-t border-gray-200">
            <button onClick={props.onLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
            </button>
        </div>
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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center gap-4">
                <div className="flex items-center min-w-0">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 mr-2 text-gray-600">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold text-brand-text capitalize truncate">{getPageTitle()}</h2>
                </div>
                <button onClick={props.onNavigateBack} className="text-sm font-medium text-brand-primary hover:underline whitespace-nowrap">
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