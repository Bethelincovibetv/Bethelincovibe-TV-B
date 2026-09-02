import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Share2,
  Download,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  LogOut,
  Calendar,
  Eye,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Upload,
  Lock,
  Radio,
  FileText,
  MapPin,
  Check,
  Trash2,
  Megaphone,
  Settings,
  HelpCircle,
  Info,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatVCardString,
  downloadVcfContact,
  downloadBatchVcfContacts,
  downloadGoogleContactsCsv,
  getWhatsAppDirectLink,
  shareContactToDevice,
  requestGoogleContactsConsent,
  getStoredGoogleSession,
  clearGoogleSession,
  addContactToGoogle,
  GoogleAccountSession,
  getEffectiveGoogleClientId,
  setCustomGoogleClientId,
  DEFAULT_GOOGLE_CLIENT_ID,
} from "@/services/googleContactsService";
import {
  BUSINESS_CATEGORIES,
  LAGOS_LOCATIONS,
  NetworkMember,
  ConnectionLog,
  StatusAdBooking,
  UserEnginePreferences,
  getConnectionLogs,
  recordConnectionLog,
  getUserEnginePreferences,
  saveUserEnginePreferences,
  getStatusAdBookings,
  createStatusAdBooking,
  updateBookingStatus,
  clearAllEngineData,
  refreshVerifiedNetworkMembers,
} from "@/services/whatsappEngineService";

