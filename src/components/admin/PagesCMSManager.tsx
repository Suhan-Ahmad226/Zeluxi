import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatDateOnly } from '../../utils/formatters';
import { StaticPageContent } from '../../types';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Search,
  AlertCircle,
  ExternalLink,
  Shield,
  HelpCircle,
  Truck,
  RefreshCw,
  Mail,
} from 'lucide-react';

export const PagesCMSManager: React.FC = () => {
  const { pages, addPage, updatePage, deletePage, showToast, setActiveStaticPage } = useStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPageContent | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<StaticPageContent | null>(null);

  // Form states
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [showInFooter, setShowInFooter] = useState(false);
  const [showInHeader, setShowInHeader] = useState(false);
  const [navigationLabel, setNavigationLabel] = useState('');
  const [navigationOrder, setNavigationOrder] = useState(100);

  const openCreateModal = () => {
    setEditingPage(null);
    setSlug('');
    setTitle('');
    setContent('');
    setIsPublished(true);
    setShowInFooter(false);
    setShowInHeader(false);
    setNavigationLabel('');
    setNavigationOrder(100);
    setIsModalOpen(true);
  };

  const openEditModal = (page: StaticPageContent) => {
    setEditingPage(page);
    setSlug(page.slug);
    setTitle(page.title);
    setContent(page.content);
    setIsPublished(page.isPublished ?? true);
    setShowInFooter(page.showInFooter ?? false);
    setShowInHeader(page.showInHeader ?? false);
    setNavigationLabel(page.navigationLabel || '');
    setNavigationOrder(page.navigationOrder ?? 100);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPage) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      showToast('Page title and slug are required', 'error');
      return;
    }

    const cleanedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!cleanedSlug) {
      showToast('Please use a URL slug with English letters or numbers.', 'error');
      return;
    }
    const duplicateSlug = pages.some((page) => page.slug === cleanedSlug && page.slug !== editingPage?.slug);
    if (duplicateSlug) {
      showToast('This URL slug is already in use. Choose a unique slug.', 'error');
      return;
    }
    const pageData: StaticPageContent = {
      slug: cleanedSlug,
      title: title.trim(),
      content: content.trim(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      isPublished,
      showInFooter: showInFooter && isPublished,
      showInHeader: showInHeader && isPublished,
      navigationLabel: navigationLabel.trim() || title.trim(),
      navigationGroup: 'customer-care',
      navigationOrder: Number.isFinite(navigationOrder) ? Math.max(0, navigationOrder) : 100,
    };

    if (editingPage) {
      updatePage(pageData);
    } else {
      addPage(pageData);
    }

    setIsModalOpen(false);
  };

  const filteredPages = pages.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Pages & CMS Content Management</h3>
          <p className="text-xs text-slate-500">
            Create, update legal documents, FAQs, customer guarantees, and informational store pages
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Page</span>
        </button>
      </div>

      {/* Search & Statistics */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredPages.length}</strong> pages
        </span>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Page Title</th>
              <th className="p-3.5">Route Slug</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Last Revised</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPages.map((page) => (
              <tr key={page.slug} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3.5 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span>{page.title}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3.5 font-mono text-slate-600">/{page.slug}</td>
                <td className="p-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      page.isPublished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {page.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-slate-500 text-[11px]">{formatDateOnly(page.lastUpdated)}</td>
                <td className="p-3.5 text-right space-x-1">
                  <button
                    onClick={() => setActiveStaticPage(page.slug as any)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Preview Storefront Page"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(page)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Page"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(page)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / Create Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingPage ? `Edit Page: ${editingPage.title}` : 'Create New CMS Page'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Shipping & Delivery Policy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Route Slug *</label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
                  <span className="px-3 py-2 bg-slate-50 text-slate-400 font-mono text-[11px] border-r border-slate-200">
                    zelux.com.bd/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    disabled={Boolean(editingPage)}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="shipping-policy"
                    className="w-full px-3 py-2 font-mono text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Content *</label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter policy text, terms, or customer information..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Navigation label</label>
                  <input
                    type="text"
                    value={navigationLabel}
                    onChange={(e) => setNavigationLabel(e.target.value)}
                    placeholder={title || 'Page link label'}
                    maxLength={80}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Footer position</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={navigationOrder}
                    onChange={(e) => setNavigationOrder(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={showInHeader}
                  onChange={(e) => setShowInHeader(e.target.checked)}
                  disabled={!isPublished}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block font-semibold text-slate-800">Show in storefront header</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">Adds this published page to the desktop store navigation. Keep labels short for smaller screens.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={showInFooter}
                  onChange={(e) => setShowInFooter(e.target.checked)}
                  disabled={!isPublished}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block font-semibold text-slate-800">Show in footer navigation</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">Only published pages can appear in the customer-facing footer.</span>
                </span>
              </label>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">Publish Status</p>
                  <p className="text-[11px] text-slate-500">Enable for public customer viewing</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isPublished ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isPublished ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs active:scale-95 transition-all"
                >
                  {editingPage ? 'Save Changes' : 'Publish Page'}
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
              <h4 className="font-bold text-slate-900 text-sm">Delete CMS Page?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{deleteCandidate.title}</strong> (/{deleteCandidate.slug})?
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
                  deletePage(deleteCandidate.slug);
                  setDeleteCandidate(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
