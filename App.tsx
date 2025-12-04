import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StoreInfo from './components/StoreInfo';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import StoreInfoModal from './components/StoreInfoModal';
import CategoryMenuModal from './components/CategoryMenuModal';
import ProductDetailModal from './components/ProductDetailModal';
import CartButton from './components/CartButton';
import CheckoutPage from './components/CheckoutPage';
import OrderSuccessPage from './components/OrderSuccessPage';
import OrderTrackingModal from './components/OrderTrackingModal';
import { BikeIcon, ShoppingBagIcon } from './components/IconComponents';
import type { Product, CartItem, StoreInfoData, Order, ProductOption } from './types';
import { getMenu, addProduct, getStoreInfo, updateStoreInfo, updateProduct, deleteProduct, addCategory, deleteCategory, initializeFirebaseData, updateCategoryOrder, incrementVisitCount, getOrderById } from './services/menuService';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfoData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [view, setView] = useState<'menu' | 'login' | 'admin' | 'checkout' | 'orderSuccess'>('menu');
  const [orderSuccessData, setOrderSuccessData] = useState<Order | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isStoreInfoModalOpen, setStoreInfoModalOpen] = useState(false);
  const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  
  // State for active orders banner (now an array)
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Increment visit count on initial app load
    incrementVisitCount();

    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // If we are on admin page but logged out, go to login
        setView(currentView => currentView === 'admin' ? 'login' : currentView);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for active orders in localStorage on mount and poll for updates
  useEffect(() => {
    const checkActiveOrders = async () => {
      let ids: string[] = [];
      
      // Check legacy single ID
      const legacyId = localStorage.getItem('activeOrderId');
      if (legacyId) ids.push(legacyId);

      // Check new array of IDs
      const storedIds = localStorage.getItem('activeOrderIds');
      if (storedIds) {
        try {
          const parsed = JSON.parse(storedIds);
          if (Array.isArray(parsed)) {
            ids = [...ids, ...parsed];
          }
        } catch (e) {
          console.error("Error parsing activeOrderIds", e);
        }
      }

      // Deduplicate IDs
      ids = [...new Set(ids)];

      if (ids.length === 0) {
        setActiveOrders([]);
        return;
      }

      // Fetch all orders
      const promises = ids.map(id => getOrderById(id));
      const results = await Promise.all(promises);
      
      const validOrders: Order[] = [];
      const validIds: string[] = [];

      results.forEach(order => {
        // Keep order if it exists and is not archived
        if (order && order.status !== 'archived') {
            validOrders.push(order);
            validIds.push(order.id);
        }
      });
      
      // Sort: Newest first (by orderNumber descending)
      validOrders.sort((a, b) => b.orderNumber - a.orderNumber);

      setActiveOrders(validOrders);
      
      // Update localStorage with clean list
      if (validIds.length !== ids.length || legacyId) {
          localStorage.setItem('activeOrderIds', JSON.stringify(validIds));
          localStorage.removeItem('activeOrderId'); // Cleanup legacy
      }
    };

    checkActiveOrders();
    
    // Poll every 30 seconds to update status in the banner
    const interval = setInterval(checkActiveOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isModalOpen = isStoreInfoModalOpen || isCategoryMenuOpen || !!selectedProduct || isOrderTrackingOpen;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isStoreInfoModalOpen, isCategoryMenuOpen, selectedProduct, isOrderTrackingOpen]);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        await initializeFirebaseData(); // Initialize data if needed
        const [menuResult, storeInfoResult] = await Promise.all([getMenu(), getStoreInfo()]);
        
        setProducts(menuResult.products);
        setCategories(['Todos', ...menuResult.categories]);
        setStoreInfo(storeInfoResult);

    } catch (error) {
        console.error("Failed to fetch initial data", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'menu' || (view === 'admin' && isAuthenticated)) {
        fetchInitialData();
    }
  }, [view, isAuthenticated, fetchInitialData]);

  const handleSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);
  
  const handleModalCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
    setCategoryMenuOpen(false);
  }, []);

  const handleAddProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
    await addProduct(productData);
    await fetchInitialData(); 
  }, [fetchInitialData]);

  const handleUpdateProduct = useCallback(async (productData: Product) => {
      await updateProduct(productData);
      await fetchInitialData();
  }, [fetchInitialData]);

   const handleDeleteProduct = useCallback(async (productId: string) => {
      try {
        await deleteProduct(productId);
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      } catch (error) {
        console.error("Failed to delete product. Refetching to sync.", error);
        await fetchInitialData();
      }
  }, [fetchInitialData]);

  const handleUpdateStoreInfo = useCallback(async (storeInfoData: StoreInfoData) => {
      await updateStoreInfo(storeInfoData);
      await fetchInitialData();
  }, [fetchInitialData]);

  const handleAddCategory = useCallback(async (categoryName: string) => {
    const updatedCategories = await addCategory(categoryName);
    setCategories(['Todos', ...updatedCategories]);
  }, []);

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
      const updatedCategories = await deleteCategory(categoryName);
      setCategories(['Todos', ...updatedCategories]);
      if (selectedCategory === categoryName) {
        setSelectedCategory('Todos');
      }
  }, [selectedCategory]);
  
  const handleUpdateCategoryOrder = useCallback(async (newOrder: string[]) => {
      try {
          await updateCategoryOrder(newOrder);
          setCategories(['Todos', ...newOrder]);
      } catch (error) {
          console.error("Failed to update category order", error);
          await fetchInitialData();
      }
  }, [fetchInitialData]);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);
  
  const handleAddToCart = useCallback((productToAdd: Product, quantity: number, observations?: string, selectedOption?: ProductOption) => {
    setCartItems(prevItems => {
        // Find if item exists with same ID AND same option
        const existingItemIndex = prevItems.findIndex(item => 
            item.id === productToAdd.id && 
            item.selectedOption?.name === selectedOption?.name
        );

        if (existingItemIndex !== -1) {
            // Update existing item
            const newItems = [...prevItems];
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                quantity: newItems[existingItemIndex].quantity + quantity,
                observations: observations 
            };
            return newItems;
        } else {
            // Add new item. 
            const itemPrice = selectedOption ? selectedOption.price : productToAdd.price;
            
            return [...prevItems, { 
                ...productToAdd, 
                price: itemPrice, // Override price
                quantity, 
                observations, 
                selectedOption 
            }];
        }
    });
    // Just close the modal, stay on menu
    setSelectedProduct(null);
  }, []);

  const handleUpdateCartQuantity = useCallback((productId: string, newQuantity: number, optionName?: string) => {
    setCartItems(prev => {
        if (newQuantity <= 0) {
            return prev.filter(item => !(item.id === productId && item.selectedOption?.name === optionName));
        }
        return prev.map(item =>
            (item.id === productId && item.selectedOption?.name === optionName) 
                ? { ...item, quantity: newQuantity } 
                : item
        );
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: string, optionName?: string) => {
    setCartItems(prev => prev.filter(item => !(item.id === productId && item.selectedOption?.name === optionName)));
  }, []);
  
  // Directly go to checkout view, no intermediate cart modal
  const handleGoToCheckout = useCallback(() => {
    setView('checkout');
  }, []);

  const handleOrderSuccess = (order: Order) => {
    setOrderSuccessData(order);
    setCartItems([]);
    
    // Add to active orders and persist
    setActiveOrders(prev => {
        // Prevent duplicates
        const exists = prev.some(o => o.id === order.id);
        const newOrders = exists 
            ? prev.map(o => o.id === order.id ? order : o) 
            : [order, ...prev];
        
        // Update storage
        const ids = newOrders.map(o => o.id);
        localStorage.setItem('activeOrderIds', JSON.stringify(ids));
        localStorage.removeItem('activeOrderId'); // ensure legacy is gone
        
        return newOrders;
    });

    setView('orderSuccess');
  };

  const handleTrackOrder = useCallback((order: Order) => {
    setOrderSuccessData(order);
    setView('orderSuccess');
    setIsOrderTrackingOpen(false);
  }, []);

  const handleBannerClick = () => {
    if (activeOrders.length === 1) {
        setOrderSuccessData(activeOrders[0]);
        setView('orderSuccess');
    } else if (activeOrders.length > 1) {
        setIsOrderTrackingOpen(true);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex justify-between items-center mb-4 mt-8">
        <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-brand-text">{title}</h2>
        </div>
    </div>
  );

  // Compute all visible categories (official + orphans)
  const allCategories = useMemo(() => {
    const officialCategories = categories.filter(c => c !== 'Todos');
    const productCategories = new Set(products.map(p => p.category));
    const orphanCategories = Array.from(productCategories).filter(cat => 
        cat && cat !== 'Todos' && !officialCategories.includes(cat)
    );
    return [...officialCategories, ...orphanCategories];
  }, [categories, products]);

  const renderMenu = () => {
    const displayCategories = allCategories;

    // Filter for section rendering
    const categoriesWithProducts = displayCategories.filter(category => 
        products.some(p => p.category === category)
    );

    // Only show categories with products in tabs
    const visibleCategoriesForTabs = ['Todos', ...categoriesWithProducts];
    
    const getStatusText = (status: Order['status']) => {
        const texts = {
            new: 'Recebido',
            pending_payment: 'Pagamento Pendente',
            confirmed: 'Em Preparo',
            shipped: 'Saiu para entrega',
            completed: 'Finalizado',
            archived: ''
        };
        return texts[status] || 'Em andamento';
    };

    return (
        <>
        <div className="min-h-screen flex flex-col bg-gray-50">
            {activeOrders.length > 0 && (
                <div 
                    onClick={handleBannerClick}
                    className="bg-brand-primary text-white py-3 px-4 cursor-pointer shadow-md flex items-center justify-between"
                >
                    {activeOrders.length === 1 ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <BikeIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Você possui um pedido em andamento</p>
                                    <p className="text-xs text-brand-secondary opacity-90">
                                        Pedido #{activeOrders[0].orderNumber} • {getStatusText(activeOrders[0].status)}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/10 px-3 py-1 rounded text-xs font-bold hover:bg-white/20 transition-colors">
                                Ver
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <ShoppingBagIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Você tem {activeOrders.length} pedidos em andamento</p>
                                    <p className="text-xs text-brand-secondary opacity-90">
                                        Toque para acompanhar
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/10 px-3 py-1 rounded text-xs font-bold hover:bg-white/20 transition-colors">
                                Ver todos
                            </div>
                        </>
                    )}
                </div>
            )}
            <main className="flex-grow">
            <StoreInfo 
                storeInfo={storeInfo} 
                isLoading={!storeInfo}
                onOpenModal={() => setStoreInfoModalOpen(true)}
                onOpenOrderTracker={() => setIsOrderTrackingOpen(true)}
            />
            <CategoryTabs
                categories={visibleCategoriesForTabs}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                onOpenMenu={() => setCategoryMenuOpen(true)}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
            />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {isLoading ? (
                <div>
                    {Array.from({length: 2}).map((_, i) => (
                        <div key={i}>
                            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4 mt-8"></div>
                            <div className="space-y-4">
                                {Array.from({length: 2}).map((_, index) => (
                                    <div key={index} className="flex items-center bg-white p-2 rounded-lg gap-4 animate-pulse">
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-md"></div>
                                        <div className="flex-grow space-y-3 py-2">
                                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full hidden sm:block"></div>
                                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                ) : searchQuery.trim() !== '' ? (() => {
                    const searchResults = products.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return (
                    <section>
                        <SectionTitle title={`Resultados para "${searchQuery}"`} />
                        {searchResults.length > 0 ? (
                        <div className="space-y-4">
                            {searchResults.map(product => (
                            <ProductCard key={product.id} product={product} onProductClick={handleProductClick} />
                            ))}
                        </div>
                        ) : (
                        <p className="text-center text-gray-500 mt-8">Nenhum produto encontrado.</p>
                        )}
                    </section>
                    );
                })() : (
                    selectedCategory === 'Todos' ? (
                        categoriesWithProducts.map(category => {
                            const categoryProducts = products.filter(p => p.category === category);
                            if (categoryProducts.length === 0) return null;
                            return (
                                <section key={category}>
                                    <SectionTitle title={category} />
                                    <div className="space-y-4">
                                        {categoryProducts.map(product => (
                                            <ProductCard key={product.id} product={product} onProductClick={handleProductClick} />
                                        ))}
                                    </div>
                                </section>
                            )
                        })
                    ) : (() => {
                        const categoryProducts = products.filter(p => p.category === selectedCategory);
                        return (
                        <section>
                            <SectionTitle title={selectedCategory} />
                            <div className="space-y-4">
                                {categoryProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onProductClick={handleProductClick}
                                />
                                ))}
                            </div>
                        </section>
                        );
                    })()
                )}
            </div>
            </main>
            <Footer onNavigate={setView} />
            {cartItems.length > 0 && <div className="h-24 sm:h-28" />}
        </div>
        <StoreInfoModal 
            isOpen={isStoreInfoModalOpen}
            onClose={() => setStoreInfoModalOpen(false)}
            storeInfo={storeInfo}
        />
        <CategoryMenuModal
            isOpen={isCategoryMenuOpen}
            onClose={() => setCategoryMenuOpen(false)}
            categories={categoriesWithProducts}
            onSelectCategory={handleModalCategorySelect}
        />
        <ProductDetailModal 
            product={selectedProduct}
            onClose={handleCloseModal}
            onAddToCart={handleAddToCart}
        />
        {/* New Cart Button Bar */}
        <CartButton 
            itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            totalPrice={cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}
            onClick={handleGoToCheckout}
        />
        <OrderTrackingModal
            isOpen={isOrderTrackingOpen}
            onClose={() => setIsOrderTrackingOpen(false)}
            onTrackOrder={handleTrackOrder}
            initialOrders={activeOrders}
        />
        </>
    );
  }


  switch (view) {
    case 'login':
      return <LoginPage
        onLoginSuccess={() => {
          setView('admin');
        }}
        onNavigateBack={() => setView('menu')}
      />;
    case 'admin':
      if (!isAuthenticated) {
        // Just a safe guard, useEffect handles the redirect
        return <div className="min-h-screen flex items-center justify-center">Verificando acesso...</div>;
      }
      return <AdminPage
        products={products}
        categories={allCategories} // Pass combined list to AdminPage to fix disappearing categories
        storeInfo={storeInfo}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateStoreInfo={handleUpdateStoreInfo}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onUpdateCategoryOrder={handleUpdateCategoryOrder}
        onNavigateBack={() => setView('menu')}
        onLogout={handleLogout}
      />;
    case 'checkout':
        return <CheckoutPage 
            cartItems={cartItems}
            storeInfo={storeInfo}
            onNavigateBack={() => {
                setView('menu');
            }}
            onOrderSuccess={handleOrderSuccess}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
        />;
    case 'orderSuccess':
        return <OrderSuccessPage
            order={orderSuccessData}
            storeInfo={storeInfo}
            onNavigateBack={() => setView('menu')}
        />
    default:
      return renderMenu();
  }
};

export default App;