

import React from 'react';
import type { CartItem } from '../types';
import { XIcon, PlusIcon, MinusIcon, TrashIcon } from './IconComponents';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-brand-bg shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-brand-secondary">
            <h2 className="text-2xl font-bold text-brand-text">Meu Pedido</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-brand-secondary/50">
              <XIcon className="h-6 w-6 text-brand-text" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-brand-text text-lg">Seu carrinho está vazio.</p>
                <p className="text-gray-500 mt-2">Adicione delícias do nosso cardápio!</p>
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.id} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                  <img src={item.imageUrls[0]} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                  <div className="flex-grow ml-4">
                    <h3 className="font-semibold text-brand-text">{item.name}</h3>
                    <p className="text-brand-primary font-bold">{formatPrice(item.price)}</p>
                    <div className="flex items-center mt-2">
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-brand-secondary/50 text-brand-text"><MinusIcon className="w-4 h-4" /></button>
                      <span className="px-3 font-bold text-brand-text">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-brand-secondary/50 text-brand-text"><PlusIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <button onClick={() => onRemoveItem(item.id)} className="ml-4 p-2 text-gray-400 hover:text-brand-primary">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="p-4 border-t border-brand-secondary bg-white">
              <div className="flex justify-between items-center text-lg font-bold text-brand-text">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full mt-4 bg-brand-primary text-white font-bold py-3 rounded-lg text-lg hover:bg-brand-primary-dark transition-colors duration-300"
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Cart;