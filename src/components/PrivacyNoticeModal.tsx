import { X, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { t } from '../data/i18n';

interface PrivacyNoticeModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
}

export function PrivacyNoticeModal({ open, onClose, lang }: PrivacyNoticeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'గోప్యతా విధానం', 'Privacy Notice')}
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#F6F3E1]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#0E5E1F]" />
            <h2 className="text-base font-bold text-slate-900">
              {t(
                lang,
                'వ్యాపార మిత్ర గోప్యతా విధానం (DPDP నియమాలు 2025)',
                'Vyapara Mitra Privacy Notice (DPDP Rules 2025)'
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy notice"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs font-medium text-slate-500">
            Notice Version: v1.0 (November 2026) · Applicable across Andhra Pradesh &amp; Telangana
          </p>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">
              {t(lang, '1. మేము సేకరించే సమాచారం', '1. Data We Collect')}
            </h3>
            <p>
              {t(
                lang,
                'ఖాతా కోసం మీ పేరు, మొబైల్ నంబర్ (OTP ధృవీకరణ కోసం), జిల్లా మరియు ఐచ్ఛిక ఇమెయిల్ సేకరిస్తాము. వ్యాపార లిస్టింగ్ కోసం వ్యాపారం పేరు, ఫోన్, చిరునామా, ఫోటోలు, సమయాలు మరియు మీరు ఇచ్చే GSTIN/ఉద్యమ్ వివరాలను సేకరిస్తాము. ఆధార్, పాన్ లేదా బ్యాంకు వివరాలు ఎప్పుడూ అడగము.',
                'For your account we collect your name, mobile number (for OTP verification), district, and optional email. For a listing we collect business name, phone, address, photos, timings, and optional GSTIN/Udyam details. We never ask for Aadhaar, PAN, bank details, or document uploads.'
              )}
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">
              {t(lang, '2. పబ్లిక్‌గా కనిపించేది vs గోప్యమైనది', '2. What Becomes Public vs Private')}
            </h3>
            <p>
              {t(
                lang,
                'ఫారమ్‌లో "పబ్లిక్ · అందరికీ కనిపిస్తుంది" అని గుర్తించిన వివరాలు మాత్రమే vyaparamitra.in లో కనిపిస్తాయి. మీ లాగిన్ మొబైల్ నంబర్, ఉద్యమ్ నంబర్ మరియు టీమ్ ప్రశ్నలు ఎప్పుడూ పబ్లిక్‌గా చూపబడవు. మీ సమాచారం ఎవరికీ అమ్మబడదు లేదా పంచుకోబడదు.',
                'Only fields explicitly tagged "Public" in the form are displayed on vyaparamitra.in. Your login mobile number (unless selected as business phone), Udyam number, and team support answers remain strictly private. We never sell or share member data.'
              )}
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">
              {t(lang, '3. మీ హక్కులు & ఖాతా తొలగింపు', '3. Your Rights & Account Deletion')}
            </h3>
            <p>
              {t(
                lang,
                'మీరు ఎప్పుడైనా మీ డ్యాష్‌బోర్డ్‌లో "నా ఖాతాను తొలగించు" క్లిక్ చేసి మీ లిస్టింగ్‌లను వెంటనే అన్‌పబ్లిష్ చేయవచ్చు. చట్టపరమైన అవసరాలు మినహా మీ వ్యక్తిగత సమాచారం 30 రోజుల్లో తొలగించబడుతుంది.',
                'You can withdraw consent or click "Delete my account" in your Owner Dashboard at any time. Your listings are unpublished immediately and your personal data is deleted within 30 days, except where retention is required by law.'
              )}
            </p>
          </section>

          <section className="space-y-1.5 pt-2 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900">
              {t(lang, '4. గోప్యతా సంప్రదింపు అధికారి', '4. Privacy Officer Contact')}
            </h3>
            <p>
              Vyapara Mitra Data Privacy Desk ·{' '}
              <span className="font-medium text-[#0E5E1F]">privacy@vyaparamitra.in</span>
            </p>
          </section>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#0E5E1F] text-white text-sm font-medium hover:bg-[#1A5B0B] transition-colors"
          >
            {t(lang, 'అర్థమైంది', 'Understood')}
          </button>
        </div>
      </div>
    </div>
  );
}
