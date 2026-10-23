import React from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Ruler, Check } from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

export const SizeGuideModal: React.FC = () => {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useStore();

  if (!isSizeGuideOpen) return null;

  const measurements = [
    { size: '38 (S)', chest: '38–40"', length: '40"', shoulder: '17.5"', sleeve: '24"' },
    { size: '40 (M)', chest: '41–42"', length: '41"', shoulder: '18.0"', sleeve: '24.5"' },
    { size: '42 (L)', chest: '43–44"', length: '42"', shoulder: '18.5"', sleeve: '25"' },
    { size: '44 (XL)', chest: '45–46"', length: '43"', shoulder: '19.0"', sleeve: '25.5"' },
    { size: '46 (XXL)', chest: '47–48"', length: '44"', shoulder: '19.5"', sleeve: '26"' },
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Apparel & Panjabi Sizing Guide
            </h3>
          </div>
          <button
            onClick={() => setIsSizeGuideOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          All our organic linen shirts and artisan panjabis are tailored to standard relaxed South Asian body specifications. Measure across your chest for best fit.
        </p>

        {/* Measurements Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
          <table className="w-full text-left min-w-[420px]">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Size Tag</th>
                <th className="p-3">Chest</th>
                <th className="p-3">Length</th>
                <th className="p-3">Shoulder</th>
                <th className="p-3">Sleeve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {measurements.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 font-mono">
                  <td className="p-3 font-bold text-slate-900 font-sans">{row.size}</td>
                  <td className="p-3 text-slate-700">{row.chest}</td>
                  <td className="p-3 text-slate-700">{row.length}</td>
                  <td className="p-3 text-slate-700">{row.shoulder}</td>
                  <td className="p-3 text-slate-700">{row.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fit Guarantee Callout */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs space-y-1 text-indigo-950">
          <div className="flex items-center gap-1.5 font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Free Size Exchange Guarantee</span>
          </div>
          <p className="text-[11px] text-indigo-900">
            If your selected size does not fit comfortably, our courier will pick it up and deliver the revised size with no extra hassle.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setIsSizeGuideOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
          >
            Close Guide
          </button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};
