import React from 'react';
import { XIcon } from './IconComponents';

interface CategoryMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSelectCategory: (category: string) => void;
}

const CategoryMenuModal: React.FC<CategoryMenuModalProps> = ({ isOpen, onClose, categories, onSelectCategory }) => {
  const handleCategoryClick = (category: string) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center h-16 border-b border-gray-200 relative">
            <div className="flex-grow flex items-center justify-center">
              <span className="h-px w-8 bg-gray-300"></span>
              <h2 className="text-lg font-bold text-brand-text uppercase tracking-wider mx-4">Menu</h2>
              <span className="h-px w-8 bg-gray-300"></span>
            </div>
            <button
              onClick={onClose}
              className="absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full text-brand-text-light hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </header>
          <nav className="flex-grow overflow-y-auto p-2">
            <ul className="divide-y divide-gray-100">
              {categories.map(category => (
                <li key={category}>
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className="w-full text-left text-brand-text hover:bg-gray-100 px-4 py-3 transition-colors text-base"
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default CategoryMenuModal;