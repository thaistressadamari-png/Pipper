
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, ProductOption, CustomizationGroup, CustomizationOption, SelectedCustomization } from '../types';
import { ArrowLeftIcon, PlusIcon, MinusIcon, ShoppingBagIcon, XIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ShoppingCartIcon } from './IconComponents';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, observations?: string, selectedOption?: ProductOption, selectedCustomizations?: SelectedCustomization[]) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);
  
  const [customSelections, setCustomSelections] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setObservations('');
      setIsImageFullscreen(false);
      setCurrentImageIndex(0);
      setCustomSelections({});
      if (product.options && product.options.length > 0) {
          setSelectedOption(product.options[0]);
      } else {
          setSelectedOption(null);
      }
    }
  }, [product]);

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => {
        const next = Math.max(1, prev + amount);
        if (product?.inventoryEnabled && next > (product.inventoryQuantity || 0)) {
            return prev;
        }
        return next;
    });
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product?.imageUrls) {
      setCurrentImageIndex((prev) => (prev + 1) % product.imageUrls.length);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product?.imageUrls) {
      setCurrentImageIndex((prev) => (prev - 1 + product.imageUrls.length) % product.imageUrls.length);
    }
  };

  const { extraTotal, isAllGroupsValid, formattedCustomizations } = useMemo(() => {
    let total = 0;
    let allValid = true;
    const result: SelectedCustomization[] = [];

    if (!product?.customizationGroups) return { extraTotal: 0, isAllGroupsValid: true, formattedCustomizations: [] };

    for (const group of product.customizationGroups) {
      const groupSelections = customSelections[group.id] || {};
      const totalInGroup = (Object.values(groupSelections) as number[]).reduce((a: number, b: number) => a + b, 0);
      
      if (totalInGroup < group.min || totalInGroup > group.max) {
        allValid = false;
      }

      const items = [];
      for (const [optName, optQtyValue] of Object.entries(groupSelections)) {
        const optQty = optQtyValue as number;
        if (optQty > 0) {
          const opt = group.options.find(o => o.name === optName);
          if (opt) {
            total += (opt.priceExtra * optQty);
            items.push({ name: opt.name, quantity: optQty, priceExtra: opt.priceExtra });
          }
        }
      }
      if (items.length > 0) {
        result.push({ groupName: group.name, items });
      }
    }
    return { extraTotal: total, isAllGroupsValid: allValid, formattedCustomizations: result };
  }, [product, customSelections]);

  const handleCustomOptionChange = (group: CustomizationGroup, option: CustomizationOption, delta: number) => {
    setCustomSelections(prev => {
      const groupSelections: Record<string, number> = { ...(prev[group.id] || {}) };
      const currentQty = (groupSelections[option.name] as number) || 0;
      const totalInGroup = (Object.values(groupSelections) as number[]).reduce((a: number, b: number) => a + b, 0);

      if (group.type === 'single' || (group.min === 1 && group.max === 1)) {
        if (delta > 0) {
          return { ...prev, [group.id]: { [option.name]: 1 } };
        } else {
          return { ...prev, [group.id]: {} };
        }
      }

      const newQty = Math.max(0, currentQty + delta);
      if (delta > 0 && totalInGroup >= group.max) return prev;

      return {
        ...prev,
        [group.id]: {
          ...groupSelections,
          [option.name]: newQty
        }
      };
    });
  };
  
  const handleAddToCartClick = () => {
    if (product) {
        if (product.options && product.options.length > 0 && !selectedOption) {
            alert("Por favor, selecione uma opção.");
            return;
        }
        if (!isAllGroupsValid) {
            alert("Por favor, preencha as opções obrigatórias.");
            return;
        }
      onAddToCart(product, quantity, observations, selectedOption || undefined, formattedCustomizations);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  if (!product) return null;

  const basePrice = selectedOption ? selectedOption.price : product.price;
  const totalPrice = (basePrice + extraTotal) * quantity;
  const isSoldOut = product.inventoryEnabled && (product.inventoryQuantity || 0) <= 0;
  const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

  return (
    <>
      {isImageFullscreen && (
        <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center p-4" onClick={() => setIsImageFullscreen(false)}>
            <button className="absolute top-4 right-4 text-white p-2 z-[80]"><XIcon className="w-8 h-8"/></button>
            
            {hasMultipleImages && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all z-[80]"
                >
                  <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all z-[80]"
                >
                  <ChevronRightIcon className="w-8 h-8" />
                </button>
              </>
            )}

            <img src={product.imageUrls[currentImageIndex]} className="max-h-full max-w-full object-contain rounded" alt={product.name}/>

            {hasMultipleImages && (
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-[80]">
                {product.imageUrls.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all ${idx === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                  />
                ))}
              </div>
            )}
        </div>
      )}
      
      <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-in-up overflow-y-auto no-scrollbar">
        <style>{`.animate-slide-in-up { animation: slideInUp 0.3s ease-out; } @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        
        <div className="flex-1 pb-48"> 
          <div className="max-w-2xl mx-auto w-full relative">
            
            {product.imageUrls && product.imageUrls.length > 0 ? (
              <div className="relative aspect-square sm:aspect-video w-full bg-gray-100 group">
                  <img 
                    src={product.imageUrls[currentImageIndex]} 
                    alt={product.name} 
                    className={`w-full h-full object-cover cursor-pointer ${isSoldOut ? 'grayscale' : ''}`} 
                    onClick={() => setIsImageFullscreen(true)}
                  />

                  {hasMultipleImages && !isSoldOut && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg text-gray-800 transition-all active:scale-90 z-10"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg text-gray-800 transition-all active:scale-90 z-10"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>

                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                        {product.imageUrls.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                            className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/60 hover:bg-white/80'}`}
                            aria-label={`Ver imagem ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <button 
                    onClick={onClose} 
                    className="absolute top-4 left-4 p-2 bg-white/90 rounded-full shadow-lg text-gray-900 hover:bg-white transition-all active:scale-90 z-20"
                  >
                    <ArrowLeftIcon className="w-6 h-6" />
                  </button>
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white font-bold px-6 py-2 rounded uppercase tracking-widest">Esgotado</span>
                    </div>
                  )}
              </div>
            ) : (
               <div className="p-4 border-b flex items-center sticky top-0 bg-white z-20">
                  <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900"><ArrowLeftIcon className="w-6 h-6"/></button>
                  <h1 className="ml-2 text-lg font-bold text-brand-text truncate">{product.name}</h1>
              </div>
            )}
            
            <div className="p-6 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-brand-text">{product.name}</h1>
                    <p className="text-brand-text-light text-base mt-2 leading-relaxed">{product.description}</p>
                </div>
                
                {product.options && product.options.length > 0 && !isSoldOut && (
                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-brand-text border-l-4 border-brand-primary pl-3">Escolha uma opção</h3>
                        <div className="grid gap-3">
                            {product.options.map((option, index) => (
                                <button key={index} onClick={() => setSelectedOption(option)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${selectedOption?.name === option.name ? 'border-brand-primary bg-brand-secondary/20 ring-1 ring-brand-primary shadow-sm' : 'border-gray-200'}`}
                                >
                                    <span className="font-bold text-brand-text">{option.name}</span>
                                    <span className="font-bold text-brand-primary">{formatPrice(option.price)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {product.customizationGroups?.map((group) => {
                  const groupSelections = customSelections[group.id] || {};
                  const totalInGroup = (Object.values(groupSelections) as number[]).reduce((a: number, b: number) => a + b, 0);
                  const isValid = totalInGroup >= group.min && totalInGroup <= group.max;
                  const isSingleChoice = group.min === 1 && group.max === 1;

                  return (
                    <div key={group.id} className="pt-6 border-t border-gray-100 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-brand-text">{group.name}</h3>
                                <p className="text-xs text-gray-400">
                                    {group.min === group.max ? `Escolha ${group.min}` : `Escolha de ${group.min} a ${group.max}`}
                                </p>
                            </div>
                            {isValid ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Obrigatório</span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {group.options.map((opt) => {
                                const qty = (groupSelections[opt.name] as number) || 0;
                                const isSelected = qty > 0;
                                
                                return (
                                    <div 
                                      key={opt.name} 
                                      onClick={() => isSingleChoice && handleCustomOptionChange(group, opt, 1)}
                                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSingleChoice ? 'cursor-pointer' : ''} ${isSelected ? 'border-brand-primary/50 bg-brand-secondary/10' : 'border-gray-50'}`}
                                    >
                                        <div className="flex-grow pr-4">
                                            <p className="text-sm font-bold text-brand-text">{opt.name}</p>
                                            {opt.priceExtra > 0 && <p className="text-xs text-brand-accent font-bold">+{formatPrice(opt.priceExtra)}</p>}
                                        </div>
                                        
                                        {isSingleChoice ? (
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-brand-primary bg-brand-primary' : 'border-gray-200 bg-white'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                          </div>
                                        ) : (
                                          <div className="flex items-center bg-white rounded-lg border border-gray-100 shadow-sm">
                                              <button onClick={(e) => { e.stopPropagation(); handleCustomOptionChange(group, opt, -1); }} className={`p-2 transition-opacity ${qty === 0 ? 'opacity-20 text-gray-300' : 'text-gray-900'}`}><MinusIcon className="w-4 h-4"/></button>
                                              <span className="px-3 text-sm font-black min-w-[32px] text-center text-brand-text">{qty}</span>
                                              <button onClick={(e) => { e.stopPropagation(); handleCustomOptionChange(group, opt, 1); }} className={`p-2 transition-opacity ${(totalInGroup >= group.max && group.type !== 'single') ? 'opacity-20 text-gray-300' : 'text-brand-primary'}`}><PlusIcon className="w-4 h-4"/></button>
                                          </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                  );
                })}
  
                {!isSoldOut && (
                    <div className="pt-6 border-t border-gray-100">
                        <label className="block text-sm font-bold text-brand-text mb-2">Observações</label>
                        <textarea 
                            value={observations} 
                            onChange={(e) => setObservations(e.target.value)} 
                            rows={3} 
                            placeholder="Algum pedido especial? (Ex: Sem amendoim)"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none text-gray-900 placeholder-gray-400"
                        />
                    </div>
                )}
            </div>
          </div>
        </div>
        
        {/* Barra de Ação Inferior Refinada */}
        {!isSoldOut && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.06)] z-30">
                <div className="max-w-2xl mx-auto space-y-4">
                    {/* Linha Superior: Total e Quantidade Arredondada */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs font-normal text-gray-400 mb-0.5">Total</span>
                            <span className="text-2xl font-black text-brand-primary">{formatPrice(totalPrice)}</span>
                        </div>
                        
                        <div className="flex items-center bg-gray-50 rounded-full px-2 py-1.5 border border-gray-100">
                            <button 
                                onClick={() => handleQuantityChange(-1)} 
                                disabled={quantity === 1} 
                                className="p-2 disabled:opacity-20 text-gray-600 hover:bg-white hover:shadow-sm rounded-full transition-all"
                            >
                                <MinusIcon className="w-4 h-4" />
                            </button>
                            <span className="px-4 text-base font-bold min-w-[50px] text-center text-brand-text tabular-nums">
                              {quantity}
                            </span>
                            <button 
                                onClick={() => handleQuantityChange(1)} 
                                className="p-2 text-brand-primary hover:bg-white hover:shadow-sm rounded-full transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Botão de Adicionar ao Carrinho */}
                    <button 
                        onClick={handleAddToCartClick} 
                        disabled={!isAllGroupsValid}
                        className="w-full bg-brand-primary text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
                    >
                        <ShoppingCartIcon className="w-6 h-6 text-brand-secondary" /> 
                        <span className="text-lg">Adicionar ao carrinho</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default ProductDetailModal;
