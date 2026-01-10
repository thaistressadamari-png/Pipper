
import React, { useState, useEffect, useCallback } from 'react';
import type { Product, ProductOption } from '../types';
import { ArrowLeftIcon, PlusIcon, MinusIcon, ShoppingBagIcon, ExpandIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, observations?: string, selectedOption?: ProductOption) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setObservations('');
      setIsImageFullscreen(false);
      setCurrentImageIndex(0);
      if (product.options && product.options.length > 0) {
          setSelectedOption(product.options[0]);
      } else {
          setSelectedOption(null);
      }
    }
  }, [product]);

  const handleImageNavigation = useCallback((direction: 'next' | 'prev') => {
    if (!product) return;
    const newIndex = direction === 'next'
      ? (currentImageIndex + 1) % product.imageUrls.length
      : (currentImageIndex - 1 + product.imageUrls.length) % product.imageUrls.length;
    setCurrentImageIndex(newIndex);
  }, [currentImageIndex, product]);

  useEffect(() => {
    if (!isImageFullscreen || !product || product.imageUrls.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            handleImageNavigation('prev');
        } else if (e.key === 'ArrowRight') {
            handleImageNavigation('next');
        } else if (e.key === 'Escape') {
            setIsImageFullscreen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageFullscreen, product, handleImageNavigation, setIsImageFullscreen]);
  
  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => {
        const next = Math.max(1, prev + amount);
        // Se estoque habilitado, não deixa passar do saldo (lógica mantida internamente)
        if (product?.inventoryEnabled && next > (product.inventoryQuantity || 0)) {
            return prev;
        }
        return next;
    });
  };
  
  const handleAddToCartClick = () => {
    if (product) {
        if (product.options && product.options.length > 0 && !selectedOption) {
            alert("Por favor, selecione uma opção.");
            return;
        }
        
        if (product.inventoryEnabled && quantity > (product.inventoryQuantity || 0)) {
            alert("Desculpe, a quantidade desejada é maior do que o nosso estoque disponível.");
            return;
        }

      onAddToCart(product, quantity, observations, selectedOption || undefined);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  if (!product) return null;

  const currentPrice = selectedOption ? selectedOption.price : product.price;
  const total = currentPrice * quantity;
  const hasImages = product.imageUrls && product.imageUrls.length > 0;
  
  const isSoldOut = product.inventoryEnabled && (product.inventoryQuantity || 0) <= 0;

  return (
    <>
      {isImageFullscreen && hasImages && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
            onClick={() => setIsImageFullscreen(false)}
            role="dialog"
            aria-modal="true"
        >
            <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsImageFullscreen(false); }} 
                className="absolute top-4 right-4 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Fechar"
            >
                <XIcon className="w-8 h-8"/>
            </button>
            {product.imageUrls.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleImageNavigation('prev'); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Imagem anterior"
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleImageNavigation('next'); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Próxima imagem"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                </>
            )}
            <img 
                src={product.imageUrls[currentImageIndex]} 
                alt={product.name} 
                className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
      
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
      >
        <style>{`.animate-slide-in-up { animation: slideInUp 0.3s ease-out; } @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        
        <div className="flex-1 overflow-y-auto pb-28"> 
          <div className="max-w-2xl mx-auto w-full">
            {hasImages ? (
              <div className="relative group w-full bg-gray-100">
                  <div 
                    className="aspect-square sm:aspect-video w-full relative overflow-hidden cursor-pointer"
                    onClick={() => setIsImageFullscreen(true)}
                  >
                     <img 
                        src={product.imageUrls[currentImageIndex]} 
                        alt={product.name} 
                        className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`} 
                     />
                     {isSoldOut && (
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                             <span className="bg-red-600 text-white font-bold px-6 py-2 rounded-lg text-xl uppercase tracking-widest shadow-xl">ESGOTADO</span>
                         </div>
                     )}
                  </div>
                  
                  <button 
                      onClick={onClose} 
                      className="absolute top-4 left-4 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-colors z-20 shadow-sm"
                      aria-label="Voltar"
                  >
                      <ArrowLeftIcon className="w-6 h-6"/>
                  </button>
                  <button 
                      onClick={() => setIsImageFullscreen(true)} 
                      className="absolute top-4 right-4 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-colors z-20 shadow-sm"
                      aria-label="Ver imagem em tela cheia"
                  >
                      <ExpandIcon className="w-6 h-6"/>
                  </button>
                  
                  {product.imageUrls.length > 1 && !isSoldOut && (
                      <>
                          <button
                              onClick={(e) => { e.stopPropagation(); handleImageNavigation('prev'); }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-transform duration-200 ease-in-out hover:scale-110 opacity-0 group-hover:opacity-100 z-20 shadow-sm"
                              aria-label="Imagem anterior"
                          >
                              <ChevronLeftIcon className="w-6 h-6"/>
                          </button>
                          <button
                              onClick={(e) => { e.stopPropagation(); handleImageNavigation('next'); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-transform duration-200 ease-in-out hover:scale-110 opacity-0 group-hover:opacity-100 z-20 shadow-sm"
                              aria-label="Próxima imagem"
                          >
                              <ChevronRightIcon className="w-6 h-6"/>
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                              {product.imageUrls.map((_, index) => (
                                  <button
                                      key={index}
                                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
                                      className={`w-2 h-2 rounded-full transition-all duration-300 shadow-sm ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/60'}`}
                                      aria-label={`Ir para imagem ${index + 1}`}
                                  />
                              ))}
                          </div>
                      </>
                  )}
              </div>
            ) : (
               <div className="relative p-4 border-b border-gray-100 flex items-center sticky top-0 bg-white z-20">
                  <button 
                      onClick={onClose} 
                      className="p-2 -ml-2 rounded-full text-brand-text hover:bg-gray-100 transition-colors"
                      aria-label="Voltar"
                  >
                      <ArrowLeftIcon className="w-6 h-6"/>
                  </button>
                  <h1 className="ml-2 text-lg font-bold text-brand-text truncate">{product.name}</h1>
              </div>
            )}
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        {!hasImages && <h1 id="product-title" className="text-2xl font-bold text-brand-text">{product.name}</h1>}
                        {hasImages && <h1 id="product-title" className="text-2xl font-bold text-brand-text mb-2">{product.name}</h1>}
                    </div>
                </div>
                
                <p className="text-brand-text-light whitespace-pre-wrap text-base leading-relaxed">{product.description}</p>
                
                {product.options && product.options.length > 0 && !isSoldOut && (
                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-base font-bold text-brand-text mb-3">Escolha uma opção:</h3>
                        <div className="space-y-3">
                            {product.options.map((option, index) => (
                                <label key={index} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${selectedOption?.name === option.name ? 'border-brand-primary bg-brand-secondary/20 ring-1 ring-brand-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="flex items-center">
                                        <input 
                                            type="radio" 
                                            name="productOption" 
                                            checked={selectedOption?.name === option.name}
                                            onChange={() => setSelectedOption(option)}
                                            className="w-5 h-5 text-brand-primary focus:ring-brand-primary border-gray-300"
                                        />
                                        <span className="ml-3 font-medium text-brand-text text-base">{option.name}</span>
                                    </div>
                                    <span className="font-bold text-brand-text text-base">{formatPrice(option.price)}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
  
                {!isSoldOut && (
                    <div className="pt-4 border-t border-gray-100">
                        <label htmlFor="observations" className="block text-sm font-bold text-brand-text mb-2">Observações</label>
                        <textarea 
                            id="observations"
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            rows={3}
                            placeholder="Digite as observações aqui..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors duration-200"
                        />
                    </div>
                )}
            </div>
          </div>
        </div>
        
        {!isSoldOut && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
                <div className="max-w-2xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Total</span>
                          <span className={`text-2xl font-bold ${product.originalPrice && !selectedOption ? 'text-brand-accent' : 'text-brand-text'}`}>
                              {formatPrice(total)}
                          </span>
                        </div>
                        <div className="flex items-center bg-gray-100 rounded-full">
                          <button onClick={() => handleQuantityChange(-1)} disabled={quantity === 1} className="p-3 rounded-full text-brand-text hover:bg-gray-200 transition disabled:opacity-30"><MinusIcon className="w-5 h-5" /></button>
                          <span className="px-4 text-xl font-bold w-14 text-center text-brand-text">{quantity}</span>
                          <button onClick={() => handleQuantityChange(1)} className="p-3 rounded-full text-brand-text hover:bg-gray-200 transition"><PlusIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <button 
                      onClick={handleAddToCartClick}
                      className="w-full bg-brand-primary text-white font-bold py-4 px-6 rounded-xl text-lg flex items-center justify-center gap-3 hover:bg-brand-primary-dark transition-colors duration-300 shadow-md active:scale-[0.98]"
                    >
                        <ShoppingBagIcon className="w-6 h-6" />
                        <span>
                            Adicionar ao Carrinho
                        </span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default ProductDetailModal;
