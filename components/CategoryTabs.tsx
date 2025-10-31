import React, { useRef, useEffect, useState } from 'react';
import { MoreVerticalIcon, SearchIcon, ArrowLeftIcon } from './IconComponents';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenMenu: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, selectedCategory, onSelectCategory, onOpenMenu, onSearch, searchQuery }) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const selectedTabRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    if (selectedTabRef.current) {
      selectedTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);
  
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - tabsRef.current.offsetLeft;
    scrollLeft.current = tabsRef.current.scrollLeft;
  };
  
  const onMouseLeave = () => {
    isDragging.current = false;
  };
  
  const onMouseUp = () => {
    isDragging.current = false;
  };
  
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Multiplier for faster scroll
    tabsRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleBackClick = () => {
    setIsSearchVisible(false);
    onSearch('');
  };

  const scrollableCategories = categories.filter(c => c !== 'Todos');

  if (isSearchVisible) {
    return (
      <div className="sticky top-0 bg-brand-bg/80 backdrop-blur-md z-30 border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBackClick}
              className="p-2 rounded-full text-brand-text hover:bg-gray-100/50 transition-colors mr-2"
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
                className="w-full bg-gray-100/80 border-transparent rounded-full py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 bg-brand-bg/80 backdrop-blur-md z-30 border-b border-white/20 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={() => onSelectCategory('Todos')}
            className={`py-3 px-1 text-sm sm:text-base font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
              selectedCategory === 'Todos'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-light hover:text-brand-text'
            }`}
          >
            Todos
          </button>
          <div className="h-6 w-px bg-gray-200/50 mx-2"></div>
          <button onClick={onOpenMenu} className="p-2 text-gray-500 rounded-full hover:bg-gray-100/50 transition-colors" aria-label="Abrir menu de categorias">
            <MoreVerticalIcon className="h-5 w-5" />
          </button>

          <div
            ref={tabsRef}
            className="flex items-center space-x-4 overflow-x-auto flex-grow no-scrollbar cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
          >
            {scrollableCategories.map((category) => (
              <button
                ref={selectedCategory === category ? selectedTabRef : null}
                key={category}
                onClick={(e) => {
                  if (Math.abs(tabsRef.current!.scrollLeft - scrollLeft.current) > 5) {
                    e.preventDefault();
                  } else {
                    onSelectCategory(category);
                  }
                }}
                className={`py-3 px-1 text-sm sm:text-base font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                  selectedCategory === category
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-brand-text-light hover:text-brand-text'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <button
              onClick={() => setIsSearchVisible(true)}
              className="p-2 rounded-full text-brand-primary hover:bg-brand-secondary/50 transition-colors ml-2"
              aria-label="Buscar"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;