import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserCheck, MessageSquare, Shield, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateDirectConversation } from '@/services/realtimeChatService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NewDirectChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationSelected: (conversation: any) => void;
}

interface ProfileItem {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role?: string;
}

export default function NewDirectChatModal({ open, onOpenChange, onConversationSelected }: NewDirectChatModalProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchProfiles();
  }, [open]);

  const fetchProfiles = async (queryStr = '') => {
    try {
      setLoading(true);
      let q = supabase
        .from('profiles')
        .select('id, user_id, display_name, username, avatar_url')
        .limit(20);

      if (queryStr.trim()) {
        q = q.or(`display_name.ilike.%${queryStr.trim()}%,username.ilike.%${queryStr.trim()}%`);
      }

      const { data, error } = await q;
      if (!error && data) {
        // Exclude current user
        setProfiles(data.filter((p) => p.user_id !== user?.id));
      }
    } catch (err) {
      console.warn('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchProfiles(val);
  };

  const handleStartChat = async (target: ProfileItem) => {
    if (!user) {
      toast.error('Please sign in to start a private conversation.');
      return;
    }

    try {
      setCreating(target.user_id);
      const currentName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      const currentAvatar = user.user_metadata?.avatar_url || '';
      const targetName = target.display_name || target.username || 'Bethel Member';
      const targetAvatar = target.avatar_url || '';

      const conv = await getOrCreateDirectConversation(
        { id: user.id, name: currentName, avatar: currentAvatar },
        { id: target.user_id, name: targetName, avatar: targetAvatar }
      );

      toast.success(`Connected with ${targetName}!`);
      onConversationSelected(conv);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initialize direct chat');
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <span className="p-1.5 rounded-xl bg-primary/10">
              <MessageSquare className="h-4 w-4" />
            </span>
            Direct Messaging
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">New Private Conversation</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search for registered members, promoters, or merchants to start 1-on-1 messaging.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 rounded-xl"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading member directory...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No members found matching "{search}".
              </div>
            ) : (
              profiles.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-border/50 hover:bg-secondary/60 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        p.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${p.user_id}`
                      }
                      alt="avatar"
                      className="h-10 w-10 rounded-xl object-cover shrink-0 border border-border/80"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {p.display_name || p.username || 'Community Member'}
                      </div>
                      {p.username && (
                        <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleStartChat(p)}
                    disabled={creating === p.user_id}
                    className="rounded-xl h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90"
                  >
                    {creating === p.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Chat'
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
