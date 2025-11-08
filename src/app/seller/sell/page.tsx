// app/sell/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadCompressedToSupabase } from "@/lib/compressAndUpload";
import CategorySheetPicker from "@/components/listing/CategorySheetPicker";

import {
  ChevronLeft,
  Plus,
  Trash2,
  X,
  MoveLeft,
  MoveRight,
  Play,
  Pencil,
  Check,
  Video,
  Upload,
  ImagePlus,
  Camera,
  Loader2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import EstimateDays from "@/components/EstimateDays";
import { ShippingPricingField } from "@/components/ShippingPricingField";
import { Button } from "@/components/ui/button";

import { v4 as uuidv4 } from "uuid";
import { Separator } from "@/components/ui/separator";

/* ---------------- Types ---------------- */
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type ShippingDetails = {
  mode: "free" | "fees";
  fee_mad: number | null;
  free_over_mad: number | null;
  estimate_days_min: number | null;
  estimate_days_max: number | null;
  cod: boolean;
  pickup: boolean;
  tracking: boolean;
  notes: string | null;
};

type ItemDetails = {
  type: "physical" | "digital";
  width_cm: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  personalizable: boolean;
  ships_from: string | null;
  ships_to: string[];
  materials: string[];
  returns: "accepted" | "not_accepted";
  shipping?: ShippingDetails | null;
};

type NewProductInsert = {
  title: string;
  keywords?: string | null;
  description?: string | null;

  price_mad: number;
  city: string | null;
  active: boolean;
  photos: string[];
  shop_id: string;

  // promo
  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;

  // options
  options_config: OptionGroup[];

  // personalization
  personalization_enabled: boolean;
  personalization_instructions: string | null;
  personalization_max_chars: number | null;

  // details
  item_details?: ItemDetails | null;

  // (optional) video
  video_url?: string | null;
  video_poster_url?: string | null;
};

type NewProductInsertWithOwner = NewProductInsert & { shop_owner: string };

const LIMITS = {
  title: 100,
  keywordMax: 7,
  keywordLen: 40,
  description: 2000,
  city: 60,
  shipsFrom: 60,
  shipsTo: 200,
  materials: 200,
  shipNotes: 500,
  persoInstr: 300,
  optionGroupName: 60,
  optionValueLabel: 60,
};

const MAX_PHOTOS = 5;

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, LIMITS.keywordLen))
    .slice(0, LIMITS.keywordMax);
}
function joinKeywordsForDB(ks: string[]): string {
  return ks.join(", ");
}

