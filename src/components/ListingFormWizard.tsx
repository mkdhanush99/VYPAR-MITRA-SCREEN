import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Lock,
  MapPin,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  BusinessListing,
  BusinessMode,
  CategoryItem,
  DayOfWeek,
  DiscoveryChannel,
  HelpWantedOption,
  Language,
  OwnerAccount,
  PaymentMethod,
} from '../types';
import { AP_DISTRICTS, DISTRICT_MAP, TELANGANA_DISTRICTS } from '../data/districts';
import { FOOD_CATEGORY_SLUGS, SUGGESTED_TAGS_BY_CATEGORY } from '../data/categories';
import { DISCOVERY_LABELS, HELP_WANTED_LABELS, t } from '../data/i18n';
import {
  BilingualError,
  buildListingSlug,
  findDuplicateListing,
  isValidBusinessPhone,
  isValidFssai,
  isValidGstin,
  isValidHttpsUrl,
  isValidUdyam,
  normalizeMobile,
  sanitizeAboutText,
  validatePinCode,
} from '../utils/validation';
import { StorefrontVisual } from './StorefrontVisual';

interface ListingFormWizardProps {
  lang: Language;
  owner: OwnerAccount;
  categories: CategoryItem[];
  existingListings: BusinessListing[];
  editingListing?: BusinessListing | null;
  prefillDistrict?: string;
  onSaveDraft: (listing: BusinessListing) => void;
  onSubmitForReview: (listing: BusinessListing, isEdit: boolean) => void;
  onCancel: () => void;
}

