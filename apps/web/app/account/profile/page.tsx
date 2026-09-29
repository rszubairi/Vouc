"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const ALL_LANGUAGES = "All";
const ALL_MARKETS = "All";

export default function ProfilePage() {
  const me = useQuery(api.profiles.me);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const requestDeleteAccount = useMutation(api.profiles.requestDeleteAccount);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const setProfileImage = useMutation(api.profiles.setProfileImage);
  const updateMyLanguages = useMutation(api.profiles.updateMyLanguages);
  const updateMyMarkets = useMutation(api.profiles.updateMyMarkets);
  const updateMyReferrer = useMutation(api.profiles.updateMyReferrer);
  const languageOptions = useQuery(api.languages.list, {}) ?? [];
  const marketOptions = useQuery(api.markets.list, {}) ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    nickName: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    city: "",
    country: "",
    bio: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: "",
    line: "",
    tiktok: "",
    weChat: "",
    youtube: "",
  });

  const [referrer, setReferrer] = useState("");
  const [savingReferrer, setSavingReferrer] = useState(false);

  const [languages, setLanguages] = useState<string[]>([]);
  const [savingLanguages, setSavingLanguages] = useState(false);

  const [markets, setMarkets] = useState<string[]>([]);
  const [savingMarkets, setSavingMarkets] = useState(false);

  useEffect(() => {
    if (me) {
      setForm({
        nickName: me.nickName ?? "",
        firstName: me.firstName ?? "",
        lastName: me.lastName ?? "",
        phoneNumber: me.phoneNumber ?? "",
        city: me.city ?? "",
        country: me.country ?? "",
        bio: me.bio ?? "",
        website: me.website ?? "",
        instagram: me.instagram ?? "",
        facebook: me.facebook ?? "",
        twitter: me.twitter ?? "",
        line: me.line ?? "",
        tiktok: me.tiktok ?? "",
        weChat: me.weChat ?? "",
        youtube: me.youtube ?? "",
      });
      setReferrer(me.sponsorName ?? "");
      setLanguages(me.languages && me.languages.length > 0 ? me.languages : [ALL_LANGUAGES]);
      setMarkets(me.markets && me.markets.length > 0 ? me.markets : [ALL_MARKETS]);
    }
  }, [me?._id]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleLanguage(language: string) {
    setLanguages((prev) => {
      if (language === ALL_LANGUAGES) return [ALL_LANGUAGES];
      const withoutAll = prev.filter((l) => l !== ALL_LANGUAGES);
      const next = withoutAll.includes(language)
        ? withoutAll.filter((l) => l !== language)
        : [...withoutAll, language];
      return next.length === 0 ? [ALL_LANGUAGES] : next;
    });
  }

  function toggleMarket(market: string) {
    setMarkets((prev) => {
      if (market === ALL_MARKETS) return [ALL_MARKETS];
      const withoutAll = prev.filter((m) => m !== ALL_MARKETS);
      const next = withoutAll.includes(market)
        ? withoutAll.filter((m) => m !== market)
        : [...withoutAll, market];
      return next.length === 0 ? [ALL_MARKETS] : next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSavedMessage(null);
    try {
      await updateProfile(form);
      setSavedMessage("Profile updated.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReferrer() {
    if (!referrer.trim()) return;
    setSavingReferrer(true);
    try {
      await updateMyReferrer({ referrer: referrer.trim() });
    } finally {
      setSavingReferrer(false);
    }
  }

  async function handleSaveLanguages() {
    setSavingLanguages(true);
    try {
      const toSave = languages.includes(ALL_LANGUAGES) ? [] : languages;
      await updateMyLanguages({ languages: toSave });
    } finally {
      setSavingLanguages(false);
    }
  }

  async function handleSaveMarkets() {
    setSavingMarkets(true);
    try {
      const toSave = markets.includes(ALL_MARKETS) ? [] : markets;
      await updateMyMarkets({ markets: toSave });
    } finally {
      setSavingMarkets(false);
    }
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await setProfileImage({ storageId });
    } finally {
      setUploadingImage(false);
    }
  }

  function handleDeleteAccount() {
    if (!window.confirm("This will submit a request to delete your account. Continue?")) return;
    void requestDeleteAccount({});
  }

  if (me === undefined) {
    return <div className="text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-black mb-6">Your Profile</h1>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="relative w-20 h-20 rounded-full bg-black/10 border border-black/20 overflow-hidden flex items-center justify-center text-black font-semibold text-2xl disabled:opacity-60"
        >
          {me?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.profileImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            me?.nickName?.[0]?.toUpperCase() ?? "?"
          )}
        </button>
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="text-sm font-semibold text-[#F2650C] hover:underline disabled:opacity-60"
          >
            {uploadingImage ? "Uploading..." : "Change photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickImage}
          />
        </div>
      </div>

      <div className="bg-[#F5EFE0] border border-black/10 rounded-xl p-6 space-y-4">
        <Field label="Display Name">
          <input className={inputClass} value={form.nickName} onChange={(e) => set("nickName", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <input className={inputClass} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Last Name">
            <input className={inputClass} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
        </div>
        <Field label="Phone Number">
          <input className={inputClass} value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Country">
            <input className={inputClass} value={form.country} onChange={(e) => set("country", e.target.value)} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea
            className={`${inputClass} min-h-[90px]`}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Website">
            <input className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="Instagram">
            <input className={inputClass} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="Facebook">
            <input className={inputClass} value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
          </Field>
          <Field label="X">
            <input className={inputClass} value={form.twitter} onChange={(e) => set("twitter", e.target.value)} />
          </Field>
          <Field label="Line">
            <input className={inputClass} value={form.line} onChange={(e) => set("line", e.target.value)} />
          </Field>
          <Field label="TikTok">
            <input className={inputClass} value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
          </Field>
          <Field label="YouTube">
            <input className={inputClass} value={form.youtube} onChange={(e) => set("youtube", e.target.value)} />
          </Field>
          <Field label="WeChat">
            <input className={inputClass} value={form.weChat} onChange={(e) => set("weChat", e.target.value)} />
          </Field>
        </div>

        {savedMessage && <p className="text-sm text-green-700">{savedMessage}</p>}

        <button onClick={handleSave} disabled={saving} className={buttonClass}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-[#F5EFE0] border border-black/10 rounded-xl p-6 mt-6">
        <h2 className="text-sm font-bold text-black mb-3">Referred By</h2>
        <div className="flex gap-3">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Email or username"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
          />
          <button onClick={handleSaveReferrer} disabled={savingReferrer} className={secondaryButtonClass}>
            {savingReferrer ? "Saving..." : "Update"}
          </button>
        </div>
      </div>

      <div className="bg-[#F5EFE0] border border-black/10 rounded-xl p-6 mt-6">
        <h2 className="text-sm font-bold text-black mb-3">Language(s) to follow</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Chip active={languages.includes(ALL_LANGUAGES)} onClick={() => toggleLanguage(ALL_LANGUAGES)}>
            All
          </Chip>
          {languageOptions.map((l) => (
            <Chip key={l._id} active={languages.includes(l.name)} onClick={() => toggleLanguage(l.name)}>
              {l.name}
            </Chip>
          ))}
        </div>
        <button onClick={handleSaveLanguages} disabled={savingLanguages} className={secondaryButtonClass}>
          {savingLanguages ? "Saving..." : "Save Languages"}
        </button>
      </div>

      <div className="bg-[#F5EFE0] border border-black/10 rounded-xl p-6 mt-6">
        <h2 className="text-sm font-bold text-black mb-3">Market(s) to follow</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Chip active={markets.includes(ALL_MARKETS)} onClick={() => toggleMarket(ALL_MARKETS)}>
            All
          </Chip>
          {marketOptions.map((m) => (
            <Chip key={m._id} active={markets.includes(m.name)} onClick={() => toggleMarket(m.name)}>
              {m.name}
            </Chip>
          ))}
        </div>
        <button onClick={handleSaveMarkets} disabled={savingMarkets} className={secondaryButtonClass}>
          {savingMarkets ? "Saving..." : "Save Markets"}
        </button>
      </div>

      <button onClick={handleDeleteAccount} className="mt-8 text-sm text-red-600 hover:underline">
        Request Account Deletion
      </button>
    </div>
  );
}

const inputClass =
  "w-full bg-white border border-black/15 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black/40";

const buttonClass =
  "bg-black text-white font-semibold rounded-lg py-2.5 px-6 hover:bg-neutral-800 transition-colors disabled:opacity-50";

const secondaryButtonClass =
  "bg-white border border-black text-black font-semibold rounded-lg py-2 px-4 hover:bg-black/5 transition-colors disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
        active ? "bg-black text-white border-black" : "bg-white text-black border-black/15 hover:border-black/40"
      }`}
    >
      {children}
    </button>
  );
}