/* ---------------- Page ---------------- */
export default function SellPage() {
  const router = useRouter();

  /* ---------- Stepper ---------- */
  const [step, setStep] = useState(0);
  const STEPS = [
    "Photos & Video",
    "Basics",
    "Details",
    "Options",
    "Review & Publish",
  ];
  const isLast = step === STEPS.length - 1;

  // drag state for reordering photos
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  function reorder<T>(arr: T[], from: number, to: number): T[] {
    const copy = [...arr];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  }

  /* ---------- Basics ---------- */
  const [title, setTitle] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywordsCount, setKeywordsCount] = useState(0);
  const [description, setDescription] = useState("");

  const [price, setPrice] = useState<string>("");
  const [city, setCity] = useState("");

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string>("");

  /* ---------- Media ---------- */
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoErr, setVideoErr] = useState<string | null>(null);

  /* ---------- Promo ---------- */
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [promoStart, setPromoStart] = useState<string>("");
  const [promoEnd, setPromoEnd] = useState<string>("");

  /* ---------- Options ---------- */
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  /* ---------- Personalization ---------- */
  const [persoEnabled, setPersoEnabled] = useState(false);
  const [persoInstr, setPersoInstr] = useState("");
  const [persoMax, setPersoMax] = useState<string>("");

  /* ---------- Item Details ---------- */
  const [itemType, setItemType] = useState<"physical" | "digital">("physical");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [shipsFrom, setShipsFrom] = useState("");
  const [shipsTo, setShipsTo] = useState("");
  const [materials, setMaterials] = useState("");
  const [returns, setReturns] = useState<"accepted" | "not_accepted">(
    "not_accepted"
  );

  const [shipMode, setShipMode] = useState<"free" | "fees">("free");
  const [shipFee, setShipFee] = useState<string>("");
  const [shipFreeOver, setShipFreeOver] = useState<string>("");
  const [estDaysMin, setEstDaysMin] = useState<string>("");
  const [estDaysMax, setEstDaysMax] = useState<string>("");
  const [shipCOD, setShipCOD] = useState(false);
  const [shipPickup, setShipPickup] = useState(false);
  const [shipTracking, setShipTracking] = useState(true);
  const [shipNotes, setShipNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [promoEnabled, setPromoEnabled] = useState(false);

  const [publishSuccess, setPublishSuccess] = useState<{ id: string } | null>(
    null
  );
  const [redirectIn, setRedirectIn] = useState(4);

  // at top of component

  const recordRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // If the form is “dirty”
  const isDirty =
    photos.length > 0 ||
    title.trim().length > 0 ||
    price.trim().length > 0 ||
    description.trim().length > 0 ||
    videoUrl ||
    groups.length > 0 ||
    persoEnabled ||
    promoPrice ||
    promoStart ||
    promoEnd;

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  /* ---------- Options CRUD ---------- */
  function addGroup() {
    setGroups((gs) => [
      ...gs,
      {
        id: uuidv4(),
        name: "Size",
        required: true,
        values: [{ id: uuidv4(), label: "S", price_delta_mad: 0 }],
      },
    ]);
  }
  function removeGroup(id: string) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }
  function setGroupName(id: string, name: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === id ? { ...g, name: name.slice(0, LIMITS.optionGroupName) } : g
      )
    );
  }
  function toggleRequired(id: string) {
    setGroups((gs) =>
      gs.map((g) => (g.id === id ? { ...g, required: !g.required } : g))
    );
  }
  function addValue(groupId: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              values: [
                ...g.values,
                { id: uuidv4(), label: "New option", price_delta_mad: 0 },
              ],
            }
          : g
      )
    );
  }
  function removeValue(groupId: string, valueId: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.filter((v) => v.id !== valueId) }
          : g
      )
    );
  }
  function updateValue(
    groupId: string,
    valueId: string,
    patch: Partial<OptionValue>
  ) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              values: g.values.map((v) =>
                v.id === valueId
                  ? {
                      ...v,
                      ...patch,
                      label:
                        patch.label !== undefined
                          ? patch.label.slice(0, LIMITS.optionValueLabel)
                          : v.label,
                    }
                  : v
              ),
            }
          : g
      )
    );
  }

  /* ---------- Video helpers ---------- */
  const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB
  const MAX_VIDEO_SECONDS = 15;

  function validateVideoDuration(objectUrl: string, maxSec: number) {
    return new Promise<boolean>((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = objectUrl;
      v.onloadedmetadata = () => {
        const ok = (v.duration || 0) <= maxSec + 0.2;
        resolve(ok);
      };
      v.onerror = reject;
    });
  }

  async function capturePoster(objectUrl: string): Promise<Blob | null> {
    try {
      const v = document.createElement("video");
      v.src = objectUrl;
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.preload = "auto";
      await v.play().catch(() => {});
      v.currentTime = 0.3;
      await new Promise<void>((res) => {
        v.onseeked = () => res();
        v.onloadeddata = () => res();
      });
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.82)
      );
    } catch {
      return null;
    }
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget; // keep a ref; React pools events
    const file = el.files?.[0];
    el.value = "";
    if (!file) return;

    setVideoErr(null);

    try {
      if (!file.type.startsWith("video/"))
        throw new Error("Please choose a video.");
      if (file.size > MAX_VIDEO_BYTES)
        throw new Error("Video too big. Max 20MB.");
      setVideoBusy(true);

      const blobUrl = URL.createObjectURL(file);
      const ok = await validateVideoDuration(blobUrl, MAX_VIDEO_SECONDS).catch(
        () => false
      );
      if (!ok) {
        URL.revokeObjectURL(blobUrl);
        throw new Error("Max 15 seconds.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const base = `temp/${user.id}/${uuidv4()}`;
      const videoPath = `${base}/video.${ext}`;
      const posterPath = `${base}/poster.jpg`;
      const bucket = "product_media";

      const { error: vErr } = await supabase.storage
        .from(bucket)
        .upload(videoPath, file, { upsert: true, contentType: file.type });
      if (vErr) throw vErr;

      const posterBlob = await capturePoster(blobUrl);
      if (posterBlob) {
        const { error: pErr } = await supabase.storage
          .from(bucket)
          .upload(posterPath, posterBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });
        if (pErr) throw pErr;
      }

      URL.revokeObjectURL(blobUrl);

      const { data: vPub } = supabase.storage
        .from(bucket)
        .getPublicUrl(videoPath);
      const { data: pPub } = supabase.storage
        .from(bucket)
        .getPublicUrl(posterPath);

      setVideoUrl(vPub.publicUrl);
      setVideoPosterUrl(pPub.publicUrl);
    } catch (err: any) {
      setVideoErr(err?.message ?? "Video upload failed.");
      setVideoUrl(null);
      setVideoPosterUrl(null);
    } finally {
      setVideoBusy(false);
    }
  }
  function clearVideo() {
    setVideoUrl(null);
    setVideoPosterUrl(null);
    setVideoErr(null);
  }

  /* ---------- Photos ---------- */
  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget; // keep before awaiting
    const picked = Array.from(el.files ?? []);
    el.value = "";
    if (!picked.length) return;

    if (photos.length >= MAX_PHOTOS) {
      alert(`You already have ${photos.length}/${MAX_PHOTOS} photos.`);
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = picked.slice(0, remaining);
    if (picked.length > toProcess.length) {
      alert(`Only ${remaining} more photo(s) allowed (max ${MAX_PHOTOS}).`);
    }

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const urls = await Promise.all(
        toProcess.map(async (file) => {
          if (!/^image\/(jpeg|png|webp|gif|bmp)$/i.test(file.type)) {
            throw new Error(
              `Unsupported image type: ${
                file.type || file.name
              }. Please use JPG/PNG/WEBP.`
            );
          }
          return uploadCompressedToSupabase(file, user.id, "products");
        })
      );

      setPhotos((prev) => [...prev, ...urls.filter(Boolean)]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  /* ---------- Shop ---------- */
  async function getOrCreateMyShop(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data: existing, error: selErr } = await supabase
      .from("shops")
      .select("id, owner")
      .eq("owner", user.id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (existing?.id) return existing.id;

    const { data: created, error: insErr } = await supabase
      .from("shops")
      .insert({ owner: user.id, title: "My shop" })
      .select("id")
      .maybeSingle();

    if (insErr) throw insErr;
    return created!.id;
  }

  /* ---------- Promo helpers ---------- */
  function toISO(dtLocal: string): string | null {
    if (!dtLocal) return null;
    const ms = Date.parse(dtLocal.replace(" ", "T"));
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }

  /* ---------- Save ---------- */
  async function handleSave() {
    try {
      const base = Number(price);

      if (!title.trim()) throw new Error("Title is required");
      if (title.trim().length > LIMITS.title)
        throw new Error(`Title must be ≤ ${LIMITS.title} characters`);
      if (!Number.isFinite(base) || base <= 0)
        throw new Error("Enter a valid price");
      if (!photos.length) throw new Error("Add at least one photo");
      if (!categoryId) throw new Error("Please select a category.");

      const kw = parseKeywords(keywordsInput);
      if (kw.length > LIMITS.keywordMax)
        throw new Error(`Use at most ${LIMITS.keywordMax} keywords`);

      for (const g of groups) {
        if (!g.name.trim()) throw new Error("Option group needs a name");
        if (g.name.length > LIMITS.optionGroupName)
          throw new Error(
            `Option group names must be ≤ ${LIMITS.optionGroupName} chars`
          );
        if (!g.values.length)
          throw new Error(`"${g.name}" needs at least one value`);
        for (const v of g.values) {
          if (!v.label.trim())
            throw new Error(`A value in "${g.name}" is missing a label`);
          if (v.label.length > LIMITS.optionValueLabel)
            throw new Error(
              `Option value labels must be ≤ ${LIMITS.optionValueLabel} chars`
            );
          if (
            v.price_delta_mad != null &&
            !Number.isFinite(Number(v.price_delta_mad))
          ) {
            throw new Error(`Invalid price delta in "${g.name}"`);
          }
        }
      }

      let promo_price_mad: number | null = null;
      let promo_starts_at: string | null = null;
      let promo_ends_at: string | null = null;

      if (promoEnabled) {
        const p = Number(promoPrice);
        if (!Number.isFinite(p) || p <= 0)
          throw new Error("Enter a valid promo price");
        if (p >= base)
          throw new Error("Promo price must be lower than base price");
        if (!promoStart || !promoEnd)
          throw new Error("Select both promo start and end");

        const sISO = toISO(promoStart)!;
        const eISO = toISO(promoEnd)!;
        if (new Date(eISO).getTime() <= new Date(sISO).getTime())
          throw new Error("Promo end must be after start");

        promo_price_mad = Math.round(p);
        promo_starts_at = sISO;
        promo_ends_at = eISO;
      }

      let personalization_enabled = !!persoEnabled;
      let personalization_instructions: string | null = null;
      let personalization_max_chars: number | null = null;

      if (personalization_enabled) {
        const max = Number(persoMax);
        if (!Number.isFinite(max) || max <= 0)
          throw new Error("Enter a valid max characters for personalization");
        if (!persoInstr.trim())
          throw new Error("Add buyer instructions for personalization");
        if (persoInstr.length > LIMITS.persoInstr)
          throw new Error(
            `Personalization instructions must be ≤ ${LIMITS.persoInstr} chars`
          );
        personalization_instructions = persoInstr.trim();
        personalization_max_chars = Math.round(max);
      } else {
        personalization_instructions = null;
        personalization_max_chars = null;
      }

      if (description.length > LIMITS.description)
        throw new Error(`Description must be ≤ ${LIMITS.description} chars`);
      if (city.length > LIMITS.city)
        throw new Error(`City must be ≤ ${LIMITS.city} chars`);
      if (shipsFrom.length > LIMITS.shipsFrom)
        throw new Error(`"Ships from" must be ≤ ${LIMITS.shipsFrom} chars`);
      if (shipsTo.length > LIMITS.shipsTo)
        throw new Error(`"Ships to" must be ≤ ${LIMITS.shipsTo} chars`);
      if (materials.length > LIMITS.materials)
        throw new Error(`Materials must be ≤ ${LIMITS.materials} chars`);
      if (shipNotes.length > LIMITS.shipNotes)
        throw new Error(`Shipping notes must be ≤ ${LIMITS.shipNotes} chars`);

      const shipping: ShippingDetails = {
        mode: shipMode,
        fee_mad: shipMode === "fees" ? (shipFee ? Number(shipFee) : 0) : null,
        free_over_mad: shipFreeOver ? Number(shipFreeOver) : null,
        estimate_days_min: estDaysMin !== "" ? Number(estDaysMin) : null,
        estimate_days_max: estDaysMax !== "" ? Number(estDaysMax) : null,
        cod: shipCOD,
        pickup: shipPickup,
        tracking: shipTracking,
        notes: shipNotes.trim() || null,
      };

      const item_details: ItemDetails = {
        type: itemType,
        width_cm: width !== "" ? Number(width) : null,
        height_cm: height !== "" ? Number(height) : null,
        weight_kg: weight !== "" ? Number(weight) : null,
        personalizable: personalization_enabled,
        ships_from: shipsFrom || city || null,
        ships_to: shipsTo
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        materials: materials
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        returns,
        shipping,
      };

      setSaving(true);

      const shopId = await getOrCreateMyShop();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload: NewProductInsertWithOwner = {
        title: title.trim(),
        keywords: kw.length ? joinKeywordsForDB(kw) : null,
        description: description.trim() || null,
        price_mad: Math.round(Number(price)),
        city: city.trim() || null,
        active: false,
        photos,
        shop_id: shopId,
        shop_owner: user.id,
        promo_price_mad,
        promo_starts_at,
        promo_ends_at,
        options_config: groups,
        personalization_enabled,
        personalization_instructions,
        personalization_max_chars,
        item_details,
        video_url: videoUrl ?? null,
        video_poster_url: videoPosterUrl ?? null,
      };

      const { data: prod, error: insErr } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (insErr) throw insErr;
      const productId = prod!.id as string;

      const { error: catErr } = await supabase
        .from("product_categories")
        .upsert(
          [
            {
              product_id: productId,
              category_id: categoryId!,
              is_primary: true,
            },
          ],
          { onConflict: "product_id,category_id" }
        );
      if (catErr) throw catErr;

      const { error: actErr } = await supabase
        .from("products")
        .update({ active: true })
        .eq("id", productId);
      if (actErr) throw actErr;

      // alert("Product created!");

      // Success 🎉
      setPublishSuccess({ id: productId });
      setRedirectIn(4);
      // router.push(`/product/${productId}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!publishSuccess) return;
    const t = setInterval(() => {
      setRedirectIn((s) => {
        if (s <= 1) {
          clearInterval(t);
          router.push(`/product/${publishSuccess.id}`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [publishSuccess, router]);

  /* ---------- Live keyword normalization ---------- */
  useEffect(() => {
    const ks = parseKeywords(keywordsInput);
    setKeywordsCount(ks.length);
    const normalized = joinKeywordsForDB(ks);
    const currentTokens = keywordsInput.split(",").filter(Boolean).length;
    if (currentTokens > LIMITS.keywordMax || keywordsInput.length > 400) {
      setKeywordsInput(normalized);
    }
  }, [keywordsInput]);

  useEffect(() => {
    if (shipMode !== "free") setShipFreeOver(""); // hide + clear when not free
  }, [shipMode]);

  /* ---------- Step Validation ---------- */
  const canProceed = (targetStep = step) => {
    if (targetStep === 0) {
      return photos.length > 0;
    }
    if (targetStep === 1) {
      const base = Number(price);
      return (
        !!title.trim() &&
        Number.isFinite(base) &&
        base > 0 &&
        !!categoryId &&
        photos.length > 0
      );
    }
    return true; // other steps optional until publish
  };

  function goNext() {
    if (isLast) return;
    if (!canProceed(step)) {
      alert("Please complete the required fields for this step.");
      return;
    }
    setStep((s) => s + 1);
    // keep content scrolled to top of the pane, not the window
    const pane = document.getElementById("sell-scroll-pane");
    pane?.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    const pane = document.getElementById("sell-scroll-pane");
    pane?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function EditSection({ go }: { go: number }) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setStep(go)}
        className="h-8 w-8 rounded-full  bg-neutral-100 text-neutral-500 p-3"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    );
  }

  /* ---------- UI ---------- */
  return (
    <main
      className="min-h-[100dvh] flex flex-col bg-white text-ink overflow-hidden
                 [--h-header:56px] [--h-footer:80px]"
    >
      {/* Sticky header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white h-[var(--h-header)]">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-2 py-3">
          {/* Back */}
          <button
            onClick={() => {
              if (step === 0) {
                if (isDirty) setShowExitConfirm(true);
                else router.back();
              } else {
                goBack();
              }
            }}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>

          {/* Segmented progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-10 sm:w-24 rounded-full ${
                  i <= step ? "bg-ink" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>

          {/* Close */}
          <button
            onClick={() => (isDirty ? setShowExitConfirm(true) : router.back())}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Scrollable content pane */}
      {/* Scrollable content pane */}
      {/* Scrollable content pane */}
      <div
        id="sell-scroll-pane"
        className="min-h-0 flex-1 overflow-y-auto
             pt-[var(--h-header)]
             pb-[calc(var(--h-footer)+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-2xl min-h-0">
          <div className="px-4 pb-0 pt-6 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* ===== Step 0: Media ===== */}
                {step === 0 && (
                  <>
                    <h1 className="text-xl font-semibold">Photos & Video</h1>

                    {/* Preview rail (what buyers see) */}
                    {/* <div className="rounded-xl border bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">Preview</div>
                        <div className="text-xs text-neutral-600">
                          First = cover • Video shows 2nd
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                     
                        {(() => {
                          const items: Array<{
                            kind: "photo" | "video";
                            src: string;
                            i?: number;
                          }> = [];
                          if (photos[0])
                            items.push({ kind: "photo", src: photos[0], i: 0 });
                          if (videoPosterUrl)
                            items.push({ kind: "video", src: videoPosterUrl });
                          for (let idx = 1; idx < photos.length; idx++) {
                            items.push({
                              kind: "photo",
                              src: photos[idx],
                              i: idx,
                            });
                          }
                          if (!items.length) {
                            return (
                              <div className="h-28 w-full grid place-items-center text-xs text-neutral-500 rounded-lg border bg-neutral-50">
                                Add photos to see the preview
                              </div>
                            );
                          }
                          return items.map((m, k) => (
                            <div
                              key={`${m.kind}-${m.src}-${k}`}
                              className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-white"
                              title={
                                m.kind === "video"
                                  ? "Video appears second"
                                  : "Photo"
                              }
                            >
                             
                              <img
                                src={m.src}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              {k === 0 && (
                                <span className="absolute left-1 top-1 rounded-md bg-ink text-white text-[10px] px-1.5 py-0.5">
                                  Cover
                                </span>
                              )}
                              {m.kind === "video" && (
                                <span className="absolute bottom-1 left-1 rounded-md bg-black/80 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                                  <Play className="h-3 w-3" /> Video
                                </span>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </div> */}

                    {/* Photos uploader (camera or upload) */}
                    <div className="rounded-xl border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Photos</div>
                        <div className="text-xs text-neutral-600">
                          {photos.length}/{MAX_PHOTOS}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Take photo (opens camera on mobile) */}
                        <label className="block cursor-pointer rounded-2xl border px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl border bg-white">
                              <Camera className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                Take photo
                              </div>
                              <div className="text-xs text-neutral-500">
                                Opens camera
                              </div>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                            capture="environment"
                            className="hidden"
                            onChange={handleSelect}
                            disabled={photos.length >= MAX_PHOTOS}
                          />
                        </label>

                        {/* Upload from device (gallery/files) */}
                        <label className="block cursor-pointer rounded-2xl border px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl border bg-white">
                              <ImagePlus className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                Upload from device
                              </div>
                              <div className="text-xs text-neutral-500">
                                JPG/PNG/WEBP · up to {MAX_PHOTOS} photos
                              </div>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                            multiple
                            className="hidden"
                            onChange={handleSelect}
                            disabled={photos.length >= MAX_PHOTOS}
                          />
                        </label>
                      </div>

                      {/* Tips */}
                      <ul className="text-xs text-neutral-600 space-y-1">
                        <li>• Drag tiles or use arrows to reorder.</li>
                        <li>• The first photo is your cover.</li>
                        {videoUrl && (
                          <li>• If a video is added, it shows as slide #2.</li>
                        )}
                      </ul>

                      {!!photos.length && (
                        <div className="grid grid-cols-3 gap-3">
                          {photos.map((src, i) => (
                            <div
                              key={src + i}
                              className="relative rounded-xl overflow-hidden border bg-white group"
                              draggable
                              onDragStart={() => setDragFrom(i)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (dragFrom === null || dragFrom === i) return;
                                setPhotos((prev) => {
                                  const copy = [...prev];
                                  const [m] = copy.splice(dragFrom, 1);
                                  copy.splice(i, 0, m);
                                  return copy;
                                });
                                setDragFrom(null);
                              }}
                              title="Drag to reorder"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                className="w-full h-32 object-cover"
                              />

                              {i === 0 && (
                                <div className="absolute left-1 top-1 rounded-md bg-ink text-white text-[10px] px-1.5 py-0.5">
                                  Cover
                                </div>
                              )}

                              {i !== 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotos((prev) => {
                                      const copy = [...prev];
                                      const [m] = copy.splice(i, 1);
                                      copy.unshift(m);
                                      return copy;
                                    })
                                  }
                                  className="absolute right-1 top-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] shadow-sm opacity-0 group-hover:opacity-100 transition"
                                >
                                  Make cover
                                </button>
                              )}

                              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                                    onClick={() =>
                                      i > 0 &&
                                      setPhotos((prev) => {
                                        const copy = [...prev];
                                        const [m] = copy.splice(i, 1);
                                        copy.splice(i - 1, 0, m);
                                        return copy;
                                      })
                                    }
                                    aria-label="Move left"
                                  >
                                    <MoveLeft className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                                    onClick={() =>
                                      i < photos.length - 1 &&
                                      setPhotos((prev) => {
                                        const copy = [...prev];
                                        const [m] = copy.splice(i, 1);
                                        copy.splice(i + 1, 0, m);
                                        return copy;
                                      })
                                    }
                                    aria-label="Move right"
                                  >
                                    <MoveRight className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePhoto(i)}
                                  className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                                  aria-label="Remove photo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploading && (
                        <div className="text-sm text-neutral-600">
                          Uploading…
                        </div>
                      )}
                    </div>

                    {/* Video (optional) */}
                    <div className="rounded-xl border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Video (optional)
                        </div>
                        <div className="text-xs text-neutral-600">
                          ≤15s · ≤20MB
                        </div>
                      </div>

                      {!videoUrl ? (
                        <div className="flex flex-wrap gap-2">
                          {/* Record (camera) */}
                          <button
                            type="button"
                            onClick={() => recordRef.current?.click()}
                            disabled={videoBusy}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm bg-neutral-50 hover:bg-neutral-100 transition disabled:opacity-50"
                          >
                            {videoBusy ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading…
                              </>
                            ) : (
                              <>
                                <Video className="h-4 w-4" />
                                Record video
                              </>
                            )}
                          </button>
                          <input
                            ref={recordRef}
                            type="file"
                            className="hidden"
                            accept="video/*"
                            capture="environment"
                            onChange={handleVideoSelect}
                            disabled={videoBusy}
                          />

                          {/* Upload (gallery/files) */}
                          <button
                            type="button"
                            onClick={() => uploadRef.current?.click()}
                            disabled={videoBusy}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm bg-neutral-50 hover:bg-neutral-100 transition disabled:opacity-50"
                          >
                            {videoBusy ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading…
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload from library
                              </>
                            )}
                          </button>
                          <input
                            ref={uploadRef}
                            type="file"
                            className="hidden"
                            accept="video/*"
                            onChange={handleVideoSelect}
                            disabled={videoBusy}
                          />
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-xl border bg-white w-36">
                          <div className="w-full aspect-[9/12] overflow-hidden">
                            <img
                              src={videoPosterUrl || "/placeholder.svg"}
                              alt="Video poster"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Play overlay */}
                          <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <div className="rounded-full bg-black/70 p-1.5">
                              <Play className="h-4 w-4 text-white" />
                            </div>
                          </div>

                          {/* Optional uploading overlay */}
                          {videoBusy && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] grid place-items-center">
                              <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
                            </div>
                          )}

                          {/* Bottom row (small badge + remove button) */}
                          <div className="p-1.5 flex items-center justify-between text-[10px]">
                            <span className="text-neutral-600 truncate">
                              Video
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="rounded bg-black/80 text-white px-1 py-0.5">
                                #2
                              </span>
                              <button
                                type="button"
                                onClick={clearVideo}
                                className="rounded border px-1 py-0.5"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {videoErr && (
                        <p className="text-xs text-red-600">{videoErr}</p>
                      )}
                    </div>
                  </>
                )}

                {/* ===== Step 1: Basics ===== */}
                {step === 1 && (
                  <>
                    <h1 className="text-xl font-semibold">Basics</h1>

                    <label htmlFor="title" className="block text-sm">
                      Title
                      <input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                        maxLength={LIMITS.title}
                      />
                    </label>

                    <label className="block">
                      <div className="text-sm mb-1">Category</div>
                      <CategorySheetPicker
                        title={title}
                        value={categoryId}
                        onChange={(id, path) => {
                          setCategoryId(id);
                          setCategoryPath(path);
                        }}
                      />
                    </label>

                    {/* Base Price */}
                    <label className="block">
                      <div className="text-sm mb-1">Base Price (MAD)</div>
                      <input
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                        inputMode="numeric"
                      />
                    </label>

                    {/* Promo Section */}
                    <div className="rounded-lg border p-4 space-y-4 bg-white">
                      {/* Header row with switch */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Promo</div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="promo-switch"
                            checked={promoEnabled}
                            onCheckedChange={(checked) =>
                              setPromoEnabled(checked)
                            }
                          />
                        </div>
                      </div>

                      {/* Only show promo fields if enabled */}
                      {promoEnabled && (
                        <>
                          <label className="block">
                            <div className="text-sm mb-1">
                              Promo Price (MAD)
                            </div>
                            <input
                              type="number"
                              min={0}
                              value={promoPrice}
                              onChange={(e) => setPromoPrice(e.target.value)}
                              className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                              inputMode="numeric"
                              placeholder="e.g., 199"
                            />
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <div className="text-sm mb-1">Promo starts</div>
                              <input
                                type="datetime-local"
                                value={promoStart}
                                onChange={(e) => setPromoStart(e.target.value)}
                                className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                              />
                            </label>

                            <label className="block">
                              <div className="text-sm mb-1">Promo ends</div>
                              <input
                                type="datetime-local"
                                value={promoEnd}
                                onChange={(e) => setPromoEnd(e.target.value)}
                                className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                              />
                            </label>
                          </div>

                          <p className="text-xs text-neutral-500">
                            If promo is enabled, both start and end are
                            required.
                          </p>
                        </>
                      )}
                    </div>

                    <label className="block">
                      <div className="text-sm mb-1">Keywords / Tags</div>
                      <input
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                        className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                        placeholder="The Great Wave, Hokusai, Japanese Art, Poster"
                      />
                      <div className="text-xs text-neutral-500 mt-1">
                        {keywordsCount}/{LIMITS.keywordMax} tags (each ≤{" "}
                        {LIMITS.keywordLen} chars)
                      </div>
                    </label>
                  </>
                )}

                {/* ===== Step 2: Details ===== */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) =>
                          setDescription(
                            e.target.value.slice(0, LIMITS.description)
                          )
                        }
                        placeholder="Describe the item. Materials, story, process…"
                        rows={5}
                        className="rounded-lg shadow-none"
                      />
                      <div className="text-xs text-neutral-500 text-right">
                        {description.length}/{LIMITS.description}
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="border rounded-lg p-4 space-y-4 bg-white">
                      <div className="text-sm font-medium">Item Details</div>

                      {/* Item type */}
                      <div className="space-y-1">
                        <Label>Item type</Label>
                        <Select
                          value={itemType}
                          onValueChange={(v) =>
                            setItemType(v as "physical" | "digital")
                          }
                        >
                          <SelectTrigger className="rounded-lg shadow-none h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">
                              Physical item
                            </SelectItem>
                            <SelectItem value="digital">
                              Digital download
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dimensions */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Width (cm)</Label>
                          <Input
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            type="number"
                            className="rounded-lg shadow-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Height (cm)</Label>
                          <Input
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            type="number"
                            className="rounded-lg shadow-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Weight (kg)</Label>
                        <Input
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          type="number"
                          className="rounded-lg shadow-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>
                          Ships from{" "}
                          <span className="text-neutral-500">
                            (shown to buyers)
                          </span>
                        </Label>
                        <Input
                          value={shipsFrom}
                          onChange={(e) =>
                            setShipsFrom(
                              e.target.value.slice(0, LIMITS.shipsFrom)
                            )
                          }
                          placeholder="Casablanca"
                          className="rounded-lg shadow-none"
                        />
                        <div className="text-xs text-neutral-500 text-right">
                          {shipsFrom.length}/{LIMITS.shipsFrom}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Only ships to (comma separated)</Label>
                        <Input
                          value={shipsTo}
                          onChange={(e) =>
                            setShipsTo(e.target.value.slice(0, LIMITS.shipsTo))
                          }
                          placeholder="Casablanca, Rabat, Marrakech"
                          className="rounded-lg shadow-none"
                        />
                        <div className="text-xs text-neutral-500 text-right">
                          {shipsTo.length}/{LIMITS.shipsTo}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Materials</Label>
                        <Input
                          value={materials}
                          onChange={(e) =>
                            setMaterials(
                              e.target.value.slice(0, LIMITS.materials)
                            )
                          }
                          placeholder="Wood, Bamboo, Cotton"
                          className="rounded-lg shadow-none"
                        />
                        <div className="text-xs text-neutral-500 text-right">
                          {materials.length}/{LIMITS.materials}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Returns & exchanges</Label>
                        <Select
                          value={returns}
                          onValueChange={(v) =>
                            setReturns(v as "accepted" | "not_accepted")
                          }
                        >
                          <SelectTrigger className="rounded-lg shadow-none h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="not_accepted">
                              Not accepted
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Shipping */}
                    <div className="border rounded-lg p-4 space-y-4 bg-white">
                      <div className="text-sm font-medium">Shipping</div>

                      <ShippingPricingField
                        value={shipMode}
                        onChange={setShipMode}
                      />

                      {shipMode === "fees" && (
                        <div className="space-y-1">
                          <Label>Flat fee (MAD)</Label>
                          <Input
                            value={shipFee}
                            onChange={(e) => setShipFee(e.target.value)}
                            type="number"
                            className="rounded-lg shadow-none"
                            placeholder="e.g., 29"
                          />
                        </div>
                      )}

                      {/* Only under FREE shipping */}
                      {shipMode === "free" && (
                        <div className="space-y-1">
                          <Label>Free over (MAD)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={shipFreeOver}
                            onChange={(e) => setShipFreeOver(e.target.value)}
                            className="rounded-lg shadow-none"
                            placeholder="optional"
                            inputMode="numeric"
                          />
                        </div>
                      )}

                      <EstimateDays
                        min={0}
                        max={60}
                        valueMin={Number(estDaysMin || 0)}
                        valueMax={Number(estDaysMax || 0)}
                        onChange={({ min, max }) => {
                          setEstDaysMin(String(min));
                          setEstDaysMax(String(max));
                        }}
                      />

                      {/* Switches */}
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cod">Cash on delivery (COD)</Label>
                          <Switch
                            id="cod"
                            checked={shipCOD}
                            onCheckedChange={setShipCOD}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pickup">Pickup available</Label>
                          <Switch
                            id="pickup"
                            checked={shipPickup}
                            onCheckedChange={setShipPickup}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="tracking">Tracking provided</Label>
                          <Switch
                            id="tracking"
                            checked={shipTracking}
                            onCheckedChange={setShipTracking}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Shipping notes (optional)</Label>
                        <Textarea
                          value={shipNotes}
                          onChange={(e) =>
                            setShipNotes(
                              e.target.value.slice(0, LIMITS.shipNotes)
                            )
                          }
                          rows={3}
                          className="rounded-lg shadow-none"
                        />
                        <div className="text-xs text-neutral-500 text-right">
                          {shipNotes.length}/{LIMITS.shipNotes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== Step 3: Options & Personalization ===== */}
                {step === 3 && (
                  <>
                    <h1 className="text-xl font-semibold">
                      Options & Personalization
                    </h1>

                    {/* ---------- Options (custom dropdowns) ---------- */}
                    <section className="rounded-lg border p-4 space-y-4 bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                          Options (custom dropdowns)
                        </div>
                        <Button
                          type="button"
                          onClick={addGroup}
                          className="rounded-lg bg-black text-white hover:bg-black/90"
                          size="sm"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add option group
                        </Button>
                      </div>

                      {!groups.length && (
                        <p className="text-sm text-neutral-600">
                          Add groups like <b>Size</b> or <b>Fabric Color</b>.
                          Each value can adjust the price relative to the base
                          price.
                        </p>
                      )}

                      {/* GROUPS */}
                      {groups.map((g, gi) => (
                        <div key={g.id} className="space-y-4">
                          {/* Group Title */}

                          <div className="text-sm font-medium text-neutral-500">
                            Option {gi + 1}
                          </div>

                          {/* Group Name + Remove Icon */}
                          <div className="flex items-center gap-2">
                            <Input
                              value={g.name}
                              onChange={(e) =>
                                setGroupName(g.id, e.target.value)
                              }
                              className="rounded-lg flex-1 h-12"
                              placeholder="Group name (e.g., Size)"
                              maxLength={LIMITS.optionGroupName}
                            />

                            {/* Remove icon only */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeGroup(g.id)}
                              className="rounded-lg shrink-0 h-12 w-12 "
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          {/* Required Toggle on its own row */}
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`req-${g.id}`} className="text-sm">
                              Required
                            </Label>
                            <Switch
                              id={`req-${g.id}`}
                              checked={g.required ?? true}
                              onCheckedChange={() => toggleRequired(g.id)}
                            />
                          </div>

                          {/* Column headers (Name / Added price) */}
                          <div className="grid grid-cols-5 gap-2 text-[13px] text-neutral-500 mb-1">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-1">Added price</div>
                            <div className="col-span-1" />
                          </div>

                          {/* Values */}
                          <div className="space-y-2">
                            {g.values.map((v) => (
                              <div
                                key={v.id}
                                className="grid grid-cols-5 gap-2 items-center"
                              >
                                <Input
                                  className="col-span-3 rounded-lg h-10"
                                  value={v.label}
                                  onChange={(e) =>
                                    updateValue(g.id, v.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Option label (e.g., M - Hoodie)"
                                  maxLength={LIMITS.optionValueLabel}
                                />
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  className="col-span-1 rounded-lg h-10"
                                  value={String(v.price_delta_mad ?? 0)}
                                  onChange={(e) =>
                                    updateValue(g.id, v.id, {
                                      price_delta_mad: Number(
                                        e.target.value || 0
                                      ),
                                    })
                                  }
                                  placeholder="Δ"
                                  title="Price delta relative to base price."
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeValue(g.id, v.id)}
                                  className="col-span-1 rounded-lg bg-red-400 h-10 w-10"
                                  aria-label="Remove value"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            onClick={() => addValue(g.id)}
                            size="sm"
                            className="rounded-lg bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                            variant="secondary"
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add value
                          </Button>

                          {/* Separator between big option groups (not after last) */}
                          {gi < groups.length - 1 && (
                            <Separator className="my-4 bg-black" />
                          )}
                        </div>
                      ))}
                    </section>

                    {/* ---------- Personalization ---------- */}
                    <section className="rounded-lg border p-4 space-y-4 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Personalization
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="perso-switch"
                            checked={persoEnabled}
                            onCheckedChange={(checked) =>
                              setPersoEnabled(checked)
                            }
                          />
                        </div>
                      </div>

                      {persoEnabled && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm">
                              Buyer instructions (shown in sheet)
                            </Label>
                            <Textarea
                              className="rounded-lg shadow-none"
                              value={persoInstr}
                              onChange={(e) =>
                                setPersoInstr(
                                  e.target.value.slice(0, LIMITS.persoInstr)
                                )
                              }
                              placeholder="Tell the buyer what to write (e.g., 'Enter the name to engrave…')"
                              rows={3}
                              maxLength={LIMITS.persoInstr}
                            />
                            <div className="text-xs text-neutral-500">
                              {persoInstr.length}/{LIMITS.persoInstr}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Max characters</Label>
                            <Input
                              type="number"
                              min={1}
                              className="rounded-lg"
                              value={persoMax}
                              onChange={(e) => setPersoMax(e.target.value)}
                              inputMode="numeric"
                              placeholder="e.g., 80"
                            />
                          </div>

                          <p className="text-xs text-neutral-600">
                            The “Add a personalization” button appears on the
                            product page only when personalization is enabled.
                          </p>
                        </>
                      )}
                    </section>
                  </>
                )}

                {/* ===== Step 4: Review & Publish ===== */}
                {step === 4 && (
                  <>
                    <h1 className="text-xl font-semibold">Review & Publish</h1>

                    {/* Media Preview */}
                    <section className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Photos &amp; Video
                        </div>
                        <EditSection go={0} />
                      </div>

                      {photos.length === 0 && !videoPosterUrl ? (
                        <p className="text-sm text-neutral-600">
                          No media added.
                        </p>
                      ) : (
                        <>
                          {(() => {
                            // Build: cover photo → video poster → remaining photos
                            const items: Array<{
                              kind: "photo" | "video";
                              src: string;
                              key: string;
                            }> = [];
                            if (photos[0])
                              items.push({
                                kind: "photo",
                                src: photos[0],
                                key: `p0`,
                              });
                            if (videoPosterUrl)
                              items.push({
                                kind: "video",
                                src: videoPosterUrl,
                                key: `v`,
                              });
                            for (let i = 1; i < photos.length; i++) {
                              items.push({
                                kind: "photo",
                                src: photos[i],
                                key: `p${i}`,
                              });
                            }

                            return (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {items.map((m, i) => (
                                  <div
                                    key={m.key}
                                    className="relative aspect-square overflow-hidden rounded-lg border bg-white"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={m.src}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                    {i === 0 && m.kind === "photo" && (
                                      <span className="absolute left-1 top-1 rounded bg-ink text-white text-[10px] px-1.5 py-0.5">
                                        Cover
                                      </span>
                                    )}
                                    {m.kind === "video" && (
                                      <span className="absolute bottom-1 left-1 rounded bg-black text-white text-[10px] px-1.5 py-0.5">
                                        Video
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </section>

                    {/* Basics */}
                    <section className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Basics</div>
                        <EditSection go={1} />
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-neutral-500">Title</div>
                        <div className="text-right">{title || "—"}</div>

                        <div className="text-neutral-500">Price</div>
                        <div className="text-right">
                          {price
                            ? `${Number(price).toLocaleString()} MAD`
                            : "—"}
                        </div>

                        <div className="text-neutral-500">Category</div>
                        <div className="text-right">{categoryPath || "—"}</div>

                        <div className="text-neutral-500">Keywords</div>
                        <div className="text-right truncate">
                          {keywordsInput || "—"}
                        </div>
                      </div>
                    </section>

                    {/* Details */}
                    <section className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Item details</div>
                        <EditSection go={2} />
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-neutral-500">Type</div>
                        <div className="text-right capitalize">{itemType}</div>

                        <div className="text-neutral-500">Dimensions (cm)</div>
                        <div className="text-right">
                          {width || "—"} × {height || "—"}
                        </div>

                        <div className="text-neutral-500">Weight</div>
                        <div className="text-right">{weight || "—"} kg</div>

                        <div className="text-neutral-500">Ships from</div>
                        <div className="text-right">
                          {shipsFrom || city || "—"}
                        </div>

                        <div className="text-neutral-500">Ships to</div>
                        <div className="text-right truncate">
                          {shipsTo ? shipsTo : "—"}
                        </div>

                        <div className="text-neutral-500">Materials</div>
                        <div className="text-right truncate">
                          {materials || "—"}
                        </div>

                        <div className="text-neutral-500">Returns</div>
                        <div className="text-right">
                          {returns === "accepted" ? "Accepted" : "Not accepted"}
                        </div>
                      </div>

                      {description && (
                        <>
                          <Separator />
                          <div>
                            <div className="text-sm text-neutral-500 mb-1">
                              Description
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {description}
                            </p>
                          </div>
                        </>
                      )}
                    </section>

                    {/* Options & Personalization */}
                    <section className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {" "}
                          Options & personalization
                        </div>
                        <EditSection go={3} />
                      </div>

                      {/* Options */}
                      {groups.length ? (
                        <div className="space-y-3">
                          {groups.map((g) => (
                            <div key={g.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="font-medium">
                                  {g.name || "Untitled group"}
                                </div>
                                <div className="text-neutral-500">
                                  {g.required ? "Required" : "Optional"}
                                </div>
                              </div>
                              {g.values.length ? (
                                <ul className="mt-2 space-y-1 text-sm">
                                  {g.values.map((v) => (
                                    <li
                                      key={v.id}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="truncate">
                                        {v.label || "—"}
                                      </span>
                                      <span className="text-neutral-500">
                                        {v.price_delta_mad
                                          ? `+ ${Number(v.price_delta_mad).toLocaleString()} MAD`
                                          : "+ 0"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-sm text-neutral-500">
                                  No values.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-600">
                          No option groups.
                        </p>
                      )}

                      {/* Personalization */}
                      <div className="  gap-y-2 text-sm mt-6">
                        <div className="flex items-center gap-2 text-sm">
                          {persoEnabled ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              <span>
                                With{" "}
                                <span className="text-neutral-900">
                                  personalization
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-500" />
                              <span>
                                Without{" "}
                                <span className="text-neutral-900">
                                  personalization
                                </span>
                              </span>
                            </>
                          )}
                        </div>

                        {persoEnabled && (
                          <>
                            <div className="text-neutral-500">
                              Max characters
                            </div>
                            <div className="text-right">{persoMax || "—"}</div>

                            {persoInstr && (
                              <>
                                <div className="col-span-2">
                                  <div className="text-neutral-500 mb-1">
                                    Buyer instructions
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {persoInstr}
                                  </p>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </section>

                    {/* Shipping */}
                    <section className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Shipping</div>
                        <EditSection go={4} />
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-neutral-500">Pricing</div>
                        <div className="text-right">
                          {shipMode === "free"
                            ? "Free shipping"
                            : "+ Fees (flat)"}
                        </div>

                        {shipMode === "fees" && (
                          <>
                            <div className="text-neutral-500">Flat fee</div>
                            <div className="text-right">
                              {shipFee
                                ? `${Number(shipFee).toLocaleString()} MAD`
                                : "—"}
                            </div>
                          </>
                        )}

                        {shipMode === "free" && (
                          <>
                            <div className="text-neutral-500">Free over</div>
                            <div className="text-right">
                              {shipFreeOver
                                ? `${Number(shipFreeOver).toLocaleString()} MAD`
                                : "—"}
                            </div>
                          </>
                        )}

                        <div className="text-neutral-500">Estimate</div>
                        <div className="text-right">
                          {estDaysMin || estDaysMax
                            ? `${estDaysMin || 0}–${estDaysMax || 0} days`
                            : "—"}
                        </div>

                        <div className="text-neutral-500">COD</div>
                        <div className="text-right">
                          {shipCOD ? "Yes" : "No"}
                        </div>

                        <div className="text-neutral-500">Pickup</div>
                        <div className="text-right">
                          {shipPickup ? "Yes" : "No"}
                        </div>

                        <div className="text-neutral-500">Tracking</div>
                        <div className="text-right">
                          {shipTracking ? "Yes" : "No"}
                        </div>
                      </div>

                      {shipNotes && (
                        <>
                          <Separator />
                          <div>
                            <div className="text-sm text-neutral-500 mb-1">
                              Notes
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {shipNotes}
                            </p>
                          </div>
                        </>
                      )}
                    </section>

                    {/* Promo */}
                    {(promoPrice || promoStart || promoEnd) && (
                      <section className="rounded-lg border bg-white p-4 space-y-3">
                        <div className="text-sm font-medium">Promo</div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div className="text-neutral-500">Promo price</div>
                          <div className="text-right">
                            {promoPrice
                              ? `${Number(promoPrice).toLocaleString()} MAD`
                              : "—"}
                          </div>
                          <div className="text-neutral-500">Starts</div>
                          <div className="text-right">
                            {promoStart
                              ? new Date(promoStart).toLocaleString()
                              : "—"}
                          </div>
                          <div className="text-neutral-500">Ends</div>
                          <div className="text-right">
                            {promoEnd
                              ? new Date(promoEnd).toLocaleString()
                              : "—"}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                          If a promo is set, both start and end must be valid.
                        </p>
                      </section>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>{" "}
        </div>
      </div>

      {/* Bottom sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t h-[var(--h-footer)]">
        <div className="mx-auto max-w-2xl px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {isLast ? (
            <button
              onClick={() => (isLast ? handleSave() : goNext())}
              disabled={isLast ? saving : !canProceed(step)}
              className="w-full rounded-full bg-black text-white py-3 text-center font-medium disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed(step)}
              className="w-full rounded-full bg-black text-white py-3 text-center font-medium disabled:opacity-50"
            >
              <span className="opacity-50"> Next: </span> {STEPS[step + 1]}
            </button>
          )}
        </div>
      </div>

      {/* Exit confirmation drawer */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-t-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium">Discard listing?</h2>
            <p className="text-sm text-neutral-600">
              Your changes will not be saved.
            </p>

            <button
              onClick={() => router.push("/seller")}
              className="w-full bg-red-500 text-white py-3 rounded-xl"
            >
              Leave
            </button>

            <button
              onClick={() => setShowExitConfirm(false)}
              className="w-full border py-3 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {publishSuccess && (
        <div className="fixed inset-0 z-200 bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 grid place-items-center">
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Product published!</h2>
            <p className="text-sm text-neutral-600">
              Redirecting in {redirectIn}s…
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => router.push(`/product/${publishSuccess.id}`)}
                className="rounded-full bg-black text-white px-4 py-2 text-sm"
              >
                View product now
              </button>
              <button
                onClick={() => setPublishSuccess(null)}
                className="rounded-full border px-4 py-2 text-sm"
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
