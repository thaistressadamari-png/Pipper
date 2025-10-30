import React, { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { ArrowLeftIcon, PlusIcon, MinusIcon, ShoppingBagIcon, ExpandIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, observations?: string) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setObservations('');
      setIsImageFullscreen(false);
      setCurrentImageIndex(0);
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
    setQuantity(prev => Math.max(1, prev + amount));
  };
  
  const handleAddToCartClick = () => {
    if (product) {
      onAddToCart(product, quantity, observations);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  if (!product) return null;

  const total = product.price * quantity;

  return (
    <>
      {isImageFullscreen && (
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
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 flex items-center justify-center ${
          product ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          product ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
      >
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="relative group">
             <img src={product.imageUrls[currentImageIndex]} alt={product.name} className="w-full h-96 md:h-[30rem] object-cover rounded-t-lg" />
             <button 
                onClick={onClose} 
                className="absolute top-4 left-4 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-colors z-20"
                aria-label="Voltar"
            >
                <ArrowLeftIcon className="w-6 h-6"/>
            </button>
            <button 
                onClick={() => setIsImageFullscreen(true)} 
                className="absolute top-4 right-4 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-colors z-20"
                aria-label="Ver imagem em tela cheia"
            >
                <ExpandIcon className="w-6 h-6"/>
            </button>
            {product.imageUrls.length > 1 && (
                <>
                    <button
                        onClick={() => handleImageNavigation('prev')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-transform duration-200 ease-in-out hover:scale-110 opacity-0 group-hover:opacity-100 z-20"
                        aria-label="Imagem anterior"
                    >
                        <ChevronLeftIcon className="w-6 h-6"/>
                    </button>
                    <button
                        onClick={() => handleImageNavigation('next')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/70 backdrop-blur-sm rounded-full text-brand-text hover:bg-white transition-transform duration-200 ease-in-out hover:scale-110 opacity-0 group-hover:opacity-100 z-20"
                        aria-label="Próxima imagem"
                    >
                        <ChevronRightIcon className="w-6 h-6"/>
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                        {product.imageUrls.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/60'}`}
                                aria-label={`Ir para imagem ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 space-y-4">
              <h1 id="product-title" className="text-2xl font-bold text-brand-text">{product.name}</h1>
              <p className="text-brand-text-light whitespace-pre-wrap">{product.description}</p>
              <div>
                  <label htmlFor="observations" className="block text-sm font-medium text-brand-text-light mb-1">Observações</label>
                  <textarea 
                      id="observations"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={3}
                      placeholder="Digite observações aqui (opcional)..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-brand-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors duration-200"
                  />
              </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg mt-auto">
              <div className="flex justify-between items-center mb-4">
                  <span className={`text-xl font-bold ${product.originalPrice ? 'text-brand-accent' : 'text-brand-text'}`}>
                    {formatPrice(total)}
                  </span>
                  <div className="flex items-center">
                    <button onClick={() => handleQuantityChange(-1)} disabled={quantity === 1} className="p-2 rounded-full bg-brand-secondary text-brand-text hover:bg-gray-200 transition disabled:opacity-50"><MinusIcon className="w-5 h-5" /></button>
                    <span className="px-4 text-lg font-bold w-12 text-center text-brand-text">{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} className="p-2 rounded-full bg-brand-secondary text-brand-text hover:bg-gray-200 transition"><PlusIcon className="w-5 h-5" /></button>
                  </div>
              </div>
              <button 
                onClick={handleAddToCartClick}
                className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-brand-primary-dark transition-colors duration-300"
              >
                  <ShoppingBagIcon className="w-6 h-6" />
                  <span>ADICIONAR</span>
              </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailModal;