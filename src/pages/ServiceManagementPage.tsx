import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Plus,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Coins,
  Search,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Play,
  Layers,
  Building2,
  ShieldCheck,
  Filter,
  X,
  UserCheck,
  ArrowRight,
  ChevronRight,
  FileCheck,
  Camera,
  Upload,
} from "lucide-react";
import StockPhotoPickerModal from "@/components/directory/StockPhotoPickerModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProviderServices,
  saveProviderServices,
  getProviderServiceBookings,
  createServiceBooking,
  updateServiceBookingStatus,
  deleteServiceBooking,
  subscribeToServiceBookings,
  ServiceItem,
  ServicePortfolioSample,
  ServiceBooking,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "@/services/serviceManagementService";
import FeaturedServiceCard from "@/components/directory/FeaturedServiceCard";
import { toast } from "sonner";

const SERVICE_CATEGORIES = [
  "Web & Software Development",
  "Graphic Design & Branding",
  "Video Production & Editing",
  "Solar & Electrical Energy",
  "Digital Marketing & Ads",
  "Real Estate & Construction",
  "Photography & Media",
  "Consulting & Coaching",
  "Catering & Events",
  "Fashion & Tailoring",
  "Health, Beauty & Spa",
  "Logistics & Delivery",
  "Education & Tutoring",
  "Legal & Accounting",
  "Other Professional Service",
];

const PRICING_MODELS = [
  { id: "fixed", label: "Fixed Price" },
  { id: "starting_at", label: "Starting At" },
  { id: "hourly", label: "Per Hour / Day" },
  { id: "custom", label: "Custom / Free Quote" },
];

