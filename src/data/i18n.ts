import {
  BadgeId,
  DiscoveryChannel,
  HelpWantedOption,
  Language,
  ListingStatus,
  RejectionReasonCode,
  ReportReasonCode,
} from '../types';

export const STATUS_LABELS: Record<ListingStatus, { te: string; en: string }> = {
  draft: { te: 'డ్రాఫ్ట్', en: 'Draft' },
  pending: { te: 'సమీక్షలో ఉంది', en: 'Pending review' },
  live: { te: 'లైవ్', en: 'Live' },
  changes_needed: { te: 'మార్పులు అవసరం', en: 'Changes needed' },
  hidden: { te: 'దాచబడింది', en: 'Hidden by owner' },
  suspended: { te: 'నిలిపివేయబడింది', en: 'Suspended' },
};

export const BADGE_LABELS: Record<BadgeId, { te: string; en: string }> = {
  vm_verified: { te: 'వ్యాపార మిత్ర వెరిఫైడ్', en: 'Vyapara Mitra Verified' },
  phone_verified: { te: 'ఫోన్ వెరిఫైడ్', en: 'Phone Verified' },
  gst_registered: { te: 'GST రిజిస్టర్డ్', en: 'GST Registered' },
  udyam_registered: { te: 'ఉద్యమ్ రిజిస్టర్డ్', en: 'Udyam Registered' },
  women_led: { te: 'మహిళా వ్యాపారం', en: 'Women-led' },
};

export const REJECTION_REASONS: Record<RejectionReasonCode, { te: string; en: string }> = {
  photo_missing: {
    te: 'ఫోటో లేదు లేదా స్పష్టంగా లేదు',
    en: 'Photo missing or unclear',
  },
  wrong_category: {
    te: 'కేటగిరీ సరైనది కాదు',
    en: 'Wrong category',
  },
  address_incomplete: {
    te: 'చిరునామా పూర్తిగా లేదు',
    en: 'Address incomplete',
  },
  already_listed: {
    te: 'ఈ వ్యాపారం ఇప్పటికే లిస్ట్ అయ్యింది',
    en: 'Already listed',
  },
  phone_not_reachable: {
    te: 'ఫోన్ కలవడం లేదు',
    en: 'Phone not reachable',
  },
  description_unclear: {
    te: 'వివరణ చాలా చిన్నది లేదా స్పష్టంగా లేదు',
    en: 'Description too short or unclear',
  },
  business_not_allowed: {
    te: 'ఈ రకమైన వ్యాపారానికి అనుమతి లేదు',
    en: 'Business type not allowed',
  },
};

export const REPORT_REASONS: Record<ReportReasonCode, { te: string; en: string }> = {
  closed_permanently: { te: 'శాశ్వతంగా మూసివేయబడింది', en: 'Closed permanently' },
  wrong_phone: { te: 'తప్పు ఫోన్ నంబర్', en: 'Wrong phone number' },
  wrong_address: { te: 'తప్పు చిరునామా', en: 'Wrong address' },
  fake_or_spam: { te: 'నకిలీ లేదా స్పామ్', en: 'Fake or spam' },
  offensive: { te: 'అభ్యంతరకరమైన సమాచారం', en: 'Offensive content' },
  this_is_my_business: { te: 'ఇది నా వ్యాపారం (క్లెయిమ్ చేయాలి)', en: 'This is my business' },
};

export const HELP_WANTED_LABELS: Record<HelpWantedOption, { te: string; en: string }> = {
  loans_schemes: { te: 'లోన్లు & ప్రభుత్వ పథకాలు', en: 'Loans & government schemes' },
  gst_registrations: { te: 'GST & రిజిస్ట్రేషన్లు', en: 'GST & registrations' },
  sales_tips: { te: 'అమ్మకాలు పెంచే చిట్కాలు', en: 'Sales tips' },
  online_digital: { te: 'ఆన్‌లైన్ & డిజిటల్ మార్కెటింగ్', en: 'Online & digital' },
  accounts_money: { te: 'అకౌంట్స్ & డబ్బు నిర్వహణ', en: 'Accounts & money' },
  starting_new: { te: 'కొత్త వ్యాపారం ప్రారంభించడం', en: 'Starting a new business' },
};

export const DISCOVERY_LABELS: Record<DiscoveryChannel, { te: string; en: string }> = {
  whatsapp_group: { te: 'WhatsApp గ్రూప్', en: 'WhatsApp group' },
  instagram: { te: 'Instagram', en: 'Instagram' },
  facebook: { te: 'Facebook', en: 'Facebook' },
  youtube: { te: 'YouTube', en: 'YouTube' },
  poster_qr: { te: 'పోస్టర్ లేదా QR కోడ్', en: 'Poster or QR' },
  friend: { te: 'స్నేహితుడు / తెలిసినవారు', en: 'Friend' },
  ambassador: { te: 'జిల్లా అంబాసిడర్', en: 'District Ambassador' },
  google: { te: 'Google సెర్చ్', en: 'Google Search' },
  other: { te: 'ఇతర', en: 'Other' },
};

export function t(lang: Language, te: string, en: string): string {
  return lang === 'te' ? te : en;
}
