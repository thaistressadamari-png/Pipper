
import React, { useState, useEffect, useRef } from 'react';
import type { Product, ProductOption } from '../types';
import { TrashIcon, SearchIcon, DragHandleIcon, CopyIcon, PlusIcon } from './IconComponents';

interface ProductsViewProps {
  products: Product[];
  categories: string[];
  onAddProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (productData: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onUpdateCategoryOrder: (newOrder: string[]) => Promise<void>;
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


const ProductsView: React.FC<ProductsViewProps> = ({ products, categories, onAddProduct, onUpdateProduct, onDeleteProduct, onAddCategory, onDeleteCategory, onUpdateCategoryOrder }) => {
  const initialFormState = {
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    promotionalTag: '',
    category: categories[0] || '',
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

  // Effect to update base price if options exist
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
        originalPrice: product.originalPrice ? String(product.originalPrice) : '',
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
        originalPrice: product.originalPrice ? String(product.originalPrice) : '',
        promotionalTag: product.promotionalTag || '',
        category: product.category,
        imageUrls: product.imageUrls ? product.imageUrls.join('\n') : '',
        leadTimeDays: String(product.leadTimeDays || 0),
    });
    setProductOptions(product.options || []);
    setEditingProduct(null); // Ensure we are NOT in edit mode (we want a new ID)
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
    
    // If no options, price is required. If options exist, we calculate from options.
    if (productOptions.length === 0 && !productForm.price) {
         setMessage({ type: 'error', text: 'Por favor, informe o preço base ou adicione opções.' });
         setIsSubmitting(false);
         return;
    }

    try {
      // Determine effective price: if options exist, use the lowest option price
      let effectivePrice = parseFloat(productForm.price);
      if (productOptions.length > 0) {
          effectivePrice = Math.min(...productOptions.map(o => o.price));
      }

      const productData: Omit<Product, 'id'> = {
        name: productForm.name,
        description: productForm.description,
        price: effectivePrice,
        category: productForm.category,
        imageUrls: imageUrlsArray,
        leadTimeDays: parseInt(productForm.leadTimeDays, 10) || 0,
        options: productOptions,
      };

      if (productForm.originalPrice) {
        productData.originalPrice = parseFloat(productForm.originalPrice);
      }
      if (productForm.promotionalTag) {
        productData.promotionalTag = productForm.promotionalTag;
      }

      if (editingProduct) {
        await onUpdateProduct({ ...productData, id: editingProduct.id });
        setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
      } else {
        await onAddProduct(productData);
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
      const draggedItemContent = categoriesCopy.splice(dragItem.current, 1)[0];
      categoriesCopy.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      onUpdateCategoryOrder(categoriesCopy);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'Todas' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-900";

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
                    {/* Basic Fields */}
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
                        
                        {/* Options Section */}
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
                                <label htmlFor="price" className="block text-sm font-medium text-brand-text-light">Preço Base (R$)</label>
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
                                    title={productOptions.length > 0 ? "O preço é calculado automaticamente baseado na opção mais barata." : ""}
                                />
                                {productOptions.length > 0 && <p className="text-xs text-gray-500 mt-1">Definido automaticamente pela menor opção.</p>}
                            </div>
                            <div>
                                <label htmlFor="originalPrice" className="block text-sm font-medium text-brand-text-light">Preço Original (Opcional)</label>
                                <input type="number" name="originalPrice" id="originalPrice" value={productForm.originalPrice} onChange={handleProductFormChange} className={inputStyles} step="0.01" min="0" placeholder="30.00" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-brand-text-light">Categoria</label>
                                <select name="category" id="category" value={productForm.category} onChange={handleProductFormChange} className={inputStyles} required>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                    <div className="space-y-2 mt-1">
                        {categories.map((cat, index) => (
                            <div key={cat}
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleSort}
                                onDragOver={(e) => e.preventDefault()}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-center gap-2">
                                    <DragHandleIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-800">{cat}</span>
                                </div>
                                <button type="button" onClick={() => handleDeleteCategory(cat)} className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50" disabled={isSubmitting}>
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-6">Produtos Cadastrados</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-4">
                                {p.imageUrls && p.imageUrls.length > 0 ? (
                                    <img src={p.imageUrls[0]} alt={p.name} className="w-12 h-12 object-cover rounded"/>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">Sem img</div>
                                )}
                                <div>
                                    <p className="font-semibold text-brand-text">{p.name}</p>
                                    <p className="text-sm text-gray-500">{p.category}</p>
                                    {p.options && p.options.length > 0 && (
                                        <p className="text-xs text-brand-primary mt-1">{p.options.length} opções disponíveis</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleDuplicateClick(p)} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-primary hover:underline" title="Duplicar">
                                    <CopyIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Duplicar</span>
                                </button>
                                <button onClick={() => handleEditClick(p)} className="text-sm font-medium text-brand-primary hover:underline">Editar</button>
                                <button onClick={() => setProductToDelete(p)} className="text-sm font-medium text-red-600 hover:underline">Apagar</button>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhum produto encontrado.</p>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default ProductsView;
