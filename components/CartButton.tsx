import React from 'react';
import { ShoppingBagIcon } from './IconComponents';

interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ itemCount, onClick }) => {
  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onClick}
        className="flex items-center justify-center bg-brand-primary text-white rounded-full shadow-lg hover:bg-brand-primary-dark transition-all duration-300 ease-in-out w-16 h-16"
        aria-label={`Ver carrinho com ${itemCount} itens`}
      >
        <ShoppingBagIcon className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 bg-brand-accent text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
          {itemCount}
        </span>
      </button>
    </div>
  );
};

export default CartButton;
