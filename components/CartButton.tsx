
import React from 'react';
import { ShoppingBagIcon } from './IconComponents';

interface CartButtonProps {
  itemCount: number;
  totalPrice: number;
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ itemCount, totalPrice, onClick }) => {
  if (itemCount === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onClick}
          className="w-full bg-brand-primary text-white p-4 rounded-xl shadow-xl flex items-center justify-between hover:bg-brand-primary-dark transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] group"
          aria-label={`Ver carrinho com ${itemCount} itens no total de ${formatPrice(totalPrice)}`}
        >
          <div className="flex items-center gap-3">
             <div className="bg-brand-secondary/20 w-8 h-8 rounded-full flex items-center justify-center relative group-hover:bg-brand-secondary/30 transition-colors">
               <span className="font-bold text-sm text-brand-secondary">{itemCount}</span>
            </div>
            <div className="flex flex-col items-start">
               <span className="font-medium text-sm sm:text-base text-brand-secondary">Ver sacola</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="font-bold text-base sm:text-lg">
                {formatPrice(totalPrice)}
             </span>
             <ShoppingBagIcon className="w-5 h-5 text-brand-secondary opacity-80" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default CartButton;
