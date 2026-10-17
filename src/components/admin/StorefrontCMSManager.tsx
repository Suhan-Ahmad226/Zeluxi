import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { StorefrontCMS, HeroBannerItem } from '../../types';
import { getHeroBanners, heroContentFromBanner } from '../../lib/heroBanners';
import { compressImageFile } from '../../utils/imageCompressor';
import {
  Palette,
  Eye,
  Save,
  RotateCcw,
  Sparkles,
  Layout,
  Check,
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Trash2,
  FolderUp,
  Loader2,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export const StorefrontCMSManager: React.FC = () => {
  const { storefrontCMS, updateStorefrontCMS, language, showToast, setActiveView } = useStore();

  // Normalize legacy single-hero records into the new editable banner collection.
  const buildEditorState = (cms: StorefrontCMS): StorefrontCMS => {
    const cloned = JSON.parse(JSON.stringify(cms)) as StorefrontCMS;
    const banners = getHeroBanners(cloned);
    return {
      ...cloned,
      banners,
      hero: banners[0] ? heroContentFromBanner(banners[0]) : cloned.hero,
    };
  };
  const [formData, setFormData] = useState<StorefrontCMS>(() => buildEditorState(storefrontCMS));
  const [selectedBannerId, setSelectedBannerId] = useState<string>(() => getHeroBanners(storefrontCMS)[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'visibility'>('hero');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // The CMS is fetched asynchronously; refresh the editor when the saved server state arrives.
  useEffect(() => {
    const current = buildEditorState(storefrontCMS);
    setFormData(current);
    setSelectedBannerId((previous) =>
      current.banners?.some((banner) => banner.id === previous)
        ? previous
        : current.banners?.[0]?.id || '',
    );
  }, [storefrontCMS]);

  // Banner image upload state
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [bannerUploadMode, setBannerUploadMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);

  const handleBannerFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP, AVIF)', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('Image size should be less than 20MB', 'error');
      return;
    }

    setIsCompressingBanner(true);
    try {
      // Compress to full HD web-ready banner (1920x1080 max)
      const compressed = await compressImageFile(file, 1920, 1080, 0.86);
      handleHeroChange('imageUrl', compressed.dataUrl);
      const kbSize = Math.round(compressed.size / 1024);
      showToast(
        `Banner photo uploaded from local device (${compressed.width}x${compressed.height}, ${kbSize} KB)`,
        'success'
      );
    } catch (err) {
      console.error('Banner image upload error:', err);
      // Fallback to FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          handleHeroChange('imageUrl', dataUrl);
          showToast('Banner image uploaded from local storage', 'success');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingBanner(false);
    }
  };

  const handleHeroChange = (field: keyof StorefrontCMS['hero'], val: string) => {
    setFormData((prev) => {
      const hero = { ...prev.hero, [field]: val };
      return {
        ...prev,
        hero,
        banners: (prev.banners || []).map((banner) =>
          banner.id === selectedBannerId ? { ...banner, ...hero } : banner,
        ),
      };
    });
  };

  const handleSelectBanner = (banner: HeroBannerItem) => {
    setSelectedBannerId(banner.id);
    setFormData((prev) => ({ ...prev, hero: heroContentFromBanner(banner) }));
  };

  const handleAddBanner = () => {
    const currentBanners = [...(formData.banners || [])].sort((a, b) => a.order - b.order);
    if (currentBanners.length >= 10) {
      showToast('You can manage up to 10 hero banners.', 'error');
      return;
    }
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const banner: HeroBannerItem = {
      id,
      order: currentBanners.length,
      active: true,
      tagline: 'New collection',
      headline: 'Add your campaign headline',
      description: '',
      primaryButtonText: 'Shop now',
      secondaryButtonText: '',
      imageUrl: '',
      highlightTitle: '',
      highlightSubtitle: '',
      highlightPrice: '',
      primaryButtonLink: '/shop',
      secondaryButtonLink: '',
      mobileImageUrl: '',
    };
    setFormData((prev) => ({
      ...prev,
      banners: [...(prev.banners || []), banner],
      hero: heroContentFromBanner(banner),
    }));
    setSelectedBannerId(id);
    setBannerUploadMode('upload');
  };

  const handleDeleteBanner = (id: string) => {
    const banners = [...(formData.banners || [])].sort((a, b) => a.order - b.order);
    if (banners.length <= 1) {
      showToast('Keep at least one banner. You can hide the Hero section instead.', 'error');
      return;
    }
    const next = banners.filter((banner) => banner.id !== id).map((banner, order) => ({ ...banner, order }));
    const nextSelected = next.find((banner) => banner.id === selectedBannerId) || next[0];
    setFormData((prev) => ({
      ...prev,
      banners: next,
      hero: heroContentFromBanner(nextSelected),
    }));
    setSelectedBannerId(nextSelected.id);
  };

  const handleMoveBanner = (id: string, direction: -1 | 1) => {
    setFormData((prev) => {
      const banners = [...(prev.banners || [])].sort((a, b) => a.order - b.order);
      const index = banners.findIndex((banner) => banner.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= banners.length) return prev;
      [banners[index], banners[target]] = [banners[target], banners[index]];
      return { ...prev, banners: banners.map((banner, order) => ({ ...banner, order })) };
    });
  };

  const handleToggleBanner = (id: string) => {
    const banners = formData.banners || [];
    const target = banners.find((banner) => banner.id === id);
    if (target?.active && banners.filter((banner) => banner.active).length <= 1) {
      showToast('At least one hero banner must remain active.', 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      banners: (prev.banners || []).map((banner) =>
        banner.id === id ? { ...banner, active: !banner.active } : banner,
      ),
    }));
  };

  const handleAnnouncementChange = (field: keyof StorefrontCMS['announcement'], val: any) => {
    setFormData((prev) => ({
      ...prev,
      announcement: {
        ...prev.announcement,
        [field]: val,
      },
    }));
  };

  const handleVisibilityToggle = (section: keyof StorefrontCMS['sectionVisibility']) => {
    setFormData((prev) => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [section]: !prev.sectionVisibility[section],
      },
    }));
  };

  const handleSave = async () => {
    if (isSaving || isCompressingBanner) return;
    const banners = formData.banners || [];
    if (banners.length > 10) {
      showToast('You can publish up to 10 hero banners.', 'error');
      return;
    }
    if (banners.some((banner) => banner.active && !banner.headline.trim())) {
      showToast('Every active banner needs a headline before publishing.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await updateStorefrontCMS(formData);
      setFormData(buildEditorState(saved));
      const savedBanners = getHeroBanners(saved);
      if (!savedBanners.some((banner) => banner.id === selectedBannerId)) {
        setSelectedBannerId(savedBanners[0]?.id || '');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Storefront changes could not be saved.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToCurrent = () => {
    const current = buildEditorState(storefrontCMS);
    setFormData(current);
    setSelectedBannerId(current.banners?.[0]?.id || '');
    showToast('Unsaved changes discarded.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Storefront Appearance & CMS Control</h3>
          <p className="text-xs text-slate-500">
            Customize hero banners, headlines, promotional announcement bar, and homepage section display
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              showLivePreview
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
          </button>

          <button
            onClick={handleResetToCurrent}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isCompressingBanner}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Publishing…' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'hero'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Hero Banner & Banners
        </button>
        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'announcement'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Announcement Bar
        </button>
        <button
          onClick={() => setActiveTab('visibility')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'visibility'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Section Visibility & Ordering
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Column */}
        <div className={showLivePreview ? 'lg:col-span-6 space-y-6' : 'lg:col-span-12 space-y-6'}>
          {/* TAB 1: HERO SECTION CONFIG */}
          {activeTab === 'hero' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 text-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span>Hero Banner Content & Call to Actions</span>
                </h4>
                <button type="button" onClick={handleAddBanner} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                  <Plus className="h-3.5 w-3.5" /> Add banner
                </button>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Manage banners <span className="font-normal text-slate-500">({(formData.banners || []).length}/10)</span></p>
                <div className="space-y-2">
                  {[...(formData.banners || [])].sort((a, b) => a.order - b.order).map((banner, index, all) => (
                    <div key={banner.id} className={`flex items-center gap-2 rounded-xl border p-2 ${banner.id === selectedBannerId ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
                      <button type="button" onClick={() => handleSelectBanner(banner)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-xs font-bold text-slate-800">{banner.headline || `Banner ${index + 1}`}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">Slide {index + 1} · {banner.active ? 'Active' : 'Hidden'}</span>
                      </button>
                      <button type="button" onClick={() => handleToggleBanner(banner.id)} aria-label={banner.active ? 'Hide banner' : 'Publish banner'} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${banner.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{banner.active ? 'Live' : 'Hidden'}</button>
                      <button type="button" onClick={() => handleMoveBanner(banner.id, -1)} disabled={index === 0} aria-label="Move banner up" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleMoveBanner(banner.id, 1)} disabled={index === all.length - 1} aria-label="Move banner down" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDeleteBanner(banner.id)} aria-label="Delete banner" className="rounded-md p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Select a banner to edit it. At least one banner must stay active. Changes go live only after Save & Publish.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={formData.hero.tagline}
                  onChange={(e) => handleHeroChange('tagline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Main Headline *</label>
                <input
                  type="text"
                  value={formData.hero.headline}
                  onChange={(e) => handleHeroChange('headline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.hero.description}
                  onChange={(e) => handleHeroChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    value={formData.hero.primaryButtonText}
                    onChange={(e) => handleHeroChange('primaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Secondary Button Text</label>
                  <input
                    type="text"
                    value={formData.hero.secondaryButtonText}
                    onChange={(e) => handleHeroChange('secondaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Button Link</label>
                  <input type="text" value={formData.hero.primaryButtonLink || ''} onChange={(e) => handleHeroChange('primaryButtonLink', e.target.value)} placeholder="/shop or https://example.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Secondary Button Link</label>
                  <input type="text" value={formData.hero.secondaryButtonLink || ''} onChange={(e) => handleHeroChange('secondaryButtonLink', e.target.value)} placeholder="/about or https://example.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Optional Mobile Image URL</label>
                  <input type="url" value={formData.hero.mobileImageUrl || ''} onChange={(e) => handleHeroChange('mobileImageUrl', e.target.value)} placeholder="https://... (optional)" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  <p className="mt-1 text-[10px] text-slate-500">Use a portrait-friendly image for small screens. Leave empty to reuse the main image.</p>
                </div>
              </div>

              {/* Banner Image Upload & Management */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs">
                      Hero Banner Image
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Upload directly from your computer or provide an image link
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBannerUploadMode('upload')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        bannerUploadMode === 'upload'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Local Device
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerUploadMode('url')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        bannerUploadMode === 'url'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerUploadMode('presets')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        bannerUploadMode === 'presets'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Presets
                    </button>
                  </div>
                </div>

                {/* Hidden File Input for Device Upload */}
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleBannerFile(file);
                    e.currentTarget.value = '';
                  }}
                />

                {bannerUploadMode === 'upload' && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleBannerFile(file);
                    }}
                    onClick={() => !isCompressingBanner && !isSaving && bannerFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDraggingBanner
                        ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {isCompressingBanner ? (
                      <div className="py-2">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                        <p className="font-bold text-xs text-indigo-700">Optimizing local banner photo...</p>
                        <p className="text-[11px] text-slate-500">Processing high-res image for ultra-fast loading</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                          <FolderUp className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-xs text-slate-900">
                          Click to select banner picture from your computer
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          or drag & drop here · Supports PNG, JPG, WEBP, AVIF (High-res up to 20MB auto-optimized)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {bannerUploadMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={formData.hero.imageUrl}
                      onChange={(e) => handleHeroChange('imageUrl', e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                )}

                {bannerUploadMode === 'presets' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      {
                        name: 'Atelier Leather Duffel',
                        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80',
                      },
                      {
                        name: 'Organic Flax Linen Studio',
                        url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
                      },
                      {
                        name: 'Mechanical Timepieces',
                        url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
                      },
                      {
                        name: 'Desk & Botanical Living',
                        url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
                      },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleHeroChange('imageUrl', preset.url);
                          showToast(`Selected preset: ${preset.name}`, 'info');
                        }}
                        className={`group relative rounded-lg overflow-hidden border text-left aspect-[4/3] transition-all ${
                          formData.hero.imageUrl === preset.url
                            ? 'border-indigo-600 ring-2 ring-indigo-500/40'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute inset-x-0 bottom-0 p-1 text-[9px] font-bold bg-slate-950/80 text-white backdrop-blur-xs truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Current Banner Preview with Replace / Remove controls */}
                {formData.hero.imageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img
                      src={formData.hero.imageUrl}
                      alt="Banner Preview"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-800 truncate">
                        Active Banner Image
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {formData.hero.imageUrl.startsWith('data:')
                          ? 'Uploaded from Local Device'
                          : formData.hero.imageUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleHeroChange(
                            'imageUrl',
                            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80'
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Reset to default banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Highlight Card Configuration */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="font-bold text-slate-900 text-xs">Featured Atelier Spotlight Badge</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Badge Title</label>
                    <input
                      type="text"
                      value={formData.hero.highlightTitle}
                      onChange={(e) => handleHeroChange('highlightTitle', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Subtitle</label>
                    <input
                      type="text"
                      value={formData.hero.highlightSubtitle}
                      onChange={(e) => handleHeroChange('highlightSubtitle', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Price / Status Label</label>
                    <input
                      type="text"
                      value={formData.hero.highlightPrice}
                      onChange={(e) => handleHeroChange('highlightPrice', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENT BAR */}
          {activeTab === 'announcement' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Top Header Announcement Bar</h4>
                  <p className="text-slate-500">Notice text pinned to the very top of all storefront pages</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAnnouncementChange('active', !formData.announcement.active)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    formData.announcement.active ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.announcement.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Announcement Text *</label>
                <textarea
                  rows={3}
                  value={formData.announcement.text}
                  onChange={(e) => handleAnnouncementChange('text', e.target.value)}
                  placeholder="e.g. Complimentary delivery across Bangladesh on orders over ৳3,500 with code FREEDELIVERY"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SECTION VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Homepage Section Visibility Control</h4>
                <p className="text-slate-500">Enable or disable entire content blocks on the main landing page</p>
              </div>

              <div className="divide-y divide-slate-100">
                {[
                  { key: 'hero', title: 'Hero Banner & Main Call-to-Action', desc: 'Top full-width atmospheric atelier banner' },
                  { key: 'trustBadges', title: 'Trust Badges & Guarantees', desc: '100% Genuine, 7-Day Return, Nationwide COD guarantees' },
                  { key: 'categories', title: 'Categories Carousel Grid', desc: 'Visual collection cards with product counts' },
                  { key: 'featured', title: 'Featured Atelier Collection', desc: 'Curated 4-column master product showcase' },
                  { key: 'deals', title: 'Special Deals & Promo Banner', desc: 'Promotional discount banner with countdown/code' },
                  { key: 'allProducts', title: 'All Products Catalog Grid', desc: 'Complete browseable product grid with category filter tabs' },
                  { key: 'recentlyViewed', title: 'Recently Viewed Products Bar', desc: 'Customer session browsing history' },
                ].map((sec) => (
                  <div key={sec.key} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{sec.title}</p>
                      <p className="text-[11px] text-slate-500">{sec.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVisibilityToggle(sec.key as any)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        (formData.sectionVisibility as any)[sec.key] ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          (formData.sectionVisibility as any)[sec.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        {showLivePreview && (
          <div className="lg:col-span-6 space-y-4 sticky top-20">
            <div className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="flex items-center gap-2 font-mono text-[11px] text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Preview Mode
                </span>
                <button
                  onClick={() => setActiveView('store')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  <span>Open Public Storefront</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Announcement Bar Preview */}
              {formData.announcement.active && (
                <div className="bg-indigo-950/80 border border-indigo-800/50 rounded-lg p-2 text-center text-[10px] text-indigo-200 flex items-center justify-center gap-1.5 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{formData.announcement.text}</span>
                </div>
              )}

              {/* Hero Banner Preview */}
              <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4 relative overflow-hidden">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 block">
                    {formData.hero.tagline}
                  </span>
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {formData.hero.headline}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {formData.hero.description}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-3 py-1.5 bg-white text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1">
                      <span>{formData.hero.primaryButtonText}</span>
                      <ArrowRight className="w-3 h-3 text-slate-900" />
                    </span>
                    <span className="px-3 py-1.5 border border-slate-700 text-slate-300 font-semibold text-xs rounded-lg">
                      {formData.hero.secondaryButtonText}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg overflow-hidden border border-slate-800 aspect-video relative bg-slate-900">
                  {formData.hero.imageUrl ? (
                    <img
                      src={formData.hero.imageUrl}
                      alt={formData.hero.headline ? `Preview: ${formData.hero.headline}` : 'Hero banner preview'}
                      width={1200}
                      height={675}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-slate-500">Choose or upload an image to preview this banner.</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left text-[11px]">
                    <p className="text-amber-400 font-bold text-[10px]">{formData.hero.highlightTitle}</p>
                    <p className="text-white font-semibold">{formData.hero.highlightSubtitle}</p>
                    <p className="text-slate-300 text-[10px] font-mono">{formData.hero.highlightPrice}</p>
                  </div>
                </div>
              </div>

              {/* Active Sections Summary */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                <p className="font-bold text-slate-300">Active Homepage Sections:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(formData.sectionVisibility).map(([key, isVis]) => (
                    <span
                      key={key}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isVis
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-500 border border-slate-800 line-through'
                      }`}
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
