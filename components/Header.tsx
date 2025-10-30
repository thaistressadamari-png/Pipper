import React, { useState } from 'react';
import { MenuIcon, SearchIcon, ArrowLeftIcon } from './IconComponents';

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

const Header: React.FC<HeaderProps> = ({ onSearch, searchQuery }) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const handleSearchClick = () => {
    setIsSearchVisible(true);
  };

  const handleBackClick = () => {
    setIsSearchVisible(false);
    onSearch('');
  };

  return (
    <header className="bg-brand-bg/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {!isSearchVisible ? (
          <div className="flex items-center justify-between h-16">
            <button
              className="p-2 rounded-full text-brand-text hover:bg-gray-100 transition-colors"
              aria-label="Abrir menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <button
              onClick={handleSearchClick}
              className="p-2 rounded-full text-brand-primary hover:bg-brand-secondary transition-colors"
              aria-label="Buscar"
            >
              <SearchIcon className="h-6 w-6" />
            </button>
          </div>
        ) : (
          <div className="flex items-center h-16">
            <button
              onClick={handleBackClick}
              className="p-2 rounded-full text-brand-text hover:bg-gray-100 transition-colors mr-2"
              aria-label="Voltar"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div className="relative flex-grow">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
