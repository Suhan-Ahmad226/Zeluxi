import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import { Category } from '../../types';
import { compressImageFile } from '../../utils/imageCompressor';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  FolderTree,
  LayoutGrid,
  Upload,
  FolderPlus,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface CategoriesManagerProps {
  onViewCategoryProducts?: (categoryId: string) => void;
  initialOpenSubcategory?: boolean;
  initialAction?: 'add-category' | 'add-subcategory' | null;
  onActionConsumed?: () => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  onViewCategoryProducts,
  initialOpenSubcategory = false,
  initialAction = null,
  onActionConsumed,
}) => {
  const { categories, products, addCategory, updateCategory, deleteCategory, showToast } = useStore();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'main' | 'sub' | 'hierarchy'>('hierarchy');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null);

  // Form states
  const [isSubCategory, setIsSubCategory] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  // Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isCompressingImg, setIsCompressingImg] = useState(false);

  // Categorize
  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => !!c.parentId);

  const openAddMainCategoryModal = () => {
    setEditingCategory(null);
    setIsSubCategory(false);
    setParentId('');
    setName('');
    setSlug('');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80');
    setOrder(categories.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openAddSubCategoryModal = (presetParentId?: string) => {
    setEditingCategory(null);
    setIsSubCategory(true);
    const defaultParent = presetParentId || (mainCategories[0]?.id ?? '');
    setParentId(defaultParent);
    setName('');
    setSlug('');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80');
    setOrder(categories.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  // React to initialAction or initialOpenSubcategory
  useEffect(() => {
    if (initialAction === 'add-category') {
      openAddMainCategoryModal();
      onActionConsumed?.();
    } else if (initialAction === 'add-subcategory' || initialOpenSubcategory) {
      openAddSubCategoryModal();
      onActionConsumed?.();
    }
  }, [initialAction, initialOpenSubcategory]);

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setIsSubCategory(!!cat.parentId);
    setParentId(cat.parentId || '');
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImage(cat.image || '');
    setOrder(cat.order || 1);
    setIsActive(cat.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleImageFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }
    setIsCompressingImg(true);
    try {
      const compressed = await compressImageFile(file, 900, 900, 0.85);
      setImage(compressed.dataUrl);
      showToast('Category image uploaded from local device', 'success');
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setImage(dataUrl);
          showToast('Category image uploaded from local device', 'success');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingImg(false);
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    if (isSubCategory && !parentId) {
      showToast('Please select a parent category for this sub-category', 'error');
      return;
    }

    const cleanedSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const resolvedParentId = isSubCategory ? parentId : null;

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name: name.trim(),
        slug: cleanedSlug,
        description: description.trim(),
        image: image.trim() || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        order: Number(order) || 1,
        isActive,
        parentId: resolvedParentId,
      });
    } else {
      addCategory({
        name: name.trim(),
        slug: cleanedSlug,
        description: description.trim(),
        image: image.trim() || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        order: Number(order) || (categories.length + 1),
        isActive,
        parentId: resolvedParentId,
      });
}

    setIsModalOpen(false);
  };

  const handleMoveOrder = (cat: Category, direction: 'up' | 'down') => {
    const list = cat.parentId
      ? categories.filter((c) => c.parentId === cat.parentId)
      : categories.filter((c) => !c.parentId);

    const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sorted.findIndex((c) => c.id === cat.id);

    if (direction === 'up' && currentIndex > 0) {
      const prev = sorted[currentIndex - 1];
      const prevOrder = prev.order || currentIndex;
      const currentOrder = cat.order || (currentIndex + 1);
      updateCategory({ ...cat, order: prevOrder });
      updateCategory({ ...prev, order: currentOrder });
    } else if (direction === 'down' && currentIndex < sorted.length - 1) {
      const next = sorted[currentIndex + 1];
      const nextOrder = next.order || (currentIndex + 2);
      const currentOrder = cat.order || (currentIndex + 1);
      updateCategory({ ...cat, order: nextOrder });
      updateCategory({ ...next, order: currentOrder });
    }
  };

  // Filtered categories according to tab & search
  const filteredCategories = categories.filter((c) => {
    if (viewMode === 'main' && c.parentId) return false;
    if (viewMode === 'sub' && !c.parentId) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const parent = categories.find((p) => p.id === c.parentId);
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (parent && parent.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Categories & Sub-Categories
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {mainCategories.length} Main · {subCategories.length} Sub-Categories
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize your product hierarchy with primary collections and nested subcategories for storefront navigation.
          </p>
        </div>

        {/* The Two Direct Action Buttons Requested By User */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openAddMainCategoryModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors active:scale-95"
            title="Create a primary collection"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Main Category</span>
          </button>

          <button
            onClick={() => openAddSubCategoryModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors active:scale-95"
            title="Create a sub-category under a parent category"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Add Sub-Category</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar & View Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories or sub-categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewMode === 'hierarchy'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Hierarchy Tree</span>
          </button>

          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({categories.length})
          </button>

          <button
            onClick={() => setViewMode('main')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewMode === 'main'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Main ({mainCategories.length})
          </button>

          <button
            onClick={() => setViewMode('sub')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewMode === 'sub'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sub-Categories ({subCategories.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: HIERARCHY TREE VIEW */}
      {viewMode === 'hierarchy' && (
        <div className="space-y-4">
          {mainCategories.map((mainCat, idx) => {
            const childSubs = categories.filter((c) => c.parentId === mainCat.id);
            const parentProductCount = products.filter(
              (p) => p.category === mainCat.id || p.category === mainCat.name
            ).length;

            return (
              <div
                key={mainCat.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
              >
                {/* Parent Category Header Row */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <StoreImage
                      src={mainCat.image || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80'}
                      alt={mainCat.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                          Main Category
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{mainCat.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-indigo-600 text-[11px]">/{mainCat.slug}</span>
                        <span>·</span>
                        <span>{parentProductCount} products</span>
                        <span>·</span>
                        <span>{childSubs.length} sub-categories</span>
                        {mainCat.isActive === false && (
                          <span className="text-[10px] text-amber-600 font-bold">(Hidden from store)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Parent Category */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => openAddSubCategoryModal(mainCat.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                      title={`Add a sub-category directly to ${mainCat.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Subcategory</span>
                    </button>

                    <button
                      onClick={() => openEditModal(mainCat)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteCandidate(mainCat)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Categories Nested Under Parent */}
                <div className="p-4 sm:p-5 bg-slate-50/40">
                  {childSubs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {childSubs.map((sub) => {
                        const subProdCount = products.filter(
                          (p) =>
                            p.category === sub.id ||
                            p.category === sub.name ||
                            p.subcategory === sub.name ||
                            p.subcategory === sub.id
                        ).length;

                        return (
                          <div
                            key={sub.id}
                            className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <StoreImage
                                src={sub.image || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80'}
                                alt={sub.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-slate-900 truncate">
                                  {sub.name}
                                </p>
                                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                  {subProdCount} items · /{sub.slug}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditModal(sub)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                                title="Edit Sub-Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate(sub)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                                title="Delete Sub-Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 gap-2">
                      <span>No sub-categories created under {mainCat.name} yet.</span>
                      <button
                        onClick={() => openAddSubCategoryModal(mainCat.id)}
                        className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add first sub-category</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: GRID CARDS VIEW (For All, Main, or Sub filters) */}
      {viewMode !== 'hierarchy' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat, idx) => {
            const productCount = products.filter(
              (p) =>
                p.category === cat.id ||
                p.category === cat.name ||
                p.subcategory === cat.name ||
                p.subcategory === cat.id
            ).length;
            const parent = categories.find((p) => p.id === cat.parentId);

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col group"
              >
                <div className="h-36 w-full relative bg-slate-100 overflow-hidden">
                  <StoreImage
                    src={cat.image || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cat.parentId
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      } backdrop-blur-xs shadow-xs`}
                    >
                      {cat.parentId ? 'Sub-Category' : 'Main Category'}
                    </span>
                    {cat.isActive === false && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                        Hidden
                      </span>
                    )}
                  </div>

                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/70 text-white backdrop-blur-xs">
                    {productCount} items
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {parent && (
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <span>↳ Under: {parent.name}</span>
                      </p>
                    )}
                    <h4 className="font-bold text-sm text-slate-900">{cat.name}</h4>
                    <p className="text-[11px] font-mono text-indigo-600 mt-1 truncate">/{cat.slug}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{cat.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveOrder(cat, 'up')}
                          title="Move Order Up"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(cat, 'down')}
                          title="Move Order Down"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {!cat.parentId && (
                          <button
                            onClick={() => openAddSubCategoryModal(cat.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Add Subcategory Under This"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(cat)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {onViewCategoryProducts && (
                      <button
                        onClick={() => onViewCategoryProducts(cat.id)}
                        className="w-full py-1.5 px-3 bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Filter Products</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category & Sub-Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                    isSubCategory ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}
                >
                  {isSubCategory ? <FolderPlus className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingCategory
                      ? `Edit ${isSubCategory ? 'Sub-Category' : 'Category'}: ${editingCategory.name}`
                      : isSubCategory
                      ? 'Create New Sub-Category'
                      : 'Create New Main Category'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isSubCategory
                      ? 'Assign under a parent category for organized navigation'
                      : 'Create a primary store department'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Category Level Toggle Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Category Level *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubCategory(false);
                      setParentId('');
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      !isSubCategory
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Main Category</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSubCategory(true);
                      if (!parentId && mainCategories.length > 0) {
                        setParentId(mainCategories[0].id);
                      }
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      isSubCategory
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Sub-Category</span>
                  </button>
                </div>
              </div>

              {/* Parent Category Dropdown (Visible only when Sub-Category is selected) */}
              {isSubCategory && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                  <label className="block font-bold text-emerald-950 text-xs">
                    Select Parent Category *
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                  >
                    <option value="" disabled>-- Choose Main Category --</option>
                    {mainCategories.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-emerald-700">
                    This sub-category will be nested under the selected parent category.
                  </p>
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isSubCategory ? 'Sub-Category Name' : 'Category Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Travel & Duffel Bags"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Slug and Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug URL *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="travel-duffel-bags"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Cover Image Upload (Local Device or URL) */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-800">
                    Category Image
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        imageMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Local Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        imageMode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFileSelect(file);
                  }}
                />

                {imageMode === 'upload' ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl bg-white text-center flex items-center justify-center gap-2 text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold">Upload Picture from Computer</span>
                  </button>
                ) : (
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                )}

                {image && (
                  <div className="flex items-center gap-3 pt-1">
                    <StoreImage
                      src={image}
                      alt="Preview"
                      className="w-14 h-12 rounded-lg object-cover border bg-white shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-700 truncate">
                        {image.startsWith('data:') ? 'Uploaded from device' : image}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief merchandising description for storefront taxonomy and SEO..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">Publish in Store Navigation</p>
                  <p className="text-[11px] text-slate-500">Visible to customer storefront</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isActive ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs active:scale-95 transition-all ${
                    isSubCategory
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {editingCategory
                    ? `Update ${isSubCategory ? 'Sub-Category' : 'Category'}`
                    : `Save ${isSubCategory ? 'Sub-Category' : 'Main Category'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-sm">
                Delete {deleteCandidate.parentId ? 'Sub-Category' : 'Main Category'}?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deleteCandidate.name}</strong>?
                {!deleteCandidate.parentId && ' Any child sub-categories will be unlinked.'}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCategory(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
