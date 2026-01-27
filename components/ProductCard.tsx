
import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick }) => {
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const calculateStartingPrice = () => {
    let price = product.price;
    let starting = (product.options && product.options.length > 0);

    // Se o preço base for 0 e houver grupos de personalização, calculamos o preço mínimo
    if (price === 0 && product.customizationGroups && product.customizationGroups.length > 0) {
      const mandatoryGroups = product.customizationGroups.filter(g => g.min > 0);
      if (mandatoryGroups.length > 0) {
        let minMandatory = 0;
        mandatoryGroups.forEach(g => {
          if (g.options && g.options.length > 0) {
            const prices = g.options.map(o => o.priceExtra);
            minMandatory += Math.min(...prices);
          }
        });
        if (minMandatory > 0) {
          return { price: minMandatory, starting: true };
        }
      }
      
      // Fallback: se não houver obrigatórios, mas houver adicionais com preço, mostra o menor
      const allExtras = product.customizationGroups.flatMap(g => g.options.map(o => o.priceExtra)).filter(p => p > 0);
      if (allExtras.length > 0) {
        return { price: Math.min(...allExtras), starting: true };
      }
    }

    return { price, starting };
  };

  const { price: displayPrice, starting: showStartingAt } = calculateStartingPrice();
  
  const isOnPromotion = product.originalPrice && product.originalPrice > product.price;
  
  const isSoldOut = product.inventoryEnabled && (product.inventoryQuantity || 0) <= 0;

  return (
    <button 
        onClick={() => !isSoldOut && onProductClick(product)} 
        disabled={isSoldOut}
        className={`w-full text-left flex items-center bg-white p-2 sm:p-3 rounded-xl gap-4 border border-transparent transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 shadow-sm ${
            isSoldOut 
                ? 'opacity-60 cursor-not-allowed filter grayscale' 
                : 'hover:shadow-lg hover:border-brand-secondary/50 hover:-translate-y-1'
        }`}
    >
      {product.imageUrls && product.imageUrls.length > 0 && (
          <div className="flex-shrink-0 relative">
            <img 
                src={product.imageUrls[0]} 
                alt={product.name} 
                className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg shadow-sm" 
            />
            {isSoldOut && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Esgotado</span>
                </div>
            )}
          </div>
      )}
      <div className="flex flex-col flex-grow py-1">
        <div className="flex flex-wrap gap-2 mb-1">
            {product.promotionalTag && isOnPromotion && (
                <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    {product.promotionalTag}
                </span>
            )}
            {isSoldOut && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    ESGOTADO
                </span>
            )}
        </div>
        <h3 className="text-base font-bold text-brand-text leading-tight">{product.name}</h3>
        <p className="text-gray-500 text-xs sm:text-sm mt-1 flex-grow line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="flex items-baseline space-x-2 mt-2">
          {isOnPromotion && (
            <span className="text-gray-400 line-through text-xs">
              {formatPrice(product.originalPrice!)}
            </span>
          )}
          <div className="flex flex-col sm:flex-row sm:items-baseline">
              {showStartingAt && <span className="text-[10px] text-gray-400 mr-1 uppercase font-medium">A partir de</span>}
              <span className={`text-base font-bold ${isOnPromotion ? 'text-brand-accent' : 'text-brand-primary'}`}>
                {formatPrice(displayPrice)}
              </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
