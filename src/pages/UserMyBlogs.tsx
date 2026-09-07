import React, { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Sparkles,
  TrendingUp,
  Eye,
  MessageCircle,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  BarChart3,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  RefreshCw,
  Smartphone,
  Globe,
  Loader2,
  Copy,
  Check,
  ImageIcon,
  Camera,
  Upload,
  X,
  Wallet,
  Phone,
  Mail,
  Edit3,
  SlidersHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { getStoredAnalyticsEvents } from "@/lib/analyticsTracker";

const DEFAULT_COST = 1000;

export interface BlogSubmissionItem {
  id: string;
  business_name: string;
  description: string;
  banner_url?: string | null;
  status: string;
  cost_credits: number;
  created_at: string;
  updated_at?: string;
  generated_post_id?: string | null;
  rejection_reason?: string | null;
  website?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  category_id?: string | null;
  blog_post?: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    published_at: string;
    featured_image?: string;
  } | null;
  photos?: string[] | null;
  guest_submission_photos?: Array<{ id: string; image_url: string; caption?: string | null; display_order?: number }>;
  views_count?: number;
  inquiries_count?: number;
  shares_count?: number;
  deleted_at?: string | null;
}

interface UserMyBlogsProps {
  defaultTab?: "my-blogs" | "submit";
}