export default function ServiceManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"services" | "bookings" | "share">("services");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business and services state
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [supplier, setSupplier] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<string>("ALL");
  const [bookingSearch, setBookingSearch] = useState("");

  // Modals state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewService, setPreviewService] = useState<ServiceItem | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [sampleModal, setSampleModal] = useState<ServicePortfolioSample | null>(null);

  // Stock photo library & direct upload picker
  const [stockPickerOpen, setStockPickerOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<"cover" | "sample">("cover");

  // Manual booking modal state
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBooking, setManualBooking] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceTitle: "",
    servicePrice: "",
    preferredDate: "",
    message: "",
  });

  // Service form draft state
  const [serviceForm, setServiceForm] = useState<ServiceItem>({
    id: "",
    title: "",
    description: "",
    price: "",
    pricing_type: "starting_at",
    price_numeric: undefined,
    duration: "2-3 Days",
    category: "Web & Software Development",
    image_url: "",
    youtube_video_url: "",
    samples: [],
    benefits: [],
    link_url: "",
    active: true,
  });

  // Deliverable tag input state
  const [newDeliverable, setNewDeliverable] = useState("");

  // Sample form draft inside service modal
  const [sampleForm, setSampleForm] = useState<ServicePortfolioSample>({
    id: "",
    title: "",
    image_url: "",
    description: "",
    link_url: "",
  });
  const [showAddSampleForm, setShowAddSampleForm] = useState(false);

  // Load services and bookings on mount
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [servicesRes, bookingsRes] = await Promise.all([
          getProviderServices(user.id),
          getProviderServiceBookings(user.id),
        ]);

        if (isMounted) {
          setServices(servicesRes.services);
          setSupplier(servicesRes.supplier);
          setProfile(servicesRes.profile);
          setBookings(bookingsRes);
        }
      } catch (err) {
        console.error("Error loading service management data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();

    const channel = subscribeToServiceBookings(user.id, async () => {
      const refreshed = await getProviderServiceBookings(user.id);
      if (isMounted) setBookings(refreshed);
    });

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [user]);

  // Handle open modal for new service
  const handleOpenNewService = () => {
    setEditingIndex(null);
    setServiceForm({
      id: `svc_${Date.now()}`,
      title: "",
      description: "",
      price: "",
      pricing_type: "starting_at",
      price_numeric: undefined,
      duration: "2-3 Days",
      category: supplier?.category_id || "Web & Software Development",
      image_url: supplier?.cover_url || "",
      youtube_video_url: "",
      samples: [],
      benefits: ["Professional quality delivery", "Direct WhatsApp support"],
      link_url: "",
      active: true,
    });
    setNewDeliverable("");
    setShowAddSampleForm(false);
    setServiceModalOpen(true);
  };

  // Handle open modal for editing service
  const handleOpenEditService = (service: ServiceItem, index: number) => {
    setEditingIndex(index);
    setServiceForm({
      ...service,
      samples: service.samples || [],
      benefits: service.benefits || [],
    });
    setNewDeliverable("");
    setShowAddSampleForm(false);
    setServiceModalOpen(true);
  };

  // Add deliverable benefit tag
  const handleAddDeliverable = () => {
    const trimmed = newDeliverable.trim();
    if (!trimmed) return;
    setServiceForm((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), trimmed],
    }));
    setNewDeliverable("");
  };

  const handleRemoveDeliverable = (idx: number) => {
    setServiceForm((prev) => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== idx),
    }));
  };

  // Add sample to serviceForm
  const handleSaveSample = () => {
    if (!sampleForm.title.trim()) {
      toast.error("Please enter a sample project title.");
      return;
    }
    const newSample: ServicePortfolioSample = {
      ...sampleForm,
      id: sampleForm.id || `sample_${Date.now()}`,
    };

    setServiceForm((prev) => ({
      ...prev,
      samples: [...(prev.samples || []), newSample],
    }));

    setSampleForm({
      id: "",
      title: "",
      image_url: "",
      description: "",
      link_url: "",
    });
    setShowAddSampleForm(false);
    toast.success("Sample added to service draft!");
  };

  const handleRemoveSample = (sampleId: string) => {
    setServiceForm((prev) => ({
      ...prev,
      samples: (prev.samples || []).filter((s) => s.id !== sampleId),
    }));
  };

  // Quick AI Assistant for service description and benefits
  const handleGenerateAIDetails = () => {
    if (!serviceForm.title.trim()) {
      toast.info("Please write the service title first to generate AI details.");
      return;
    }

    const titleLower = serviceForm.title.toLowerCase();
    let suggestedDesc = `We deliver top-tier, reliable ${serviceForm.title} tailored for individuals and businesses across Nigeria. Every engagement is executed with professional precision, transparent communication, and guaranteed satisfaction.`;
    let suggestedBenefits = [
      "Custom tailored execution",
      "Fast turnaround and milestone updates",
      "Free revisions within warranty window",
      "Dedicated WhatsApp consultation",
    ];

    if (titleLower.includes("solar") || titleLower.includes("inverter")) {
      suggestedDesc = `Full turnkey solar power engineering, load auditing, and inverter system setup. High-efficiency lithium/tubular batteries and pure sine wave inverters with warranties.`;
      suggestedBenefits = [
        "Free load capacity audit",
        "1-Year installation warranty",
        "Pure sine wave certified components",
        "24/7 technical support hotline",
      ];
    } else if (titleLower.includes("web") || titleLower.includes("app") || titleLower.includes("software")) {
      suggestedDesc = `High-speed, conversion-focused modern website or web application designed for mobile devices. Fully integrated with secure payments, SEO, and WhatsApp chat.`;
      suggestedBenefits = [
        "Mobile-first responsive design",
        "Integrated Paystack / Flutterwave checkout",
        "Google SEO setup and indexing",
        "30 Days of post-launch maintenance",
      ];
    } else if (titleLower.includes("logo") || titleLower.includes("brand") || titleLower.includes("design")) {
      suggestedDesc = `Distinctive brand identity design including high-resolution vector logos, brand style guidelines, color palettes, and social media kits ready for print and digital.`;
      suggestedBenefits = [
        "Vector source files (AI, SVG, PDF, PNG)",
        "Social media ready avatar & banner kit",
        "3 Unique creative concepts",
        "Full copyright transfer upon completion",
      ];
    }

    setServiceForm((prev) => ({
      ...prev,
      description: prev.description || suggestedDesc,
      benefits: (prev.benefits?.length || 0) > 0 ? prev.benefits : suggestedBenefits,
      duration: prev.duration || "2-4 Days",
    }));

    toast.success("✨ AI Service draft generated! Review and customize as needed.");
  };

  // Save Service (Create or Update)
  const handleSaveService = async () => {
    if (!user) return;
    if (!serviceForm.title.trim()) {
      toast.error("Please enter a service title.");
      return;
    }

    setSaving(true);
    try {
      let updatedList: ServiceItem[] = [...services];
      if (editingIndex !== null && editingIndex >= 0) {
        updatedList[editingIndex] = {
          ...serviceForm,
          updated_at: new Date().toISOString(),
        };
      } else {
        updatedList = [
          {
            ...serviceForm,
            id: `svc_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...updatedList,
        ];
      }

      await saveProviderServices({
        userId: user.id,
        services: updatedList,
        supplierId: supplier?.id,
        businessName: supplier?.name || profile?.display_name || "Verified Business",
        categoryId: supplier?.category_id,
      });

      setServices(updatedList);
      setServiceModalOpen(false);
      toast.success("✨ Service updated in real time! Changes are immediately live.");
    } catch (err: any) {
      toast.error(err?.message || "Could not save service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status for service
  const handleToggleServiceActive = async (index: number) => {
    if (!user) return;
    const target = services[index];
    const updated = [...services];
    updated[index] = { ...target, active: !target.active };

    setServices(updated);
    try {
      await saveProviderServices({
        userId: user.id,
        services: updated,
        supplierId: supplier?.id,
      });
      toast.success(`Service marked ${!target.active ? "Available" : "Paused"}`);
    } catch {
      setServices(services);
      toast.error("Failed to update status.");
    }
  };

  // Delete service
  const handleDeleteService = async (index: number) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this service from your public catalog?")) return;

    const updated = services.filter((_, i) => i !== index);
    setServices(updated);

    try {
      await saveProviderServices({
        userId: user.id,
        services: updated,
        supplierId: supplier?.id,
      });
      toast.success("Service removed from catalog.");
    } catch {
      setServices(services);
      toast.error("Failed to delete service.");
    }
  };

  // Duplicate service
  const handleDuplicateService = async (service: ServiceItem) => {
    if (!user) return;
    const duplicated: ServiceItem = {
      ...service,
      id: `svc_${Date.now()}`,
      title: `${service.title} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [duplicated, ...services];
    setServices(updated);
    try {
      await saveProviderServices({
        userId: user.id,
        services: updated,
        supplierId: supplier?.id,
      });
      toast.success("Service duplicated!");
    } catch {
      setServices(services);
    }
  };

  // Handle manual booking submission
  const handleCreateManualBooking = async () => {
    if (!user) return;
    if (!manualBooking.customerName.trim() || !manualBooking.customerPhone.trim()) {
      toast.error("Please enter the client's name and phone number.");
      return;
    }

    try {
      const created = await createServiceBooking({
        providerUserId: user.id,
        businessId: supplier?.id,
        businessName: supplier?.name || profile?.display_name || "My Business",
        customerName: manualBooking.customerName.trim(),
        customerPhone: manualBooking.customerPhone.trim(),
        customerEmail: manualBooking.customerEmail.trim() || undefined,
        serviceTitle: manualBooking.serviceTitle || (services[0]?.title ?? "General Booking"),
        servicePrice: manualBooking.servicePrice || undefined,
        preferredDate: manualBooking.preferredDate || undefined,
        message: manualBooking.message || "Manual booking recorded by business owner",
        source: "manual_entry",
      });

      setBookings((prev) => [created, ...prev]);
      setManualBookingModalOpen(false);
      setManualBooking({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        serviceTitle: "",
        servicePrice: "",
        preferredDate: "",
        message: "",
      });
      toast.success("✨ Client booking logged successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Could not log booking.");
    }
  };

  // Update booking status
  const handleStatusChange = async (bookingId: string, status: ServiceBooking["status"]) => {
    if (!user) return;
    try {
      await updateServiceBookingStatus(bookingId, user.id, status);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
      toast.success(`Booking marked as ${status.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update booking status.");
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "PENDING" && b.status !== "pending") return false;
    if (bookingFilter === "CONFIRMED" && b.status !== "confirmed" && b.status !== "in_progress") return false;
    if (bookingFilter === "COMPLETED" && b.status !== "completed") return false;
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      if (
        !b.customer_name.toLowerCase().includes(q) &&
        !b.customer_phone.toLowerCase().includes(q) &&
        !b.service_title.toLowerCase().includes(q) &&
        !(b.message || "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const businessSlug = supplier?.slug || profile?.username || user?.id;
  const publicProfileUrl = `${window.location.origin}/b/${businessSlug}`;
  const whatsappNumber = supplier?.phone || profile?.whatsapp || "";

  return (
    <>
      <Helmet>
        <title>Premium Service Management & Bookings | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Manage your business services, portfolio samples, YouTube demo videos, and inbound client bookings in real time."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Top Header Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-black">
                  <Briefcase className="w-3.5 h-3.5 mr-1" /> Premium Service Flow
                </Badge>
                {supplier?.active && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Live in Directory
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {supplier?.name || profile?.display_name || "My Business Services"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Add rich service offerings with YouTube video walkthroughs, case study samples, and automated client booking management. Real-time updates sync instantly without needing to visit profile edit.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                onClick={handleOpenNewService}
                className="font-extrabold rounded-xl text-xs gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Add New Service
              </Button>
              <Button
                variant="outline"
                onClick={() => setManualBookingModalOpen(true)}
                className="font-bold rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" /> Log Booking
              </Button>
              <Button
                variant="ghost"
                asChild
                className="text-xs font-bold rounded-xl gap-1 text-muted-foreground hover:text-foreground"
              >
                <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> Public Card
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
            <div className="bg-muted/40 rounded-2xl p-3.5 border border-border/50">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> Total Services
              </div>
              <div className="text-xl font-black text-foreground mt-1">{services.length}</div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3.5 border border-border/50">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active & Booking
              </div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {services.filter((s) => s.active !== false).length}
              </div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3.5 border border-border/50">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Inbound Bookings
              </div>
              <div className="text-xl font-black text-foreground mt-1">{bookings.length}</div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3.5 border border-border/50">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Action
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {bookings.filter((b) => b.status === "pending").length}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "services"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            My Services Catalog ({services.length})
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "bookings"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Service Bookings & Orders ({bookings.length})
            {bookings.filter((b) => b.status === "pending").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("share")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "share"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Share2 className="w-4 h-4" />
            Direct Booking & WhatsApp Links
          </button>
        </div>

        {/* ===================== TAB 1: SERVICES CATALOG ===================== */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-foreground">Active Service Offerings</h2>
                <p className="text-xs text-muted-foreground">
                  Each service includes pricing, video demonstrations, portfolio samples, and instant booking buttons.
                </p>
              </div>

              <Button
                onClick={handleOpenNewService}
                className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-white shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add New Service
              </Button>
            </div>

            {loading ? (
              <div className="py-20 text-center text-muted-foreground text-xs animate-pulse">
                Loading your business services...
              </div>
            ) : services.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border-dashed border-2 space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-foreground">No services listed yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Attract ready clients by publishing your first service with pricing, turnaround time, portfolio samples, and a YouTube walkthrough.
                  </p>
                </div>
                <Button onClick={handleOpenNewService} className="rounded-xl font-bold gap-2 text-xs">
                  <Plus className="w-4 h-4" /> Create First Service Offering
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((svc, idx) => {
                  const hasVideo = !!extractYouTubeId(svc.youtube_video_url);
                  const samplesCount = (svc.samples || []).length;
                  const cover = svc.image_url || supplier?.cover_url || "/placeholder-service.jpg";

                  return (
                    <Card
                      key={svc.id || idx}
                      className={`rounded-3xl border transition-all overflow-hidden flex flex-col justify-between hover:shadow-md ${
                        svc.active !== false
                          ? "border-border/80 hover:border-primary/50 bg-card"
                          : "border-dashed border-muted bg-muted/20 opacity-75"
                      }`}
                    >
                      <div>
                        {/* Cover Image & Badges */}
                        <div className="aspect-[16/9] w-full bg-muted relative overflow-hidden group">
                          {svc.image_url ? (
                            <img
                              src={svc.image_url}
                              alt={svc.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-muted text-muted-foreground">
                              <Briefcase className="w-8 h-8 opacity-40 mb-1" />
                              <span className="text-[11px] font-semibold">{svc.category || "Professional Service"}</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                          {/* Top pill badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
                            <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                              {svc.category || "Service"}
                            </Badge>

                            <div className="flex items-center gap-1.5">
                              {hasVideo && (
                                <button
                                  type="button"
                                  onClick={() => setVideoModalUrl(svc.youtube_video_url || null)}
                                  className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center gap-1 shadow-md hover:scale-105 transition-transform"
                                >
                                  <Play className="w-2.5 h-2.5 fill-white" /> YouTube Video
                                </button>
                              )}
                              {samplesCount > 0 && (
                                <Badge className="bg-purple-600/90 text-white border-0 text-[10px] font-bold">
                                  {samplesCount} Samples
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Bottom Price Pill */}
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <span className="text-white font-extrabold text-sm drop-shadow-md">
                              {svc.price || "Free Quote"}
                            </span>
                            {svc.duration && (
                              <span className="text-white/90 text-[11px] font-semibold flex items-center gap-1 drop-shadow-md">
                                <Clock className="w-3 h-3" /> {svc.duration}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-base text-foreground line-clamp-1 hover:text-primary transition-colors">
                              {svc.title}
                            </h3>
                            <Switch
                              checked={svc.active !== false}
                              onCheckedChange={() => handleToggleServiceActive(idx)}
                              title={svc.active !== false ? "Active (Accepting Bookings)" : "Paused"}
                            />
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {svc.description || "Comprehensive service execution by verified professionals."}
                          </p>

                          {/* Key Deliverables */}
                          {(svc.benefits || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(svc.benefits || []).slice(0, 3).map((b, bi) => (
                                <span
                                  key={bi}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-medium flex items-center gap-1"
                                >
                                  <Check className="w-2.5 h-2.5 text-emerald-600" /> {b}
                                </span>
                              ))}
                              {(svc.benefits || []).length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-muted text-muted-foreground font-semibold">
                                  +{svc.benefits!.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Portfolio Samples Strip */}
                          {samplesCount > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                Work Samples & Case Studies
                              </span>
                              <div className="grid grid-cols-4 gap-1.5">
                                {(svc.samples || []).slice(0, 4).map((sample, sIdx) => (
                                  <button
                                    key={sample.id || sIdx}
                                    type="button"
                                    onClick={() => setSampleModal(sample)}
                                    className="aspect-square rounded-xl bg-muted overflow-hidden relative group/sample border border-border/60 hover:border-primary/50"
                                  >
                                    {sample.image_url ? (
                                      <img
                                        src={sample.image_url}
                                        alt={sample.title}
                                        className="w-full h-full object-cover group-hover/sample:scale-110 transition-transform"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                        #{sIdx + 1}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-5 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditService(svc, idx)}
                            className="h-8 text-xs font-bold gap-1 rounded-xl px-2.5 hover:bg-primary/10 text-primary"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewService(svc)}
                            className="h-8 text-xs font-bold gap-1 rounded-xl px-2.5 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateService(svc)}
                            className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                            title="Duplicate Service"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(idx)}
                            className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                            title="Delete Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: BOOKINGS & INQUIRIES ===================== */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-foreground">Service Bookings & Client Inquiries</h2>
                <p className="text-xs text-muted-foreground">
                  View incoming service requests from your public profile and log offline client orders in real time.
                </p>
              </div>

              <Button
                onClick={() => setManualBookingModalOpen(true)}
                className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-white shadow-xs"
              >
                <Plus className="w-4 h-4" /> Log Client Order
              </Button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-card p-4 rounded-2xl border border-border/80 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search bookings by client name, phone number, or service..."
                  className="pl-9 text-xs rounded-xl h-10"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { key: "ALL", label: `All (${bookings.length})` },
                  { key: "PENDING", label: `Pending (${bookings.filter((b) => b.status === "pending").length})` },
                  { key: "CONFIRMED", label: "Confirmed" },
                  { key: "COMPLETED", label: "Completed" },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={bookingFilter === tab.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBookingFilter(tab.key)}
                    className="rounded-xl text-xs font-bold whitespace-nowrap h-9"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border-dashed border-2 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">No bookings under this filter</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When clients book your services from your public profile or WhatsApp, they will appear here in real time.
                </p>
                <Button
                  onClick={() => setManualBookingModalOpen(true)}
                  variant="outline"
                  className="rounded-xl font-bold text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Phone or Walk-in Booking
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const cleanPhone = (b.customer_phone || "").replace(/\D/g, "");
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${b.customer_name}, I received your booking inquiry for "${b.service_title}" on Bethelincovibe TV. Let's discuss your requirements!`
                  )}`;

                  return (
                    <Card
                      key={b.id}
                      className="p-5 rounded-2xl border border-border/80 hover:border-primary/40 transition-all bg-card shadow-xs"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-base text-foreground">{b.customer_name}</h4>
                            <Badge
                              className={`text-[10px] font-bold ${
                                b.status === "pending"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : b.status === "confirmed" || b.status === "in_progress"
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  : b.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {b.status.toUpperCase().replace("_", " ")}
                            </Badge>

                            {b.source === "manual_entry" && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Manual Entry
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> {b.service_title}
                            {b.service_price && (
                              <span className="text-foreground font-black">({b.service_price})</span>
                            )}
                          </div>

                          {b.preferred_date && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>Target Date: {b.preferred_date}</span>
                            </div>
                          )}

                          {b.message && (
                            <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl border border-border/50 max-w-2xl">
                              "{b.message}"
                            </p>
                          )}
                        </div>

                        {/* Contact & Status Controls */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0">
                          {/* Quick Contact Links */}
                          <div className="flex items-center gap-1.5">
                            {cleanPhone && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 text-xs font-bold rounded-xl gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30"
                              >
                                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                              </Button>
                            )}

                            {b.customer_phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 text-xs font-bold rounded-xl gap-1"
                              >
                                <a href={`tel:${b.customer_phone}`}>
                                  <Phone className="w-3.5 h-3.5" /> Call
                                </a>
                              </Button>
                            )}

                            {b.customer_email && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 text-xs font-bold rounded-xl gap-1"
                              >
                                <a href={`mailto:${b.customer_email}`}>
                                  <Mail className="w-3.5 h-3.5" /> Email
                                </a>
                              </Button>
                            )}
                          </div>

                          {/* Status buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "confirmed")}
                                className="h-8 text-xs font-bold rounded-xl bg-primary text-white"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Confirm Booking
                              </Button>
                            )}

                            {b.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "completed")}
                                className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done
                              </Button>
                            )}

                            {b.status !== "completed" && b.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(b.id, "cancelled")}
                                className="h-8 text-xs text-muted-foreground hover:text-destructive rounded-xl"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: SHARE & PUBLIC LINKS ===================== */}
        {activeTab === "share" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-foreground">Direct Service Catalog Links & Sharing</h2>
              <p className="text-xs text-muted-foreground">
                Share your verified services link with clients on WhatsApp, social media, or email so they can view videos, samples, and book directly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Direct Link Card */}
              <Card className="p-6 rounded-3xl border border-border/80 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Public Service Catalog Link</h3>
                    <p className="text-[11px] text-muted-foreground">Direct address to your verified offerings</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input readOnly value={publicProfileUrl} className="rounded-xl text-xs font-mono h-10 bg-muted/40" />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(publicProfileUrl);
                      toast.success("Public services link copied!");
                    }}
                    className="rounded-xl font-bold text-xs gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                </div>

                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full rounded-xl text-xs font-bold gap-1.5">
                    <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-3.5 h-3.5 text-primary" /> View Public Directory Profile
                    </a>
                  </Button>
                </div>
              </Card>

              {/* WhatsApp Broadcast Card */}
              <Card className="p-6 rounded-3xl border border-border/80 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">WhatsApp Status & Chat Invitation</h3>
                    <p className="text-[11px] text-muted-foreground">Ready-to-share message for your clients</p>
                  </div>
                </div>

                <div className="bg-muted/40 p-3.5 rounded-2xl border border-border/60 text-xs text-foreground/90 leading-relaxed font-mono">
                  {`Hello! We offer verified services on Bethelincovibe TV: ${services
                    .slice(0, 3)
                    .map((s) => s.title)
                    .join(", ")}. Check out our full catalog, portfolio samples, and book us directly here: ${publicProfileUrl}`}
                </div>

                <Button
                  onClick={() => {
                    const text = `Hello! We offer verified services on Bethelincovibe TV: ${services
                      .slice(0, 3)
                      .map((s) => s.title)
                      .join(", ")}. Check out our full catalog, portfolio samples, and book us directly here: ${publicProfileUrl}`;
                    const waShare = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(waShare, "_blank");
                  }}
                  className="w-full rounded-xl text-xs font-extrabold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageCircle className="w-4 h-4" /> Share on WhatsApp Now
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* ===================== RICH SERVICE CREATOR / EDITOR MODAL ===================== */}
        <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black">
                      {editingIndex !== null ? "Edit Service Offering" : "Create New Service Offering"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Fill in pricing, turnaround, YouTube video, and past samples to win high-paying clients.
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAIDetails}
                  className="rounded-xl text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Assistant
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Title & Category */}
              <div className="space-y-2">
                <Label className="text-xs font-black">Service Title *</Label>
                <Input
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="e.g. Turnkey Solar Inverter Installation or Full-Stack Web App"
                  className="rounded-xl text-sm font-bold h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black">Industry / Category</Label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black">Estimated Turnaround / Delivery</Label>
                  <Input
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    placeholder="e.g. 24-48 Hours or 3-5 Days"
                    className="rounded-xl text-xs h-10 font-semibold"
                  />
                </div>
              </div>

              {/* Service Cover Photo & Stock Library Integration */}
              <div className="border border-border/80 rounded-2xl p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-primary" /> Service Cover Photo
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">Attracts 3x more bookings</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {serviceForm.image_url ? (
                    <div className="relative w-full sm:w-44 aspect-[16/10] rounded-xl overflow-hidden border border-border/80 shrink-0 bg-muted/40 shadow-xs">
                      <img
                        src={serviceForm.image_url}
                        alt="Service Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setServiceForm({ ...serviceForm, image_url: "" })}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-destructive text-white rounded-lg p-1 transition-colors"
                        title="Remove Photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full sm:w-44 aspect-[16/10] rounded-xl border-2 border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground shrink-0 bg-muted/20">
                      <Camera className="w-6 h-6 mb-1 opacity-50" />
                      <span className="text-[10px] font-bold">No photo selected</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setStockTarget("cover");
                          setStockPickerOpen(true);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Explore Stock Library
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStockTarget("cover");
                          setStockPickerOpen(true);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        Upload Direct Photo
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Or paste image URL directly:</span>
                      <Input
                        placeholder="https://images.unsplash.com/... or image link"
                        value={serviceForm.image_url}
                        onChange={(e) => setServiceForm({ ...serviceForm, image_url: e.target.value })}
                        className="rounded-xl text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" /> Pricing Structure
                  </Label>
                  <span className="text-xs font-black text-emerald-600">{serviceForm.price || "Free Consultation"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Price Display Text</span>
                    <Input
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                      placeholder="e.g. ₦75,000 or Starting at ₦120,000"
                      className="rounded-xl text-xs h-9 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Pricing Model</span>
                    <select
                      value={serviceForm.pricing_type}
                      onChange={(e) => setServiceForm({ ...serviceForm, pricing_type: e.target.value as any })}
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold"
                    >
                      {PRICING_MODELS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black">Detailed Service Description & Scope</Label>
                <Textarea
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Explain exactly what you do, how you work with clients, and what makes your offering superior..."
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              {/* Deliverables / What's Included */}
              <div className="space-y-2 border border-border/80 rounded-2xl p-4 bg-card">
                <Label className="text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> What's Included / Deliverables
                </Label>

                <div className="flex flex-wrap gap-1.5">
                  {(serviceForm.benefits || []).map((b, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs font-bold pl-2.5 pr-1.5 py-1 rounded-xl bg-primary/10 text-primary border-primary/20 gap-1"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(i)}
                        className="hover:text-destructive transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDeliverable();
                      }
                    }}
                    placeholder="e.g. Free 1-year warranty or 3 revision rounds..."
                    className="rounded-xl text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeliverable}
                    className="rounded-xl text-xs font-bold h-9"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* ================= YouTube Video Integration ================= */}
              <div className="border border-border/80 rounded-2xl p-4 bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-red-600" /> YouTube Video Walkthrough / Demo
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">Boosts inquiries by 80%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste any YouTube URL (watch, youtu.be, embed, or shorts) demonstrating your service or client testimonials.
                </p>

                <Input
                  value={serviceForm.youtube_video_url}
                  onChange={(e) => setServiceForm({ ...serviceForm, youtube_video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="rounded-xl text-xs h-9 font-mono"
                />

                {/* Live YouTube Preview Embed if valid URL */}
                {extractYouTubeId(serviceForm.youtube_video_url) && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground block mb-1">Live Video Preview:</span>
                    <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-border/80 shadow-xs">
                      <iframe
                        src={getYouTubeEmbedUrl(serviceForm.youtube_video_url) || ""}
                        title="YouTube Service Video Preview"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ================= Portfolio Samples & Case Studies ================= */}
              <div className="border border-border/80 rounded-2xl p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" /> Portfolio Samples & Proof of Work
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {(serviceForm.samples || []).length} added
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Showcase real past projects, case study images, and results to prove your excellence to potential clients.
                </p>

                {/* Existing samples list */}
                {(serviceForm.samples || []).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {(serviceForm.samples || []).map((sample) => (
                      <div
                        key={sample.id}
                        className="p-2.5 rounded-xl border border-border/70 bg-muted/30 flex items-start gap-2.5 relative group"
                      >
                        {sample.image_url ? (
                          <img
                            src={sample.image_url}
                            alt={sample.title}
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/60"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 opacity-60" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="font-extrabold text-xs text-foreground truncate">{sample.title}</div>
                          {sample.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {sample.description}
                            </p>
                          )}
                          {sample.link_url && (
                            <a
                              href={sample.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-0.5 font-semibold"
                            >
                              Live link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSample(sample.id)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Remove Sample"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new sample button or inline mini form */}
                {!showAddSampleForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddSampleForm(true)}
                    className="w-full rounded-xl text-xs font-bold gap-1.5 border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project Sample / Case Study
                  </Button>
                ) : (
                  <div className="p-3 bg-muted/40 rounded-2xl border border-border/70 space-y-2.5">
                    <span className="text-xs font-extrabold text-foreground block">New Sample Project</span>
                    <Input
                      placeholder="Sample Project Title (e.g. 5kVA Solar Setup for Estate Clinic)..."
                      value={sampleForm.title}
                      onChange={(e) => setSampleForm({ ...sampleForm, title: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Screenshot / Image URL (e.g. https://...)..."
                        value={sampleForm.image_url}
                        onChange={(e) => setSampleForm({ ...sampleForm, image_url: e.target.value })}
                        className="rounded-xl text-xs h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStockTarget("sample");
                          setStockPickerOpen(true);
                        }}
                        className="rounded-xl text-xs font-bold h-9 px-2.5 shrink-0 gap-1"
                      >
                        <Camera className="w-3.5 h-3.5 text-primary" /> Stock / Upload
                      </Button>
                    </div>
                    <Input
                      placeholder="Short result summary (e.g. 24/7 power achieved with zero grid outages)..."
                      value={sampleForm.description}
                      onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />
                    <Input
                      placeholder="Optional External Link / Case study URL..."
                      value={sampleForm.link_url}
                      onChange={(e) => setSampleForm({ ...sampleForm, link_url: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddSampleForm(false)}
                        className="rounded-xl text-xs h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveSample}
                        className="rounded-xl text-xs font-bold h-8 bg-primary text-white"
                      >
                        Save Sample
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Image URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black">Cover Image / Flyer URL</Label>
                <Input
                  value={serviceForm.image_url}
                  onChange={(e) => setServiceForm({ ...serviceForm, image_url: e.target.value })}
                  placeholder="https://... (Direct image or flyer creative link)"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Direct Booking / Link */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black">Custom Booking Link (Optional)</Label>
                <Input
                  value={serviceForm.link_url}
                  onChange={(e) => setServiceForm({ ...serviceForm, link_url: e.target.value })}
                  placeholder="e.g. Custom Calendly or WhatsApp URL"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between border border-border/80 rounded-2xl p-3.5 bg-muted/20">
                <div>
                  <Label className="text-xs font-black">Accept Inquiries & Bookings</Label>
                  <p className="text-[11px] text-muted-foreground">
                    When active, customers can click "Book Service" directly on your public catalog.
                  </p>
                </div>
                <Switch
                  checked={serviceForm.active !== false}
                  onCheckedChange={(v) => setServiceForm({ ...serviceForm, active: v })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setServiceModalOpen(false)}
                disabled={saving}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveService}
                disabled={saving}
                className="font-black rounded-xl text-xs bg-primary text-white shadow-md"
              >
                {saving ? "Saving Realtime Service…" : "Save & Publish Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===================== LOG MANUAL BOOKING MODAL ===================== */}
        <Dialog open={manualBookingModalOpen} onOpenChange={setManualBookingModalOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black">Log Client Booking / Order</DialogTitle>
                  <DialogDescription className="text-xs">
                    Record offline walk-ins, phone calls, or WhatsApp clients into your schedule.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-black">Client Full Name *</Label>
                <Input
                  value={manualBooking.customerName}
                  onChange={(e) => setManualBooking({ ...manualBooking, customerName: e.target.value })}
                  placeholder="e.g. Chief Emeka Adeleke"
                  className="rounded-xl text-xs h-9 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-black">Phone Number *</Label>
                  <Input
                    value={manualBooking.customerPhone}
                    onChange={(e) => setManualBooking({ ...manualBooking, customerPhone: e.target.value })}
                    placeholder="08031234567"
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black">Email (Optional)</Label>
                  <Input
                    value={manualBooking.customerEmail}
                    onChange={(e) => setManualBooking({ ...manualBooking, customerEmail: e.target.value })}
                    placeholder="client@gmail.com"
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-black">Service Requested</Label>
                {services.length > 0 ? (
                  <select
                    value={manualBooking.serviceTitle}
                    onChange={(e) => setManualBooking({ ...manualBooking, serviceTitle: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold"
                  >
                    <option value="">Select an active service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title} ({s.price || "Custom"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={manualBooking.serviceTitle}
                    onChange={(e) => setManualBooking({ ...manualBooking, serviceTitle: e.target.value })}
                    placeholder="Service title..."
                    className="rounded-xl text-xs h-9"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-black">Agreed Price (₦)</Label>
                  <Input
                    value={manualBooking.servicePrice}
                    onChange={(e) => setManualBooking({ ...manualBooking, servicePrice: e.target.value })}
                    placeholder="e.g. ₦85,000"
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black">Target Date</Label>
                  <Input
                    type="date"
                    value={manualBooking.preferredDate}
                    onChange={(e) => setManualBooking({ ...manualBooking, preferredDate: e.target.value })}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-black">Client Notes / Scope</Label>
                <Textarea
                  rows={2}
                  value={manualBooking.message}
                  onChange={(e) => setManualBooking({ ...manualBooking, message: e.target.value })}
                  placeholder="Special client requests, delivery location, or deposit status..."
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button
                variant="outline"
                onClick={() => setManualBookingModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateManualBooking}
                className="font-bold rounded-xl text-xs bg-primary text-white"
              >
                Save Client Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===================== YOUTUBE VIDEO POPUP MODAL ===================== */}
        {videoModalUrl && (
          <Dialog open={!!videoModalUrl} onOpenChange={(open) => !open && setVideoModalUrl(null)}>
            <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden bg-black border-0">
              <div className="aspect-[16/9] w-full bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(videoModalUrl) || ""}
                  title="YouTube Service Video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ===================== SAMPLE DETAIL LIGHTBOX MODAL ===================== */}
        {sampleModal && (
          <Dialog open={!!sampleModal} onOpenChange={(open) => !open && setSampleModal(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden bg-card border-border/80">
              {sampleModal.image_url && (
                <div className="aspect-[16/9] w-full bg-black overflow-hidden">
                  <img src={sampleModal.image_url} alt={sampleModal.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 space-y-3">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-lg font-black text-foreground">{sampleModal.title}</DialogTitle>
                </DialogHeader>
                {sampleModal.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{sampleModal.description}</p>
                )}
                {sampleModal.link_url && (
                  <Button asChild variant="outline" className="w-full rounded-xl text-xs font-bold gap-1.5 mt-2">
                    <a href={sampleModal.link_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" /> Visit Live Project / Result
                    </a>
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ===================== PUBLIC CARD PREVIEW MODAL ===================== */}
        {previewService && (
          <Dialog open={!!previewService} onOpenChange={(open) => !open && setPreviewService(null)}>
            <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border/80">
              <DialogHeader>
                <DialogTitle className="text-base font-black">Public Service Card Preview</DialogTitle>
                <DialogDescription className="text-xs">
                  This is exactly how potential customers see your service on Bethelincovibe TV Directory.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <FeaturedServiceCard
                  service={{
                    title: previewService.title,
                    description: previewService.description,
                    price: previewService.price,
                    image_url: previewService.image_url,
                    duration: previewService.duration,
                    category: previewService.category,
                    benefits: previewService.benefits,
                    link_url: previewService.link_url,
                  }}
                  businessId={supplier?.id}
                  businessName={supplier?.name || profile?.display_name || "Verified Business"}
                  ownerUserId={user?.id}
                  businessPhone={supplier?.phone || profile?.whatsapp}
                  businessWhatsApp={supplier?.phone || profile?.whatsapp}
                  isVerified={true}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ===================== STOCK PHOTO LIBRARY & DIRECT UPLOAD MODAL ===================== */}
        <StockPhotoPickerModal
          open={stockPickerOpen}
          onOpenChange={setStockPickerOpen}
          defaultCategory={serviceForm.category}
          currentPhotoUrl={stockTarget === "cover" ? serviceForm.image_url : sampleForm.image_url}
          onSelectPhoto={(url) => {
            if (stockTarget === "cover") {
              setServiceForm({ ...serviceForm, image_url: url });
            } else {
              setSampleForm({ ...sampleForm, image_url: url });
            }
          }}
        />
      </div>
    </>
  );
}
