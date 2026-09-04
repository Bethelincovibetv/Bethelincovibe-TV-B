import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  Search,
  Building2,
  TrendingUp,
  ShoppingBag,
  Truck,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  Radio,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ComprehensiveBusinessContext } from "@/lib/userBusinessIntelligence";

export interface CoachConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
  business_context?: any;
}

export interface StrategicSectionItem {
  id: string;
  title: string;
  icon: any;
  prompt: string;
  badge: string;
  category: string;
}

export const STRATEGIC_SECTIONS: StrategicSectionItem[] = [
  {
    id: "revenue_margin",
    title: "Revenue & Profit Margin Optimizer",
    icon: TrendingUp,
    badge: "Unit Economics",
    category: "Finance",
    prompt: "Perform a deep profit margin and unit economics audit on my current business catalog and price points. What should my target markup be to maximize net monthly profit in Nigeria?",
  },
  {
    id: "whatsapp_funnel",
    title: "High-Converting WhatsApp Funnels",
    icon: MessageSquare,
    badge: "Closing Playbook",
    category: "Sales",
    prompt: "Give me a high-converting 3-step WhatsApp broadcast script and direct closing framework for my products that turns casual inquiries into paid Paystack or bank transfer orders.",
  },
  {
    id: "catalog_pricing",
    title: "Product Catalog & Pricing Strategy",
    icon: ShoppingBag,
    badge: "Pricing Power",
    category: "Catalog",
    prompt: "Review my current listed products and prices. How should I tier them (Entry, Core, VIP Premium) to double my average order value (AOV)?",
  },
  {
    id: "sourcing_imports",
    title: "Direct Import & Wholesale (1688 / Turkey)",
    icon: Truck,
    badge: "Global Sourcing",
    category: "Procurement",
    prompt: "What is the best factory-direct wholesale sourcing strategy for my industry between China (1688), Istanbul Turkey, and Lagos Alaba/Trade Fair? What are realistic landed cargo costs and customs tips?",
  },
  {
    id: "cac_advertising",
    title: "Customer Acquisition (CAC) & Ads",
    icon: Sparkles,
    badge: "Growth Engine",
    category: "Marketing",
    prompt: "Draft a direct-response ad campaign strategy for Instagram and TikTok suited for my business. What angle and hook will yield the lowest customer acquisition cost (CAC)?",
  },
  {
    id: "pitch_investors",
    title: "Investor Proposal & Pitch Deck",
    icon: Briefcase,
    badge: "Capital & Grants",
    category: "Strategy",
    prompt: "Outline an executive 5-slide investor pitch narrative for my business, highlighting market opportunity in Nigeria, competitive moat, and capital allocation plan.",
  },
];