export default function UserMyBlogs({ defaultTab = "my-blogs" }: UserMyBlogsProps) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL tab handling (allows ?tab=submit)
  const paramTab = searchParams.get("tab");
  const initialMainTab = paramTab === "submit" ? "submit" : defaultTab;
  const [mainTab, setMainTab] = useState<"my-blogs" | "submit">(initialMainTab);

  const [submissions, setSubmissions] = useState<BlogSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "review" | "deleted">("all");

  // Deletion Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<BlogSubmissionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Analytics Modal
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedBlogForStats, setSelectedBlogForStats] = useState<BlogSubmissionItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Update Featured Image Modal State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedBlogForImage, setSelectedBlogForImage] = useState<BlogSubmissionItem | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [updatingImage, setUpdatingImage] = useState(false);

  // Quick Edit Blog Details Modal State
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [blogToEdit, setBlogToEdit] = useState<BlogSubmissionItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    business_name: "",
    description: "",
    website: "",
    contact_phone: "",
    contact_whatsapp: "",
    contact_email: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);

  // Submit Form States
  const [wallet, setWallet] = useState<any>(null);
  const [feeFromSettings, setFeeFromSettings] = useState<number>(DEFAULT_COST);
  const [submitBannerFile, setSubmitBannerFile] = useState<File | null>(null);
  const [submitBannerPreview, setSubmitBannerPreview] = useState<string | null>(null);
  const [submitPhotos, setSubmitPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [submittingBlog, setSubmittingBlog] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [submitCategoryId, setSubmitCategoryId] = useState<string>("");
  const [submitForm, setSubmitForm] = useState({
    business_name: "",
    description: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
  });

  // Sync main tab if searchParam changes
  useEffect(() => {
    if (paramTab === "submit" && mainTab !== "submit") {
      setMainTab("submit");
    } else if (paramTab === "my-blogs" && mainTab !== "my-blogs") {
      setMainTab("my-blogs");
    }
  }, [paramTab]);

  const handleTabChange = (val: string) => {
    const tab = val as "my-blogs" | "submit";
    setMainTab(tab);
    setSearchParams(tab === "submit" ? { tab: "submit" } : {});
  };

  const fetchBlogs = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Fetch user's guest blog submissions with gallery photos
      const { data: subs, error } = await supabase
        .from("guest_blog_submissions")
        .select("*, guest_submission_photos(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Hydrate linked blog_posts
      const postIds = (subs || []).map((s: any) => s.generated_post_id).filter(Boolean);
      const postsMap = new Map<string, any>();
      const commentsMap = new Map<string, number>();

      if (postIds.length > 0) {
        const [{ data: posts }, { data: comments }] = await Promise.all([
          supabase
            .from("blog_posts")
            .select("id, title, slug, published, published_at, featured_image")
            .in("id", postIds),
          supabase
            .from("blog_comments")
            .select("id, post_id")
            .in("post_id", postIds),
        ]);

        (posts || []).forEach((p: any) => postsMap.set(p.id, p));
        (comments || []).forEach((c: any) => {
          commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
        });
      }

      const storedEvents = getStoredAnalyticsEvents();

      // Merge real metrics with zero mock or synthetic formulas
      const merged: BlogSubmissionItem[] = (subs || []).map((s: any) => {
        const linkedPost = s.generated_post_id ? postsMap.get(s.generated_post_id) : null;
        const isPostPublished = Boolean(linkedPost?.published);
        const isDeleted = s.status === "deleted" || Boolean(s.deleted_at);

        // Derive true live status
        let effectiveStatus = s.status;
        if (isDeleted) {
          effectiveStatus = "deleted";
        } else if (isPostPublished || s.status === "published" || s.status === "approved") {
          effectiveStatus = "published";
        }

        // Count real recorded page views for this post
        const realViews = storedEvents.filter((ev) => {
          if (!s.generated_post_id && !linkedPost?.slug) return false;
          return (
            ev.entityId === s.generated_post_id ||
            (linkedPost?.slug && ev.path === `/blog/${linkedPost.slug}`)
          );
        }).length;

        // Count real inquiries/comments
        const realInquiries = s.generated_post_id ? (commentsMap.get(s.generated_post_id) || 0) : 0;

        return {
          ...s,
          status: effectiveStatus,
          blog_post: linkedPost,
          views_count: realViews,
          inquiries_count: realInquiries,
          shares_count: 0,
        };
      });

      setSubmissions(merged);
    } catch (err) {
      console.warn("Failed to load user blogs:", err);
      toast.error("Could not load your business blogs");
    } finally {
      setLoading(false);
    }
  };

  // Fetch submit form pre-requisites
  const fetchSubmitMetadata = async () => {
    if (!user) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setWallet(data));
    supabase.from("site_settings").select("value").eq("key", "business_blog_fee").maybeSingle().then(({ data }) => {
      const n = Number(data?.value);
      if (!Number.isNaN(n) && n >= 0) setFeeFromSettings(n);
    });
    supabase.from("categories").select("id,name,slug").eq("type", "blog").order("name").then(({ data }) => setCategories(data || []));

    // Prefill from user supplier profile if available
    Promise.all([
      supabase.from("suppliers").select("*, categories(id, name, slug)").eq("submitted_by", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: supplier }, { data: profile }]) => {
      if (supplier || profile) {
        setSubmitForm({
          business_name: supplier?.name || profile?.display_name || "",
          description: supplier?.description || profile?.bio || "",
          website: supplier?.website || profile?.social_links?.website || "",
          contact_phone: supplier?.phone || profile?.phone || "",
          contact_whatsapp: supplier?.whatsapp_number || supplier?.whatsapp || profile?.whatsapp || supplier?.phone || "",
          contact_email: profile?.email || user.email || "",
        });
        if (supplier?.category_id) {
          setSubmitCategoryId(supplier.category_id);
        }
      }
    });
  };

  useEffect(() => {
    if (user) {
      fetchBlogs();
      fetchSubmitMetadata();
    }
  }, [user]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
      if (submitBannerPreview) URL.revokeObjectURL(submitBannerPreview);
      submitPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [newImagePreview, submitBannerPreview, submitPhotos]);

  // ----------------------------------------------------
  // FEATURED IMAGE UPDATE ACTION
  // ----------------------------------------------------
  const handleOpenImageModal = (blog: BlogSubmissionItem) => {
    setSelectedBlogForImage(blog);
    setNewImageFile(null);
    setNewImagePreview(null);
    setCustomImageUrl(blog.banner_url || blog.blog_post?.featured_image || "");
    setImageModalOpen(true);
  };

  const handleNewImageFileSelect = (file: File | null) => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    if (!file) {
      setNewImageFile(null);
      setNewImagePreview(null);
      return;
    }
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSaveFeaturedImage = async () => {
    if (!selectedBlogForImage || !user) return;
    try {
      setUpdatingImage(true);
      let finalBannerUrl = customImageUrl.trim();

      // If user uploaded a new file, upload to storage
      if (newImageFile) {
        const ext = newImageFile.name.split(".").pop();
        const filePath = `${user.id}/banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("guest-submissions")
          .upload(filePath, newImageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("guest-submissions").getPublicUrl(filePath);
        finalBannerUrl = data.publicUrl;
      }

      if (!finalBannerUrl) {
        return toast.error("Please select an image file or provide an image URL.");
      }

      // 1. Update guest_blog_submissions
      const { error: subError } = await supabase
        .from("guest_blog_submissions")
        .update({
          banner_url: finalBannerUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBlogForImage.id);

      if (subError) throw subError;

      // 2. If generated_post_id exists, update linked blog_post featured_image
      if (selectedBlogForImage.generated_post_id) {
        await supabase
          .from("blog_posts")
          .update({
            featured_image: finalBannerUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedBlogForImage.generated_post_id);
      }

      // 3. Update local state
      setSubmissions((prev) =>
        prev.map((b) =>
          b.id === selectedBlogForImage.id
            ? {
                ...b,
                banner_url: finalBannerUrl,
                blog_post: b.blog_post
                  ? { ...b.blog_post, featured_image: finalBannerUrl }
                  : b.blog_post,
              }
            : b
        )
      );

      toast.success("Featured banner image updated successfully!");
      setImageModalOpen(false);
      setSelectedBlogForImage(null);
    } catch (err: any) {
      console.error("Error updating image:", err);
      toast.error(err?.message || "Failed to update featured image");
    } finally {
      setUpdatingImage(false);
    }
  };

  // ----------------------------------------------------
  // EDIT BLOG DETAILS ACTION
  // ----------------------------------------------------
  const handleOpenEditDetails = (blog: BlogSubmissionItem) => {
    setBlogToEdit(blog);
    setEditFormData({
      business_name: blog.business_name || "",
      description: blog.description || "",
      website: blog.website || "",
      contact_phone: blog.contact_phone || "",
      contact_whatsapp: blog.contact_whatsapp || "",
      contact_email: blog.contact_email || "",
    });
    setEditDetailsModalOpen(true);
  };

  const handleSaveDetails = async () => {
    if (!blogToEdit || !user) return;
    if (!editFormData.business_name.trim() || !editFormData.description.trim()) {
      return toast.error("Business name and description are required.");
    }
    try {
      setSavingDetails(true);
      const { error } = await supabase
        .from("guest_blog_submissions")
        .update({
          business_name: editFormData.business_name.trim(),
          description: editFormData.description.trim(),
          website: editFormData.website.trim() || null,
          contact_phone: editFormData.contact_phone.trim() || null,
          contact_whatsapp: editFormData.contact_whatsapp.trim() || null,
          contact_email: editFormData.contact_email.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blogToEdit.id);

      if (error) throw error;

      // Update linked post title / excerpt if exists
      if (blogToEdit.generated_post_id) {
        await supabase
          .from("blog_posts")
          .update({
            excerpt: editFormData.description.slice(0, 240),
            updated_at: new Date().toISOString(),
          })
          .eq("id", blogToEdit.generated_post_id);
      }

      setSubmissions((prev) =>
        prev.map((b) =>
          b.id === blogToEdit.id
            ? {
                ...b,
                business_name: editFormData.business_name.trim(),
                description: editFormData.description.trim(),
                website: editFormData.website.trim() || null,
                contact_phone: editFormData.contact_phone.trim() || null,
                contact_whatsapp: editFormData.contact_whatsapp.trim() || null,
                contact_email: editFormData.contact_email.trim() || null,
              }
            : b
        )
      );

      toast.success("Business details updated successfully!");
      setEditDetailsModalOpen(false);
      setBlogToEdit(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update business details");
    } finally {
      setSavingDetails(false);
    }
  };

  // ----------------------------------------------------
  // DELETE BLOG ACTION
  // ----------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!blogToDelete || !user) return;
    try {
      setDeleting(true);
      const deletedTimestamp = new Date().toISOString();

      await supabase
        .from("guest_blog_submissions")
        .update({
          status: "deleted",
          admin_notes: `User deleted on ${deletedTimestamp}`,
        })
        .eq("id", blogToDelete.id);

      if (blogToDelete.generated_post_id) {
        await supabase
          .from("blog_posts")
          .update({ published: false })
          .eq("id", blogToDelete.generated_post_id);
      }

      setSubmissions((prev) =>
        prev.map((b) =>
          b.id === blogToDelete.id
            ? {
                ...b,
                status: "deleted",
                deleted_at: deletedTimestamp,
                blog_post: b.blog_post ? { ...b.blog_post, published: false } : null,
              }
            : b
        )
      );

      toast.success(`"${blogToDelete.business_name}" blog has been archived.`);
      setDeleteModalOpen(false);
      setBlogToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete blog post");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyShareLink = (blog: BlogSubmissionItem) => {
    const slug = blog.blog_post?.slug || blog.generated_post_id;
    if (!slug) return;
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(blog.id);
    toast.success("Blog link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ----------------------------------------------------
  // SUBMIT NEW BUSINESS BLOG FLOW
  // ----------------------------------------------------
  const COST_CREDITS = isAdmin ? 0 : feeFromSettings;
  const balance = wallet?.balance ?? 0;
  const canAfford = isAdmin || balance >= COST_CREDITS;

  const handleSubmitBannerChange = (file: File | null) => {
    if (submitBannerPreview) URL.revokeObjectURL(submitBannerPreview);
    if (!file) {
      setSubmitBannerFile(null);
      setSubmitBannerPreview(null);
      return;
    }
    setSubmitBannerFile(file);
    setSubmitBannerPreview(URL.createObjectURL(file));
  };

  const handleAddSubmitPhotos = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added = Array.from(newFiles).slice(0, 8 - submitPhotos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSubmitPhotos((prev) => [...prev, ...added]);
  };

  const handleRemoveSubmitPhoto = (index: number) => {
    const target = submitPhotos[index];
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setSubmitPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadStorageFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("guest-submissions").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmitNewBlog = async () => {
    if (!user) return;
    if (!submitForm.business_name.trim() || !submitForm.description.trim()) {
      return toast.error("Business name and description are required.");
    }
    if (!canAfford) {
      return toast.error(`Insufficient wallet balance. You need ₦${COST_CREDITS.toLocaleString()}. Please top up your wallet.`);
    }

    try {
      setSubmittingBlog(true);

      // Upload banner if selected
      let bannerUrl: string | null = null;
      if (submitBannerFile) {
        bannerUrl = await uploadStorageFile(submitBannerFile, "banner");
      }

      // Upload gallery photos if any
      const photoUrls: string[] = [];
      for (const p of submitPhotos) {
        const url = await uploadStorageFile(p.file, "photo");
        photoUrls.push(url);
      }

      // Deduct wallet if not admin and fee > 0
      if (!isAdmin && COST_CREDITS > 0) {
        const newBal = balance - COST_CREDITS;
        const { error: wErr } = await supabase
          .from("wallets")
          .update({ balance: newBal, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (wErr) throw wErr;

        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "guest_blog_fee",
          amount: -COST_CREDITS,
          balance_after: newBal,
          description: `Business Blog Promotion Submission: ${submitForm.business_name.trim()}`,
          status: "completed",
        });
      }

      // Base submission data payload
      const baseSubmissionPayload: any = {
        user_id: user.id,
        business_name: submitForm.business_name.trim(),
        description: submitForm.description.trim(),
        website: submitForm.website.trim() || null,
        contact_email: submitForm.contact_email.trim() || null,
        contact_phone: submitForm.contact_phone.trim() || null,
        contact_whatsapp: submitForm.contact_whatsapp.trim() || null,
        banner_url: bannerUrl,
        category_id: submitCategoryId || null,
        cost_credits: COST_CREDITS,
        status: "paid",
      };

      // Resilient database insertion:
      // If photos column exists in the schema cache, persist directly to photos text[]
      // If the schema cache does not have the photos column, fallback cleanly to inserting without photos column
      let subData: any = null;
      let subErr: any = null;

      if (photoUrls.length > 0) {
        const resWithPhotos = await supabase
          .from("guest_blog_submissions")
          .insert({
            ...baseSubmissionPayload,
            photos: photoUrls,
          })
          .select()
          .single();

        if (resWithPhotos.error) {
          const errMsg = resWithPhotos.error.message || "";
          const isSchemaMismatch =
            errMsg.includes("photos") ||
            resWithPhotos.error.code === "PGRST204" ||
            resWithPhotos.error.code === "42703";

          if (isSchemaMismatch) {
            console.warn("Schema cache has no 'photos' column on guest_blog_submissions; falling back to relational storage.", resWithPhotos.error);
            const fallbackRes = await supabase
              .from("guest_blog_submissions")
              .insert(baseSubmissionPayload)
              .select()
              .single();
            subData = fallbackRes.data;
            subErr = fallbackRes.error;
          } else {
            subErr = resWithPhotos.error;
          }
        } else {
          subData = resWithPhotos.data;
        }
      } else {
        const simpleRes = await supabase
          .from("guest_blog_submissions")
          .insert(baseSubmissionPayload)
          .select()
          .single();
        subData = simpleRes.data;
        subErr = simpleRes.error;
      }

      if (subErr || !subData) throw subErr || new Error("Failed to save blog submission");

      // Save photos into the dedicated guest_submission_photos relation table
      // (used by Admin Review and AI Blogger functions)
      if (photoUrls.length > 0 && subData?.id) {
        const photoRows = photoUrls.map((url, idx) => ({
          submission_id: subData.id,
          image_url: url,
          caption: submitForm.business_name.trim(),
          display_order: idx,
        }));

        const { error: photoInsertErr } = await supabase
          .from("guest_submission_photos")
          .insert(photoRows);

        if (photoInsertErr) {
          console.warn("Notice: Photos saved to cloud storage, but relation insert returned:", photoInsertErr);
        }
      }

      // Invoke AI generation function in background
      if (subData?.id) {
        supabase.functions.invoke("generate-blog-post", {
          body: { submission_id: subData.id },
        }).catch((e) => console.warn("Background AI generation invoked:", e));
      }

      toast.success("Business blog submitted successfully! AI article is being prepared.");
      
      // Reset form
      setSubmitBannerFile(null);
      setSubmitBannerPreview(null);
      setSubmitPhotos([]);
      
      // Refresh list and switch to My Blogs tab
      await fetchBlogs();
      handleTabChange("my-blogs");
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast.error(err?.message || "Failed to submit business blog");
    } finally {
      setSubmittingBlog(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Aggregated Performance Metrics
  const activeBlogs = submissions.filter((s) => s.status !== "deleted");
  const liveBlogs = submissions.filter((s) => s.status === "published" || s.status === "approved");
  const totalViews = liveBlogs.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
  const totalInquiries = liveBlogs.reduce((acc, curr) => acc + (curr.inquiries_count || 0), 0);
  const totalShares = liveBlogs.reduce((acc, curr) => acc + (curr.shares_count || 0), 0);
  const avgCtr = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : "0.0";

  // Filter Submissions
  const filteredSubmissions = submissions.filter((b) => {
    const matchesSearch =
      b.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.blog_post?.title?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "published") return b.status === "published" || b.status === "approved";
    if (filterStatus === "review") return ["paid", "review", "generating", "pending_payment"].includes(b.status);
    if (filterStatus === "deleted") return b.status === "deleted";
    return true;
  });

  return (
    <>
      <Helmet>
        <title>My Business Blogs &amp; Submissions | Bethelincovibe TV</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-16">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl space-y-6 sm:space-y-8">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold h-8 text-xs mb-1 -ml-2 text-muted-foreground hover:text-foreground">
                <Link to="/dashboard">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                <FileText className="h-7 w-7 text-primary" />
                Business Blogs Hub
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Manage your published business stories, update featured banner images, track reader leads, or submit a new feature article.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBlogs}
                disabled={loading}
                className="rounded-xl font-bold text-xs h-10 border-border/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => handleTabChange(mainTab === "submit" ? "my-blogs" : "submit")}
                className={`rounded-xl font-bold text-xs h-10 shadow-md ${
                  mainTab === "submit" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {mainTab === "submit" ? (
                  <>
                    <FileText className="h-4 w-4 mr-1.5" /> View My Blogs
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" /> Submit New Business
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Top Level Unified Navigation Tabs */}
          <Tabs value={mainTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-2 p-1.5 h-auto bg-muted/60 rounded-2xl border border-border/80 max-w-md mx-auto">
              <TabsTrigger
                value="my-blogs"
                className="rounded-xl py-2.5 font-extrabold text-xs data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4 text-primary" />
                My Business Blogs
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-black">
                  {submissions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="submit"
                className="rounded-xl py-2.5 font-extrabold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Submit New Blog
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* TAB 1: MY BUSINESS BLOGS & PERFORMANCE */}
            {/* ============================================================ */}
            <TabsContent value="my-blogs" className="space-y-6 mt-6 focus-visible:outline-hidden">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Submissions</p>
                    <p className="text-2xl font-black text-foreground">{submissions.length}</p>
                    <p className="text-[10px] text-muted-foreground">{activeBlogs.length} Active</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live Articles</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{liveBlogs.length}</p>
                    <p className="text-[10px] text-muted-foreground">SEO Indexing</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Total Reads</p>
                    <p className="text-2xl font-black text-primary">{totalViews.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Verified views</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Inquiries</p>
                    <p className="text-2xl font-black text-teal-600 dark:text-teal-400">{totalInquiries}</p>
                    <p className="text-[10px] text-muted-foreground">Direct leads</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Lead CTR</p>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{avgCtr}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversion rate</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Shares</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalShares}</p>
                    <p className="text-[10px] text-muted-foreground">Viral Reach</p>
                  </CardContent>
                </Card>
              </div>

              {/* Search & Status Filter Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by business name or story..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-2xl text-xs h-10 border-border/80 bg-card"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-2xl border border-border/80 w-full sm:w-auto overflow-x-auto">
                  {(["all", "published", "review", "deleted"] as const).map((tab) => (
                    <Button
                      key={tab}
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterStatus(tab)}
                      className={`rounded-xl text-xs font-bold h-8 px-3 capitalize shrink-0 ${
                        filterStatus === tab
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "all"
                        ? "All Blogs"
                        : tab === "published"
                        ? "Live Published"
                        : tab === "review"
                        ? "In Review"
                        : "Archived"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Business Blog Articles List */}
              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground mt-2 font-medium">Loading your business blogs...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <Card className="rounded-3xl border-dashed border-2 border-border/80 p-8 sm:p-12 text-center bg-card">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-extrabold text-foreground">
                      {filterStatus === "deleted" ? "No archived blogs" : "No business blogs found"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {filterStatus === "deleted"
                        ? "When you delete a business blog, it will be safely tracked here in your archives."
                        : "Submit your business to have an authoritative SEO article published and promoted across our network."}
                    </p>
                    {filterStatus !== "deleted" && (
                      <Button onClick={() => handleTabChange("submit")} className="rounded-xl font-bold text-xs mt-2">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Submit Your Business
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredSubmissions.map((blog) => {
                    const isLive = blog.status === "published" || blog.status === "approved";
                    const isDeleted = blog.status === "deleted";
                    const postSlug = blog.blog_post?.slug || blog.generated_post_id;
                    const liveUrl = postSlug ? `/blog/${postSlug}` : null;
                    const displayImage = blog.banner_url || blog.blog_post?.featured_image;

                    return (
                      <Card
                        key={blog.id}
                        className={`rounded-3xl border transition-all overflow-hidden bg-card ${
                          isDeleted
                            ? "opacity-60 border-border/50 bg-muted/20"
                            : "border-border/80 hover:border-primary/40 shadow-xs hover:shadow-md"
                        }`}
                      >
                        <CardContent className="p-4 sm:p-6 space-y-4">
                          
                          {/* Top Section: Featured Image & Business Details */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
                            
                            {/* Featured Banner / Image Display & Quick Update Action */}
                            <div className="md:col-span-4 space-y-2">
                              <div className="relative group aspect-video sm:aspect-16/10 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-indigo-500/20 border border-border overflow-hidden shadow-sm flex items-center justify-center">
                                {displayImage ? (
                                  <img
                                    src={displayImage}
                                    alt={blog.business_name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <ImageIcon className="h-8 w-8 text-primary/60 mx-auto mb-1" />
                                    <p className="text-[11px] font-semibold text-muted-foreground">No banner uploaded</p>
                                  </div>
                                )}

                                {/* Overlay Button to Change / Update Image */}
                                {!isDeleted && (
                                  <button
                                    onClick={() => handleOpenImageModal(blog)}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-bold backdrop-blur-xs cursor-pointer"
                                  >
                                    <Camera className="h-5 w-5" />
                                    <span>Update Featured Image</span>
                                  </button>
                                )}

                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border-white/20">
                                    Featured Image
                                  </Badge>
                                </div>
                              </div>

                              {!isDeleted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenImageModal(blog)}
                                  className="w-full rounded-xl text-xs font-bold h-8 border-border/80 flex items-center justify-center gap-1.5"
                                >
                                  <Camera className="h-3.5 w-3.5 text-primary" />
                                  Update Featured Image
                                </Button>
                              )}
                            </div>

                            {/* Business Story, Title, Performance & Metadata */}
                            <div className="md:col-span-8 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-black text-base sm:text-lg text-foreground">
                                      {blog.business_name}
                                    </h3>
                                    <BlogStatusBadge status={blog.status} />
                                  </div>
                                  {blog.blog_post?.title && (
                                    <p className="text-xs font-bold text-primary line-clamp-1 mt-0.5">
                                      {blog.blog_post.title}
                                    </p>
                                  )}
                                </div>

                                {/* Performance metrics pill */}
                                {isLive && !isDeleted && (
                                  <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-border/60 shrink-0 text-xs self-start sm:self-auto">
                                    <div className="text-center px-2">
                                      <p className="text-[10px] text-muted-foreground font-medium">Reads</p>
                                      <p className="font-extrabold text-foreground">{blog.views_count}</p>
                                    </div>
                                    <div className="h-6 w-px bg-border/60" />
                                    <div className="text-center px-2">
                                      <p className="text-[10px] text-muted-foreground font-medium">Leads</p>
                                      <p className="font-extrabold text-emerald-600">{blog.inquiries_count}</p>
                                    </div>
                                    <div className="h-6 w-px bg-border/60" />
                                    <div className="text-center px-2">
                                      <p className="text-[10px] text-muted-foreground font-medium">Shares</p>
                                      <p className="font-extrabold text-foreground">{blog.shares_count}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                {blog.description}
                              </p>

                              {/* Gallery Photos Preview if present */}
                              {(() => {
                                const gallery = [
                                  ...(blog.guest_submission_photos || []).map((p: any) => p.image_url),
                                  ...(Array.isArray(blog.photos) ? blog.photos : []),
                                ].filter(Boolean);
                                const uniqueGallery = Array.from(new Set(gallery));
                                if (uniqueGallery.length === 0) return null;

                                return (
                                  <div className="pt-1">
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Photos:</span>
                                      {uniqueGallery.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                                          <img
                                            src={url}
                                            alt={`Photo ${idx + 1}`}
                                            className="h-9 w-9 rounded-lg object-cover border border-border/80 group-hover:border-primary transition-colors"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Contact Details Chips */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-1 min-w-0 max-w-full">
                                {blog.website && (
                                  <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/60 max-w-full min-w-0">
                                    <Globe className="h-3 w-3 text-primary shrink-0" />
                                    <span className="truncate max-w-[200px] sm:max-w-[320px]">{blog.website.replace(/^https?:\/\//, "")}</span>
                                  </span>
                                )}
                                {blog.contact_phone && (
                                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                                    <Phone className="h-3 w-3 text-emerald-600" /> {blog.contact_phone}
                                  </span>
                                )}
                                {blog.contact_whatsapp && (
                                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                                    <MessageCircle className="h-3 w-3 text-teal-600" /> {blog.contact_whatsapp}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  Submitted {format(new Date(blog.created_at), "MMM d, yyyy")}
                                </span>
                              </div>

                              {/* Rejection / Review feedback */}
                              {blog.rejection_reason && (
                                <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                                  <span className="font-bold">Feedback:</span> {blog.rejection_reason}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons Toolbar */}
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isLive && liveUrl && (
                                <>
                                  <Button asChild size="sm" className="rounded-xl font-bold text-xs h-8 bg-primary text-primary-foreground">
                                    <Link to={liveUrl} target="_blank" rel="noopener">
                                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Live Article
                                    </Link>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyShareLink(blog)}
                                    className="rounded-xl font-bold text-xs h-8 border-border/80"
                                  >
                                    {copiedId === blog.id ? (
                                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    {copiedId === blog.id ? "Copied" : "Share Link"}
                                  </Button>
                                </>
                              )}

                              {!isDeleted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditDetails(blog)}
                                  className="rounded-xl font-bold text-xs h-8 border-border/80 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit3 className="h-3.5 w-3.5 mr-1 text-primary" /> Edit Details
                                </Button>
                              )}

                              {isLive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBlogForStats(blog);
                                    setAnalyticsModalOpen(true);
                                  }}
                                  className="rounded-xl font-bold text-xs h-8 text-muted-foreground hover:text-foreground"
                                >
                                  <BarChart3 className="h-3.5 w-3.5 mr-1 text-primary" /> Analytics
                                </Button>
                              )}
                            </div>

                            {/* Delete / Archive Action */}
                            {!isDeleted && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBlogToDelete(blog);
                                  setDeleteModalOpen(true);
                                }}
                                className="rounded-xl font-bold text-xs h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 2: SUBMIT NEW BUSINESS BLOG (INTEGRATED ON SAME PAGE) */}
            {/* ============================================================ */}
            <TabsContent value="submit" className="space-y-6 mt-6 focus-visible:outline-hidden">
              <Card className="rounded-3xl border-border/80 bg-card shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-indigo-500/10 pb-6 border-b border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Submit a Business Blog
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Tell your business story, upload high-resolution cover photos, and let our AI engine generate an authoritative SEO article published directly across Bethelincovibe TV.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border/80 shadow-xs shrink-0 self-start sm:self-auto">
                      <Wallet className="h-4 w-4 text-primary" />
                      <div className="text-xs">
                        <p className="text-[10px] text-muted-foreground">Cost: {isAdmin ? "Free (Admin)" : `₦${COST_CREDITS.toLocaleString()}`}</p>
                        <p className="font-extrabold text-foreground">Wallet: ₦{balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-8 space-y-6">
                  {/* Business Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. Royal Apex Logistics &amp; Transport"
                        value={submitForm.business_name}
                        onChange={(e) => setSubmitForm({ ...submitForm, business_name: e.target.value })}
                        className="rounded-xl text-xs h-10 border-border/80 bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Category</Label>
                      <Select value={submitCategoryId} onValueChange={setSubmitCategoryId}>
                        <SelectTrigger className="rounded-xl text-xs h-10 border-border/80 bg-background">
                          <SelectValue placeholder="Select business category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Business Story & Pitch */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">
                        Business Story, Products &amp; Value Proposition <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground">{submitForm.description.length} / 2500</span>
                    </div>
                    <Textarea
                      placeholder="Describe what your business does, your background story, core services, competitive advantages, pricing, and why customers in Nigeria choose you..."
                      rows={5}
                      value={submitForm.description}
                      maxLength={2500}
                      onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                      className="rounded-xl text-xs border-border/80 bg-background leading-relaxed"
                    />
                  </div>

                  {/* Featured Cover Banner Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Featured Article Cover Banner</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Recommended: 16:9 widescreen (PNG/JPG/WEBP)</span>
                    </Label>

                    {submitBannerPreview ? (
                      <div className="relative group aspect-video sm:aspect-21/9 max-h-56 rounded-2xl border border-border overflow-hidden bg-black/5">
                        <img src={submitBannerPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleSubmitBannerChange(null)}
                          className="absolute top-2 right-2 h-8 w-8 rounded-xl opacity-90 hover:opacity-100 shadow-md"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-muted/40">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <Upload className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-foreground">Click to upload featured cover banner</p>
                        <p className="text-[10px] text-muted-foreground">High resolution images receive 3x more article clicks</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSubmitBannerChange(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>

                  {/* Optional Gallery Photos */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Product &amp; Facility Photos (Optional - up to 8)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{submitPhotos.length} / 8 photos</span>
                    </Label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {submitPhotos.map((photo, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-2xl border border-border overflow-hidden bg-muted/20">
                          <img src={photo.preview} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveSubmitPhoto(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {submitPhotos.length < 8 && (
                        <label className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-2xl aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer bg-muted/20 hover:bg-muted/40 text-center p-2">
                          <Plus className="h-5 w-5 text-primary" />
                          <span className="text-[10px] font-bold text-muted-foreground">Add Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAddSubmitPhotos(e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Direct Contact Channels */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                      Direct Customer Contact Channels
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Website / Social URL</Label>
                        <Input
                          placeholder="https://mybusiness.ng"
                          value={submitForm.website}
                          onChange={(e) => setSubmitForm({ ...submitForm, website: e.target.value })}
                          className="rounded-xl text-xs h-10 border-border/80 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Contact Email</Label>
                        <Input
                          placeholder="info@mybusiness.ng"
                          type="email"
                          value={submitForm.contact_email}
                          onChange={(e) => setSubmitForm({ ...submitForm, contact_email: e.target.value })}
                          className="rounded-xl text-xs h-10 border-border/80 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
                        <Input
                          placeholder="+234 800 000 0000"
                          value={submitForm.contact_phone}
                          onChange={(e) => setSubmitForm({ ...submitForm, contact_phone: e.target.value })}
                          className="rounded-xl text-xs h-10 border-border/80 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">WhatsApp Business Number</Label>
                        <Input
                          placeholder="+234 800 000 0000"
                          value={submitForm.contact_whatsapp}
                          onChange={(e) => setSubmitForm({ ...submitForm, contact_whatsapp: e.target.value })}
                          className="rounded-xl text-xs h-10 border-border/80 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action Bar */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Submission Fee: {isAdmin ? <span className="text-amber-500 font-black">₦0 (Admin Free Privilege)</span> : `₦${COST_CREDITS.toLocaleString()}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Includes AI article drafting, permanent SEO indexed backlink, and verified publisher badge.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {!canAfford && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl font-bold text-xs h-10">
                          <Link to="/dashboard/wallet">
                            <Wallet className="h-4 w-4 mr-1.5" /> Top Up Wallet
                          </Link>
                        </Button>
                      )}
                      <Button
                        onClick={handleSubmitNewBlog}
                        disabled={submittingBlog || !canAfford}
                        className="rounded-xl font-bold text-xs h-10 px-6 bg-primary text-primary-foreground shadow-md w-full sm:w-auto"
                      >
                        {submittingBlog ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Publishing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1.5" /> Submit &amp; Publish Business Blog
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ============================================================ */}
      {/* UPDATE FEATURED IMAGE MODAL */}
      {/* ============================================================ */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Camera className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Update Featured Banner Image
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the cover photo for <span className="font-extrabold text-foreground">"{selectedBlogForImage?.business_name}"</span>. This will immediately reflect across the public blog post and directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Live Image Preview */}
            <div className="relative aspect-video rounded-2xl border border-border overflow-hidden bg-black/5 flex items-center justify-center">
              {newImagePreview ? (
                <img src={newImagePreview} alt="New preview" className="w-full h-full object-cover" />
              ) : customImageUrl ? (
                <img src={customImageUrl} alt="Current banner" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="h-8 w-8 text-primary/40 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No image chosen</p>
                </div>
              )}
            </div>

            {/* Upload File Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Upload from Device</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleNewImageFileSelect(e.target.files?.[0] || null)}
                className="rounded-xl text-xs h-10 border-border/80 bg-background cursor-pointer"
              />
            </div>

            {/* Direct Image URL input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Or Direct Image URL</Label>
              <Input
                placeholder="https://example.com/cover.jpg"
                value={customImageUrl}
                onChange={(e) => {
                  setCustomImageUrl(e.target.value);
                  if (newImageFile) {
                    setNewImageFile(null);
                    setNewImagePreview(null);
                  }
                }}
                className="rounded-xl text-xs h-10 border-border/80 bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImageModalOpen(false)}
              disabled={updatingImage}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveFeaturedImage}
              disabled={updatingImage}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              {updatingImage ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
              Save &amp; Update Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* QUICK EDIT BUSINESS DETAILS MODAL */}
      {/* ============================================================ */}
      <Dialog open={editDetailsModalOpen} onOpenChange={setEditDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Edit3 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Edit Business Article Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify contact channels and description for this submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Business Name</Label>
              <Input
                value={editFormData.business_name}
                onChange={(e) => setEditFormData({ ...editFormData, business_name: e.target.value })}
                className="rounded-xl text-xs h-10 border-border/80 bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Description &amp; Story</Label>
              <Textarea
                rows={4}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="rounded-xl text-xs border-border/80 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Website</Label>
                <Input
                  value={editFormData.website}
                  onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                  className="rounded-xl text-xs h-9 border-border/80 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">WhatsApp</Label>
                <Input
                  value={editFormData.contact_whatsapp}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_whatsapp: e.target.value })}
                  className="rounded-xl text-xs h-9 border-border/80 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phone</Label>
                <Input
                  value={editFormData.contact_phone}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                  className="rounded-xl text-xs h-9 border-border/80 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Email</Label>
                <Input
                  value={editFormData.contact_email}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                  className="rounded-xl text-xs h-9 border-border/80 bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditDetailsModalOpen(false)}
              disabled={savingDetails}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveDetails}
              disabled={savingDetails}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              {savingDetails ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* CONFIRM DELETE MODAL */}
      {/* ============================================================ */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete &amp; Unpublish Business Blog?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <span className="font-extrabold text-foreground">"{blogToDelete?.business_name}"</span>?
              Once deleted, the article will be unpublished and will immediately stop displaying on the public business blog page.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="rounded-xl text-xs font-bold"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DETAILED ANALYTICS MODAL */}
      {/* ============================================================ */}
      <Dialog open={analyticsModalOpen} onOpenChange={setAnalyticsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Analytics: {selectedBlogForStats?.business_name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Traffic performance breakdown and reader engagement.
            </DialogDescription>
          </DialogHeader>

          {selectedBlogForStats && (() => {
            const events = getStoredAnalyticsEvents().filter((ev) => {
              const pid = selectedBlogForStats.generated_post_id;
              const pslug = selectedBlogForStats.blog_post?.slug;
              return (pid && ev.entityId === pid) || (pslug && ev.path === `/blog/${pslug}`);
            });
            const totalReads = events.length;
            const mobileCount = events.filter((e) => e.device === "mobile").length;
            const desktopCount = events.filter((e) => e.device === "desktop").length;
            const directOrFeed = events.filter((e) => !e.referrer || e.referrer.includes(window.location.host)).length;
            const externalSearch = events.length - directOrFeed;

            return (
              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Real Reads</p>
                    <p className="text-lg font-black text-foreground">{totalReads}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Comments / Inquiries</p>
                    <p className="text-lg font-black text-emerald-600">{selectedBlogForStats.inquiries_count}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Status</p>
                    <p className="text-sm font-black text-purple-600 capitalize mt-1">
                      {selectedBlogForStats.status}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-foreground">Real Traffic Sources</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-primary" /> External &amp; Search Engines
                      </span>
                      <span className="font-bold">{externalSearch} reads</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Platform Feed &amp; Direct Links
                      </span>
                      <span className="font-bold">{directOrFeed} reads</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-foreground">Device Breakdown</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-muted/30 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-primary" /> Mobile
                      </span>
                      <span className="font-bold">{mobileCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/30 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-indigo-500" /> Desktop
                      </span>
                      <span className="font-bold">{desktopCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setAnalyticsModalOpen(false)}
              className="rounded-xl text-xs font-bold w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BlogStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any; className?: string }> = {
    pending_payment: { label: "Pending Payment", variant: "outline" },
    paid: { label: "Paid · Queued", variant: "secondary", className: "bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold" },
    generating: { label: "AI Writing Post...", variant: "secondary", className: "bg-purple-500/10 text-purple-600 border-purple-500/30 animate-pulse font-bold" },
    review: { label: "In Review", variant: "secondary" },
    approved: { label: "Approved", variant: "default", className: "bg-emerald-600 text-white font-bold" },
    published: { label: "Live Published", variant: "default", className: "bg-emerald-600 text-white font-bold shadow-xs" },
    rejected: { label: "Rejected", variant: "destructive" },
    deleted: { label: "Archived / Deleted", variant: "outline", className: "text-muted-foreground border-border" },
  };

  const m = map[status] || { label: status, variant: "outline" };
  return (
    <Badge variant={m.variant} className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${m.className || ""}`}>
      {m.label}
    </Badge>
  );
}
