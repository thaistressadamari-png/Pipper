import React, { useState, useEffect, useCallback } from 'react';
import StoreInfo from './components/StoreInfo';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import StoreInfoModal from './components/StoreInfoModal';
import CategoryMenuModal from './components/CategoryMenuModal';
import ProductDetailModal from './components/ProductDetailModal';
import Cart from './components/Cart';
import CartButton from './components/CartButton';
import CheckoutPage from './components/CheckoutPage';
import OrderSuccessPage from './components/OrderSuccessPage';
import OrderTrackingModal from './components/OrderTrackingModal';
import type { Product, CartItem, StoreInfoData, Order } from './types';
import { getMenu, addProduct, getStoreInfo, updateStoreInfo, updateProduct, deleteProduct, addCategory, deleteCategory, initializeFirebaseData, updateCategoryOrder, incrementVisitCount, savePushSubscription } from './services/menuService';

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);

  useEffect(() => {
    // Increment visit count on initial app load
    incrementVisitCount();

    // Register Firebase Messaging Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then((registration) => {
                console.log('Service Worker registration successful, scope is:', registration.scope);
            }).catch((err) => {
                console.log('Service Worker registration failed:', err);
            });
    }

  }, []);

  useEffect(() => {
    const isModalOpen = isStoreInfoModalOpen || isCategoryMenuOpen || !!selectedProduct || isCartOpen || isOrderTrackingOpen;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isStoreInfoModalOpen, isCategoryMenuOpen, selectedProduct, isCartOpen, isOrderTrackingOpen]);

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
  
  const handleAddToCart = useCallback((productToAdd: Product, quantity: number, observations?: string) => {
    setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === productToAdd.id);

        if (existingItem) {
            return prevItems.map(item =>
                item.id === productToAdd.id
                    ? { ...item, quantity: item.quantity + quantity, observations }
                    : item
            );
        } else {
            return [...prevItems, { ...productToAdd, quantity, observations }];
        }
    });
    setSelectedProduct(null);
    setTimeout(() => setIsCartOpen(true), 300);
  }, []);

  const handleUpdateCartQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
        setCartItems(prev => prev.filter(item => item.id !== productId));
    } else {
        setCartItems(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity: newQuantity } : item
        ));
    }
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  }, []);
  
  const handleCheckout = useCallback(() => {
    setIsCartOpen(false);
    setTimeout(() => setView('checkout'), 300);
  }, []);

  const handleOrderSuccess = (order: Order) => {
    setOrderSuccessData(order);
    setCartItems([]);
    setView('orderSuccess');
  };

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex justify-between items-center mb-4 mt-8">
        <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-brand-text">{title}</h2>
        </div>
    </div>
  );

  const renderMenu = () => {
    const orderedCategories = categories.filter(c => c !== 'Todos');
    const categoriesWithProducts = orderedCategories.filter(category => 
        products.some(p => p.category === category)
    );
    const visibleCategoriesForTabs = ['Todos', ...orderedCategories];

    return (
        <>
        <div className="min-h-screen flex flex-col bg-gray-50">
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
        <Cart 
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={handleCheckout}
        />
        <CartButton 
            itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            onClick={() => setIsCartOpen(true)}
        />
        <OrderTrackingModal
            isOpen={isOrderTrackingOpen}
            onClose={() => setIsOrderTrackingOpen(false)}
        />
        </>
    );
  }


  switch (view) {
    case 'login':
      return <LoginPage
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setView('admin');
        }}
        onNavigateBack={() => setView('menu')}
      />;
    case 'admin':
      if (!isAuthenticated) {
        setTimeout(() => setView('login'), 0);
        return null;
      }
      return <AdminPage
        products={products}
        categories={categories.filter(c => c !== 'Todos')}
        storeInfo={storeInfo}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateStoreInfo={handleUpdateStoreInfo}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onUpdateCategoryOrder={handleUpdateCategoryOrder}
        onNavigateBack={() => setView('menu')}
      />;
    case 'checkout':
        return <CheckoutPage 
            cartItems={cartItems}
            storeInfo={storeInfo}
            onNavigateBack={() => {
                setView('menu');
                setIsCartOpen(true);
            }}
            onOrderSuccess={handleOrderSuccess}
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