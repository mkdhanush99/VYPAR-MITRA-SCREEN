export type Language = 'te' | 'en';
export type PortalView = 'public' | 'customer' | 'admin';
export type StateCode = 'TS' | 'AP';

export type ListingStatus =
  | 'draft'
  | 'pending'
  | 'live'
  | 'changes_needed'
  | 'hidden'
  | 'suspended';

export type BadgeId =
  | 'phone_verified'
  | 'vm_verified'
  | 'gst_registered'
  | 'udyam_registered'
  | 'women_led';

export type BusinessMode =
  | 'shop_visit'
  | 'from_home'
  | 'customer_place'
  | 'online_only';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type RejectionReasonCode =
  | 'photo_missing'
  | 'wrong_category'
  | 'address_incomplete'
  | 'already_listed'
  | 'phone_not_reachable'
  | 'description_unclear'
  | 'business_not_allowed';

export type ReportReasonCode =
  | 'closed_permanently'
  | 'wrong_phone'
  | 'wrong_address'
  | 'fake_or_spam'
  | 'offensive'
  | 'this_is_my_business';

export type HelpWantedOption =
  | 'loans_schemes'
  | 'gst_registrations'
  | 'sales_tips'
  | 'online_digital'
  | 'accounts_money'
  | 'starting_new';

export type DiscoveryChannel =
  | 'whatsapp_group'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'poster_qr'
  | 'friend'
  | 'ambassador'
  | 'google'
  | 'other';

export interface CategoryItem {
  id: string;
  slug: string;
  nameTe: string;
  nameEn: string;
  subCategories: string[];
  icon: string;
  status: 'Live' | 'New';
  order: number;
}

export interface DistrictItem {
  slug: string;
  nameEn: string;
  nameTe: string;
  state: StateCode;
  mandals: string[];
  whatsappUrl: string;
  partnerName: string;
  ambassadorsCount: number;
}

export interface ListingStats {
  views: number;
  calls: number;
  whatsappTaps: number;
  directionsTaps: number;
  shares: number;
}

export interface SponsoredMeta {
  isSponsored: boolean;
  scope: 'district' | 'category' | 'both';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slotOrder: 1 | 2;
  paymentRef: string;
  impressions: number;
  taps: number;
}

export interface ListingReport {
  id: string;
  listingId: string;
  reason: ReportReasonCode;
  note: string;
  deviceId: string;
  createdAt: string;
  resolved: boolean;
}

export interface BusinessListing {
  id: string;
  slug: string;
  ownerId: string;
  // A. Business
  nameEn: string;
  nameTe: string;
  categorySlug: string;
  subCategory: string;
  about: string;
  tags: string[];
  yearStarted?: number;
  modes: BusinessMode[];
  womenLed: boolean;
  // B. Contact
  phone: string;
  whatsapp: string;
  altPhone?: string;
  contactPerson: string;
  showContactPerson: boolean;
  businessEmail?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  // C. Location
  state: StateCode;
  districtSlug: string;
  mandal: string;
  town: string;
  address: string;
  showOnlyTown: boolean;
  landmark?: string;
  pinCode: string;
  lat?: number;
  lng?: number;
  // D. Timings & payments
  open24Hours: boolean;
  openTime?: string; // "09:00"
  closeTime?: string; // "21:00"
  weeklyHoliday: DayOfWeek | 'none';
  timingNote?: string;
  payments: PaymentMethod[];
  homeDelivery: boolean;
  // E. Photos
  mainPhoto: string; // data URL or storefront:<theme>
  galleryPhotos: string[];
  logoUrl?: string;
  // F. Registrations
  gstin?: string;
  udyamNumber?: string; // Team only
  fssaiNumber?: string;
  // G. Team-only
  helpWanted: HelpWantedOption[];
  heardAboutUs?: DiscoveryChannel;
  ambassadorCode?: string;
  utmSource?: string;
  // H. Moderation & Metadata
  status: ListingStatus;
  rejectionReason?: RejectionReasonCode;
  rejectionNote?: string;
  badges: BadgeId[];
  lastConfirmed: string; // YYYY-MM-DD
  addedBy: 'owner' | 'ambassador' | 'team';
  moderatorNotes?: string;
  createdAt: string;
  updatedAt: string;
  editedToday?: boolean;
  duplicateFlag?: boolean;
  stats: ListingStats;
  sponsored?: SponsoredMeta;
}

export interface OwnerAccount {
  id: string;
  name: string;
  mobile: string;
  mobileVerified: boolean;
  email?: string;
  districtSlug: string;
  whatsappUpdates: boolean;
  privacyConsentVersion: string;
  privacyConsentAt: string;
  listingLimit: number;
  utmSource?: string;
  ambassadorCode?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface SearchLogEntry {
  term: string;
  resultCount: number;
  count: number;
  lastSearchedAt: string;
}

export interface ExportAuditLog {
  id: string;
  type: 'listings' | 'members';
  exportedBy: string;
  recordCount: number;
  exportedAt: string;
}

export interface DirectoryFilters {
  q: string;
  state: '' | StateCode;
  district: string;
  town: string;
  category: string;
  subCategory: string;
  openNow: boolean;
  homeDelivery: boolean;
  acceptsUpi: boolean;
  verified: boolean;
  womenLed: boolean;
  sort: 'recommended' | 'complete' | 'newest';
}
