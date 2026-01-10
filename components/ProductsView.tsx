
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, ProductOption, CategoryMetadata } from '../types';
import { TrashIcon, SearchIcon, DragHandleIcon, CopyIcon, PlusIcon, ChevronRightIcon, XIcon as CloseIcon } from './IconComponents';

interface ProductsViewProps {
  products: Product[];
  categories: CategoryMetadata[];
  onAddProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (productData: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onUpdateCategoryOrder: (newOrder: CategoryMetadata[]) => Promise<void>;
  onToggleCategoriesArchive: (categoryNames: string[], archive: boolean) => Promise<void>;
}

const SearchableSelect: React.FC<{
    options: CategoryMetadata[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => 
            opt.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCategory = options.find(o => o.name === value);

    return (
        <div className="relative mt-1" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            >
                <span className="block truncate text-gray-900">
                    {selectedCategory ? (
                        <span className="flex items-center gap-2">
                            {selectedCategory.isArchived ? '📦' : '📂'} {selectedCategory.name}
                        </span>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="sticky top-0 z-10 bg-white px-2 py-2 border-b border-gray-100">
                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-brand-primary focus:border-brand-primary"
                                placeholder="Pesquisar categoria..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <li
                                    key={opt.name}
                                    onClick={() => {
                                        onChange(opt.name);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-brand-secondary/30 transition-colors ${
                                        value === opt.name ? 'bg-brand-secondary/50 text-brand-primary font-semibold' : 'text-gray-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{opt.isArchived ? '📦' : '📂'}</span>
                                        <span className="block truncate">{opt.name}</span>
                                        {opt.isArchived && <span className="text-[10px] text-gray-400 uppercase font-bold">(Arquivada)</span>}
                                    </div>
                                    {value === opt.name && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-primary">
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li className="py-4 text-center text-gray-500 text-sm">Nenhuma categoria encontrada</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{
    product: Product;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ product, onCancel, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center animate-fade-in-up">
                <h3 className="text-lg font-bold text-brand-text">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-500 mt-2">
                    Você tem certeza que deseja apagar o produto <span className="font-semibold">"{product.name}"</span>? Esta ação não pode ser desfeita.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark">
                        Apagar
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteCategoryConfirmationModal: React.FC<{
    categoryName: string;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ categoryName, onCancel, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center animate-fade-in-up">
                <h3 className="text-lg font-bold text-brand-text">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-500 mt-2">
                    Você tem certeza que deseja apagar a categoria <span className="font-semibold">"{categoryName}"</span>? Esta ação não pode ser desfeita.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark">
                        Apagar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductsView: React.FC<ProductsViewProps> = ({ 
    products, 
    categories, 
    onAddProduct, 
    onUpdateProduct, 
    onDeleteProduct, 
    onAddCategory, 
    onDeleteCategory, 
    onUpdateCategoryOrder,
    onToggleCategoriesArchive
}) => {
  const activeCategoriesOnly = useMemo(() => categories.filter(c => !c.isArchived), [categories]);
  const archivedCategoriesOnly = useMemo(() => categories.filter(c => c.isArchived), [categories]);

  const sortedCategoriesForSelect = useMemo(() => {
    return [...activeCategoriesOnly, ...archivedCategoriesOnly];
  }, [activeCategoriesOnly, archivedCategoriesOnly]);

  const initialFormState = {
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    promotionalTag: '',
    category: '',
    imageUrls: '',
    leadTimeDays: '0',
    inventoryEnabled: false,
    inventoryQuantity: '0'
  };

  const [productForm, setProductForm] = useState(initialFormState);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState({ name: '', price: '' });
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas');
  
  const [categoryTab, setCategoryTab] = useState<'active' | 'archived'>('active');
  const [productViewTab, setProductViewTab] = useState<'active' | 'inactive'>('active');
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (productToDelete || categoryToDelete || isProductModalOpen) {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }
  }, [productToDelete, categoryToDelete, isProductModalOpen]);

  useEffect(() => {
    if (productOptions.length > 0 && isProductModalOpen) {
        const minPrice = Math.min(...productOptions.map(o => o.price));
        setProductForm(prev => ({ ...prev, price: String(minPrice) }));
    }
  }, [productOptions, isProductModalOpen]);
  
  const handleProductFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
        setProductForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setProductForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm(initialFormState);
    setProductOptions([]);
    setIsProductModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        originalPrice: (product.originalPrice && product.originalPrice > 0) ? String(product.originalPrice) : '',
        promotionalTag: product.promotionalTag || '',
        category: product.category,
        imageUrls: product.imageUrls ? product.imageUrls.join('\n') : '',
        leadTimeDays: String(product.leadTimeDays || 0),
        inventoryEnabled: !!product.inventoryEnabled,
        inventoryQuantity: String(product.inventoryQuantity || 0)
    });
    setProductOptions(product.options || []);
    setIsProductModalOpen(true);
  };
  
  const handleDuplicateClick = (product: Product) => {
    setProductForm({
        name: `${product.name} (Cópia)`,
        description: product.description,
        price: String(product.price),
        originalPrice: (product.originalPrice && product.originalPrice > 0) ? String(product.originalPrice) : '',
        promotionalTag: product.promotionalTag || '',
        category: product.category,
        imageUrls: product.imageUrls ? product.imageUrls.join('\n') : '',
        leadTimeDays: String(product.leadTimeDays || 0),
        inventoryEnabled: !!product.inventoryEnabled,
        inventoryQuantity: String(product.inventoryQuantity || 0)
    });
    setProductOptions(product.options || []);
    setEditingProduct(null); 
    setIsProductModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setMessage(null);
    try {
        await onDeleteProduct(productToDelete.id);
        setMessage({ type: 'success', text: 'Produto apagado com sucesso!' });
    } catch (error) {
        setMessage({ type: 'error', text: 'Ocorreu um erro ao apagar o produto.' });
    } finally {
        setProductToDelete(null);
        setTimeout(() => setMessage(null), 5000);
    }
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductForm(initialFormState);
    setProductOptions([]);
    setMessage(null);
  };

  const handleAddOption = () => {
      if (!newOption.name || !newOption.price) return;
      setProductOptions([...productOptions, { name: newOption.name, price: parseFloat(newOption.price) }]);
      setNewOption({ name: '', price: '' });
  };

  const handleRemoveOption = (index: number) => {
      setProductOptions(productOptions.filter((_, i) => i !== index));
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    const imageUrlsArray = productForm.imageUrls.split('\n').map(url => url.trim()).filter(url => url);

    if (!productForm.name || !productForm.description || !productForm.category) {
        setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' });
        setIsSubmitting(false);
        return;
    }
    
    if (productOptions.length === 0 && !productForm.price) {
         setMessage({ type: 'error', text: 'Por favor, informe o preço base ou adicione opções.' });
         setIsSubmitting(false);
         return;
    }

    try {
      let effectivePrice = parseFloat(productForm.price);
      if (productOptions.length > 0) {
          effectivePrice = Math.min(...productOptions.map(o => o.price));
      }

      const productData: any = {
        name: productForm.name,
        description: productForm.description,
        price: effectivePrice,
        category: productForm.category,
        imageUrls: imageUrlsArray,
        leadTimeDays: parseInt(productForm.leadTimeDays, 10) || 0,
        options: productOptions,
        inventoryEnabled: productForm.inventoryEnabled,
        inventoryQuantity: parseInt(productForm.inventoryQuantity, 10) || 0,
      };

      if (editingProduct) {
          productData.id = editingProduct.id;
      }

      const origPrice = parseFloat(productForm.originalPrice);
      if (!isNaN(origPrice) && origPrice > 0) {
        productData.originalPrice = origPrice;
      } else {
        productData.originalPrice = null;
      }

      if (productForm.promotionalTag && productForm.promotionalTag.trim()) {
        productData.promotionalTag = productForm.promotionalTag.trim();
      } else {
        productData.promotionalTag = null;
      }

      if (editingProduct) {
        await onUpdateProduct(productData);
        setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
      } else {
        await onAddProduct(productData);
        setMessage({ type: 'success', text: 'Produto cadastrado com sucesso!' });
      }
      
      setTimeout(() => {
          closeProductModal();
      }, 1000);
    } catch (error) {
        setMessage({ type: 'error', text: 'Ocorreu um erro.' });
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setIsSubmitting(true);
    try {
        await onAddCategory(newCategory);
        setNewCategory('');
        setMessage({ type: 'success', text: 'Categoria adicionada!' });
    } catch (e) {
        setMessage({ type: 'error', text: 'Erro ao adicionar categoria.' });
    } finally {
        setIsSubmitting(false);
        setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
      const isCategoryInUse = products.some(p => p.category === categoryName);
      if (isCategoryInUse) {
          alert(`A categoria "${categoryName}" está em uso por um ou mais produtos e não pode ser apagada.`);
          return;
      }
      setCategoryToDelete(categoryName);
  };
  
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
        await onDeleteCategory(categoryToDelete);
        setMessage({ type: 'success', text: 'Categoria apagada!' });
    } catch (e) {
        setMessage({ type: 'error', text: 'Erro ao apagar categoria.' });
    } finally {
        setIsSubmitting(false);
        setCategoryToDelete(null);
        setTimeout(() => setMessage(null), 3000);
    }
  };
  
  const handleSort = () => {
      if (dragItem.current === null || dragOverItem.current === null) return;
      const categoriesCopy = [...categories];
      
      const activeCats = categories.filter(c => !c.isArchived);
      const draggedCat = activeCats[dragItem.current];
      const targetCat = activeCats[dragOverItem.current];
      
      const realDragIdx = categories.findIndex(c => c.name === draggedCat.name);
      const realTargetIdx = categories.findIndex(c => c.name === targetCat.name);

      const item = categoriesCopy.splice(realDragIdx, 1)[0];
      categoriesCopy.splice(realTargetIdx, 0, item);

      dragItem.current = null;
      dragOverItem.current = null;
      onUpdateCategoryOrder(categoriesCopy);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase());
    const isCategoryArchived = categories.some(c => c.name === p.category && c.isArchived);
    
    if (productViewTab === 'active' && isCategoryArchived) return false;
    if (productViewTab === 'inactive' && !isCategoryArchived) return false;

    const matchesCategory = selectedCategoryFilter === 'Todas' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-900";

  const archivedCategories = useMemo(() => categories.filter(c => c.isArchived), [categories]);
  const currentCategoryList = categoryTab === 'active' ? activeCategoriesOnly : archivedCategories;

  const toggleCategorySelection = (name: string) => {
    setSelectedCategoryNames(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleArchiveSelected = async () => {
    if (selectedCategoryNames.length === 0) return;
    setIsSubmitting(true);
    try {
      await onToggleCategoriesArchive(selectedCategoryNames, categoryTab === 'active');
      setSelectedCategoryNames([]);
      setMessage({ type: 'success', text: `Categorias ${categoryTab === 'active' ? 'arquivadas' : 'restauradas'} com sucesso!` });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao atualizar categorias.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const productCounts = useMemo(() => {
    const active = products.filter(p => !categories.find(c => c.name === p.category && c.isArchived)).length;
    const inactive = products.length - active;
    return { active, inactive };
  }, [products, categories]);

  return (
    <>
        {productToDelete && (
            <DeleteConfirmationModal 
                product={productToDelete}
                onCancel={() => setProductToDelete(null)}
                onConfirm={confirmDelete}
            />
        )}
        {categoryToDelete && (
            <DeleteCategoryConfirmationModal
                categoryName={categoryToDelete}
                onCancel={() => setCategoryToDelete(null)}
                onConfirm={confirmDeleteCategory}
            />
        )}

        {/* Modal de Produto (Cadastro/Edição) */}
        {isProductModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-in-up">
                    <header className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-xl font-bold text-brand-text">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                        <button onClick={closeProductModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <form onSubmit={handleProductSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-brand-text-light">Nome do Produto</label>
                                    <input type="text" name="name" id="name" value={productForm.name} onChange={handleProductFormChange} className={inputStyles} required />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-brand-text-light">Descrição</label>
                                    <textarea name="description" id="description" value={productForm.description} onChange={handleProductFormChange} rows={3} className={inputStyles} required></textarea>
                                </div>
                                <div>
                                    <label htmlFor="imageUrls" className="block text-sm font-medium text-brand-text-light">URLs da Imagem (uma por linha)</label>
                                    <textarea name="imageUrls" id="imageUrls" value={productForm.imageUrls} onChange={handleProductFormChange} rows={4} className={inputStyles} placeholder="https://exemplo.com/imagem.jpg"></textarea>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-bold text-brand-text mb-2">Variações (Tamanho/Peso)</label>
                                    <div className="space-y-2 mb-4">
                                        {productOptions.map((opt, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                                                <div className="min-w-0 pr-4">
                                                    <span className="font-medium text-brand-text">{opt.name}</span>
                                                    <span className="mx-2 text-gray-300">|</span>
                                                    <span className="text-brand-primary font-bold">{opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveOption(index)} className="p-1 text-gray-400 hover:text-red-600">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                                        <div className="flex-grow">
                                            <input type="text" placeholder="Nome (Ex: 500g)" value={newOption.name} onChange={(e) => setNewOption({ ...newOption, name: e.target.value })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md sm:text-sm" />
                                        </div>
                                        <div className="w-full sm:w-1/3">
                                            <input type="number" placeholder="Preço" value={newOption.price} onChange={(e) => setNewOption({ ...newOption, price: e.target.value })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md sm:text-sm" />
                                        </div>
                                        <button type="button" onClick={handleAddOption} className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark">
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="price" className="block text-sm font-medium text-brand-text-light">Preço de Venda (R$)</label>
                                        <input type="number" name="price" id="price" value={productForm.price} onChange={handleProductFormChange} className={`${inputStyles} ${productOptions.length > 0 ? 'bg-gray-100' : ''}`} step="0.01" min="0" required={productOptions.length === 0} readOnly={productOptions.length > 0} />
                                    </div>
                                    <div>
                                        <label htmlFor="originalPrice" className="block text-sm font-medium text-brand-text-light">Preço Original (R$ - Opcional)</label>
                                        <input type="number" name="originalPrice" id="originalPrice" value={productForm.originalPrice} onChange={handleProductFormChange} className={inputStyles} step="0.01" min="0" placeholder="Sem promoção" />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input 
                                            type="checkbox" 
                                            id="inventoryEnabled" 
                                            name="inventoryEnabled" 
                                            checked={!!productForm.inventoryEnabled} 
                                            onChange={handleProductFormChange}
                                            className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                                        />
                                        <label htmlFor="inventoryEnabled" className="text-sm font-bold text-brand-text">Habilitar Controle de Estoque</label>
                                    </div>
                                    {productForm.inventoryEnabled && (
                                        <div className="animate-fade-in">
                                            <label htmlFor="inventoryQuantity" className="block text-sm font-medium text-brand-text-light">Quantidade Disponível</label>
                                            <input 
                                                type="number" 
                                                name="inventoryQuantity" 
                                                id="inventoryQuantity" 
                                                value={productForm.inventoryQuantity} 
                                                onChange={handleProductFormChange} 
                                                className={inputStyles} 
                                                min="0"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-brand-text-light">Categoria</label>
                                        <SearchableSelect options={sortedCategoriesForSelect} value={productForm.category} onChange={(val) => setProductForm(prev => ({ ...prev, category: val }))} placeholder="Selecione..." />
                                    </div>
                                    <div>
                                        <label htmlFor="promotionalTag" className="block text-sm font-medium text-brand-text-light">Tag Promocional (Opcional)</label>
                                        <input type="text" name="promotionalTag" id="promotionalTag" value={productForm.promotionalTag} onChange={handleProductFormChange} className={inputStyles} placeholder="Ex: PROMO" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="leadTimeDays" className="block text-sm font-medium text-brand-text-light">Prazo de Produção (dias)</label>
                                    <input type="number" name="leadTimeDays" id="leadTimeDays" value={productForm.leadTimeDays} onChange={handleProductFormChange} className={inputStyles} min="0" required />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="submit" disabled={isSubmitting} className="flex-grow py-3 px-4 rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark font-bold disabled:opacity-50">
                                    {isSubmitting ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto')}
                                </button>
                                <button type="button" onClick={closeProductModal} className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-8 overflow-x-hidden">
            <div className="max-w-3xl mx-auto flex justify-between items-center bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-brand-text">Gestão de Produtos</h2>
                    <p className="text-xs text-gray-500">Gerencie seu cardápio e categorias</p>
                </div>
                <button 
                    onClick={openAddProductModal}
                    className="bg-brand-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-brand-primary-dark transition-all shadow-md active:scale-95"
                >
                    <PlusIcon className="w-5 h-5" />
                    Novo Produto
                </button>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-6">Gerenciar Categorias</h2>
                    <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input 
                            type="text" 
                            value={newCategory} 
                            onChange={(e) => setNewCategory(e.target.value)} 
                            className={inputStyles + ' flex-grow'} 
                            placeholder="Nova categoria" 
                        />
                        <button type="button" onClick={handleAddCategory} disabled={isSubmitting} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50">Adicionar</button>
                    </div>

                    <div className="border-b border-gray-200 mt-6 overflow-x-auto">
                      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                          onClick={() => { setCategoryTab('active'); setSelectedCategoryNames([]); }}
                          className={`${
                            categoryTab === 'active'
                              ? 'border-brand-primary text-brand-primary'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                          Ativas ({activeCategoriesOnly.length})
                        </button>
                        <button
                          onClick={() => { setCategoryTab('archived'); setSelectedCategoryNames([]); }}
                          className={`${
                            categoryTab === 'archived'
                              ? 'border-brand-primary text-brand-primary'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                          Arquivadas ({archivedCategories.length})
                        </button>
                      </nav>
                    </div>

                    {selectedCategoryNames.length > 0 && (
                      <div className="flex items-center justify-between bg-brand-secondary/30 p-3 rounded-lg animate-fade-in">
                        <span className="text-sm font-medium text-brand-primary">
                          {selectedCategoryNames.length} {selectedCategoryNames.length === 1 ? 'selecionada' : 'selecionadas'}
                        </span>
                        <button
                          onClick={handleArchiveSelected}
                          disabled={isSubmitting}
                          className={`px-4 py-2 text-sm font-bold rounded-md text-white transition-colors ${
                            categoryTab === 'active' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {categoryTab === 'active' ? 'Arquivar Selecionadas' : 'Restaurar Selecionadas'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 mt-2">
                        {currentCategoryList.map((cat, index) => (
                            <div key={cat.name}
                                draggable={categoryTab === 'active'}
                                onDragStart={() => categoryTab === 'active' && (dragItem.current = index)}
                                onDragEnter={() => categoryTab === 'active' && (dragOverItem.current = index)}
                                onDragEnd={handleSort}
                                onDragOver={(e) => e.preventDefault()}
                                className={`flex items-center justify-between p-3 rounded-md border border-gray-100 ${
                                  categoryTab === 'active' ? 'bg-gray-50 cursor-grab active:cursor-grabbing' : 'bg-gray-100/50'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-grow">
                                    <input 
                                      type="checkbox"
                                      checked={selectedCategoryNames.includes(cat.name)}
                                      onChange={() => toggleCategorySelection(cat.name)}
                                      className="w-5 h-5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary cursor-pointer flex-shrink-0"
                                    />
                                    {categoryTab === 'active' && <DragHandleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                    <span className={`text-sm font-medium truncate ${cat.isArchived ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                      {cat.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                  <button 
                                    type="button" 
                                    onClick={() => onToggleCategoriesArchive([cat.name], !cat.isArchived)}
                                    title={cat.isArchived ? "Restaurar" : "Arquivar"}
                                    className="p-1 text-gray-400 hover:text-brand-primary transition-colors"
                                  >
                                    {cat.isArchived ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                      </svg>
                                    )}
                                  </button>
                                  <button type="button" onClick={() => handleDeleteCategory(cat.name)} className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50" disabled={isSubmitting}>
                                      <TrashIcon className="w-5 h-5" />
                                  </button>
                                </div>
                            </div>
                        ))}
                        {currentCategoryList.length === 0 && (
                          <p className="text-center text-gray-400 text-sm py-8 italic">Nenhuma categoria {categoryTab === 'active' ? 'ativa' : 'arquivada'}.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-6">Produtos Cadastrados</h2>
                
                <div className="border-b border-gray-200 mb-6 overflow-x-auto">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setProductViewTab('active')}
                      className={`${
                        productViewTab === 'active'
                          ? 'border-brand-primary text-brand-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                    >
                      Ativos ({productCounts.active})
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </button>
                    <button
                      onClick={() => setProductViewTab('inactive')}
                      className={`${
                        productViewTab === 'inactive'
                          ? 'border-brand-primary text-brand-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                    >
                      Arquivados ({productCounts.inactive})
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    </button>
                  </nav>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Buscar produtos por nome..."
                            className="w-full bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="sm:w-64 flex-shrink-0">
                        <select
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="w-full bg-gray-100 border-transparent rounded-full py-2 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer"
                            style={{
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 1rem center',
                                backgroundSize: '0.65em auto'
                            }}
                        >
                            <option value="Todas">Todas as Categorias</option>
                            {(productViewTab === 'active' ? activeCategoriesOnly : archivedCategories).map(cat => (
                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredProducts.map(p => {
                        const isArchived = categories.find(c => c.name === p.category && c.isArchived);
                        return (
                        <div key={p.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border transition-all gap-3 ${isArchived ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto flex-grow">
                                {p.imageUrls && p.imageUrls.length > 0 ? (
                                    <img src={p.imageUrls[0]} alt={p.name} className="w-12 h-12 object-cover rounded flex-shrink-0"/>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-[10px] flex-shrink-0">Sem img</div>
                                )}
                                <div className="min-w-0 flex-grow">
                                    <p className="font-semibold text-brand-text truncate text-sm sm:text-base">{p.name}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[150px]">{p.category}</p>
                                        {isArchived && (
                                            <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase flex-shrink-0">Arquivada</span>
                                        )}
                                        {p.inventoryEnabled && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${p.inventoryQuantity && p.inventoryQuantity > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                Estoque: {p.inventoryQuantity || 0}
                                            </span>
                                        )}
                                        {p.promotionalTag && (
                                            <span className="text-[9px] font-bold bg-brand-primary text-white px-1.5 py-0.5 rounded uppercase flex-shrink-0">{p.promotionalTag}</span>
                                        )}
                                    </div>
                                    {p.options && p.options.length > 0 && (
                                        <p className="text-[9px] text-brand-primary font-medium mt-1">{p.options.length} opções</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                                <button onClick={() => handleDuplicateClick(p)} className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-gray-500 hover:text-brand-primary transition-colors" title="Duplicar">
                                    <CopyIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Duplicar</span>
                                </button>
                                <button onClick={() => handleEditClick(p)} className="text-[10px] sm:text-xs font-medium text-brand-primary hover:underline transition-colors">Editar</button>
                                <button onClick={() => setProductToDelete(p)} className="text-[10px] sm:text-xs font-medium text-red-600 hover:underline transition-colors">Apagar</button>
                            </div>
                        </div>
                    )})}
                    {filteredProducts.length === 0 && (
                        <p className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            Nenhum produto {productViewTab === 'active' ? 'ativo' : 'arquivado'} encontrado.
                        </p>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default ProductsView;