interface CoachNavigationSidebarProps {
  conversations: CoachConversationSummary[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onSelectStrategicTopic: (prompt: string) => void;
  businessIntelligence: ComprehensiveBusinessContext | null;
  onSelectBusinessId?: (businessId: string) => void;
  onRefreshBusinessData?: () => void;
  className?: string;
}

export default function CoachNavigationSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onSelectStrategicTopic,
  businessIntelligence,
  onSelectBusinessId,
  onRefreshBusinessData,
  className = "",
}: CoachNavigationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "sections">("history");

  // Group conversations chronologically
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      (c.title || "Untitled Session").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = Date.now();
    const oneDay = 86400000;
    const sevenDays = 7 * oneDay;

    const today: CoachConversationSummary[] = [];
    const yesterday: CoachConversationSummary[] = [];
    const last7Days: CoachConversationSummary[] = [];
    const older: CoachConversationSummary[] = [];

    for (const c of filtered) {
      const time = new Date(c.updated_at).getTime();
      const diff = now - time;
      if (diff < oneDay) {
        today.push(c);
      } else if (diff < 2 * oneDay) {
        yesterday.push(c);
      } else if (diff < sevenDays) {
        last7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return { today, yesterday, last7Days, older, total: filtered.length };
  }, [conversations, searchQuery]);

  const startEditing = (c: CoachConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditingTitle(c.title || "");
  };

  const commitEditing = (id: string) => {
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const selectedBiz = businessIntelligence?.selectedBusiness;

  return (
    <aside className={`flex flex-col h-full bg-card border-r border-border/80 overflow-hidden ${className}`}>
      {/* Top Action Bar */}
      <div className="p-3.5 border-b border-border/70 space-y-2.5">
        <Button
          onClick={onNewConversation}
          className="w-full h-9 rounded-2xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-between px-3"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Strategy Session
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">
            ⌘N
          </kbd>
        </Button>

        {/* Tab switcher: History vs Strategic Sections */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3 w-3" /> History ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "sections"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3 w-3" /> Playbooks
          </button>
        </div>

        {/* Search if in history mode */}
        {activeTab === "history" && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl bg-muted/40 border-border/60"
            />
          </div>
        )}
      </div>

      {/* Real-time Business Intelligence Grounding Card */}
      <div className="p-3 border-b border-border/60 bg-muted/20">
        <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                Live Business Vault
              </span>
            </div>
            {businessIntelligence?.businesses && businessIntelligence.businesses.length > 1 && (
              <select
                aria-label="Select target business profile"
                value={businessIntelligence.selectedBusinessId}
                onChange={(e) => onSelectBusinessId?.(e.target.value)}
                className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-0.5 max-w-[110px] truncate"
              >
                {businessIntelligence.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-black text-xs text-foreground truncate">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{selectedBiz?.name || "Business Profile Connected"}</span>
              {selectedBiz?.verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {selectedBiz?.category || "Registered Enterprise"} • {selectedBiz?.city || selectedBiz?.state || "Nigeria"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center pt-1 border-t border-primary/10">
            <div className="p-1 rounded-lg bg-background/60">
              <p className="text-[11px] font-black text-foreground">
                {businessIntelligence?.metrics.totalProducts || 0}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Products</p>
            </div>
            <div className="p-1 rounded-lg bg-background/60">
              <p className="text-[11px] font-black text-foreground">
                {businessIntelligence?.metrics.totalServices || 0}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Services</p>
            </div>
            <div className="p-1 rounded-lg bg-background/60">
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {businessIntelligence?.metrics.totalViews || 0}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Views</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content: History or Strategic Playbooks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {activeTab === "sections" ? (
          <div className="space-y-2 p-1">
            <div className="px-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Executive Focus Departments
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Click any department to generate custom advisory tailored to your catalog.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              {STRATEGIC_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => onSelectStrategicTopic(sec.prompt)}
                    className="w-full text-left p-2.5 rounded-2xl border border-border/70 hover:border-primary/60 hover:bg-primary/5 transition-all group flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {sec.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground mt-1 inline-block">
                        {sec.badge}
                      </span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Today */}
            {groupedConversations.today.length > 0 && (
              <ConversationGroup
                title="Today"
                items={groupedConversations.today}
                activeId={activeId}
                editingId={editingId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                startEditing={startEditing}
                commitEditing={commitEditing}
                cancelEditing={() => setEditingId(null)}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            )}

            {/* Yesterday */}
            {groupedConversations.yesterday.length > 0 && (
              <ConversationGroup
                title="Yesterday"
                items={groupedConversations.yesterday}
                activeId={activeId}
                editingId={editingId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                startEditing={startEditing}
                commitEditing={commitEditing}
                cancelEditing={() => setEditingId(null)}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            )}

            {/* Previous 7 Days */}
            {groupedConversations.last7Days.length > 0 && (
              <ConversationGroup
                title="Previous 7 Days"
                items={groupedConversations.last7Days}
                activeId={activeId}
                editingId={editingId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                startEditing={startEditing}
                commitEditing={commitEditing}
                cancelEditing={() => setEditingId(null)}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            )}

            {/* Older */}
            {groupedConversations.older.length > 0 && (
              <ConversationGroup
                title="Older Sessions"
                items={groupedConversations.older}
                activeId={activeId}
                editingId={editingId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                startEditing={startEditing}
                commitEditing={commitEditing}
                cancelEditing={() => setEditingId(null)}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            )}

            {groupedConversations.total === 0 && (
              <div className="text-center py-10 px-3 space-y-2 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto opacity-30 text-primary" />
                <p className="text-xs font-bold">No sessions found</p>
                <p className="text-[11px] leading-relaxed">
                  Start a new session or choose an executive playbook above!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-border/70 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground px-4">
        <span className="flex items-center gap-1.5 font-medium">
          <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span>Strategic Core Active</span>
        </span>
        <span className="font-mono text-[10px]">v3.8 Executive</span>
      </div>
    </aside>
  );
}

function ConversationGroup({
  title,
  items,
  activeId,
  editingId,
  editingTitle,
  setEditingTitle,
  startEditing,
  commitEditing,
  cancelEditing,
  onSelect,
  onDelete,
}: {
  title: string;
  items: CoachConversationSummary[];
  activeId: string | null;
  editingId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  startEditing: (c: CoachConversationSummary, e: React.MouseEvent) => void;
  commitEditing: (id: string) => void;
  cancelEditing: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5">
        {title}
      </p>
      {items.map((c) => {
        const isActive = activeId === c.id;
        const isEditing = editingId === c.id;

        if (isEditing) {
          return (
            <div key={c.id} className="p-1.5 rounded-xl border border-primary bg-primary/5 flex items-center gap-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEditing(c.id);
                  if (e.key === "Escape") cancelEditing();
                }}
                autoFocus
                className="h-7 text-xs rounded-lg bg-background"
              />
              <Button size="icon" variant="ghost" onClick={() => commitEditing(c.id)} className="h-7 w-7 rounded-lg">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={cancelEditing} className="h-7 w-7 rounded-lg">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        }

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group relative w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "hover:bg-muted/70 text-foreground font-medium"
            }`}
          >
            <span className="truncate flex-1">{c.title || "Untitled Session"}</span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                aria-label="Rename session"
                onClick={(e) => startEditing(c, e)}
                className={`p-1 rounded-md hover:bg-background/20 ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Delete session"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this strategy conversation?")) {
                    onDelete(c.id);
                  }
                }}
                className={`p-1 rounded-md hover:bg-destructive/20 hover:text-destructive ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