export default function WhatsAppStatusEngine() {
  const { user } = useAuth();
  const [googleSession, setGoogleSession] = useState<GoogleAccountSession | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [activeTab, setActiveTab] = useState("exchange");

  // Google OAuth Guide & Custom Client ID Dialogs
  const [googleGuideOpen, setGoogleGuideOpen] = useState(false);
  const [googleConfigOpen, setGoogleConfigOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getEffectiveGoogleClientId());

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Lagos Locations");

  // Exchange logs & Preferences
  const [networkMembers, setNetworkMembers] = useState<NetworkMember[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [preferences, setPreferences] = useState<UserEnginePreferences>(getUserEnginePreferences());
  const [bookings, setBookings] = useState<StatusAdBooking[]>([]);

  // Action States
  const [connectingContactId, setConnectingContactId] = useState<string | null>(null);
  const [batchConnecting, setBatchConnecting] = useState(false);

  // Dialogs
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingConnectMember, setPendingConnectMember] = useState<NetworkMember | null>(null);

  // Ad Booking Modal
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [targetCreator, setTargetCreator] = useState<NetworkMember | null>(null);
  const [bookingForm, setBookingForm] = useState({
    campaignTitle: "",
    caption: "",
    mediaUrl: "",
    targetDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    slotCount: 1,
    advertiserName: user?.email ? user.email.split("@")[0] : "Lagos Entrepreneur",
    advertiserPhone: "",
    advertiserEmail: user?.email || "",
  });

  // Proof Submission Modal
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedBookingForProof, setSelectedBookingForProof] = useState<StatusAdBooking | null>(null);
  const [proofScreenshotUrl, setProofScreenshotUrl] = useState("");
  const [proofViewerCount, setProofViewerCount] = useState(850);

  // Load initial states
  useEffect(() => {
    let active = true;
    setGoogleSession(getStoredGoogleSession());
    setConnectionLogs(getConnectionLogs());
    setBookings(getStatusAdBookings());
    refreshVerifiedNetworkMembers()
      .then((members) => { if (active) setNetworkMembers(members); })
      .catch((error) => { if (active) toast.error(error?.message || "Unable to load the verified WhatsApp network."); });
    return () => { active = false; };
  }, []);

  // Handle Google OAuth Consent
  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const session = await requestGoogleContactsConsent();
      setGoogleSession(session);
      toast.success("Google Contacts connected successfully! You can now sync verified contacts.");
    } catch (err: any) {
      const errMsg = err.message || "";
      // If error indicates Google Cloud testing mode or access blocked, show helpful guide dialog
      if (
        errMsg.toLowerCase().includes("testing") ||
        errMsg.toLowerCase().includes("access_denied") ||
        errMsg.toLowerCase().includes("project owner") ||
        errMsg.toLowerCase().includes("blocked")
      ) {
        setGoogleGuideOpen(true);
        toast.info("Google OAuth is currently in developer testing mode. Universal 1-Click sync is active with zero restrictions!");
      } else {
        toast.error(errMsg || "Google authorization failed");
      }
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    if (confirm("Disconnect Google Contacts? Future contact syncs will use Universal 1-Click Mode.")) {
      clearGoogleSession();
      setGoogleSession(null);
      toast.success("Google Contacts disconnected. Universal sync mode is active.");
    }
  };

  // Save custom Google Client ID
  const handleSaveCustomClientId = () => {
    setCustomGoogleClientId(clientIdInput.trim());
    setGoogleConfigOpen(false);
    toast.success("Google Client ID updated! Re-authorizing will use this credential.");
  };

  // Trigger Mutual Connection
  const initiateConnect = (member: NetworkMember) => {
    setPendingConnectMember(member);
    setConsentDialogOpen(true);
  };

  const executeMutualConnect = async () => {
    if (!pendingConnectMember) return;
    const member = pendingConnectMember;
    setConsentDialogOpen(false);
    setConnectingContactId(member.id);

    try {
      let syncMethod: "google_api" | "vcf_export" = "vcf_export";
      let googleResourceName: string | undefined = undefined;

      // 1. If Google OAuth session is active, also sync to Google People API
      if (googleSession?.accessToken) {
        try {
          const result = await addContactToGoogle(googleSession.accessToken, {
            givenName: member.name,
            phone: member.phone,
            email: member.email,
            businessName: member.businessName,
            category: member.category,
            location: member.location,
            notes: member.bio,
          });
          if (result.success) {
            syncMethod = "google_api";
            googleResourceName = result.resourceName;
          }
        } catch {
          // Soft fallback to device sync
        }
      }

      // 2. Always trigger Universal Device / Contact Card download
      await shareContactToDevice({
        givenName: member.name,
        phone: member.phone,
        email: member.email,
        businessName: member.businessName,
        category: member.category,
        location: member.location,
        notes: member.bio,
      });

      // 3. Record log
      const log = recordConnectionLog({
        contactId: member.id,
        contactName: member.name,
        businessName: member.businessName,
        category: member.category,
        phone: member.phone,
        method: syncMethod,
        googleResourceName,
        mutualConfirmed: true,
      });
      setConnectionLogs((prev) => [log, ...prev.filter((p) => p.contactId !== member.id)]);

      toast.success(
        `Added ${member.name} (${member.businessName}) to your contacts!`,
        {
          action: {
            label: "Open WhatsApp",
            onClick: () => {
              window.open(getWhatsAppDirectLink(member.phone, member.name, member.businessName), "_blank");
            },
          },
        }
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to perform contact sync");
    } finally {
      setConnectingContactId(null);
      setPendingConnectMember(null);
    }
  };

  // Fallback vCard Download
  const handleDownloadVcard = (member: NetworkMember) => {
    downloadVcfContact({
      givenName: member.name,
      phone: member.phone,
      email: member.email,
      businessName: member.businessName,
      category: member.category,
      location: member.location,
      notes: member.bio,
    });
    const log = recordConnectionLog({
      contactId: member.id,
      contactName: member.name,
      businessName: member.businessName,
      category: member.category,
      phone: member.phone,
      method: "vcf_export",
      mutualConfirmed: true,
    });
    setConnectionLogs((prev) => [log, ...prev.filter((p) => p.contactId !== member.id)]);
    toast.success(`Downloaded .VCF contact card for ${member.name}`);
  };

  // Direct WhatsApp Link Handshake
  const handleDirectWhatsAppChat = (member: NetworkMember) => {
    const url = getWhatsAppDirectLink(member.phone, member.name, member.businessName);
    window.open(url, "_blank");
  };

  // Bulk Auto-Sync in Niche (Works with Google People API or Universal VCF)
  const handleBatchSyncNiche = async () => {
    const unsynced = filteredMembers.filter(
      (m) => !connectionLogs.some((l) => l.contactId === m.id)
    );
    if (unsynced.length === 0) {
      toast.info("All filtered contacts are already in your network!");
      return;
    }

    const batchToSync = unsynced.slice(0, 5);
    setBatchConnecting(true);

    if (googleSession?.accessToken) {
      // Direct Google Cloud API Sync
      let successCount = 0;
      for (const member of batchToSync) {
        const res = await addContactToGoogle(googleSession.accessToken, {
          givenName: member.name,
          phone: member.phone,
          email: member.email,
          businessName: member.businessName,
          category: member.category,
          location: member.location,
        });
        if (res.success) {
          recordConnectionLog({
            contactId: member.id,
            contactName: member.name,
            businessName: member.businessName,
            category: member.category,
            phone: member.phone,
            method: "google_api",
            googleResourceName: res.resourceName,
            mutualConfirmed: true,
          });
          successCount++;
        }
      }
      setConnectionLogs(getConnectionLogs());
      setBatchConnecting(false);
      toast.success(`Batch synced ${successCount} verified Lagos contacts to your Google Account!`);
    } else {
      // Universal Batch VCF Download (1 tap import for any phone or Google Contacts)
      downloadBatchVcfContacts(
        batchToSync.map((m) => ({
          givenName: m.name,
          phone: m.phone,
          email: m.email,
          businessName: m.businessName,
          category: m.category,
          location: m.location,
          notes: m.bio,
        })),
        "Bethelincovibe_Lagos_WhatsApp_Network_Batch.vcf"
      );

      // Record logs
      batchToSync.forEach((member) => {
        recordConnectionLog({
          contactId: member.id,
          contactName: member.name,
          businessName: member.businessName,
          category: member.category,
          phone: member.phone,
          method: "vcf_export",
          mutualConfirmed: true,
        });
      });
      setConnectionLogs(getConnectionLogs());
      setBatchConnecting(false);
      toast.success(`Generated 1-Click Universal Batch contact file for ${batchToSync.length} entrepreneurs!`);
    }
  };

  // Export to Google Contacts CSV
  const handleExportGoogleCsv = () => {
    downloadGoogleContactsCsv(
      filteredMembers.map((m) => ({
        givenName: m.name,
        phone: m.phone,
        email: m.email,
        businessName: m.businessName,
        category: m.category,
        location: m.location,
        notes: m.bio,
      })),
      `Google_Contacts_Bethelincovibe_${selectedCategory.replace(/\s+/g, "_")}.csv`
    );
    toast.success("Exported official Google Contacts CSV! You can import it anytime at contacts.google.com");
  };

  // Filter Members
  const filteredMembers = useMemo(() => {
    return networkMembers.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bio.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "All Categories" || m.category === selectedCategory;

      const matchesLoc =
        selectedLocation === "All Lagos Locations" || m.location.includes(selectedLocation);

      return matchesSearch && matchesCat && matchesLoc;
    });
  }, [networkMembers, searchQuery, selectedCategory, selectedLocation]);

  // Creators open for Status Ads
  const adCreators = useMemo(() => {
    return networkMembers.filter((m) => m.openForAds);
  }, [networkMembers]);

  // Submit Ad Booking
  const handleOpenBookingDialog = (creator: NetworkMember) => {
    setTargetCreator(creator);
    setBookingForm((prev) => ({
      ...prev,
      slotCount: 1,
    }));
    setBookingDialogOpen(true);
  };

  const handleSubmitBooking = () => {
    if (!targetCreator) return;
    if (!bookingForm.campaignTitle.trim() || !bookingForm.caption.trim()) {
      toast.error("Please provide campaign title and WhatsApp status caption text.");
      return;
    }

    const costPerSlot = targetCreator.ratePerPost || 2500;
    const total =
      bookingForm.slotCount === 3 && targetCreator.bundlePrice
        ? targetCreator.bundlePrice
        : costPerSlot * bookingForm.slotCount;

    const newBooking = createStatusAdBooking({
      creatorId: targetCreator.id,
      creatorName: targetCreator.name,
      advertiserId: user?.id || "guest-adv",
      advertiserName: bookingForm.advertiserName,
      advertiserPhone: bookingForm.advertiserPhone,
      advertiserEmail: bookingForm.advertiserEmail,
      campaignTitle: bookingForm.campaignTitle,
      caption: bookingForm.caption,
      mediaUrl: bookingForm.mediaUrl,
      targetDate: bookingForm.targetDate,
      slotCount: bookingForm.slotCount,
      totalAmount: total,
    });

    setBookings((prev) => [newBooking, ...prev]);
    setBookingDialogOpen(false);
    toast.success(
      `Status Ad booking submitted for ₦${total.toLocaleString()}! The creator will review and post.`
    );
  };

  // Submit Proof
  const handleOpenProofDialog = (booking: StatusAdBooking) => {
    setSelectedBookingForProof(booking);
    setProofScreenshotUrl(booking.proofScreenshotUrl || "");
    setProofViewerCount(booking.proofViewerCount || 850);
    setProofDialogOpen(true);
  };

  const handleSaveProof = () => {
    if (!selectedBookingForProof) return;
    if (!proofScreenshotUrl.trim()) {
      toast.error("Please provide the URL or image link of your WhatsApp Status screenshot.");
      return;
    }
    const updated = updateBookingStatus(selectedBookingForProof.id, {
      status: "posted_with_proof",
      proofScreenshotUrl,
      proofViewerCount,
      proofSubmittedAt: new Date().toISOString(),
    });
    setBookings(updated);
    setProofDialogOpen(false);
    toast.success("Live status proof submitted! Earnings credited to your pending balance.");
  };

  // Update Preferences
  const handleSavePrefs = (newPrefs: UserEnginePreferences) => {
    setPreferences(newPrefs);
    saveUserEnginePreferences(newPrefs);
    toast.success("WhatsApp Status Engine preferences updated");
  };

  // NDPR Data Deletion
  const handleClearAllData = () => {
    if (
      confirm(
        "Are you sure you want to delete all stored connection logs and preferences? This cannot be undone."
      )
    ) {
      clearAllEngineData();
      clearGoogleSession();
      setGoogleSession(null);
      setConnectionLogs([]);
      setBookings([]);
      setPreferences(getUserEnginePreferences());
      toast.success("All personal connection data has been deleted under NDPR standards.");
    }
  };

  // Total reach estimate
  const totalVerifiedContacts = connectionLogs.length;
  const estimatedReach = totalVerifiedContacts * 850;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-28">
      <SEO
        title={`WhatsApp Status Engine — Mutual Network & Status Monetization | ${SITE_NAME}`}
        description="Grow your verified WhatsApp business network with mutual Google Contacts exchange and monetize your WhatsApp status with paid advertiser slots in Lagos."
        url="/whatsapp-engine"
        type="website"
        image={PAGE_OG_IMAGES.whatsappEngine()}
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-md font-bold text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Lagos Growth Engine
              </Badge>
              <Badge className="bg-emerald-400/30 text-white border-emerald-300/40 font-bold text-xs">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-200" />
                Universal 1-Click & Google Cloud Sync
              </Badge>
              <Badge className="bg-amber-400/30 text-white border-amber-300/40 font-bold text-xs">
                ⚡ 100% Open to All Accounts
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              WhatsApp Status Engine
            </h1>
            <p className="text-sm sm:text-base text-white/90 font-medium">
              Expand your WhatsApp audience through verified mutual contact exchange and turn your daily status into a high-earning ad channel.
            </p>
          </div>

          {/* Quick Google OAuth & Universal Status */}
          <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shrink-0 flex flex-col gap-3 min-w-[260px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">
                Connection Status
              </span>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  googleSession ? "bg-emerald-300 animate-pulse" : "bg-emerald-400"
                )}
              />
            </div>

            {googleSession ? (
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {googleSession.userEmail || "Google Cloud Connected"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnectGoogle}
                    className="h-8 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl gap-1 flex-1"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Disconnect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGoogleConfigOpen(true)}
                    className="h-8 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl px-2.5"
                    title="OAuth Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-white font-semibold mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span>Universal 1-Click Sync Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleConnectGoogle}
                    disabled={connectingGoogle}
                    className="flex-1 h-9 bg-white text-emerald-800 hover:bg-white/90 font-extrabold text-xs rounded-xl shadow-md gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {connectingGoogle ? "Connecting..." : "Connect Google Cloud"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGoogleGuideOpen(true)}
                    className="h-9 w-9 p-0 bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl"
                    title="Why did Google show project owner notice?"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
          <div className="bg-black/15 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[11px] text-white/70 font-semibold block">Synced Contacts</span>
            <span className="text-xl sm:text-2xl font-black text-white">{totalVerifiedContacts}</span>
          </div>
          <div className="bg-black/15 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[11px] text-white/70 font-semibold block">Est. Status Reach</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {estimatedReach > 0 ? `${estimatedReach.toLocaleString()}+` : "850+"}
            </span>
          </div>
          <div className="bg-black/15 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[11px] text-white/70 font-semibold block">Status Ad Rate</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              ₦{preferences.ratePerPost.toLocaleString()}
            </span>
          </div>
          <div className="bg-black/15 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[11px] text-white/70 font-semibold block">Ad Bookings</span>
            <span className="text-xl sm:text-2xl font-black text-white">{bookings.length}</span>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/70 p-1 rounded-2xl border flex-wrap h-auto">
            <TabsTrigger
              value="exchange"
              className="rounded-xl font-extrabold text-xs sm:text-sm py-2 px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Users className="h-4 w-4 text-emerald-600" />
              Exchange Hub
            </TabsTrigger>
            <TabsTrigger
              value="monetize"
              className="rounded-xl font-extrabold text-xs sm:text-sm py-2 px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Status Monetization
              {bookings.filter((b) => b.status === "pending").length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="marketplace"
              className="rounded-xl font-extrabold text-xs sm:text-sm py-2 px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Megaphone className="h-4 w-4 text-indigo-600" />
              Advertiser Marketplace
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-xl font-extrabold text-xs sm:text-sm py-2 px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <FileCheck className="h-4 w-4 text-violet-600" />
              Connection History ({connectionLogs.length})
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="rounded-xl font-extrabold text-xs sm:text-sm py-2 px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Privacy & NDPR
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConnectionLogs(getConnectionLogs());
              setBookings(getStatusAdBookings());
              toast.success("Refreshed WhatsApp Engine data");
            }}
            className="h-9 rounded-xl text-xs font-bold gap-1 text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* TAB 1: EXCHANGE HUB */}
        <TabsContent value="exchange" className="space-y-6">
          {/* Universal & Cloud Sync Banner */}
          <Card className="border-emerald-500/30 bg-emerald-500/5 rounded-3xl shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-foreground">
                      Universal 1-Click Mutual Contact Exchange
                    </h3>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-black">
                      No Google Blockers
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                    Every Lagos entrepreneur on this platform can connect instantly without permission barriers. Click "Save & Connect" to instantly save contact details to your phone and start mutual WhatsApp status viewing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap self-stretch lg:self-center justify-start lg:justify-end">
                <Button
                  size="sm"
                  onClick={handleBatchSyncNiche}
                  disabled={batchConnecting}
                  className="h-9 px-4 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {batchConnecting ? "Syncing..." : "⚡ Auto-Sync 5 Contacts"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportGoogleCsv}
                  className="h-9 px-3 rounded-xl font-bold text-xs gap-1.5 bg-background shadow-2xs"
                  title="Export official Google Contacts CSV"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  Google CSV
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setGoogleGuideOpen(true)}
                  className="h-9 px-2.5 rounded-xl font-bold text-xs text-muted-foreground gap-1"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                  OAuth Guide
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Lagos business, niche or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-[170px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {BUSINESS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-[180px]">
                  <SelectValue placeholder="Lagos Location" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LAGOS_LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Member Pool Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const isConnected = connectionLogs.some((l) => l.contactId === member.id);
              const isConnecting = connectingContactId === member.id;

              return (
                <Card
                  key={member.id}
                  className={cn(
                    "rounded-3xl border transition-all duration-200 shadow-xs overflow-hidden flex flex-col justify-between",
                    isConnected ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-primary/40"
                  )}
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-foreground">{member.name}</h4>
                          {member.verified && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-black px-1.5 py-0">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-bold text-primary mt-0.5">{member.businessName}</p>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-extrabold shrink-0 bg-background">
                        <Eye className="h-3 w-3 mr-1 text-emerald-600" />
                        {member.statusViewsEstimate.toLocaleString()} Views
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                      <span className="truncate">{member.location}</span>
                    </div>

                    <Badge variant="secondary" className="text-[10px] font-bold rounded-lg w-fit">
                      {member.category}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {member.bio}
                    </p>

                    {member.openForAds && (
                      <div className="bg-background/80 p-2 rounded-xl border border-dashed flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">Status Ad Slot:</span>
                        <span className="font-extrabold text-emerald-600">
                          ₦{member.ratePerPost?.toLocaleString()} / 24hrs
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1 border-t">
                      {isConnected ? (
                        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-2 rounded-xl text-xs font-extrabold border border-emerald-500/20">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Connected</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDirectWhatsAppChat(member)}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 font-bold shadow-2xs"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => initiateConnect(member)}
                            disabled={isConnecting}
                            className="col-span-2 h-9 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1"
                          >
                            <Users className="h-3.5 w-3.5" />
                            {isConnecting ? "Syncing..." : "Save & Sync"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDirectWhatsAppChat(member)}
                            className="h-9 rounded-xl font-bold text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 px-2"
                            title="Chat directly on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Chat
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: STATUS MONETIZATION */}
        <TabsContent value="monetize" className="space-y-6">
          {/* Rate Card & Creator Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 rounded-3xl border shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Your Status Rate Card</h3>
                  <p className="text-[11px] text-muted-foreground">Set your advertising pricing</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border">
                  <div>
                    <Label className="text-xs font-extrabold">Open to Advertisers</Label>
                    <p className="text-[10px] text-muted-foreground">Accept status sponsorship offers</p>
                  </div>
                  <Switch
                    checked={preferences.openForAds}
                    onCheckedChange={(v) => handleSavePrefs({ ...preferences, openForAds: v })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Price per 24hr Status Slot (₦)</Label>
                  <Input
                    type="number"
                    value={preferences.ratePerPost}
                    onChange={(e) =>
                      setPreferences({ ...preferences, ratePerPost: Number(e.target.value) || 0 })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">3-Post Bundle Discount (₦)</Label>
                  <Input
                    type="number"
                    value={preferences.bundlePrice}
                    onChange={(e) =>
                      setPreferences({ ...preferences, bundlePrice: Number(e.target.value) || 0 })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Audience Description</Label>
                  <Textarea
                    rows={2}
                    value={preferences.audienceNiche}
                    onChange={(e) =>
                      setPreferences({ ...preferences, audienceNiche: e.target.value })
                    }
                    placeholder="e.g. 1.2k+ Lagos University Students and Fashion Enthusiasts"
                    className="text-xs rounded-xl"
                  />
                </div>

                <Button
                  onClick={() => handleSavePrefs(preferences)}
                  className="w-full h-9 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  Save Rate Card
                </Button>
              </div>
            </Card>

            {/* Incoming Bookings Queue */}
            <Card className="lg:col-span-2 rounded-3xl border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Status Sponsorship Requests</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Manage advertiser campaigns and submit proof of post
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {bookings.length} Bookings
                </Badge>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl p-4 text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-xs">No Ad Bookings Yet</p>
                  <p className="text-[11px] mt-1">
                    When advertisers book your status space, their creative copy and target dates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border bg-card shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-foreground">
                              {b.campaignTitle}
                            </span>
                            <Badge
                              className={cn(
                                "text-[10px] font-black uppercase px-2 py-0",
                                b.status === "pending" && "bg-amber-500 text-white",
                                b.status === "accepted" && "bg-blue-600 text-white",
                                b.status === "posted_with_proof" && "bg-emerald-600 text-white",
                                b.status === "declined" && "bg-rose-500 text-white"
                              )}
                            >
                              {b.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Advertiser: <strong className="text-foreground">{b.advertiserName}</strong> ({b.advertiserPhone})
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-sm text-emerald-600">
                            ₦{b.totalAmount.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            Target Date: {b.targetDate}
                          </span>
                        </div>
                      </div>

                      <div className="bg-muted/40 p-3 rounded-xl border text-xs space-y-1">
                        <span className="font-bold text-[11px] text-muted-foreground uppercase">
                          Status Copy to Post:
                        </span>
                        <p className="text-foreground whitespace-pre-wrap font-sans text-xs">
                          {b.caption}
                        </p>
                      </div>

                      {b.proofScreenshotUrl && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Proof Submitted: {b.proofViewerCount} live status views recorded</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t flex-wrap">
                        {b.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updated = updateBookingStatus(b.id, { status: "declined" });
                                setBookings(updated);
                                toast.info("Booking request declined");
                              }}
                              className="h-8 text-xs font-bold rounded-xl text-destructive"
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const updated = updateBookingStatus(b.id, { status: "accepted" });
                                setBookings(updated);
                                toast.success("Booking accepted! Please post on scheduled date.");
                              }}
                              className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Accept Booking
                            </Button>
                          </>
                        )}

                        {(b.status === "accepted" || b.status === "pending") && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenProofDialog(b)}
                            className="h-8 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Upload className="h-3.5 w-3.5" /> Submit Live Proof
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: ADVERTISER MARKETPLACE */}
        <TabsContent value="marketplace" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Verified Lagos WhatsApp Status Creators
              </h2>
              <p className="text-xs text-muted-foreground">
                Book status promotion slots on active accounts with 1,000+ daily local views
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adCreators.map((creator) => (
              <Card key={creator.id} className="rounded-3xl border shadow-xs p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm">{creator.name}</h4>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0">
                        Verified
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-primary">{creator.businessName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{creator.location}</p>
                  </div>

                  <Badge className="bg-emerald-600 text-white font-extrabold text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {creator.statusViewsEstimate.toLocaleString()} Views
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{creator.bio}</p>

                <div className="bg-muted/40 p-3 rounded-2xl border space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Single 24h Post:</span>
                    <span className="font-black text-foreground">
                      ₦{creator.ratePerPost?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">3-Post Bundle:</span>
                    <span className="font-black text-emerald-600">
                      ₦{creator.bundlePrice?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleOpenBookingDialog(creator)}
                  className="w-full h-10 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs gap-1.5"
                >
                  <Megaphone className="h-4 w-4" /> Book Status Slot
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: CONNECTION HISTORY LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="rounded-3xl border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm">Transparent Contact Exchange Audit Trail</h3>
                <p className="text-xs text-muted-foreground">
                  Complete record of every contact synced to your Google account or exported via vCard.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold">
                {connectionLogs.length} Total Synced
              </Badge>
            </div>

            {connectionLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No contacts synced yet. Go to the Exchange Hub to connect with Lagos entrepreneurs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground font-bold">
                      <th className="pb-2">Contact Name</th>
                      <th className="pb-2">Business Title</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Phone Number</th>
                      <th className="pb-2">Sync Method</th>
                      <th className="pb-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {connectionLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-2.5 font-bold text-foreground">{log.contactName}</td>
                        <td className="py-2.5 text-muted-foreground">{log.businessName}</td>
                        <td className="py-2.5">
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {log.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-mono text-[11px]">{log.phone}</td>
                        <td className="py-2.5">
                          {log.method === "google_api" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px] font-black">
                              Google People API
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-bold">
                              vCard Export
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-[10px]">
                          {new Date(log.syncedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 5: PRIVACY & NDPR COMPLIANCE */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="rounded-3xl border shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base">NDPR & Google API Privacy Governance</h2>
                <p className="text-xs text-muted-foreground">
                  Your data ownership, consent management, and token controls
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" /> Google API Limited Use Compliance
                </h4>
                <p>
                  Bethelincovibe LEOS uses the official Google Identity Services OAuth 2.0 and Google People API (<code>https://www.googleapis.com/auth/contacts</code>) solely for user-initiated contact creations. We do NOT scrape, index, transfer, or sell your personal address book.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> NDPR Affirmative Mutual Consent
                </h4>
                <p>
                  Every participant in the WhatsApp Status Engine explicitly opts in to exchange business contact cards with fellow Lagos entrepreneurs. You retain the right to pause exchange participation or delete your connection logs at any time.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-bold text-xs text-destructive">Data Deletion & Token Revocation</h4>
                <p className="text-[11px] text-muted-foreground">
                  Permanently purge all local connection logs and revoke the Google OAuth grant.
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAllData}
                className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5 shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Purge Stored Data & Revoke Access
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CONSENT DIALOG BEFORE CONNECT */}
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Users className="h-5 w-5 text-emerald-600" /> Mutual Contact Exchange Consent
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm mutual business networking under NDPR standards
            </DialogDescription>
          </DialogHeader>

          {pendingConnectMember && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <p className="font-bold text-foreground">
                  Connecting with <strong>{pendingConnectMember.name}</strong> will:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
                  <li>Add their verified business number to your Google Contacts.</li>
                  <li>Enable mutual WhatsApp status viewing for both business accounts.</li>
                  <li>Log the exchange in your private Connection Audit Trail.</li>
                </ul>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl border text-[11px] text-muted-foreground">
                Business: <strong className="text-foreground">{pendingConnectMember.businessName}</strong>
                <br />
                Location: <strong className="text-foreground">{pendingConnectMember.location}</strong>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConsentDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executeMutualConnect}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Confirm & Sync to Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AD BOOKING DIALOG */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-600" /> Book WhatsApp Status Ad Slot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sponsor status space on {targetCreator?.name}'s verified WhatsApp account
            </DialogDescription>
          </DialogHeader>

          {targetCreator && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-muted/40 p-3 rounded-2xl border flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-foreground">{targetCreator.name}</span>
                  <p className="text-[11px] text-muted-foreground">{targetCreator.businessName}</p>
                </div>
                <Badge className="bg-emerald-600 text-white text-xs font-black">
                  {targetCreator.statusViewsEstimate.toLocaleString()} Est. Views
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Campaign Headline / Title</Label>
                <Input
                  value={bookingForm.campaignTitle}
                  onChange={(e) => setBookingForm({ ...bookingForm, campaignTitle: e.target.value })}
                  placeholder="e.g. Lagos Black Friday Tech Deals"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status Caption & Copy Text</Label>
                <Textarea
                  rows={3}
                  value={bookingForm.caption}
                  onChange={(e) => setBookingForm({ ...bookingForm, caption: e.target.value })}
                  placeholder="Write the exact text you want posted on their WhatsApp status with discount code and links..."
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Target Broadcast Date</Label>
                  <Input
                    type="date"
                    value={bookingForm.targetDate}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, targetDate: e.target.value })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Slot Package</Label>
                  <Select
                    value={bookingForm.slotCount.toString()}
                    onValueChange={(v) =>
                      setBookingForm({ ...bookingForm, slotCount: Number(v) })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1" className="text-xs">
                        1 Single 24h Post (₦{targetCreator.ratePerPost?.toLocaleString()})
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3-Post Bundle (₦{targetCreator.bundlePrice?.toLocaleString()})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Advertiser Phone (WhatsApp)</Label>
                <Input
                  value={bookingForm.advertiserPhone}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, advertiserPhone: e.target.value })
                  }
                  placeholder="+23480..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookingDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitBooking}
              className="rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirm & Book Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROOF OF POST DIALOG */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" /> Submit WhatsApp Status Proof
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload screenshot of the live status post with viewer metrics
            </DialogDescription>
          </DialogHeader>

          {selectedBookingForProof && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-muted/40 p-3 rounded-2xl border text-xs">
                <p className="font-bold">{selectedBookingForProof.campaignTitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  Advertiser: {selectedBookingForProof.advertiserName} (₦
                  {selectedBookingForProof.totalAmount.toLocaleString()})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Screenshot Image Link / URL</Label>
                <Input
                  value={proofScreenshotUrl}
                  onChange={(e) => setProofScreenshotUrl(e.target.value)}
                  placeholder="https://imgur.com/my-status-proof.png"
                  className="h-9 text-xs rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">
                  Paste the URL of your uploaded WhatsApp status screenshot showing viewer count.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Recorded Status Views Count</Label>
                <Input
                  type="number"
                  value={proofViewerCount}
                  onChange={(e) => setProofViewerCount(Number(e.target.value) || 0)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProofDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveProof}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Verify & Complete Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GOOGLE OAUTH GUIDE DIALOG */}
      <Dialog open={googleGuideOpen} onOpenChange={setGoogleGuideOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Google Connection & OAuth Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              Understand Google Cloud access rules and Universal 1-Click Sync
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                Why Google showed "Access Blocked / Project Owner"?
              </h4>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                By default, Google Cloud OAuth applications are created in <strong>"Testing Mode"</strong>. In Testing Mode, Google strictly limits logins to the developer's registered test emails.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Solution 1: Universal 1-Click Sync (Active for 100% of Accounts)
              </h4>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                You do <strong>not</strong> need Google Cloud sign-in to grow your network! Clicking <strong>"Save & Sync"</strong> or <strong>"Auto-Sync"</strong> instantly creates native contact cards compatible with every Android, iPhone, Windows, and Google Contacts account with zero permission blocks.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                <Settings className="h-4 w-4 text-indigo-600 shrink-0" />
                Solution 2: Enable Public Google Cloud OAuth
              </h4>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-[11px]">
                <li>Open Google Cloud Console &rarr; <strong>APIs &amp; Services</strong> &rarr; <strong>OAuth Consent Screen</strong>.</li>
                <li>Click <strong>"PUBLISH APP"</strong> to switch from <em>Testing</em> to <em>In Production</em>.</li>
                <li>Or add your custom Google Client ID below.</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGoogleGuideOpen(false);
                setGoogleConfigOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-1"
            >
              <Settings className="h-3.5 w-3.5" /> Configure Client ID
            </Button>
            <Button
              size="sm"
              onClick={() => setGoogleGuideOpen(false)}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Got It, Use Universal Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CUSTOM GOOGLE CLIENT ID & CONSOLE CONFIG DIALOG */}
      <Dialog open={googleConfigOpen} onOpenChange={setGoogleConfigOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" /> Google Console & OAuth Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure and test Google Contacts OAuth for <strong>https://bethelincovibetv.com.ng</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Live Connection Status */}
            <div className="p-3 rounded-2xl bg-muted/50 border flex items-center justify-between">
              <div>
                <p className="font-extrabold text-foreground text-xs">Active Session Status</p>
                <p className="text-[11px] text-muted-foreground">
                  {googleSession ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected as {googleSession.userEmail || "Google Account"}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Not currently authenticated
                    </span>
                  )}
                </p>
              </div>
              {googleSession ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnectGoogle}
                  className="rounded-xl text-xs font-bold h-8 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={async () => {
                    await handleConnectGoogle();
                  }}
                  disabled={connectingGoogle}
                  className="rounded-xl text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {connectingGoogle ? "Connecting..." : "Connect Now"}
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Google OAuth Client ID</Label>
              <Input
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="h-9 text-xs rounded-xl font-mono text-[11px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Override with your verified Web Client ID from Google Cloud Console, or leave default.
              </p>
            </div>

            {/* Google Cloud Console URLs with Copy Buttons */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
                  Google Cloud Console Settings
                </p>
                <span className="text-[9px] text-slate-400 font-mono">APIs &amp; Services &gt; Credentials</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-300 font-semibold mb-1">
                    <span>1. Authorized JavaScript Origins:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("https://bethelincovibetv.com.ng");
                        toast.success("Copied https://bethelincovibetv.com.ng to clipboard!");
                      }}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Copy className="h-3 w-3" /> Copy Domain
                    </button>
                  </div>
                  <div className="bg-black/50 p-2 rounded-xl text-[10px] font-mono text-emerald-300 space-y-1 select-all">
                    <div>https://bethelincovibetv.com.ng</div>
                    <div>https://www.bethelincovibetv.com.ng</div>
                    {typeof window !== "undefined" && !window.location.origin.includes("bethelincovibetv.com.ng") && (
                      <div className="text-slate-400">{window.location.origin}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-300 font-semibold mb-1">
                    <span>2. Authorized Redirect URIs:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("https://bethelincovibetv.com.ng/whatsapp-engine");
                        toast.success("Copied Redirect URI to clipboard!");
                      }}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Copy className="h-3 w-3" /> Copy URI
                    </button>
                  </div>
                  <div className="bg-black/50 p-2 rounded-xl text-[10px] font-mono text-emerald-300 space-y-1 select-all">
                    <div>https://bethelincovibetv.com.ng/whatsapp-engine</div>
                    <div>https://www.bethelincovibetv.com.ng/whatsapp-engine</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setClientIdInput(DEFAULT_GOOGLE_CLIENT_ID);
              }}
              className="rounded-xl text-xs"
            >
              Reset to Default
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCustomClientId}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
