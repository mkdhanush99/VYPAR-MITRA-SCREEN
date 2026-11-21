import { useState } from 'react';
import { Check, Copy, ExternalLink, Phone, MapPin, X } from 'lucide-react';
import { BusinessListing, CategoryItem, DistrictItem, Language } from '../types';
import { t } from '../data/i18n';
import { buildWhatsAppLink } from '../utils/directory';

interface ShareCardModalProps {
  listing: BusinessListing | null;
  category?: CategoryItem;
  district?: DistrictItem;
  lang: Language;
  onClose: () => void;
  onTrackShare?: (listingId: string) => void;
}

export function ShareCardModal({
  listing,
  category,
  district,
  lang,
  onClose,
  onTrackShare,
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);

  if (!listing) return null;

  const listingUrl = `https://vyaparamitra.in/businesses/${listing.slug}/`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(listingUrl).catch(() => {});
    }
    setCopied(true);
    onTrackShare?.(listing.id);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'WhatsApp షేర్ కార్డ్', 'WhatsApp Share Card')}
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            {t(lang, 'WhatsApp స్టేటస్ షేర్ కార్డ్', 'WhatsApp Status Share Card')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share card"
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Square Brand Share Card (Section 11) */}
        <div className="p-5 bg-slate-50 flex justify-center">
          <div className="w-full max-w-[330px] aspect-square rounded-xl bg-[#0E5E1F] text-white p-5 flex flex-col justify-between relative overflow-hidden border border-[#1A5B0B]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/aistudio/Instagram_Profile_1080x1080_3ecef66e.png"
                  alt="Vyapara Mitra logo"
                  className="w-8 h-8 rounded-full object-cover border border-[#FDB902]"
                />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-[#FDB902]">వ్యాపార మిత్ర</div>
                  <div className="text-[10px] text-white/80">vyaparamitra.in</div>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FDB902] text-[#0A4216]">
                {category ? (lang === 'te' ? category.nameTe : category.nameEn) : 'Business'}
              </span>
            </div>

            <div className="my-2">
              <h4 className="text-lg font-bold leading-snug text-white">{listing.nameEn}</h4>
              {listing.nameTe && (
                <p className="text-sm font-medium text-[#FDB902] mt-0.5">{listing.nameTe}</p>
              )}
              <div className="mt-3 space-y-1 text-xs text-white/90">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FDB902] shrink-0" />
                  <span>
                    {listing.town}, {district?.nameEn ?? listing.districtSlug}
                  </span>
                </p>
                <p className="flex items-center gap-1.5 font-mono-num">
                  <Phone className="w-3.5 h-3.5 text-[#FDB902] shrink-0" />
                  <span>+91 {listing.phone}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/85 leading-snug">
                <p className="font-semibold text-[#FDB902]">
                  {t(lang, 'స్కాన్ చేసి సంప్రదించండి', 'Scan to view & contact')}
                </p>
                <p className="text-[10px] text-white/75 truncate max-w-[180px]">{listingUrl}</p>
              </div>
              {/* Crisp deterministic QR pattern */}
              <div className="w-14 h-14 bg-white p-1.5 rounded-lg shrink-0" aria-hidden="true">
                <svg viewBox="0 0 21 21" className="w-full h-full text-slate-900">
                  <rect x="0" y="0" width="7" height="7" fill="currentColor" />
                  <rect x="1" y="1" width="5" height="5" fill="#fff" />
                  <rect x="2" y="2" width="3" height="3" fill="currentColor" />
                  <rect x="14" y="0" width="7" height="7" fill="currentColor" />
                  <rect x="15" y="1" width="5" height="5" fill="#fff" />
                  <rect x="16" y="2" width="3" height="3" fill="currentColor" />
                  <rect x="0" y="14" width="7" height="7" fill="currentColor" />
                  <rect x="1" y="15" width="5" height="5" fill="#fff" />
                  <rect x="2" y="16" width="3" height="3" fill="currentColor" />
                  <rect x="9" y="2" width="2" height="2" fill="currentColor" />
                  <rect x="9" y="6" width="3" height="2" fill="currentColor" />
                  <rect x="9" y="10" width="4" height="3" fill="currentColor" />
                  <rect x="15" y="10" width="2" height="4" fill="currentColor" />
                  <rect x="18" y="12" width="3" height="3" fill="currentColor" />
                  <rect x="10" y="15" width="3" height="3" fill="currentColor" />
                  <rect x="15" y="16" width="4" height="4" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#0E5E1F]" /> : <Copy className="w-4 h-4" />}
            {copied ? t(lang, 'లింక్ కాపీ అయింది', 'Link Copied') : t(lang, 'లింక్ కాపీ చేయండి', 'Copy Link')}
          </button>
          <a
            href={buildWhatsAppLink(listing)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrackShare?.(listing.id)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-medium hover:bg-[#1A5B0B] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {t(lang, 'WhatsApp లో షేర్', 'Share on WhatsApp')}
          </a>
        </div>
      </div>
    </div>
  );
}
