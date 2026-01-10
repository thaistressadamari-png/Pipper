
import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '../types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, CheckCircleIcon, XIcon, BoxIcon, SpinnerIcon } from './IconComponents';

interface InventoryViewProps {
    products: Product[];
    onUpdateProduct: (product: Product) => Promise<void>;
}

const InventoryModal: React.FC<{
    product: Product;
    onClose: () => void;
    onSave: (newQuantity: number) => Promise<void>;
}> = ({ product, onClose, onSave }) => {
    const [mode, setMode] = useState<'add' | 'set'>('add');
    const [value, setValue] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return alert("Digite um valor válido.");
        
        setIsSaving(true);
        const currentQty = product.inventoryQuantity || 0;
        const newQty = mode === 'add' ? currentQty + numValue : numValue;
        
        try {
            await onSave(Math.max(0, newQty));
            onClose();
        } catch (e) {
            alert("Erro ao atualizar estoque.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in-up">
                <header className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-brand-text">Ajustar Estoque</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </header>
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        {product.imageUrls?.[0] ? (
                            <img src={product.imageUrls[0]} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400">Sem img</div>
                        )}
                        <div>
                            <p className="font-bold text-brand-text leading-tight">{product.name}</p>
                            <p className="text-xs text-gray-500">Saldo atual: <span className="font-bold text-brand-primary">{product.inventoryQuantity || 0}</span></p>
                        </div>
                    </div>

                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button 
                            onClick={() => setMode('add')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'add' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'}`}
                        >
                            SOMA ENTRADA
                        </button>
                        <button 
                            onClick={() => setMode('set')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'set' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'}`}
                        >
                            AJUSTE FIXO
                        </button>
                    </div>

                    <div className="relative">
                        <input 
                            type="number"
                            autoFocus
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            className="w-full text-center text-3xl font-black text-brand-primary py-4 border-2 border-gray-100 rounded-2xl focus:border-brand-primary outline-none transition-colors"
                            placeholder="0"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold">UN</div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !value}
                        className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary-dark active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center"
                    >
                        {isSaving ? <SpinnerIcon className="w-6 h-6" /> : 'Confirmar Atualização'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InventoryView: React.FC<InventoryViewProps> = ({ products: initialProducts, onUpdateProduct }) => {
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    // Estado local para refletir mudanças instantaneamente sem esperar o fetch global
    const [localProducts, setLocalProducts] = useState<Product[]>(initialProducts);

    // Sincroniza o estado local quando os produtos iniciais mudam
    useEffect(() => {
        setLocalProducts(initialProducts);
    }, [initialProducts]);

    const inventoryProducts = useMemo(() => {
        return localProducts
            .filter(p => p.inventoryEnabled)
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.inventoryQuantity || 0) - (b.inventoryQuantity || 0));
    }, [localProducts, search]);

    const handleUpdateQuantity = async (newQuantity: number) => {
        if (!selectedProduct) return;
        
        const updatedProduct = {
            ...selectedProduct,
            inventoryQuantity: newQuantity
        };

        // Atualização Otimista: Muda na tela agora!
        setLocalProducts(prev => prev.map(p => p.id === selectedProduct.id ? updatedProduct : p));

        try {
            await onUpdateProduct(updatedProduct);
        } catch (e) {
            // Se falhar no banco, reverte o estado local
            setLocalProducts(initialProducts);
            alert("Erro ao sincronizar com o servidor. O valor foi revertido.");
        }
    };

    return (
        <div className="space-y-6">
            {selectedProduct && (
                <InventoryModal 
                    product={selectedProduct} 
                    onClose={() => setSelectedProduct(null)} 
                    onSave={handleUpdateQuantity} 
                />
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar produtos em estoque..."
                        className="w-full bg-gray-50 border-transparent rounded-full py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="flex-shrink-0 px-4 py-2 bg-brand-secondary/30 rounded-lg text-xs font-bold text-brand-primary uppercase">
                    {inventoryProducts.length} Itens monitorados
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-start gap-4">
                            {p.imageUrls?.[0] ? (
                                <img src={p.imageUrls[0]} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] text-gray-400">Sem imagem</div>
                            )}
                            <div className="min-w-0 flex-grow">
                                <h4 className="font-bold text-brand-text truncate pr-2">{p.name}</h4>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{p.category}</p>
                                
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`px-2 py-1 rounded-md text-xs font-black transition-colors duration-500 ${
                                        (p.inventoryQuantity || 0) <= 0 
                                            ? 'bg-red-100 text-red-700' 
                                            : (p.inventoryQuantity || 0) <= 5 
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-green-100 text-green-700'
                                    }`}>
                                        {p.inventoryQuantity || 0} UN
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">disponíveis</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                            <button 
                                onClick={() => setSelectedProduct(p)}
                                className="flex-1 py-2 bg-brand-secondary/50 text-brand-primary text-xs font-black uppercase tracking-widest rounded-lg hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                            >
                                Movimentar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {inventoryProducts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BoxIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-gray-500 font-bold">Nenhum produto encontrado</h3>
                    <p className="text-sm text-gray-400 mt-1 px-4">Apenas produtos com "Controle de Estoque" ativado aparecem aqui.</p>
                    <div className="mt-6 flex justify-center">
                        <p className="text-xs text-brand-primary bg-brand-secondary/30 px-4 py-2 rounded-full font-bold">
                            Dica: Ative o estoque no formulário de edição do produto
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
