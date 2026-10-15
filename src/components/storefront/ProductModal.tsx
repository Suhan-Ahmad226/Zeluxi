import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import {
  X,
  Star,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Heart,
  ArrowRight,
  Clock,
  Ruler,
  SlidersHorizontal,
  MessageSquare,
  HelpCircle,
  Send,
} from 'lucide-react';

export const ProductModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    language,
    addToCart,
    wishlist,
    toggleWishlist,
    setIsCheckoutOpen,
    showToast,
    settings,
    reviews,
    addReview,
    questions,
    askQuestion,
    setIsSizeGuideOpen,
    toggleCompare,
    compareList,
    setIsCompareOpen,
    addRecentlyViewed,
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews' | 'qa' | 'delivery'>('details');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Question Form State
  const [questionUser, setQuestionUser] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedVariantId(selectedProduct.variants[0]?.id || '');
      setActiveImageIndex(0);
      setQuantity(1);
      addRecentlyViewed(selectedProduct.id);
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const selectedVariant = selectedProduct.variants.find((v) => v.id === selectedVariantId);
  const currentPrice = selectedVariant ? selectedVariant.price : selectedProduct.price;
  const currentStock = selectedVariant ? selectedVariant.stock : selectedProduct.stock;
  const isOutOfStock = currentStock <= 0;
  const isWishlisted = wishlist.includes(selectedProduct.id);
  const isCompared = compareList.includes(selectedProduct.id);
  const isApparel = selectedProduct.category.toLowerCase().includes('menswear') || selectedProduct.category.toLowerCase().includes('panjabi');

  const productReviews = reviews.filter((r) => r.comment.length > 0);
  const productQuestions = questions.filter((q) => q.productId === selectedProduct.id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(selectedProduct, selectedVariantId, quantity);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(selectedProduct, selectedVariantId, quantity);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: selectedProduct.name,
        text: selectedProduct.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Product link copied to clipboard', 'info');
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    addReview(selectedProduct.id, {
      userName: reviewName.trim(),
      rating: reviewRating,
      comment: reviewComment.trim(),
      verifiedPurchase: true,
    });

    setReviewName('');
    setReviewComment('');
    setShowReviewForm(false);
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionUser.trim() || !questionText.trim()) return;

    askQuestion(selectedProduct.id, questionUser.trim(), questionText.trim());
    setQuestionUser('');
    setQuestionText('');
    setShowQuestionForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Top Close bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="uppercase tracking-wider font-semibold text-slate-700">
              {selectedProduct.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">{selectedProduct.sku}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Compare Button */}
            <button
              onClick={() => toggleCompare(selectedProduct.id)}
              className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                isCompared
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Add to Comparison"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{isCompared ? 'Compared' : 'Compare'}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Share Product"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleWishlist(selectedProduct.id)}
              className={`p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors ${
                isWishlisted ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
              }`}
              title="Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setSelectedProduct(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Contiguous View */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <img
                src={selectedProduct.images[activeImageIndex] || selectedProduct.images[0]}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {selectedProduct.compareAtPrice && (
                <div className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                  SAVE {Math.round(((selectedProduct.compareAtPrice - selectedProduct.price) / selectedProduct.compareAtPrice) * 100)}%
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {selectedProduct.images.length > 1 && (
              <div className="flex items-center gap-2">
                {selectedProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust highlights & Size Guide trigger */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Dhaka delivery in 24-48 hrs, Outside Dhaka in 2-4 days
                  </span>
                </div>
              </div>

              {isApparel && (
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-slate-300 rounded-lg text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>View Sizing & Fit Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{selectedProduct.rating}</span>
                  </div>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{selectedProduct.reviewCount} Customer Reviews</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {selectedProduct.name}
                </h1>

                {/* Price block */}
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    {formatPrice(currentPrice)}
                  </span>
                  {selectedProduct.compareAtPrice && (
                    <span className="text-sm text-slate-400 line-through tabular-nums">
                      {formatPrice(selectedProduct.compareAtPrice)}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    VAT Included
                  </span>
                </div>
              </div>

              {/* Stock status indicator */}
              <div className="flex items-center gap-2 text-xs">
                {isOutOfStock ? (
                  <span className="flex items-center gap-1 text-rose-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Currently Out of Stock
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    {currentStock} Units In Stock (Fast Dispatch)
                  </span>
                )}
              </div>

              {/* Variants Selector */}
              {selectedProduct.variants.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Select Variant / Option:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          selectedVariantId === v.id
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-sm'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-semibold text-slate-700">
                  Quantity:
                </span>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold font-mono text-slate-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                    disabled={quantity >= currentStock || isOutOfStock}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tabs: Details / Specs / Reviews / Q&A / Delivery */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 border-b border-slate-200 text-xs font-medium pb-2 mb-3 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-1 whitespace-nowrap transition-colors ${
                      activeTab === 'details' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-1 whitespace-nowrap transition-colors ${
                      activeTab === 'specs' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Specs
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-1 whitespace-nowrap transition-colors ${
                      activeTab === 'reviews' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Reviews ({productReviews.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('qa')}
                    className={`pb-1 whitespace-nowrap transition-colors ${
                      activeTab === 'qa' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Q&A ({productQuestions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('delivery')}
                    className={`pb-1 whitespace-nowrap transition-colors ${
                      activeTab === 'delivery' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Delivery
                  </button>
                </div>

                {activeTab === 'details' && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}

                {activeTab === 'specs' && (
                  <div className="text-xs space-y-1.5">
                    {Object.entries(selectedProduct.specifications).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">{key}</span>
                        <span className="text-slate-800 font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Customer Verified Reviews</span>
                      <button
                        onClick={() => setShowReviewForm(!showReviewForm)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {showReviewForm ? 'Cancel' : '+ Write Review'}
                      </button>
                    </div>

                    {showReviewForm && (
                      <form onSubmit={handleSubmitReview} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-700">Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                type="button"
                                key={s}
                                onClick={() => setReviewRating(s)}
                                className="p-0.5 text-amber-400"
                              >
                                <Star className={`w-4 h-4 ${s <= reviewRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          required
                          value={reviewName}
                          onChange={(e) => setReviewName(e.target.value)}
                          placeholder="Your Name (e.g. Asif Mahmud)"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                        />
                        <textarea
                          required
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Write your genuine experience with the product..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                        >
                          Submit Review
                        </button>
                      </form>
                    )}

                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                      {productReviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{rev.userName}</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{rev.comment}</p>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{rev.date} · Verified Buyer</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'qa' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Questions & Answers</span>
                      <button
                        onClick={() => setShowQuestionForm(!showQuestionForm)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {showQuestionForm ? 'Cancel' : '+ Ask Question'}
                      </button>
                    </div>

                    {showQuestionForm && (
                      <form onSubmit={handleSubmitQuestion} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <input
                          type="text"
                          required
                          value={questionUser}
                          onChange={(e) => setQuestionUser(e.target.value)}
                          placeholder="Your Name"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                        />
                        <textarea
                          required
                          rows={2}
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder="Ask about dimensions, fabric, warranty or delivery..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                        >
                          Submit Question
                        </button>
                      </form>
                    )}

                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                      {productQuestions.length === 0 ? (
                        <p className="text-slate-400 text-center py-4">No questions asked yet. Be the first to ask!</p>
                      ) : (
                        productQuestions.map((q) => (
                          <div key={q.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                            <p className="font-semibold text-slate-800 flex items-start gap-1">
                              <span className="text-indigo-600 font-bold">Q:</span>
                              <span>{q.question}</span>
                            </p>
                            {q.answer ? (
                              <p className="text-slate-600 pl-4 border-l-2 border-emerald-500 text-[11px]">
                                <strong className="text-emerald-700">Zelux Concierge:</strong> {q.answer}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic pl-4">Awaiting concierge response...</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <div className="text-xs space-y-2 text-slate-600">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                      <span>Inside Dhaka (Pathao Express)</span>
                      <span className="font-bold text-slate-900">৳{settings.shippingDhaka} (24-48 hrs)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                      <span>Outside Dhaka (Steadfast Courier)</span>
                      <span className="font-bold text-slate-900">৳{settings.shippingOutsideDhaka} (2-4 days)</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      * Free Delivery on orders above ৳{settings.freeShippingThreshold.toLocaleString()}!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>Buy Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
