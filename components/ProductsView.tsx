
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, ProductOption, CategoryMetadata } from '../types';
import { TrashIcon, SearchIcon, DragHandleIcon, CopyIcon, PlusIcon } from './IconComponents';

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

const DeleteConfirmationModal: React.FC<{
    product: Product;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ product, onCancel, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
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

  const initialFormState = {
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    promotionalTag: '',
    category: activeCategoriesOnly.length > 0 ? activeCategoriesOnly[0].name : '',
    imageUrls: '',
    leadTimeDays: '0',
  };

  const [productForm, setProductForm] = useState(initialFormState);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState({ name: '', price: '' });
  
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
    if (productToDelete || categoryToDelete) {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }
  }, [productToDelete, categoryToDelete]);

  useEffect(() => {
    if (productOptions.length > 0) {
        const minPrice = Math.min(...productOptions.map(o => o.price));
        setProductForm(prev => ({ ...prev, price: String(minPrice) }));
    }
  }, [productOptions]);
  
  const handleProductFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
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
    });
    setProductOptions(product.options || []);
    window.scrollTo(0, 0); 
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
    });
    setProductOptions(product.options || []);
    setEditingProduct(null); 
    window.scrollTo(0, 0);
    setMessage({ type: 'success', text: 'Dados copiados para o formulário. Ajuste e salve como novo produto.' });
    setTimeout(() => setMessage(null), 4000);
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

  const cancelEdit = () => {
    setEditingProduct(null);
    setProductForm(initialFormState);
    setProductOptions([]);
  }

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

      const productData: Product = {
        id: editingProduct?.id || '',
        name: productForm.name,
        description: productForm.description,
        price: effectivePrice,
        category: productForm.category,
        imageUrls: imageUrlsArray,
        leadTimeDays: parseInt(productForm.leadTimeDays, 10) || 0,
        options: productOptions,
        originalPrice: 0,
        promotionalTag: '',
      };

      const origPrice = parseFloat(productForm.originalPrice);
      if (!isNaN(origPrice) && origPrice > 0) {
        productData.originalPrice = origPrice;
      } else {
        delete productData.originalPrice;
      }

      if (productForm.promotionalTag && productForm.promotionalTag.trim()) {
        productData.promotionalTag = productForm.promotionalTag;
      } else {
        delete productData.promotionalTag;
      }

      if (editingProduct) {
        await onUpdateProduct(productData);
        setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
      } else {
        const { id, ...newProductData } = productData;
        await onAddProduct(newProductData);
        setMessage({ type: 'success', text: 'Produto cadastrado com sucesso!' });
      }
      
      setProductForm(initialFormState);
      setProductOptions([]);
      setEditingProduct(null);
    } catch (error) {
        setMessage({ type: 'error', text: 'Ocorreu um erro.' });
        console.error(error);
    } finally {
        setIsSubmitting(false);
        setTimeout(() => setMessage(null), 5000);
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
    
    // Check if the product's category is archived
    const isCategoryArchived = categories.some(c => c.name === p.category && c.isArchived);
    
    // Tab filtering
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

  // Helper to count products in each view
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
        <div className="space-y-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-6">{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h2>
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
                            <label htmlFor="imageUrls" className="block text-sm font-medium text-brand-text-light">URLs da Imagem (uma por linha) - Opcional</label>
                            <textarea name="imageUrls" id="imageUrls" value={productForm.imageUrls} onChange={handleProductFormChange} rows={4} className={inputStyles} placeholder="https://exemplo.com/imagem1.jpg&#10;https://exemplo.com/imagem2.jpg"></textarea>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-bold text-brand-text mb-2">Opções / Variações (Tamanho, Peso, Qtd)</label>
                            <p className="text-xs text-gray-500 mb-4">Adicione variações aqui. O preço base será definido automaticamente pelo menor valor das opções.</p>
                            
                            <div className="space-y-2 mb-4">
                                {productOptions.map((opt, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                                        <div>
                                            <span className="font-medium text-brand-text">{opt.name}</span>
                                            <span className="mx-2 text-gray-300">|</span>
                                            <span className="text-brand-primary font-bold">{opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveOption(index)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {productOptions.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">Nenhuma opção adicionada. O produto terá um preço único.</p>
                                )}
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-grow">
                                    <label htmlFor="optName" className="block text-xs text-gray-500 mb-1">Nome (ex: Grande, 500g)</label>
                                    <input 
                                        type="text" 
                                        id="optName"
                                        value={newOption.name}
                                        onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                        placeholder="Ex: 500g"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label htmlFor="optPrice" className="block text-xs text-gray-500 mb-1">Preço (R$)</label>
                                    <input 
                                        type="number" 
                                        id="optPrice"
                                        value={newOption.price}
                                        onChange={(e) => setNewOption({ ...newOption, price: e.target.value })}
                                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleAddOption}
                                    disabled={!newOption.name || !newOption.price}
                                    className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-brand-text-light">Preço de Venda (R$)</label>
                                <input 
                                    type="number" 
                                    name="price" 
                                    id="price" 
                                    value={productForm.price} 
                                    onChange={handleProductFormChange} 
                                    className={`${inputStyles} ${productOptions.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    step="0.01" 
                                    min="0" 
                                    required={productOptions.length === 0} 
                                    placeholder="25.50"
                                    readOnly={productOptions.length > 0}
                                />
                                {productOptions.length > 0 && <p className="text-xs text-gray-500 mt-1">Definido pela menor opção.</p>}
                            </div>
                            <div>
                                <label htmlFor="originalPrice" className="block text-sm font-medium text-brand-text-light">Preço "De" (R$ - Opcional)</label>
                                <input type="number" name="originalPrice" id="originalPrice" value={productForm.originalPrice} onChange={handleProductFormChange} className={inputStyles} step="0.01" min="0" placeholder="30.00" />
                                <p className="text-xs text-gray-400 mt-1">Deixe vazio para preço sem promoção.</p>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-brand-text-light">Categoria</label>
                                <select name="category" id="category" value={productForm.category} onChange={handleProductFormChange} className={inputStyles} required>
                                    <option value="">Selecione...</option>
                                    {/* Show all categories in dropdown to allow moving products out of archived categories */}
                                    {categories.map(cat => (
                                        <option key={cat.name} value={cat.name}>
                                            {cat.name} {cat.isArchived ? '(Arquivada)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="promotionalTag" className="block text-sm font-medium text-brand-text-light">Tag Promocional (Opcional)</label>
                                <input type="text" name="promotionalTag" id="promotionalTag" value={productForm.promotionalTag} onChange={handleProductFormChange} className={inputStyles} placeholder="Ex: PROMOÇÃO" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="leadTimeDays" className="block text-sm font-medium text-brand-text-light">Prazo Mínimo (dias)</label>
                            <input type="number" name="leadTimeDays" id="leadTimeDays" value={productForm.leadTimeDays} onChange={handleProductFormChange} className={inputStyles} min="0" required placeholder="Ex: 0 para pronta-entrega" />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.text}
                        </div>
                    )}
                    <div className="pt-2 flex items-center gap-4">
                        <button type="submit" disabled={isSubmitting} className="flex-grow justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {isSubmitting ? 'Salvando...' : (editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto')}
                        </button>
                        {editingProduct && <button type="button" onClick={cancelEdit} className="py-3 px-4 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>}
                    </div>
                </form>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-6">Gerenciar Categorias</h2>
                    <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={newCategory} 
                            onChange={(e) => setNewCategory(e.target.value)} 
                            className={inputStyles + ' flex-grow'} 
                            placeholder="Nova categoria" 
                        />
                        <button type="button" onClick={handleAddCategory} disabled={isSubmitting} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50">Adicionar</button>
                    </div>

                    <div className="border-b border-gray-200 mt-6">
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
                                <div className="flex items-center gap-3">
                                    <input 
                                      type="checkbox"
                                      checked={selectedCategoryNames.includes(cat.name)}
                                      onChange={() => toggleCategorySelection(cat.name)}
                                      className="w-5 h-5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary cursor-pointer"
                                    />
                                    {categoryTab === 'active' && <DragHandleIcon className="w-5 h-5 text-gray-400" />}
                                    <span className={`text-sm font-medium ${cat.isArchived ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                      {cat.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
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
                
                <div className="border-b border-gray-200 mb-6">
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
                            {/* Filter category options in select based on view tab */}
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
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-md border transition-all ${isArchived ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center gap-4">
                                {p.imageUrls && p.imageUrls.length > 0 ? (
                                    <img src={p.imageUrls[0]} alt={p.name} className="w-12 h-12 object-cover rounded"/>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">Sem img</div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-brand-text truncate">{p.name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500">{p.category}</p>
                                        {isArchived && (
                                            <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">Categoria Arquivada</span>
                                        )}
                                    </div>
                                    {p.options && p.options.length > 0 && (
                                        <p className="text-[10px] text-brand-primary font-medium mt-1">{p.options.length} opções disponíveis</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                                <button onClick={() => handleDuplicateClick(p)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-primary hover:underline transition-colors" title="Duplicar">
                                    <CopyIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Duplicar</span>
                                </button>
                                <button onClick={() => handleEditClick(p)} className="text-xs font-medium text-brand-primary hover:underline transition-colors">Editar</button>
                                <button onClick={() => setProductToDelete(p)} className="text-xs font-medium text-red-600 hover:underline transition-colors">Apagar</button>
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