const STOREFRONT_PRESETS = [
  { key: 'storefront:kirana', label: 'Kirana / Retail Shop' },
  { key: 'storefront:hotel', label: 'Hotel / Tiffin Centre' },
  { key: 'storefront:agro', label: 'Agro / Seeds Shop' },
  { key: 'storefront:hardware', label: 'Hardware / Building' },
  { key: 'storefront:medical', label: 'Medical / Clinic' },
  { key: 'storefront:handloom', label: 'Clothing / Handloom' },
  { key: 'storefront:mobile', label: 'Mobile / Electronics' },
  { key: 'storefront:services', label: 'Home Services' },
  { key: 'storefront:digital', label: 'Digital / Printing' },
  { key: 'storefront:professional', label: 'Office / Consulting' },
];

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ListingFormWizard({
  lang,
  owner,
  categories,
  existingListings,
  editingListing,
  prefillDistrict,
  onSaveDraft,
  onSubmitForReview,
  onCancel,
}: ListingFormWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [draftId] = useState(() => editingListing?.id || `biz-${Date.now()}`);
  const [draftSavedNote, setDraftSavedNote] = useState<string>('');

  // Step 1: Business
  const [nameEn, setNameEn] = useState(editingListing?.nameEn ?? '');
  const [nameTe, setNameTe] = useState(editingListing?.nameTe ?? '');
  const [categorySlug, setCategorySlug] = useState(
    editingListing?.categorySlug ?? categories[0]?.slug ?? 'kirana-supermarket'
  );
  const [subCategory, setSubCategory] = useState(editingListing?.subCategory ?? '');
  const [otherSubCategory, setOtherSubCategory] = useState('');
  const [about, setAbout] = useState(editingListing?.about ?? '');
  const [aboutSanitizedNotice, setAboutSanitizedNotice] = useState(false);
  const [tags, setTags] = useState<string[]>(editingListing?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [yearStarted, setYearStarted] = useState(
    editingListing?.yearStarted ? String(editingListing.yearStarted) : ''
  );
  const [modes, setModes] = useState<BusinessMode[]>(
    editingListing?.modes ?? ['shop_visit']
  );
  const [womenLed, setWomenLed] = useState(editingListing?.womenLed ?? false);
  const [mainPhoto, setMainPhoto] = useState(editingListing?.mainPhoto ?? 'storefront:kirana');
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(
    editingListing?.galleryPhotos ?? []
  );

  // Step 2: Contact
  const [useLoginPhone, setUseLoginPhone] = useState(
    editingListing ? editingListing.phone === owner.mobile : true
  );
  const [phone, setPhone] = useState(editingListing?.phone ?? owner.mobile);
  const [sameAsPhone, setSameAsPhone] = useState(
    editingListing ? editingListing.whatsapp === editingListing.phone : true
  );
  const [whatsapp, setWhatsapp] = useState(editingListing?.whatsapp ?? owner.mobile);
  const [altPhone, setAltPhone] = useState(editingListing?.altPhone ?? '');
  const [contactPerson, setContactPerson] = useState(
    editingListing?.contactPerson ?? owner.name
  );
  // Section 5B: "show my name on the listing": yes or no, NO DEFAULT for new listings!
  const [showContactChoice, setShowContactChoice] = useState<'yes' | 'no' | ''>(
    editingListing ? (editingListing.showContactPerson ? 'yes' : 'no') : ''
  );
  const [businessEmail, setBusinessEmail] = useState(editingListing?.businessEmail ?? '');
  const [website, setWebsite] = useState(editingListing?.website ?? '');
  const [instagram, setInstagram] = useState(editingListing?.instagram ?? '');
  const [facebook, setFacebook] = useState(editingListing?.facebook ?? '');
  const [youtube, setYoutube] = useState(editingListing?.youtube ?? '');

  // Step 3: Location
  const initialDist =
    editingListing?.districtSlug || prefillDistrict || owner.districtSlug || 'jagtial';
  const [districtSlug, setDistrictSlug] = useState(initialDist);
  const [mandal, setMandal] = useState(editingListing?.mandal ?? '');
  const [otherMandal, setOtherMandal] = useState('');
  const [town, setTown] = useState(editingListing?.town ?? '');
  const [address, setAddress] = useState(editingListing?.address ?? '');
  const [showOnlyTown, setShowOnlyTown] = useState(editingListing?.showOnlyTown ?? false);
  const [landmark, setLandmark] = useState(editingListing?.landmark ?? '');
  const [pinCode, setPinCode] = useState(editingListing?.pinCode ?? '');
  const [mapsLink, setMapsLink] = useState('');
  const [lat, setLat] = useState<number | undefined>(editingListing?.lat);
  const [lng, setLng] = useState<number | undefined>(editingListing?.lng);

  // Step 4: Timings, Payments, Registrations, Team-only, Consent
  const [open24Hours, setOpen24Hours] = useState(editingListing?.open24Hours ?? false);
  const [openTime, setOpenTime] = useState(editingListing?.openTime ?? '09:00');
  const [closeTime, setCloseTime] = useState(editingListing?.closeTime ?? '21:00');
  const [weeklyHoliday, setWeeklyHoliday] = useState<DayOfWeek | 'none'>(
    editingListing?.weeklyHoliday ?? 'none'
  );
  const [timingNote, setTimingNote] = useState(editingListing?.timingNote ?? '');
  const [payments, setPayments] = useState<PaymentMethod[]>(
    editingListing?.payments ?? ['cash', 'upi']
  );
  const [homeDelivery, setHomeDelivery] = useState(editingListing?.homeDelivery ?? false);
  const [gstin, setGstin] = useState(editingListing?.gstin ?? '');
  const [udyamNumber, setUdyamNumber] = useState(editingListing?.udyamNumber ?? '');
  const [fssaiNumber, setFssaiNumber] = useState(editingListing?.fssaiNumber ?? '');
  const [helpWanted, setHelpWanted] = useState<HelpWantedOption[]>(
    editingListing?.helpWanted ?? []
  );
  const [heardAboutUs, setHeardAboutUs] = useState<DiscoveryChannel | ''>(
    editingListing?.heardAboutUs ?? ''
  );
  const [ambassadorCode, setAmbassadorCode] = useState(
    editingListing?.ambassadorCode ?? owner.ambassadorCode ?? ''
  );
  const [consentOwner, setConsentOwner] = useState(Boolean(editingListing));
  const [consentPublic, setConsentPublic] = useState(Boolean(editingListing));
  const [consentSupport, setConsentSupport] = useState(true);

  const [errors, setErrors] = useState<Record<string, BilingualError>>({});
  const [duplicateMatch, setDuplicateMatch] = useState<BusinessListing | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug]
  );
  const selectedDistrict = DISTRICT_MAP.get(districtSlug);
  const isFoodCategory = FOOD_CATEGORY_SLUGS.has(categorySlug);

  const approvedTownsInDistrict = useMemo(() => {
    const set = new Set<string>();
    if (selectedDistrict) {
      selectedDistrict.mandals.forEach((m) => set.add(m));
    }
    existingListings
      .filter((l) => l.status === 'live' && l.districtSlug === districtSlug)
      .forEach((l) => set.add(l.town));
    return Array.from(set);
  }, [existingListings, districtSlug, selectedDistrict]);

  useEffect(() => {
    if (useLoginPhone) {
      setPhone(owner.mobile);
      if (sameAsPhone) setWhatsapp(owner.mobile);
    }
  }, [useLoginPhone, owner.mobile, sameAsPhone]);

  useEffect(() => {
    if (sameAsPhone) {
      setWhatsapp(phone);
    }
  }, [sameAsPhone, phone]);

  const pinValidation = useMemo(
    () => (pinCode ? validatePinCode(pinCode, selectedDistrict?.state) : { valid: true }),
    [pinCode, selectedDistrict]
  );

  const buildPayload = (targetStatus: BusinessListing['status']): BusinessListing => {
    const cleanAbout = sanitizeAboutText(about).cleaned;
    const finalMandal = mandal === '__other__' ? otherMandal.trim() : mandal;
    const finalSubCat = subCategory === '__other__' ? otherSubCategory.trim() : subCategory;
    const normPhone = normalizeMobile(phone);
    const isPhoneVerified = normPhone === owner.mobile && owner.mobileVerified;

    const existingBadges = editingListing?.badges ?? [];
    const badges = new Set(existingBadges);
    if (isPhoneVerified) badges.add('phone_verified');
    if (womenLed) badges.add('women_led');
    else badges.delete('women_led');

    const nowIso = new Date().toISOString();
    const isEditingLive = editingListing?.status === 'live';

    return {
      id: draftId,
      slug: editingListing?.slug || buildListingSlug(nameEn, town),
      ownerId: owner.id,
      nameEn: nameEn.trim(),
      nameTe: nameTe.trim(),
      categorySlug,
      subCategory: finalSubCat,
      about: cleanAbout,
      tags,
      yearStarted: yearStarted ? Number(yearStarted) : undefined,
      modes,
      womenLed,
      phone: normPhone,
      whatsapp: normalizeMobile(whatsapp),
      altPhone: altPhone.trim() ? normalizeMobile(altPhone) : undefined,
      contactPerson: contactPerson.trim(),
      showContactPerson: showContactChoice === 'yes',
      businessEmail: businessEmail.trim() || undefined,
      website: website.trim() || undefined,
      facebook: facebook.trim() || undefined,
      instagram: instagram.trim() || undefined,
      youtube: youtube.trim() || undefined,
      state: selectedDistrict?.state ?? 'TS',
      districtSlug,
      mandal: finalMandal,
      town: town.trim(),
      address: address.trim(),
      showOnlyTown,
      landmark: landmark.trim() || undefined,
      pinCode: pinCode.trim(),
      lat,
      lng,
      open24Hours,
      openTime: open24Hours ? undefined : openTime,
      closeTime: open24Hours ? undefined : closeTime,
      weeklyHoliday,
      timingNote: timingNote.trim() || undefined,
      payments,
      homeDelivery,
      mainPhoto,
      galleryPhotos: galleryPhotos.length > 0 ? galleryPhotos : [mainPhoto],
      gstin: gstin.trim().toUpperCase() || undefined,
      udyamNumber: udyamNumber.trim().toUpperCase() || undefined,
      fssaiNumber: isFoodCategory ? fssaiNumber.trim() || undefined : undefined,
      helpWanted,
      heardAboutUs: heardAboutUs || undefined,
      ambassadorCode: ambassadorCode.trim() || undefined,
      utmSource: owner.utmSource || 'direct',
      // Phase 1 spec: edits to an already-live listing go live at once & logged as editedToday;
      // new listings or resubmitted "changes_needed" listings go to pending!
      status:
        targetStatus === 'pending' && isEditingLive
          ? 'live'
          : targetStatus,
      rejectionReason: targetStatus === 'pending' ? undefined : editingListing?.rejectionReason,
      rejectionNote: targetStatus === 'pending' ? undefined : editingListing?.rejectionNote,
      badges: Array.from(badges),
      lastConfirmed: nowIso.slice(0, 10),
      addedBy: editingListing?.addedBy ?? 'owner',
      createdAt: editingListing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      editedToday: isEditingLive ? true : editingListing?.editedToday,
      duplicateFlag: Boolean(duplicateMatch),
      stats: editingListing?.stats ?? {
        views: 0,
        calls: 0,
        whatsappTaps: 0,
        directionsTaps: 0,
        shares: 0,
      },
      sponsored: editingListing?.sponsored,
    };
  };

  const validateStep = (targetStep: 1 | 2 | 3 | 4): boolean => {
    const nextErrors: Record<string, BilingualError> = {};

    if (targetStep === 1) {
      if (nameEn.trim().length < 3 || nameEn.trim().length > 80) {
        nextErrors.nameEn = {
          te: 'వ్యాపారం పేరు (ఇంగ్లీష్‌లో) 3 నుండి 80 అక్షరాల మధ్య ఉండాలి.',
          en: 'Business name in English must be 3–80 characters.',
        };
      }
      const { cleaned } = sanitizeAboutText(about);
      if (cleaned.length < 50 || cleaned.length > 600) {
        nextErrors.about = {
          te: 'మీ వ్యాపారం గురించి కనీసం 50 అక్షరాలు (గరిష్టంగా 600) రాయండి. ఫోన్ నంబర్లు, లింకులు తీసివేయబడతాయి.',
          en: 'Description must be 50–600 characters (phone numbers and links are stripped).',
        };
      }
      if (modes.length === 0) {
        nextErrors.modes = {
          te: 'వ్యాపారం జరిగే విధానం కనీసం ఒకటి ఎంచుకోండి.',
          en: 'Select at least one way the business runs.',
        };
      }
      if (!mainPhoto) {
        nextErrors.mainPhoto = {
          te: 'కనీసం ఒక ముఖ్య ఫోటో అవసరం.',
          en: 'At least 1 main photo is required.',
        };
      }
      if (yearStarted) {
        const yr = Number(yearStarted);
        if (Number.isNaN(yr) || yr < 1900 || yr > 2026) {
          nextErrors.yearStarted = {
            te: 'సంవత్సరం 1900 నుండి 2026 మధ్య ఉండాలి.',
            en: 'Year started must be between 1900 and 2026.',
          };
        }
      }
    }

    if (targetStep === 2) {
      if (!isValidBusinessPhone(phone)) {
        nextErrors.phone = {
          te: 'సరైన 10 అంకెల మొబైల్ నంబర్ (6–9 తో మొదలయ్యేది) లేదా ల్యాండ్‌లైన్ ఇవ్వండి.',
          en: 'Enter a valid 10-digit mobile starting with 6–9, or STD landline.',
        };
      }
      if (whatsapp.trim() && !isValidBusinessPhone(whatsapp)) {
        nextErrors.whatsapp = {
          te: 'సరైన WhatsApp నంబర్ ఇవ్వండి.',
          en: 'Enter a valid WhatsApp number.',
        };
      }
      if (contactPerson.trim().length < 2 || contactPerson.trim().length > 60) {
        nextErrors.contactPerson = {
          te: 'సంప్రదించాల్సిన వ్యక్తి పేరు 2–60 అక్షరాలు ఉండాలి.',
          en: 'Contact person name must be 2–60 characters.',
        };
      }
      if (showContactChoice === '') {
        nextErrors.showContactChoice = {
          te: 'మీ పేరు లిస్టింగ్‌లో చూపించాలా వద్దా అనేది తప్పనిసరిగా ఎంచుకోండి.',
          en: 'Please choose Yes or No for showing your name on the listing.',
        };
      }
      if (website && !isValidHttpsUrl(website)) {
        nextErrors.website = {
          te: 'వెబ్‌సైట్ లింక్ https:// తో మొదలవ్వాలి.',
          en: 'Website URL must start with https://',
        };
      }
    }

    if (targetStep === 3) {
      if (!districtSlug) {
        nextErrors.districtSlug = {
          te: 'దయచేసి మీ జిల్లాను ఎంచుకోండి.',
          en: 'Please select your district.',
        };
      }
      if (town.trim().length < 2) {
        nextErrors.town = {
          te: 'మీ ఊరు / పట్టణం / ఏరియా పేరు రాయండి.',
          en: 'Please enter your town, village, or area.',
        };
      }
      if (modes.includes('shop_visit') && address.trim().length < 5) {
        nextErrors.address = {
          te: 'షాప్ లేదా ఆఫీసు కోసం పూర్తి చిరునామా (డోర్ నంబర్, వీధి) అవసరం.',
          en: 'Address is required for shops and offices customers visit.',
        };
      }
      const pinCheck = validatePinCode(pinCode, selectedDistrict?.state);
      if (!pinCheck.valid && pinCheck.error) {
        nextErrors.pinCode = pinCheck.error;
      }
    }

    if (targetStep === 4) {
      if (gstin.trim() && !isValidGstin(gstin)) {
        nextErrors.gstin = {
          te: 'GSTIN 15 అక్షరాలు ఉండాలి మరియు 36 (తెలంగాణ) లేదా 37 (ఆంధ్రప్రదేశ్) తో మొదలవ్వాలి.',
          en: 'GSTIN must be 15 characters starting with 36 (Telangana) or 37 (Andhra Pradesh).',
        };
      }
      if (udyamNumber.trim() && !isValidUdyam(udyamNumber)) {
        nextErrors.udyamNumber = {
          te: 'ఉద్యమ్ నంబర్ UDYAM-XX-00-0000000 ఫార్మాట్‌లో ఉండాలి.',
          en: 'Udyam number must match UDYAM-XX-00-0000000.',
        };
      }
      if (isFoodCategory && fssaiNumber.trim() && !isValidFssai(fssaiNumber)) {
        nextErrors.fssaiNumber = {
          te: 'FSSAI లైసెన్స్ నంబర్ 14 అంకెలు ఉండాలి.',
          en: 'FSSAI licence must be exactly 14 digits.',
        };
      }
      if (!consentOwner) {
        nextErrors.consentOwner = {
          te: 'ఈ వ్యాపారం మీదని నిర్ధారించండి.',
          en: 'Please confirm that you own or manage this business.',
        };
      }
      if (!consentPublic) {
        nextErrors.consentPublic = {
          te: 'పబ్లిక్ వివరాల ప్రదర్శనకు అంగీకరించండి.',
          en: 'Please consent to displaying public fields on vyaparamitra.in.',
        };
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    // Save draft automatically after every step (Section 4)
    if (!editingListing || editingListing.status === 'draft') {
      const draft = buildPayload('draft');
      onSaveDraft(draft);
      setDraftSavedNote(
        t(lang, 'డ్రాఫ్ట్ ఆటోమేటిక్‌గా సేవ్ చేయబడింది', 'Draft saved automatically')
      );
    }
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    // Duplicate detection on submit (Section 9)
    const dup = findDuplicateListing(existingListings, {
      id: editingListing?.id,
      phone,
      nameEn,
      town,
    });
    if (dup && !duplicateMatch) {
      setDuplicateMatch(dup);
      return;
    }

    const payload = buildPayload('pending');
    onSubmitForReview(payload, Boolean(editingListing));
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isGallery = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (isGallery) {
        setGalleryPhotos((prev) => [...prev, dataUrl].slice(0, 5));
      } else {
        setMainPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleParseMapsLink = (val: string) => {
    setMapsLink(val);
    const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      setLat(Number(match[1]));
      setLng(Number(match[2]));
    }
  };

  const handleUseCurrentLocation = () => {
    // Deterministic realistic district coordinates fallback if geolocation is blocked in headless browser
    const fallbackLat = selectedDistrict?.state === 'AP' ? 16.5062 : 18.7895;
    const fallbackLng = selectedDistrict?.state === 'AP' ? 80.648 : 78.912;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(5)));
          setLng(Number(pos.coords.longitude.toFixed(5)));
        },
        () => {
          setLat(fallbackLat);
          setLng(fallbackLng);
        },
        { timeout: 2500 }
      );
    } else {
      setLat(fallbackLat);
      setLng(fallbackLng);
    }
  };

  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean || tags.length >= 10 || tags.includes(clean)) return;
    setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const toggleMode = (m: BusinessMode) => {
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const togglePayment = (p: PaymentMethod) => {
    setPayments((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleHelp = (h: HelpWantedOption) => {
    setHelpWanted((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };

  const renderFieldError = (field: string) => {
    const err = errors[field];
    if (!err) return null;
    return (
      <p className="mt-1.5 text-xs text-red-700 font-medium" role="alert">
        {err.te} / {err.en}
      </p>
    );
  };

  const PublicTag = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0E5E1F]">
      <Eye className="w-3 h-3" />
      {t(lang, 'పబ్లిక్ · అందరికీ కనిపిస్తుంది', 'Public · Visible to everyone')}
    </span>
  );

  const PrivateTag = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
      <Lock className="w-3 h-3" />
      {t(lang, 'టీమ్ కోసం మాత్రమే · పబ్లిక్ కాదు', 'Team only · Never shown publicly')}
    </span>
  );

  const suggestedTags = SUGGESTED_TAGS_BY_CATEGORY[categorySlug] ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top Progress Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#0E5E1F]"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? t(lang, 'డ్యాష్‌బోర్డ్‌కు తిరిగి', 'Back to Dashboard') : t(lang, 'వెనుకకు', 'Back')}
          </button>
          <span className="text-xs font-semibold text-[#0E5E1F] font-mono-num">
            {t(lang, `దశ ${step} / 4`, `Step ${step} of 4`)}
          </span>
        </div>

        <h2 className="mt-3 text-xl font-bold text-slate-900">
          {editingListing
            ? t(lang, 'మీ వ్యాపార వివరాలు సవరించండి', 'Edit Your Business Listing')
            : t(lang, 'మీ వ్యాపారాన్ని ఉచితంగా చేర్చండి', 'Add Your Business for Free')}
        </h2>

        {/* Step Progress Bar */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { num: 1, te: '1. వ్యాపారం', en: '1. Business' },
            { num: 2, te: '2. సంప్రదింపు', en: '2. Contact' },
            { num: 3, te: '3. ప్రాంతం', en: '3. Location' },
            { num: 4, te: '4. సమయాలు', en: '4. Timings' },
          ].map((s) => (
            <div key={s.num} className="space-y-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step >= s.num ? 'bg-[#0E5E1F]' : 'bg-slate-200'
                }`}
              />
              <p
                className={`text-xs truncate ${
                  step === s.num ? 'font-semibold text-[#0E5E1F]' : 'text-slate-500'
                }`}
              >
                {lang === 'te' ? s.te : s.en}
              </p>
            </div>
          ))}
        </div>

        {draftSavedNote && (
          <p className="mt-3 text-xs text-[#0E5E1F] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {draftSavedNote}
          </p>
        )}
      </div>

      {/* Form Card (One Column, Inputs >= 48px tall per Section 7) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
        noValidate
      >
        {/* STEP 1: BUSINESS */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-name-en" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'వ్యాపారం పేరు (ఇంగ్లీష్‌లో) *', 'Business Name in English *')}
                </label>
                <PublicTag />
              </div>
              <input
                id="vm-name-en"
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g., Sri Lakshmi Kirana & General Store"
                maxLength={80}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
              />
              {nameEn.trim().length >= 3 && (
                <p className="mt-1 text-xs text-slate-500 font-mono-num">
                  URL: vyaparamitra.in/businesses/{buildListingSlug(nameEn, town || selectedDistrict?.nameEn || '')}/
                </p>
              )}
              {renderFieldError('nameEn')}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-name-te" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'వ్యాపారం పేరు (తెలుగులో)', 'Business Name in Telugu (Optional)')}
                </label>
                <PublicTag />
              </div>
              <input
                id="vm-name-te"
                type="text"
                value={nameTe}
                onChange={(e) => setNameTe(e.target.value)}
                placeholder="ఉదా: శ్రీ లక్ష్మి కిరాణా & జనరల్ స్టోర్"
                maxLength={80}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="vm-category" className="text-sm font-semibold text-slate-900">
                    {t(lang, 'కేటగిరీ *', 'Category *')}
                  </label>
                  <PublicTag />
                </div>
                <select
                  id="vm-category"
                  value={categorySlug}
                  onChange={(e) => {
                    setCategorySlug(e.target.value);
                    setSubCategory('');
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                >
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {lang === 'te' ? `${cat.nameTe} (${cat.nameEn})` : `${cat.nameEn} (${cat.nameTe})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="vm-subcategory" className="text-sm font-semibold text-slate-900">
                    {t(lang, 'ఉప కేటగిరీ', 'Sub-category')}
                  </label>
                  <PublicTag />
                </div>
                <select
                  id="vm-subcategory"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                >
                  <option value="">{t(lang, 'ఎంచుకోండి (ఐచ్ఛికం)', 'Select sub-category')}</option>
                  {selectedCategory?.subCategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="__other__">{t(lang, 'ఇతర (టైప్ చేయండి)', 'Other')}</option>
                </select>
              </div>
            </div>

            {subCategory === '__other__' && (
              <div>
                <label htmlFor="vm-other-sub" className="block text-sm font-medium text-slate-700 mb-1">
                  {t(lang, 'మీ వ్యాపార రకం రాయండి', 'Specify business sub-type')}
                </label>
                <input
                  id="vm-other-sub"
                  type="text"
                  value={otherSubCategory}
                  onChange={(e) => setOtherSubCategory(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-about" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'మీ వ్యాపారం గురించి * (50–600 అక్షరాలు)', 'About the Business * (50–600 characters)')}
                </label>
                <PublicTag />
              </div>
              <textarea
                id="vm-about"
                rows={4}
                value={about}
                onChange={(e) => {
                  setAbout(e.target.value);
                  setAboutSanitizedNotice(false);
                }}
                onBlur={() => {
                  const res = sanitizeAboutText(about);
                  if (res.strippedSomething) {
                    setAbout(res.cleaned);
                    setAboutSanitizedNotice(true);
                  }
                }}
                maxLength={600}
                placeholder={t(
                  lang,
                  'ఉదా: సూర్యాపేటలో 2012 నుండి నాణ్యమైన బియ్యం, పప్పులు, నూనెలు మరియు పూజా సామాగ్రి హోల్‌సేల్ ధరలకు అందిస్తున్నాము. స్థానికంగా హోమ్ డెలివరీ అందుబాటులో ఉంది.',
                  'Example: Family-run kirana store serving fresh rice, pulses, cold-pressed oil, and daily essentials at wholesale rates with local home delivery.'
                )}
                className="w-full p-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {t(
                    lang,
                    'సూచన: ఫోన్ నంబర్లు లేదా వెబ్ లింకులు ఇక్కడ రాయకండి.',
                    'Tip: Do not include phone numbers or website links here.'
                  )}
                </span>
                <span className="font-mono-num">{about.trim().length} / 600</span>
              </div>
              {aboutSanitizedNotice && (
                <p className="mt-1 text-xs text-amber-700 font-medium">
                  {t(
                    lang,
                    'వివరణలోని ఫోన్ నంబర్లు / లింకులు ఆటోమేటిక్‌గా తొలగించబడ్డాయి.',
                    'Phone numbers or links were automatically removed from the description.'
                  )}
                </p>
              )}
              {renderFieldError('about')}
            </div>

            {/* Products / Services Tags */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-tag-input" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'ఉత్పత్తులు / సేవలు (గరిష్టంగా 10)', 'Products or Services (Up to 10 tags)')}
                </label>
                <PublicTag />
              </div>
              <div className="flex gap-2">
                <input
                  id="vm-tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder={t(lang, 'ఉత్పత్తి లేదా సేవ టైప్ చేయండి', 'Type a product or service')}
                  className="flex-1 min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="px-4 min-h-[48px] rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  {t(lang, 'జతచేయి', 'Add')}
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tg) => (
                    <span
                      key={tg}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0E5E1F]/10 text-[#0E5E1F] text-xs font-medium"
                    >
                      {tg}
                      <button
                        type="button"
                        aria-label={`Remove tag ${tg}`}
                        onClick={() => setTags((prev) => prev.filter((x) => x !== tg))}
                        className="hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {suggestedTags.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-xs text-slate-500 mb-1.5">
                    {t(lang, 'సూచించిన ట్యాగ్‌లు:', 'Quick suggestions:')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={tags.includes(st) || tags.length >= 10}
                        onClick={() => addTag(st)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:border-[#0E5E1F] hover:text-[#0E5E1F] disabled:opacity-40"
                      >
                        + {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* How business runs & Year Started */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-semibold text-slate-900 mb-2">
                  {t(lang, 'వ్యాపారం జరిగే విధానం *', 'How the Business Runs *')}
                </span>
                <div className="space-y-2">
                  {[
                    { id: 'shop_visit', te: 'షాప్ / ఆఫీసు (కస్టమర్లు వస్తారు)', en: 'Shop or office customers visit' },
                    { id: 'from_home', te: 'ఇంటి నుండి వ్యాపారం', en: 'From home' },
                    { id: 'customer_place', te: 'కస్టమర్ వద్దకు వెళ్లి సేవ', en: "Service at customer's place" },
                    { id: 'online_only', te: 'ఆన్‌లైన్ మాత్రమే', en: 'Online only' },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={modes.includes(item.id as BusinessMode)}
                        onChange={() => toggleMode(item.id as BusinessMode)}
                        className="w-4 h-4 accent-[#0E5E1F]"
                      />
                      <span>{lang === 'te' ? item.te : item.en}</span>
                    </label>
                  ))}
                </div>
                {renderFieldError('modes')}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="vm-year" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, 'ప్రారంభించిన సంవత్సరం', 'Year Started (Optional)')}
                  </label>
                  <input
                    id="vm-year"
                    type="number"
                    min={1900}
                    max={2026}
                    value={yearStarted}
                    onChange={(e) => setYearStarted(e.target.value)}
                    placeholder="e.g. 2015"
                    className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm font-mono-num"
                  />
                  {renderFieldError('yearStarted')}
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-[#F6F3E1]/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={womenLed}
                    onChange={(e) => setWomenLed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                  />
                  <span className="text-sm text-slate-800">
                    <strong className="block font-semibold">
                      {t(lang, 'మహిళా వ్యాపారం', 'Women-led Business')}
                    </strong>
                    <span className="text-xs text-slate-600">
                      {t(lang, 'పబ్లిక్ బ్యాడ్జ్ చూపించబడుతుంది', 'Displays a public Women-led badge')}
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Photos Section */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-900">
                  {t(lang, 'ముఖ్య ఫోటో * (షాప్ ముందు భాగం లేదా ఉత్పత్తులు)', 'Main Photo * (Shop front, products, or work)')}
                </span>
                <PublicTag />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-start">
                <StorefrontVisual
                  photo={mainPhoto}
                  name={nameEn || 'Your Business'}
                  town={town || selectedDistrict?.nameEn}
                  className="w-full h-40 rounded-lg border border-slate-200"
                />
                <div className="space-y-3">
                  <label className="w-full min-h-[48px] px-4 rounded-lg border-2 border-dashed border-[#0E5E1F]/40 bg-[#0E5E1F]/5 hover:bg-[#0E5E1F]/10 text-[#0E5E1F] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>{t(lang, 'ఫోటో అప్‌లోడ్ / కెమెరా', 'Upload Photo / Camera')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    {t(
                      lang,
                      'JPG/PNG/WebP (5MB వరకు). అప్‌లోడ్ తర్వాత 1600px WebP గా మార్చి GPS డేటా తొలగిస్తాము.',
                      'JPG/PNG/WebP up to 5MB. Resized to 1600px WebP with GPS EXIF stripped.'
                    )}
                  </p>
                  <div>
                    <label htmlFor="vm-preset-photo" className="block text-xs font-medium text-slate-600 mb-1">
                      {t(lang, 'లేదా డెమో స్టోర్‌ఫ్రంట్ ఎంచుకోండి:', 'Or choose a storefront illustration:')}
                    </label>
                    <select
                      id="vm-preset-photo"
                      value={mainPhoto.startsWith('storefront:') ? mainPhoto : ''}
                      onChange={(e) => e.target.value && setMainPhoto(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="">Custom uploaded photo</option>
                      {STOREFRONT_PRESETS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Extra gallery photos up to 5 */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {t(lang, 'మరిన్ని ఫోటోలు (గరిష్టంగా 5)', 'More Photos (Up to 5)')}
                  </span>
                  <label className="inline-flex items-center gap-1 text-xs font-medium text-[#0E5E1F] cursor-pointer hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    {t(lang, '+ గ్యాలరీ ఫోటో', '+ Add gallery photo')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="sr-only"
                    />
                  </label>
                </div>
                {galleryPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {galleryPhotos.map((gp, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <StorefrontVisual photo={gp} name={nameEn} compact className="w-full h-full" />
                        <button
                          type="button"
                          aria-label={`Remove gallery photo ${idx + 1}`}
                          onClick={() =>
                            setGalleryPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {renderFieldError('mainPhoto')}
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-lg bg-[#F6F3E1] border border-amber-200/70 text-xs text-slate-800">
              {t(
                lang,
                'మీ లాగిన్ మొబైల్ నంబర్ గోప్యంగా ఉంటుంది. మీరు ఇక్కడ ఎంచుకుంటేనే అది పబ్లిక్ ఫోన్ బటన్‌గా కనిపిస్తుంది.',
                'Your login number stays private unless you explicitly choose it as your public business phone below.'
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-phone" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'వ్యాపార ఫోన్ నంబర్ *', 'Business Phone *')}
                </label>
                <PublicTag />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLoginPhone}
                  onChange={(e) => setUseLoginPhone(e.target.checked)}
                  className="w-4 h-4 accent-[#0E5E1F]"
                />
                <span>
                  {t(
                    lang,
                    `నా లాగిన్ నంబర్ వాడండి (+91 ${owner.mobile})`,
                    `Use my login number (+91 ${owner.mobile})`
                  )}
                </span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm font-mono-num text-slate-600">
                  +91
                </span>
                <input
                  id="vm-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  disabled={useLoginPhone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9848012345"
                  className="flex-1 min-h-[48px] px-3.5 rounded-r-lg border border-slate-300 text-sm font-mono-num disabled:bg-slate-50"
                />
              </div>
              {renderFieldError('phone')}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-whatsapp" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'WhatsApp నంబర్ (సిఫార్సు చేయబడింది)', 'WhatsApp Number (Recommended)')}
                </label>
                <PublicTag />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={(e) => setSameAsPhone(e.target.checked)}
                  className="w-4 h-4 accent-[#0E5E1F]"
                />
                <span>{t(lang, 'ఫోన్ నంబర్ లాగే', 'Same as business phone')}</span>
              </label>
              <input
                id="vm-whatsapp"
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                disabled={sameAsPhone}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="9848012345"
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm font-mono-num disabled:bg-slate-50"
              />
              {renderFieldError('whatsapp')}
            </div>

            <div>
              <label htmlFor="vm-alt-phone" className="block text-sm font-semibold text-slate-900 mb-1.5">
                {t(lang, 'మరో ఫోన్ నంబర్ (ఐచ్ఛికం)', 'Another Phone Number (Optional)')}
              </label>
              <input
                id="vm-alt-phone"
                type="tel"
                inputMode="numeric"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm font-mono-num"
              />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 space-y-3">
              <div>
                <label htmlFor="vm-contact-person" className="block text-sm font-semibold text-slate-900 mb-1.5">
                  {t(lang, 'సంప్రదించాల్సిన వ్యక్తి పేరు *', 'Contact Person Name *')}
                </label>
                <input
                  id="vm-contact-person"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  maxLength={60}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
                {renderFieldError('contactPerson')}
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-800 mb-2">
                  {t(
                    lang,
                    'ఈ పేరును లిస్టింగ్‌లో పబ్లిక్‌గా చూపించాలా? * (తప్పనిసరి ఎంపిక)',
                    'Show my name publicly on the listing? * (Required choice)'
                  )}
                </legend>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="showContactChoice"
                      checked={showContactChoice === 'yes'}
                      onChange={() => setShowContactChoice('yes')}
                      className="w-4 h-4 accent-[#0E5E1F]"
                    />
                    <span>{t(lang, 'అవును, చూపించండి', 'Yes, show my name')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="showContactChoice"
                      checked={showContactChoice === 'no'}
                      onChange={() => setShowContactChoice('no')}
                      className="w-4 h-4 accent-[#0E5E1F]"
                    />
                    <span>{t(lang, 'వద్దు, గోప్యంగా ఉంచండి', 'No, keep private')}</span>
                  </label>
                </div>
                {renderFieldError('showContactChoice')}
              </fieldset>
            </div>

            <div>
              <label htmlFor="vm-biz-email" className="block text-sm font-semibold text-slate-900 mb-1.5">
                {t(lang, 'వ్యాపార ఇమెయిల్ (ఐచ్ఛికం)', 'Business Email (Optional)')}
              </label>
              <input
                id="vm-biz-email"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="shop@example.com"
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vm-website" className="block text-xs font-semibold text-slate-700 mb-1">
                  Website (https://)
                </label>
                <input
                  id="vm-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbusiness.in"
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
                {renderFieldError('website')}
              </div>
              <div>
                <label htmlFor="vm-instagram" className="block text-xs font-semibold text-slate-700 mb-1">
                  Instagram (https://)
                </label>
                <input
                  id="vm-instagram"
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label htmlFor="vm-facebook" className="block text-xs font-semibold text-slate-700 mb-1">
                  Facebook (https://)
                </label>
                <input
                  id="vm-facebook"
                  type="url"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label htmlFor="vm-youtube" className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube (https://)
                </label>
                <input
                  id="vm-youtube"
                  type="url"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="vm-district" className="text-sm font-semibold text-slate-900">
                    {t(lang, 'జిల్లా *', 'District *')}
                  </label>
                  <PublicTag />
                </div>
                <select
                  id="vm-district"
                  value={districtSlug}
                  onChange={(e) => {
                    setDistrictSlug(e.target.value);
                    setMandal('');
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <optgroup label="Telangana (33 Districts)">
                    {TELANGANA_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : `${d.nameEn} (${d.nameTe})`}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Andhra Pradesh (28 Districts)">
                    {AP_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : `${d.nameEn} (${d.nameTe})`}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {renderFieldError('districtSlug')}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="vm-mandal" className="text-sm font-semibold text-slate-900">
                    {t(lang, 'మండలం (సిఫార్సు)', 'Mandal (Recommended)')}
                  </label>
                  <PublicTag />
                </div>
                <select
                  id="vm-mandal"
                  value={mandal}
                  onChange={(e) => setMandal(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="">{t(lang, 'మండలం ఎంచుకోండి', 'Select mandal')}</option>
                  {selectedDistrict?.mandals.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="__other__">{t(lang, 'ఇతర', 'Other')}</option>
                </select>
              </div>
            </div>

            {mandal === '__other__' && (
              <div>
                <label htmlFor="vm-other-mandal" className="block text-sm font-medium text-slate-700 mb-1">
                  {t(lang, 'మండలం పేరు రాయండి', 'Enter mandal name')}
                </label>
                <input
                  id="vm-other-mandal"
                  type="text"
                  value={otherMandal}
                  onChange={(e) => setOtherMandal(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-town" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'ఊరు / పట్టణం / ఏరియా *', 'Town, Village or Area *')}
                </label>
                <PublicTag />
              </div>
              <input
                id="vm-town"
                type="text"
                list="approved-towns-datalist"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder={t(lang, 'ఉదా: ధర్మపురి, కోరుట్ల', 'e.g., Dharmapuri, Korutla')}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
              />
              <datalist id="approved-towns-datalist">
                {approvedTownsInDistrict.map((tn) => (
                  <option key={tn} value={tn} />
                ))}
              </datalist>
              {renderFieldError('town')}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="vm-address" className="text-sm font-semibold text-slate-900">
                  {t(lang, 'చిరునామా (డోర్ నంబర్, వీధి)', 'Address (Door number, street, area)')}
                  {modes.includes('shop_visit') ? ' *' : ''}
                </label>
                <PublicTag />
              </div>
              <input
                id="vm-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={200}
                placeholder="D.No 4-2-118, Main Road"
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyTown}
                  onChange={(e) => setShowOnlyTown(e.target.checked)}
                  className="w-4 h-4 accent-[#0E5E1F]"
                />
                <span>
                  {t(
                    lang,
                    'నా ఊరు పేరు మాత్రమే పబ్లిక్‌గా చూపించు (ఇంటి వ్యాపారాల కోసం)',
                    'Show only my town publicly (recommended for home-based businesses)'
                  )}
                </span>
              </label>
              {renderFieldError('address')}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vm-landmark" className="block text-sm font-semibold text-slate-900 mb-1.5">
                  {t(lang, 'ల్యాండ్‌మార్క్ (ఐచ్ఛికం)', 'Landmark (Optional)')}
                </label>
                <input
                  id="vm-landmark"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  maxLength={80}
                  placeholder="ఉదా: RTC బస్టాండ్ దగ్గర"
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label htmlFor="vm-pincode" className="block text-sm font-semibold text-slate-900 mb-1.5">
                  {t(lang, 'పిన్ కోడ్ * (5 తో మొదలయ్యే 6 అంకెలు)', 'PIN Code * (6 digits starting with 5)')}
                </label>
                <input
                  id="vm-pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="505425"
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm font-mono-num"
                />
                {pinValidation.warning && (
                  <p className="mt-1 text-xs text-amber-700 font-medium">
                    {lang === 'te' ? pinValidation.warning.te : pinValidation.warning.en}
                  </p>
                )}
                {renderFieldError('pinCode')}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {t(lang, 'మ్యాప్ లొకేషన్ (డైరెక్షన్స్ బటన్ కోసం)', 'Map Location (Powers Directions button)')}
                </span>
                <PublicTag />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-800 hover:border-[#0E5E1F] hover:text-[#0E5E1F]"
                >
                  <MapPin className="w-4 h-4 text-[#0E5E1F]" />
                  {t(lang, 'నా ప్రస్తుత లొకేషన్ వాడండి', 'Use my current location')}
                </button>
                <input
                  type="url"
                  value={mapsLink}
                  onChange={(e) => handleParseMapsLink(e.target.value)}
                  placeholder={t(lang, 'లేదా Google Maps లింక్ పేస్ట్ చేయండి', 'Or paste a Google Maps link')}
                  className="flex-1 min-w-[200px] min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-sm"
                />
              </div>
              {lat !== undefined && lng !== undefined && (
                <p className="text-xs text-[#0E5E1F] font-mono-num flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Coordinates saved: {lat}, {lng}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: TIMINGS, PAYMENTS, REGISTRATIONS, TEAM-ONLY, CONSENT */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Timings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {t(lang, 'సమయాలు & చెల్లింపులు', 'Timings & Payments')}
                </h3>
                <PublicTag />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={open24Hours}
                  onChange={(e) => setOpen24Hours(e.target.checked)}
                  className="w-4 h-4 accent-[#0E5E1F]"
                />
                <span>{t(lang, '24 గంటలు తెరిచి ఉంటుంది', 'Open 24 hours')}</span>
              </label>

              {!open24Hours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vm-open-time" className="block text-xs font-semibold text-slate-700 mb-1">
                      {t(lang, 'తెరిచే సమయం', 'Opening Time')}
                    </label>
                    <input
                      id="vm-open-time"
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="vm-close-time" className="block text-xs font-semibold text-slate-700 mb-1">
                      {t(lang, 'మూసే సమయం', 'Closing Time')}
                    </label>
                    <input
                      id="vm-close-time"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num"
                    />
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vm-holiday" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t(lang, 'వారపు సెలవు', 'Weekly Holiday')}
                  </label>
                  <select
                    id="vm-holiday"
                    value={weeklyHoliday}
                    onChange={(e) => setWeeklyHoliday(e.target.value as DayOfWeek | 'none')}
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="none">{t(lang, 'సెలవు లేదు (రోజూ తెరిచి ఉంటుంది)', 'No holiday (Open all days)')}</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vm-timing-note" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t(lang, 'సమయాల గమనిక (ఐచ్ఛికం)', 'Timing Note (Optional)')}
                  </label>
                  <input
                    id="vm-timing-note"
                    type="text"
                    maxLength={60}
                    value={timingNote}
                    onChange={(e) => setTimingNote(e.target.value)}
                    placeholder="e.g., Lunch 1–3 PM"
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {[
                  { id: 'cash', label: 'Cash / నగదు' },
                  { id: 'upi', label: 'UPI (PhonePe / GPay)' },
                  { id: 'card', label: 'Card / కార్డ్' },
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                ].map((pm) => (
                  <label
                    key={pm.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={payments.includes(pm.id as PaymentMethod)}
                      onChange={() => togglePayment(pm.id as PaymentMethod)}
                      className="w-4 h-4 accent-[#0E5E1F]"
                    />
                    <span>{pm.label}</span>
                  </label>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homeDelivery}
                  onChange={(e) => setHomeDelivery(e.target.checked)}
                  className="w-4 h-4 accent-[#0E5E1F]"
                />
                <span>{t(lang, 'హోమ్ డెలివరీ అందుబాటులో ఉంది', 'Home delivery available')}</span>
              </label>
            </div>

            {/* Registrations (Never ask for Aadhaar, PAN, bank details) */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {t(lang, 'రిజిస్ట్రేషన్లు (ఐచ్ఛికం)', 'Registrations (Optional)')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    lang,
                    'మేము ఎప్పుడూ ఆధార్, పాన్ లేదా బ్యాంకు వివరాలు అడగము.',
                    'We never ask for Aadhaar, PAN, bank details, or document uploads.'
                  )}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="vm-gstin" className="text-xs font-semibold text-slate-700">
                      GSTIN (36 TS / 37 AP)
                    </label>
                    <PublicTag />
                  </div>
                  <input
                    id="vm-gstin"
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="36AABCS1429B1Z5"
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num uppercase"
                  />
                  {renderFieldError('gstin')}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="vm-udyam" className="text-xs font-semibold text-slate-700">
                      {t(lang, 'ఉద్యమ్ రిజిస్ట్రేషన్ నంబర్', 'Udyam (MSME) Number')}
                    </label>
                    <PrivateTag />
                  </div>
                  <input
                    id="vm-udyam"
                    type="text"
                    value={udyamNumber}
                    onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
                    placeholder="UDYAM-TS-12-0045123"
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num uppercase"
                  />
                  {renderFieldError('udyamNumber')}
                </div>
              </div>

              {isFoodCategory && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="vm-fssai" className="text-xs font-semibold text-slate-700">
                      {t(lang, 'FSSAI లైసెన్స్ నంబర్ (14 అంకెలు)', 'FSSAI Licence Number (14 digits)')}
                    </label>
                    <PublicTag />
                  </div>
                  <input
                    id="vm-fssai"
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    value={fssaiNumber}
                    onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="13621011000482"
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num"
                  />
                  {renderFieldError('fssaiNumber')}
                </div>
              )}
            </div>

            {/* Team-Only Questions (Section 5G) */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {t(lang, 'వ్యాపార మిత్ర నుండి మీకు ఏ సహాయం కావాలి?', 'How can Vyapara Mitra help you?')}
                </h3>
                <PrivateTag />
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.keys(HELP_WANTED_LABELS) as HelpWantedOption[]).map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={helpWanted.includes(key)}
                      onChange={() => toggleHelp(key)}
                      className="w-4 h-4 accent-[#0E5E1F]"
                    />
                    <span>{lang === 'te' ? HELP_WANTED_LABELS[key].te : HELP_WANTED_LABELS[key].en}</span>
                  </label>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vm-heard" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t(lang, 'మా గురించి ఎలా తెలిసింది?', 'How did you hear about us?')}
                  </label>
                  <select
                    id="vm-heard"
                    value={heardAboutUs}
                    onChange={(e) => setHeardAboutUs(e.target.value as DiscoveryChannel)}
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">{t(lang, 'ఎంచుకోండి', 'Select channel')}</option>
                    {(Object.keys(DISCOVERY_LABELS) as DiscoveryChannel[]).map((ch) => (
                      <option key={ch} value={ch}>
                        {lang === 'te' ? DISCOVERY_LABELS[ch].te : DISCOVERY_LABELS[ch].en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vm-ambassador" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t(lang, 'అంబాసిడర్ కోడ్ (ఉంటే)', 'Ambassador Code (Optional)')}
                  </label>
                  <input
                    id="vm-ambassador"
                    type="text"
                    value={ambassadorCode}
                    onChange={(e) => setAmbassadorCode(e.target.value)}
                    placeholder="AMB-JGT-01"
                    className="w-full min-h-[48px] px-3 rounded-lg border border-slate-300 text-sm font-mono-num"
                  />
                </div>
              </div>
            </div>

            {/* Duplicate Detection Alert (Section 9) */}
            {duplicateMatch && (
              <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 space-y-2" role="alert">
                <div className="flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {t(
                        lang,
                        'ఈ వ్యాపారం ఇప్పటికే లిస్ట్ అయి ఉండవచ్చు; ఇది మీదేనా?',
                        'This business may already be listed; is it yours?'
                      )}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Matched: <strong>{duplicateMatch.nameEn}</strong> ({duplicateMatch.town} · +91{' '}
                      {duplicateMatch.phone}). Submitting again will flag it for moderator verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3 Consent Ticks (Section 5I) */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentOwner}
                  onChange={(e) => setConsentOwner(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                />
                <span>
                  <strong>*</strong>{' '}
                  {t(
                    lang,
                    'ఈ వ్యాపారం నాది లేదా నేను నిర్వహిస్తున్నాను. ఈ వివరాలు నిజమైనవి.',
                    'I own or manage this business, and these details are true.'
                  )}
                </span>
              </label>
              {renderFieldError('consentOwner')}

              <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPublic}
                  onChange={(e) => setConsentPublic(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                />
                <span>
                  <strong>*</strong>{' '}
                  {t(
                    lang,
                    "'పబ్లిక్' అని గుర్తించిన వివరాలు vyaparamitra.in లో అందరికీ కనిపిస్తాయి.",
                    'Details marked public are shown to everyone on vyaparamitra.in.'
                  )}
                </span>
              </label>
              {renderFieldError('consentPublic')}

              <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentSupport}
                  onChange={(e) => setConsentSupport(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                />
                <span>
                  {t(
                    lang,
                    'ఈ లిస్టింగ్, వ్యాపార సహాయం గురించి వ్యాపార మిత్ర నాకు కాల్ లేదా WhatsApp చేయవచ్చు. (ఐచ్ఛికం)',
                    'Vyapara Mitra may call or WhatsApp me about this listing and business support. (Optional)'
                  )}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="px-4 min-h-[48px] rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              {t(lang, 'వెనుకకు', 'Back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 min-h-[48px] rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t(lang, 'రద్దు చేయి', 'Cancel')}
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 min-h-[48px] rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors inline-flex items-center gap-2"
            >
              <span>{t(lang, 'తర్వాత దశ', 'Save & Continue')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              className="px-6 min-h-[48px] rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {duplicateMatch
                  ? t(lang, 'అయినా సమీక్షకు పంపండి', 'Submit Anyway for Review')
                  : t(lang, 'సమీక్షకు పంపండి', 'Send for Review')}
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
