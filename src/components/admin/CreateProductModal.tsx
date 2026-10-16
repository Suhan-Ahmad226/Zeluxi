import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import { Product, ProductVariant } from '../../types';
import { supabase } from '../../lib/supabase';
import { persistProductImageUrls } from '../../lib/productImageStorage';
import { compressImageFile } from '../../utils/imageCompressor';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  DollarSign,
  Truck,
  Globe,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  ShieldCheck,
  Play,
  Share2,
  RefreshCw,
  Copy,
  Tag,
  Boxes,
  HelpCircle,
  FolderPlus,
  FolderTree,
  Star,
  Loader2,
  Wand2,
} from 'lucide-react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onProductCreated?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
}

interface ImageUploadItem {
  id: string;
  url: string;
  name: string;
  size: number;
  isPrimary: boolean;
  dimensions?: string;
  file?: File;
  uploadStatus?: 'completed' | 'uploading' | 'error';
}

interface VideoUploadItem {
  url: string;
  name: string;
  size: number;
  duration?: number;
  file?: File;
}

const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  'Full-Grain Leather': ['Weekender & Travel Bags', 'Briefcases & Messenger Bags', 'Wallets & Cardholders', 'Belts & Accessories', 'Footwear'],
  'European Flax Linen': ['Resort & Band Collar Shirts', 'Relaxed Linen Trousers', 'Kimono Robes & Cardigans', 'Bedding & Cushions'],
  'Mechanical Watches': ['Automatic Dress Chronometers', 'Field & Pilot Watches', 'Diver Watches 200M', 'Horology Straps'],
  'Desk & Living': ['Full-Grain Leather Desk Mats', 'Antiqued Brass Trays', 'Fountain Pen Cases', 'Handmade Scented Candles'],
  'Artisan Menswear': ['Heavyweight Cotton Overshirts', 'Tailored Linen Suits', 'Artisan Supima Polos', 'Cashmere Scarves'],
};

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onProductCreated,
  onProductUpdated,
}) => {
  const { addProduct, updateProduct, categories, addCategory, language, showToast } = useStore();

  // Quick category & subcategory creator state
  const [isQuickAddCategoryOpen, setIsQuickAddCategoryOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'category' | 'subcategory'>('category');
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryImg, setQuickCategoryImg] = useState('');
  const [isCompressingQuickCatImg, setIsCompressingQuickCatImg] = useState(false);
  const quickCategoryFileInputRef = useRef<HTMLInputElement>(null);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'variants' | 'specs' | 'seo'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // File inputs & drag states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const [targetReplaceImageId, setTargetReplaceImageId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 1. Media State
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [video, setVideo] = useState<VideoUploadItem | null>(null);
  const [externalImageUrl, setExternalImageUrl] = useState('');

  // 2. Essential Product Information
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Full-Grain Leather');
  const [subcategory, setSubcategory] = useState('Weekender & Travel Bags');
  const [brand, setBrand] = useState('Zelux Atelier');
  const [productType, setProductType] = useState<'physical' | 'digital' | 'service'>('physical');
  const [condition, setCondition] = useState<'new' | 'refurbished'>('new');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'draft' | 'inactive'>('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [tagsInput, setTagsInput] = useState('handcrafted, leather, luxury, atelier');

  // 3. Pricing, Inventory & Tax
  const [price, setPrice] = useState<number>(3450);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(4200);
  const [costPrice, setCostPrice] = useState<number>(1800);
  const [stock, setStock] = useState<number>(25);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [taxClass, setTaxClass] = useState<'standard' | 'exempt' | 'luxury'>('standard');
  const [taxRate, setTaxRate] = useState<number>(5); // 5% default standard VAT

  // 4. Shipping & Specs
  const [weightKg, setWeightKg] = useState<number>(0.85);
  const [dimensions, setDimensions] = useState('32 x 22 x 14 cm');
  const [shippingClass, setShippingClass] = useState<'standard' | 'fragile_express' | 'heavy'>('standard');
  const [countryOfOrigin, setCountryOfOrigin] = useState('Bangladesh');
  const [warrantyPolicy, setWarrantyPolicy] = useState('1-Year Atelier Craftsmanship Warranty');
  const [returnPolicy, setReturnPolicy] = useState('7-Day Hassle-Free Return & Exchange Policy');
  const [specList, setSpecList] = useState<Array<{ key: string; value: string }>>([
    { key: 'Material', value: '1.4mm Full-Grain Pull-Up Cowhide' },
    { key: 'Hardware', value: 'Antiqued Solid Brass Buckles' },
    { key: 'Lining', value: 'Raw Cotton Canvas' },
    { key: 'Craftsmanship', value: 'Hand-stitched in Savar Atelier' },
  ]);

  // 5. Variants
  const [enableVariants, setEnableVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [bulkPriceInput, setBulkPriceInput] = useState<number>(0);
  const [bulkStockInput, setBulkStockInput] = useState<number>(0);

  // 6. SEO & Social Meta
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  // Pre-populate fields when productToEdit is provided
  useEffect(() => {
    if (!isOpen) return;

    if (productToEdit) {
      setName(productToEdit.name || '');
      setSlug(productToEdit.slug || '');
      setIsSlugManuallyEdited(true);
      setSku(productToEdit.sku || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category || 'Full-Grain Leather');
      setSubcategory(productToEdit.subcategory || '');
      setBrand(productToEdit.brand || 'Zelux Atelier');
      setProductType(productToEdit.productType || 'physical');
      setCondition(productToEdit.condition || 'new');
      setShortDesc(productToEdit.shortDescription || '');
      setDescription(productToEdit.description || '');
      setStatus(productToEdit.published ? 'active' : 'draft');
      setIsFeatured(!!productToEdit.featured);
      setIsNewArrival(!!productToEdit.isNewArrival);
      setIsBestSeller(!!productToEdit.isBestSeller);
      setTagsInput(productToEdit.tags?.join(', ') || '');
      setPrice(productToEdit.price || 0);
      setCompareAtPrice(productToEdit.compareAtPrice || 0);
      setCostPrice(productToEdit.costPrice || 0);
      setStock(productToEdit.stock || 0);
      setLowStockThreshold(productToEdit.lowStockThreshold || 5);
      setWeightKg(productToEdit.weightKg ? Number(productToEdit.weightKg) : 0.85);
      setDimensions(productToEdit.dimensions || '48 x 28 x 25 cm');
      setWarrantyPolicy(productToEdit.warrantyPolicy || '');
      setReturnPolicy(productToEdit.returnPolicy || '');
      setSeoTitle(productToEdit.seoTitle || productToEdit.name || '');
      setSeoDescription(productToEdit.seoDescription || '');
      setSeoKeywords(productToEdit.seoKeywords || '');

      if (productToEdit.images && productToEdit.images.length > 0) {
        setImages(
          productToEdit.images.map((url, idx) => ({
            id: `edit-img-${idx}-${Date.now()}`,
            url,
            name: `image_${idx + 1}.jpg`,
            size: 450000,
            isPrimary: idx === 0,
            uploadStatus: 'completed',
          }))
        );
      }
      if (productToEdit.variants && productToEdit.variants.length > 0) {
        setVariants(productToEdit.variants);
        setEnableVariants(true);
      } else {
        setEnableVariants(false);
      }
      if (productToEdit.specifications) {
        setSpecList(
          Object.entries(productToEdit.specifications).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        );
      }
      setHasUnsavedChanges(false);
    }
  }, [isOpen, productToEdit]);

  // Auto-generate SKU if empty initially
  useEffect(() => {
    if (!sku && !productToEdit) {
      setSku(`ZLX-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [productToEdit]);

  // Auto-generate slug when name changes (unless user manually modified slug)
  useEffect(() => {
    if (!isSlugManuallyEdited && name.trim()) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  }, [name, isSlugManuallyEdited]);

  // Track unsaved changes
  useEffect(() => {
    if (name.trim() || description.trim() || images.length > 1) {
      setHasUnsavedChanges(true);
    }
  }, [name, sku, description, price, stock, images]);

  if (!isOpen) return null;

  // Process Images from Local Device
  const processImageFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp|avif)$/i)) {
        errors.push(`"${file.name}" is not a supported format. Please upload JPG, PNG, WEBP, or AVIF.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      showToast(errors[0], 'error');
    }

    if (validFiles.length === 0) return;

    setIsProcessingImages(true);
    try {
      const compressedResults = await Promise.all(
        validFiles.map((file) => compressImageFile(file, 1400, 1400, 0.85))
      );

      setImages((prev) => {
        const newItems: ImageUploadItem[] = compressedResults.map((c, idx) => ({
          id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          url: c.dataUrl,
          name: c.name,
          size: c.size,
          isPrimary: prev.length === 0 && idx === 0,
          dimensions: `${c.width} × ${c.height} px`,
          uploadStatus: 'completed',
        }));
        return [...prev, ...newItems];
      });

      setHasUnsavedChanges(true);
      showToast(
        `Added ${compressedResults.length} image(s) from local device (auto-optimized)`,
        'success'
      );
    } catch (err) {
      console.error('Failed to compress images', err);
      showToast('Error uploading some images', 'error');
    } finally {
      setIsProcessingImages(false);
    }
  };

  // Replace Existing Image
  const handleTriggerReplace = (id: string) => {
    setTargetReplaceImageId(id);
    replaceImageInputRef.current?.click();
  };

  const processReplaceImage = async (file: File) => {
    if (!targetReplaceImageId) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp|avif)$/i)) {
      showToast('Unsupported format. Please select JPG, PNG, WEBP, or AVIF.', 'error');
      return;
    }

    try {
      const c = await compressImageFile(file, 1400, 1400, 0.85);
      setImages((prev) =>
        prev.map((item) =>
          item.id === targetReplaceImageId
            ? {
                ...item,
                url: c.dataUrl,
                name: c.name,
                size: c.size,
                dimensions: `${c.width} × ${c.height} px`,
                uploadStatus: 'completed',
              }
            : item
        )
      );
      setHasUnsavedChanges(true);
      showToast(`Image replaced with "${file.name}"`, 'success');
      setTargetReplaceImageId(null);
    } catch {
      showToast('Failed to replace image', 'error');
    }
  };

  // Process Video from Local Device
  const processVideoFile = (file: File) => {
    if (!file.type.match(/^video\/(mp4|webm|quicktime)$/i)) {
      showToast('Unsupported video format. Please upload MP4 or WEBM.', 'error');
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      showToast('Video exceeds maximum size of 80MB.', 'error');
      return;
    }

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;

    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const durationSec = Math.round(videoEl.duration);

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        setVideo({
          url: resultUrl,
          name: file.name,
          size: file.size,
          duration: durationSec,
          file,
        });
        showToast(`Video loaded: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB, ${durationSec}s)`, 'success');
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    };
  };

  const handleAddExternalImage = () => {
    if (!externalImageUrl.trim()) return;
    try {
      new URL(externalImageUrl);
      setImages((prev) => [
        ...prev,
        {
          id: `ext-${Date.now()}`,
          url: externalImageUrl.trim(),
          name: 'external_image_url',
          size: 0,
          isPrimary: prev.length === 0,
          uploadStatus: 'completed',
        },
      ]);
      setExternalImageUrl('');
      showToast('External image added', 'success');
    } catch {
      showToast('Please enter a valid HTTP/HTTPS URL', 'error');
    }
  };

  const handleSetPrimaryImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const newImages = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return newImages;
    });
  };

  // Variant Helpers
  const handleAddVariant = () => {
    const nextNum = variants.length + 1;
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        name: `Option / Variation ${nextNum}`,
        sku: `${sku || 'ZLX'}-V0${nextNum}`,
        price: price || 3450,
        stock: 10,
        barcode: `890123456789${nextNum}`,
        imageUrl: images[0]?.url || '',
        attributes: { Option: `Variant ${nextNum}` },
      },
    ]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVariant = (id: string, updates: Partial<ProductVariant>) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const handleBulkApplyPrice = () => {
    if (!bulkPriceInput || bulkPriceInput <= 0) return;
    setVariants((prev) => prev.map((v) => ({ ...v, price: bulkPriceInput })));
    showToast(`Updated price to ৳${bulkPriceInput.toLocaleString()} across all variants`, 'success');
  };

  const handleBulkApplyStock = () => {
    if (bulkStockInput < 0) return;
    setVariants((prev) => prev.map((v) => ({ ...v, stock: bulkStockInput })));
    showToast(`Updated stock to ${bulkStockInput} across all variants`, 'success');
  };

  // Quick Preset Generator
  const handleGenerateStandardSizes = () => {
    const sizes = ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)'];
    const generated: ProductVariant[] = sizes.map((s, idx) => ({
      id: `v-size-${Date.now()}-${idx}`,
      name: `${s}`,
      sku: `${sku || 'ZLX'}-${s.charAt(0)}`,
      price: price || 3450,
      stock: 10,
      barcode: `89012345600${idx + 1}`,
      imageUrl: images[0]?.url || '',
      attributes: { Size: s },
    }));
    setVariants(generated);
    setEnableVariants(true);
    showToast('Generated 4 standard size variants', 'success');
  };

  // Spec helpers
  const handleAddSpec = () => {
    setSpecList((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSpec = (index: number, field: 'key' | 'value', val: string) => {
    setSpecList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: val } : s))
    );
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Product Title is required.';
    if (!sku.trim()) errors.sku = 'SKU Code is required.';
    if (!price || price <= 0) errors.price = 'Price must be greater than 0 BDT.';
    if (images.length === 0) errors.images = 'At least 1 product image is required.';
    if (!category.trim()) errors.category = 'Category must be selected.';

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Please complete the highlighted required fields', 'error');
      if (errors.name || errors.sku || errors.price || errors.category) {
        setActiveTab('general');
      } else if (errors.images) {
        setActiveTab('media');
      }
      return false;
    }
    return true;
  };

  // Save Product Handler
  const handleSaveProduct = async (saveStatus: 'active' | 'draft', addAnother: boolean = false) => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Sort images so primary is first
      const sortedImages = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
      const imageUrls = sortedImages.map((img) => img.url);

      // Build specs object
      const specifications: Record<string, string> = {};
      specList.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          specifications[s.key.trim()] = s.value.trim();
        }
      });
      if (countryOfOrigin) specifications['Country of Origin'] = countryOfOrigin;
      if (warrantyPolicy) specifications['Warranty'] = warrantyPolicy;
      if (returnPolicy) specifications['Return Policy'] = returnPolicy;

      // Clean tags
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const newProductData: Omit<Product, 'id' | 'rating' | 'reviewCount'> = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        category,
        subcategory,
        brand: brand.trim() || 'Zelux Atelier',
        productType,
        condition,
        description: description.trim(),
        shortDescription: shortDesc.trim() || undefined,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        costPrice: costPrice ? Number(costPrice) : undefined,
        stock: Number(stock),
        lowStockThreshold: Number(lowStockThreshold),
        images: imageUrls,
        videoUrl: video?.url || undefined,
        featured: isFeatured,
        isNewArrival,
        isBestSeller,
        variants: enableVariants ? variants : [],
        specifications,
        tags,
        published: saveStatus === 'active',
        weightKg: Number(weightKg) || undefined,
        dimensions: dimensions.trim() || undefined,
        shippingClass,
        taxClass,
        taxRate: taxClass === 'exempt' ? 0 : taxRate,
        countryOfOrigin,
        warrantyPolicy,
        returnPolicy,
        seoTitle: seoTitle.trim() || name.trim(),
        seoDescription: seoDescription.trim() || shortDesc.trim() || undefined,
        seoKeywords: seoKeywords.trim() || tags.join(', '),
        canonicalUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeluxi.vercel.app').replace(/\\/$/, '')}/product/${slug || 'product'}`,
        ogImageUrl: sortedImages[0]?.url,
      };

      const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionResult.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error('Please sign in with an administrator account before saving products.');
      }
      const productId = productToEdit?.id || `zlx-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;
      newProductData.images = await persistProductImageUrls(newProductData.images, productId);
      const productPayload: Product = {
        ...newProductData,
        id: productId,
        rating: productToEdit?.rating ?? 0,
        reviewCount: productToEdit?.reviewCount ?? 0,
      };
      const apiResponse = await fetch('/api/products', {
        method: productToEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(productPayload),
        cache: 'no-store',
      });
      const apiResult = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) {
        throw new Error(typeof apiResult.error === 'string' ? apiResult.error : 'Product could not be saved to the catalog database.');
      }

      if (productToEdit) {
        const updatedProduct: Product = {
          ...productToEdit,
          ...newProductData,
          id: productToEdit.id,
        };
        updateProduct(updatedProduct);
        setHasUnsavedChanges(false);
        if (onProductUpdated) {
          onProductUpdated(updatedProduct);
        }
        showToast(`Product "${updatedProduct.name}" updated successfully!`, 'success');
        onClose();
        return;
      }

      const created = addProduct({ ...newProductData, id: productId });
      setHasUnsavedChanges(false);

      if (onProductCreated) {
        onProductCreated(created);
      }

      showToast(
        saveStatus === 'active'
          ? `Product "${created.name}" published to catalog!`
          : `Draft "${created.name}" saved successfully!`,
        'success'
      );

      if (addAnother) {
        // Reset form for next product
        setName('');
        setSlug('');
        setIsSlugManuallyEdited(false);
        setSku(`ZLX-${Math.floor(1000 + Math.random() * 9000)}`);
        setDescription('');
        setShortDesc('');
        setImages([]);
        setVideo(null);
        setActiveTab('general');
      } else {
        onClose();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving product. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleResetForm = () => {
    setName('');
    setSlug('');
    setIsSlugManuallyEdited(false);
    setSku(`ZLX-${Math.floor(1000 + Math.random() * 9000)}`);
    setPrice(0);
    setCompareAtPrice(0);
    setCostPrice(0);
    setStock(0);
    setDescription('');
    setShortDesc('');
    setImages([]);
    setVideo(null);
    setFormErrors({});
    setHasUnsavedChanges(false);
    showToast('Form has been reset', 'info');
  };

  const primaryImage = images.find((img) => img.isPrimary) || images[0];

  // Dynamic category mapping from StoreContext
  const mainCategories = categories.filter((c) => !c.parentId);
  const currentMainCat =
    mainCategories.find((c) => c.name === category || c.id === category) || mainCategories[0];

  const dynamicSubs = categories.filter(
    (c) =>
      c.parentId &&
      (c.parentId === currentMainCat?.id ||
        c.parentId === currentMainCat?.name ||
        c.parentId === category)
  );

  const presetSubs = CATEGORY_SUBCATEGORIES[category] || [];

  const subcategoryList: string[] =
    dynamicSubs.length > 0
      ? dynamicSubs.map((s) => s.name)
      : presetSubs;

  // Form Readiness & Completeness metrics
  const formChecks = [
    { label: 'Title', done: Boolean(name.trim()) },
    { label: 'SKU', done: Boolean(sku.trim()) },
    { label: 'Price', done: Boolean(price > 0) },
    { label: 'Category', done: Boolean(category.trim()) },
    { label: 'Photos', done: Boolean(images.length > 0) },
    { label: 'Story/Summary', done: Boolean(description.trim() || shortDesc.trim()) },
  ];
  const completedChecks = formChecks.filter((c) => c.done).length;
  const completionPercentage = Math.round((completedChecks / formChecks.length) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200">
      {/* Hidden file replacement input */}
      <input
        ref={replaceImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => {
          if (e.target.files?.[0]) processReplaceImage(e.target.files[0]);
        }}
        className="hidden"
      />

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-sm">Discard Unsaved Product?</h4>
              <p className="text-xs text-slate-500 mt-1">
                You have unsaved changes in this catalog form. Exiting now will lose uploaded media and details.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dialog Container */}
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 max-h-[94vh] flex flex-col">
        {/* Top gradient accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-amber-500" />

        {/* Modal Top Header */}
        <div className="px-5 sm:px-7 py-4 border-b border-slate-200 bg-slate-50/90 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                  {productToEdit ? `Edit Product: ${productToEdit.name}` : 'Create New Catalog Product'}
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Zelux Studio Admin
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved Edits
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Bilingual descriptions, local photo compression, category taxonomy, profit margin architecture, and live storefront view.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showLivePreview
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showLivePreview ? 'Hide Storefront View' : 'Live Storefront View'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
              title="Close form (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Completion Progress Bar */}
        <div className="w-full bg-slate-100 border-b border-slate-200/60 px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Form Readiness:</span>
            <span className={`font-mono font-bold ${completedChecks === formChecks.length ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {completionPercentage}% Complete
            </span>
            <span className="text-slate-300">·</span>
            <span>{formChecks.length - completedChecks} essential field(s) remaining</span>
          </div>

          <div className="w-32 sm:w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                completedChecks === formChecks.length
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Tab Navigation & Step Indicators */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Essential Info & Pricing</span>
            {(formErrors.name || formErrors.sku || formErrors.price) && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
            {name.trim() && sku.trim() && price > 0 && (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>2. Media Studio ({images.length} Photos{video ? ' + Video' : ''})</span>
            {formErrors.images && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            {images.length > 0 && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('variants')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'variants'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Product Variants & SKU Matrix ({enableVariants ? `${variants.length} items` : 'Single'})</span>
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>4. Shipping, Tax & Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'seo'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>5. SEO & Social Meta</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
          <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-3' : ''} gap-6`}>
            {/* Form Column */}
            <div className={showLivePreview ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>
              {/* TAB 1: GENERAL & PRICING */}
              {activeTab === 'general' && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Essential Product Information</h3>
                    <p className="text-slate-500 text-[11px]">Core product identification, category mapping, and pricing architecture</p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Product Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Heritage Full-Grain Leather Weekender"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        formErrors.name
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-slate-300 focus:ring-indigo-100 focus:border-indigo-600'
                      }`}
                    />
                    {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
                  </div>

                  {/* Slug & SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        URL Slug (Auto-generated, editable)
                      </label>
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-600">
                        <span className="text-slate-400 font-mono text-[11px]">/product/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => {
                            setIsSlugManuallyEdited(true);
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                          }}
                          placeholder="heritage-leather-weekender"
                          className="w-full bg-transparent font-mono text-xs focus:outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        SKU Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        placeholder="ZLX-LEA-08"
                        className={`w-full px-3 py-2 border rounded-lg font-mono uppercase focus:outline-none ${
                          formErrors.sku ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-600'
                        }`}
                      />
                      {formErrors.sku && <p className="text-rose-500 text-[11px] mt-1">{formErrors.sku}</p>}
                    </div>
                  </div>

                  {/* Category, Subcategory, Brand, Barcode */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Primary Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Primary Category *</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddType('category');
                            setQuickCategoryName('');
                            setQuickCategoryImg('');
                            setIsQuickAddCategoryOpen(true);
                          }}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 text-[10px] font-bold flex items-center gap-1 transition-colors active:scale-95 shadow-2xs"
                          title="Create a new primary category without leaving"
                        >
                          <Plus className="w-3 h-3 text-indigo-600" />
                          <span>+ Add Category</span>
                        </button>
                      </div>
                      <select
                        value={category}
                        onChange={(e) => {
                          const catName = e.target.value;
                          setCategory(catName);
                          const matched = categories.find((c) => c.name === catName || c.id === catName);
                          if (matched) {
                            const subs = categories.filter(
                              (s) => s.parentId && (s.parentId === matched.id || s.parentId === matched.name)
                            );
                            if (subs.length > 0) {
                              setSubcategory(subs[0].name);
                            } else {
                              const defaultSub = CATEGORY_SUBCATEGORIES[catName]?.[0] || '';
                              setSubcategory(defaultSub);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 shadow-2xs"
                      >
                        {mainCategories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sub-Category</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddType('subcategory');
                            setQuickCategoryName('');
                            setQuickCategoryImg('');
                            setIsQuickAddCategoryOpen(true);
                          }}
                          className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-colors active:scale-95 shadow-2xs"
                          title="Create a new sub-category under this category"
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>+ Add Sub-Category</span>
                        </button>
                      </div>
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 shadow-2xs"
                      >
                        <option value="">-- None / General --</option>
                        {subcategoryList.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Brand / Studio</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Zelux Atelier"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Barcode (EAN / UPC)</label>
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="8901234567890"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* Product Type & Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Product Type</label>
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="physical">Physical Goods (Courier Dispatch)</option>
                        <option value="digital">Digital Product (Instant Delivery)</option>
                        <option value="service">Artisan Bespoke Service</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Item Condition</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="new">Brand New & Pristine</option>
                        <option value="refurbished">Atelier Restored / Studio Sample</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <span>Pricing & Margin Architecture (BDT ৳)</span>
                      </span>
                      {costPrice > 0 && price > 0 && (
                        <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          Gross Margin: {Math.round(((price - costPrice) / price) * 100)}% (+৳{(price - costPrice).toLocaleString()})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Selling Price (৳ BDT) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg bg-white text-base font-bold text-slate-900 ${
                            formErrors.price ? 'border-rose-400' : 'border-slate-300'
                          }`}
                        />
                        {formErrors.price && <p className="text-rose-500 text-[11px] mt-1">{formErrors.price}</p>}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Compare-at / Strike-through (৳)
                        </label>
                        <input
                          type="number"
                          value={compareAtPrice}
                          onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                          placeholder="4200"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                        />
                        {compareAtPrice > price && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            Customers save ৳{(compareAtPrice - price).toLocaleString()} ({Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% discount)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Cost of Goods Sold (COGS ৳)
                        </label>
                        <input
                          type="number"
                          value={costPrice}
                          onChange={(e) => setCostPrice(Number(e.target.value))}
                          placeholder="1800"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Confidential accounting data</p>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Low-Stock Alerts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Initial Stock Units</label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Low-Stock Alert Level</label>
                      <input
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Catalog Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="active">Active & Published</option>
                        <option value="draft">Draft (Hidden from Public)</option>
                        <option value="inactive">Archived / Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Badges & Flags */}
                  <div className="flex flex-wrap items-center gap-5 pt-1 border-t border-slate-100 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-800">Featured in Homepage Showcase</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNewArrival}
                        onChange={(e) => setIsNewArrival(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-800">New Arrival Ribbon</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isBestSeller}
                        onChange={(e) => setIsBestSeller(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-800">Best Seller Badge</span>
                    </label>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Short Excerpt</label>
                      <textarea
                        rows={2}
                        value={shortDesc}
                        onChange={(e) => setShortDesc(e.target.value)}
                        placeholder="Brief 1-2 sentence description for quick views and search..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Full Description</label>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Comprehensive details on craftsmanship, materials, durability, and usage..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tags & Search Keywords</label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Comma separated: leather, travel, vintage, crafted, banani, handmade"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDIA UPLOADS */}
              {activeTab === 'media' && (
                <div className="space-y-6 text-xs">
                  {/* Image Upload Zone */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          <span>Local Device Product Photography Gallery</span>
                        </h3>
                        <p className="text-slate-500 text-[11px]">
                          Select or drag-and-drop JPG, PNG, WEBP, or AVIF files directly from your computer or phone
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {images.length} Image{images.length !== 1 ? 's' : ''} Ready
                      </span>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(false);
                        if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files);
                      }}
                      onClick={() => !isProcessingImages && imageInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                        isDraggingImage
                          ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                          : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/60 bg-white'
                      }`}
                    >
                      <input
                        ref={imageInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={(e) => {
                          if (e.target.files) processImageFiles(e.target.files);
                        }}
                        className="hidden"
                      />
                      {isProcessingImages ? (
                        <div className="py-2">
                          <Loader2 className="w-9 h-9 text-indigo-600 animate-spin mx-auto mb-2" />
                          <p className="font-bold text-slate-800 text-sm">
                            Optimizing local device images...
                          </p>
                          <p className="text-slate-500 text-[11px] mt-1">
                            Compressing and formatting photos for ultra-fast customer loading
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-900 text-sm">
                            Click to choose photos from your computer or drag & drop here (লোকাল পিক আপলোড)
                          </p>
                          <p className="text-slate-500 text-[11px] mt-1">
                            Supports multi-file select: JPG, PNG, WEBP, AVIF. Automatically downsampled for lightning speed.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Quick External URL Option */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="url"
                        value={externalImageUrl}
                        onChange={(e) => setExternalImageUrl(e.target.value)}
                        placeholder="Or import from external image URL (https://...)"
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddExternalImage}
                        className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Uploaded Image Cards */}
                    {images.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-700 text-xs">
                            Active Gallery Images (Primary image will be used as storefront cover card):
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Use arrows to reorder · Click replace to swap file
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {images.map((img, idx) => (
                            <div
                              key={img.id}
                              className={`relative rounded-xl border p-2 flex gap-3 transition-all ${
                                img.isPrimary
                                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-200/70 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <img
                                src={img.url}
                                alt={img.name}
                                className="w-20 h-20 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                              />
                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-semibold text-slate-900 truncate text-[11px]" title={img.name}>
                                      {img.name}
                                    </p>
                                    {img.isPrimary && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-600 text-white rounded shrink-0">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {img.size > 0 ? `${(img.size / 1024).toFixed(0)} KB` : 'External'}{' '}
                                    {img.dimensions ? `· ${img.dimensions}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1">
                                  {!img.isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimaryImage(img.id)}
                                      className="text-[10px] text-indigo-600 font-semibold hover:underline"
                                    >
                                      Set Primary
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleTriggerReplace(img.id)}
                                    className="text-[10px] text-slate-600 hover:text-slate-900 font-semibold"
                                  >
                                    Replace
                                  </button>

                                  <div className="ml-auto flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveImage(idx, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                                      title="Move Left/Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === images.length - 1}
                                      onClick={() => handleMoveImage(idx, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                                      title="Move Right/Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(img.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>No images uploaded yet. At least one primary image is required to publish this product.</span>
                      </div>
                    )}
                  </div>

                  {/* Video Upload Section */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <VideoIcon className="w-4 h-4 text-indigo-600" />
                          <span>Product Video Clip / Reel (Local Device Upload)</span>
                        </h3>
                        <p className="text-slate-500 text-[11px]">
                          Upload a short 360° reel, atelier walkthrough, or unboxing clip (MP4 / WEBM, up to 80MB)
                        </p>
                      </div>
                      {video && (
                        <button
                          type="button"
                          onClick={() => setVideo(null)}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Remove Video
                        </button>
                      )}
                    </div>

                    {video ? (
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                        <div className="aspect-video max-w-md mx-auto bg-black rounded-lg overflow-hidden shadow-sm">
                          <video
                            controls
                            src={video.url}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{video.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {(video.size / (1024 * 1024)).toFixed(1)} MB {video.duration ? `· Duration: ${video.duration}s` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                          >
                            Replace Video
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingVideo(true);
                        }}
                        onDragLeave={() => setIsDraggingVideo(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingVideo(false);
                          if (e.dataTransfer.files[0]) processVideoFile(e.dataTransfer.files[0]);
                        }}
                        onClick={() => videoInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                          isDraggingVideo
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={(e) => {
                            if (e.target.files?.[0]) processVideoFile(e.target.files[0]);
                          }}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2">
                          <Play className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="font-bold text-slate-800 text-xs">
                          Click to select video or drag & drop file here
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          MP4 or WEBM format, up to 80MB. Duration is checked automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VARIANTS & INVENTORY */}
              {activeTab === 'variants' && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Product Variants & SKU Matrix</span>
                      </h3>
                      <p className="text-slate-500 text-[11px]">
                        Configure options such as Size, Color, or Finish with specific prices, inventory, barcodes, and image assignments
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={enableVariants}
                          onChange={(e) => setEnableVariants(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800">Enable Multi-Variants</span>
                      </label>
                    </div>
                  </div>

                  {enableVariants ? (
                    <div className="space-y-4">
                      {/* Bulk Edit & Generator Bar */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700 text-[11px]">Bulk Price (৳):</span>
                          <input
                            type="number"
                            value={bulkPriceInput}
                            onChange={(e) => setBulkPriceInput(Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleBulkApplyPrice}
                            className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-[11px] font-semibold"
                          >
                            Apply All
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700 text-[11px]">Bulk Stock:</span>
                          <input
                            type="number"
                            value={bulkStockInput}
                            onChange={(e) => setBulkStockInput(Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-slate-300 rounded bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleBulkApplyStock}
                            className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-[11px] font-semibold"
                          >
                            Apply All
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateStandardSizes}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[11px] font-bold border border-indigo-200"
                        >
                          + Quick Size Preset (S, M, L, XL)
                        </button>
                      </div>

                      {/* Variants Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Variant Name / Attribute</th>
                              <th className="p-2.5">SKU Code</th>
                              <th className="p-2.5">Price (৳)</th>
                              <th className="p-2.5">Stock</th>
                              <th className="p-2.5">Barcode</th>
                              <th className="p-2.5">Gallery Image</th>
                              <th className="p-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {variants.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/70">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={v.name}
                                    onChange={(e) => handleUpdateVariant(v.id, { name: e.target.value })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded font-medium"
                                  />
                                </td>
                                <td className="p-2 font-mono">
                                  <input
                                    type="text"
                                    value={v.sku}
                                    onChange={(e) => handleUpdateVariant(v.id, { sku: e.target.value.toUpperCase() })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono uppercase"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={v.price}
                                    onChange={(e) => handleUpdateVariant(v.id, { price: Number(e.target.value) })}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded font-bold"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={v.stock}
                                    onChange={(e) => handleUpdateVariant(v.id, { stock: Number(e.target.value) })}
                                    className="w-16 px-2 py-1 border border-slate-300 rounded"
                                  />
                                </td>
                                <td className="p-2 font-mono">
                                  <input
                                    type="text"
                                    value={v.barcode || ''}
                                    onChange={(e) => handleUpdateVariant(v.id, { barcode: e.target.value })}
                                    placeholder="Barcode"
                                    className="w-28 px-2 py-1 border border-slate-300 rounded font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={v.imageUrl || ''}
                                    onChange={(e) => handleUpdateVariant(v.id, { imageUrl: e.target.value })}
                                    className="w-28 px-1.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
                                  >
                                    <option value="">Default Primary</option>
                                    {images.map((img, i) => (
                                      <option key={img.id} value={img.url}>
                                        Image #{i + 1}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(v.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Variant Row</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <p className="text-slate-700 font-semibold">Single SKU Mode Active</p>
                      <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                        This product uses a uniform selling price (৳{price.toLocaleString()}) and stock ({stock} units) under primary SKU ({sku || 'ZLX-XXX'}). Check "Enable Multi-Variants" above to add color or size variations.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SHIPPING, TAX & SPECS */}
              {activeTab === 'specs' && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>Logistics, Tax & Specification Attributes</span>
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Courier delivery parameters, Bangladesh VAT configuration, and atelier custom attributes
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Parcel Weight (kg)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                        placeholder="0.85"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Used for Pathao / Steadfast rate tiering</p>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Dimensions (L × W × H)</label>
                      <input
                        type="text"
                        value={dimensions}
                        onChange={(e) => setDimensions(e.target.value)}
                        placeholder="32 x 22 x 14 cm"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Shipping Class</label>
                      <select
                        value={shippingClass}
                        onChange={(e) => setShippingClass(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="standard">Standard Parcel (24-48h)</option>
                        <option value="fragile_express">Fragile / Luxury Handled Express</option>
                        <option value="heavy">Heavy Cargo / Bulky Delivery</option>
                      </select>
                    </div>
                  </div>

                  {/* Tax / VAT Setup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">VAT / Tax Class</label>
                      <select
                        value={taxClass}
                        onChange={(e) => setTaxClass(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="standard">Standard 5% Bangladesh VAT</option>
                        <option value="exempt">Tax Exempt / 0% VAT</option>
                        <option value="luxury">Luxury Tier (15% Duty)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tax Percentage (%)</label>
                      <input
                        type="number"
                        disabled={taxClass === 'exempt'}
                        value={taxClass === 'exempt' ? 0 : taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Country of Origin</label>
                      <input
                        type="text"
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                        placeholder="Bangladesh"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Warranty Term</label>
                      <input
                        type="text"
                        value={warrantyPolicy}
                        onChange={(e) => setWarrantyPolicy(e.target.value)}
                        placeholder="1-Year Craftsmanship Warranty"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Return / Exchange Term</label>
                      <input
                        type="text"
                        value={returnPolicy}
                        onChange={(e) => setReturnPolicy(e.target.value)}
                        placeholder="7-Day Hassle-Free Return"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Dynamic Technical Specifications */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Custom Attributes & Materials:</span>
                      <button
                        type="button"
                        onClick={handleAddSpec}
                        className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Attribute</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {specList.map((spec, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={spec.key}
                            onChange={(e) => handleUpdateSpec(i, 'key', e.target.value)}
                            placeholder="Attribute Name (e.g. Leather Grade)"
                            className="w-1/3 px-3 py-1.5 border border-slate-300 rounded-lg"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={(e) => handleUpdateSpec(i, 'value', e.target.value)}
                            placeholder="Attribute Value (e.g. 1.4mm Pull-Up Cowhide)"
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(i)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SEO & SOCIAL META */}
              {activeTab === 'seo' && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>Search Engine Optimization (SEO) & Social OpenGraph</span>
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Rich snippets and meta tags for Google search results and WhatsApp / Facebook link cards
                    </p>
                  </div>

                  {/* Google Search Result Preview */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <span>Google Search Result Snippet</span>
                    </p>
                    <p className="text-blue-700 hover:underline font-medium text-sm truncate">
                      {seoTitle || name || 'Product Title — Zelux Single-Store Bangladesh'}
                    </p>
                    <p className="text-emerald-700 text-[11px] font-mono truncate">
                      https://zelux.vercel.app/product/{slug || 'product-slug'}
                    </p>
                    <p className="text-slate-600 text-xs line-clamp-2">
                      {seoDescription || shortDesc || description || 'Handcrafted luxury goods by Zelux. Fast 24-48h courier delivery across Bangladesh.'}
                    </p>
                  </div>

                  {/* Social Share Preview (OpenGraph) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      <span>Social Share Card (Facebook / WhatsApp / iMessage)</span>
                    </p>
                    <div className="max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="aspect-video bg-slate-100 overflow-hidden">
                        {primaryImage?.url ? (
                          <img src={primaryImage.url} alt="OG" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            No image selected
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">zelux.vercel.app</span>
                        <h5 className="font-bold text-slate-900 text-xs truncate">
                          {seoTitle || name || 'Zelux Handcrafted Lifestyle'}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {seoDescription || shortDesc || 'Curated handcrafted products designed in Bangladesh.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">SEO Meta Title</label>
                        <span className={`text-[10px] font-mono ${(seoTitle || name).length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {(seoTitle || name).length} / 60 characters
                        </span>
                      </div>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder={name || 'Zelux Handcrafted Product'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">SEO Meta Description</label>
                        <span className={`text-[10px] font-mono ${(seoDescription || shortDesc).length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {(seoDescription || shortDesc).length} / 160 characters
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder={shortDesc || 'Discover handcrafted luxury pieces designed for long-lasting durability.'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Meta Keywords</label>
                      <input
                        type="text"
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        placeholder="zelux, banani, handmade leather, dhaka, bangladesh shopping"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Storefront Card Preview Column */}
            {showLivePreview && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm sticky top-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Live Storefront Preview</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                      {status === 'active' ? 'Active' : 'Draft'}
                    </span>
                  </div>

                  {/* Card Simulation */}
                  <div className="pt-3">
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                      <div className="relative aspect-square bg-slate-100 overflow-hidden">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={name || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                            <span className="text-xs">No image yet</span>
                          </div>
                        )}
                        {isNewArrival && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded shadow-xs">
                            NEW
                          </span>
                        )}
                        {compareAtPrice > price && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded shadow-xs">
                            SAVE ৳{(compareAtPrice - price).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="text-[11px] font-mono text-slate-400 uppercase">{category}</div>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                          {name || 'Untitled Catalog Item'}
                        </h4>

                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-base font-bold text-slate-900">{formatPrice(price, language)}</span>
                          {compareAtPrice > price && (
                            <span className="text-xs text-slate-400 line-through">
                              {formatPrice(compareAtPrice, language)}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
                          <span>SKU: {sku || 'ZLX-XXX'}</span>
                          <span>{stock} in stock</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveProduct('draft')}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveProduct('active', true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Save & Add Another
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveProduct('active', false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (productToEdit ? 'Updating...' : 'Publishing...')
                  : (productToEdit ? 'Update Product' : 'Publish Product')}
              </span>
            </button>
          </div>
        </div>
        {/* Inline Quick Add Category / Sub-Category Modal */}
        {isQuickAddCategoryOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  {quickAddType === 'category'
                    ? 'Add New Primary Category'
                    : `Add Sub-Category under "${category}"`}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsQuickAddCategoryOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {quickAddType === 'category' ? 'Category Name *' : 'Sub-Category Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={quickCategoryName}
                    onChange={(e) => setQuickCategoryName(e.target.value)}
                    placeholder={quickAddType === 'category' ? 'e.g. Leather Accessories' : 'e.g. Messenger Bags'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category Picture (Upload from Device)
                  </label>
                  <input
                    type="file"
                    ref={quickCategoryFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsCompressingQuickCatImg(true);
                      try {
                        const compressed = await compressImageFile(file, 800, 800, 0.85);
                        setQuickCategoryImg(compressed.dataUrl);
                        showToast('Category picture selected from local device', 'success');
                      } catch {
                        showToast('Failed to load image', 'error');
                      } finally {
                        setIsCompressingQuickCatImg(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    {quickCategoryImg ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={quickCategoryImg} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setQuickCategoryImg('')}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isCompressingQuickCatImg}
                      onClick={() => quickCategoryFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {isCompressingQuickCatImg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{quickCategoryImg ? 'Change Picture' : 'Upload Picture'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsQuickAddCategoryOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickCategoryName.trim()) {
                      showToast('Name is required', 'error');
                      return;
                    }
                    const slug = quickCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const defaultCatImg = quickCategoryImg || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80';
                    const defaultSubImg = quickCategoryImg || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80';

                    if (quickAddType === 'category') {
                      const created = addCategory({
                        name: quickCategoryName.trim(),
                        slug,
                        description: '',
                        image: defaultCatImg,
                        order: categories.length + 1,
                        isActive: true,
                        parentId: null,
                      });
                      setCategory(created.name);
                      showToast(`Category "${created.name}" created and selected`, 'success');
                    } else {
                      const parent = categories.find((c) => c.name === category || c.id === category);
                      const created = addCategory({
                        name: quickCategoryName.trim(),
                        slug,
                        description: '',
                        image: defaultSubImg,
                        order: categories.length + 1,
                        isActive: true,
                        parentId: parent?.id || null,
                      });
                      setSubcategory(created.name);
                      showToast(`Sub-Category "${created.name}" created under ${category}`, 'success');
                    }
                    setIsQuickAddCategoryOpen(false);
                    setQuickCategoryImg('');
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
