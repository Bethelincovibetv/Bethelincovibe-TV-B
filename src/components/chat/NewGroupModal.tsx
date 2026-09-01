import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, Sparkles, Shield, Image as ImageIcon, Loader2 } from 'lucide-react';
import { createCommunityGroup } from '@/services/realtimeChatService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NewGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (newGroup: any) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=200&auto=format&fit=crop&q=80',
];

const CATEGORIES = ['General', 'Promoters', 'E-Commerce', 'Creators', 'Business & Startups', 'Tech & AI', 'Local Hubs'];

export default function NewGroupModal({ open, onOpenChange, onGroupCreated }: NewGroupModalProps) {
  const { user, isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(false);
  const [onlyAdminsCanEditInfo, setOnlyAdminsCanEditInfo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a group name.');
      return;
    }
    if (!user) {
      toast.error('Please sign in to create a community group.');
      return;
    }

    try {
      setIsSubmitting(true);
      const avatarUrl = customAvatarUrl.trim() || selectedAvatar;
      const creatorName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Community Leader';
      const creatorAvatar = user.user_metadata?.avatar_url || '';

      const newGroup = await createCommunityGroup(
        {
          name,
          description,
          category,
          avatarUrl,
          isPublic: true,
          onlyAdminsCanPost,
          onlyAdminsCanEditInfo,
        },
        {
          id: user.id,
          name: creatorName,
          avatar: creatorAvatar,
        },
        isAdmin
      );

      toast.success(`Group "${name}" created successfully!`);
      onGroupCreated(newGroup);
      onOpenChange(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <span className="p-1.5 rounded-xl bg-primary/10">
              <Users className="h-4 w-4" />
            </span>
            Community Creation
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">Create WhatsApp-Style Group</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Launch a dedicated real-time group for your network, team, or trade community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs font-bold">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="e.g. Lagos Super Promoters Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-cat" className="text-xs font-bold">Category</Label>
            <select
              id="group-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc" className="text-xs font-bold">Description & Rules (Optional)</Label>
            <Textarea
              id="group-desc"
              placeholder="What is the group about? Rules on spam, promotions, and collaboration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl resize-none text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Choose Group Icon</Label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(url);
                    setCustomAvatarUrl('');
                  }}
                  className={`relative shrink-0 h-11 w-11 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedAvatar === url && !customAvatarUrl
                      ? 'border-primary ring-2 ring-primary/30 scale-105'
                      : 'border-border/60 hover:opacity-80 opacity-60'
                  }`}
                >
                  <img src={url} alt="preset" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <Input
              placeholder="Or paste custom image URL..."
              value={customAvatarUrl}
              onChange={(e) => setCustomAvatarUrl(e.target.value)}
              className="rounded-xl text-xs h-9"
            />
          </div>

          {/* Group Permissions Toggles */}
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Announcement Mode
                </div>
                <div className="text-[11px] text-muted-foreground">Only Group Admins can send messages</div>
              </div>
              <Switch checked={onlyAdminsCanPost} onCheckedChange={setOnlyAdminsCanPost} />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold">Restrict Info Editing</div>
                <div className="text-[11px] text-muted-foreground">Only Group Admins can change group name & avatar</div>
              </div>
              <Switch checked={onlyAdminsCanEditInfo} onCheckedChange={setOnlyAdminsCanEditInfo} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl font-bold bg-gradient-to-r from-primary to-accent hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating Group...
                </>
              ) : (
                'Create Community Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
