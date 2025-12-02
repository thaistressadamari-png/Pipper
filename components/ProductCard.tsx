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

  return (
    <button onClick={() => onProductClick(product)} className="w-full text-left flex items-center bg-white p-2 rounded-lg gap-4 hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2">
      {product.imageUrls && product.imageUrls.length > 0 && (
          <div className="flex-shrink-0">
            <img 
                src={product.imageUrls[0]} 
                alt={product.name} 
                className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-md" 
            />
          </div>
      )}
      <div className="flex flex-col flex-grow py-2">
        {product.promotionalTag && (
            <div className="mb-1">
                <span className="bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded">
                    {product.promotionalTag}
                </span>
            </div>
        )}
        <h3 className="text-base sm:text-lg font-bold text-brand-text">{product.name}</h3>
        <p className="text-gray-500 text-sm mt-1 flex-grow line-clamp-2 sm:block">{product.description}</p>
        <div className="flex items-baseline space-x-2 mt-2">
          {product.originalPrice && (
            <span className="text-gray-400 line-through text-sm">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          <span className={`text-base sm:text-lg font-bold ${product.originalPrice ? 'text-brand-accent' : 'text-brand-text'}`}>
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;