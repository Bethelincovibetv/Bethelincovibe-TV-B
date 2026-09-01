import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Shield,
  Crown,
  Users,
  UserX,
  UserCheck,
  MessageSquare,
  Trash2,
  Edit2,
  Save,
  LogOut,
  Sparkles,
  Info,
  Lock,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import {
  Conversation,
  updateGroupSettings,
  promoteToGroupAdmin,
  demoteFromGroupAdmin,
  removeMemberFromGroup,
  leaveGroup,
  deleteGroup,
  joinGroup,
  getOrCreateDirectConversation,
} from '@/services/realtimeChatService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onConversationUpdated?: (updated: Partial<Conversation>) => void;
  onDirectMessageSelected?: (conv: any) => void;
}

interface MemberDetail {
  userId: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  isPlatformAdmin?: boolean;
}

export default function GroupInfoDrawer({
  open,
  onOpenChange,
  conversation,
  onConversationUpdated,
  onDirectMessageSelected,
}: GroupInfoDrawerProps) {
  const { user, isAdmin: isPlatformAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.name);
  const [description, setDescription] = useState(conversation.description || '');
  const [avatarUrl, setAvatarUrl] = useState(conversation.avatarUrl || '');
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(conversation.onlyAdminsCanPost || false);
  const [onlyAdminsCanEditInfo, setOnlyAdminsCanEditInfo] = useState(conversation.onlyAdminsCanEditInfo || false);
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = user?.id === conversation.createdBy;
  const isGroupAdmin = isOwner || conversation.adminIds?.includes(user?.id || '') || false;
  const canEditInfo = isPlatformAdmin || (isGroupAdmin && !conversation.onlyAdminsCanEditInfo) || isOwner;
  const isMember = conversation.participantIds?.includes(user?.id || '');

  useEffect(() => {
    setName(conversation.name);
    setDescription(conversation.description || '');
    setAvatarUrl(conversation.avatarUrl || '');
    setOnlyAdminsCanPost(conversation.onlyAdminsCanPost || false);
    setOnlyAdminsCanEditInfo(conversation.onlyAdminsCanEditInfo || false);
    if (open) {
      loadMembers();
    }
  }, [open, conversation]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const participantIds = conversation.participantIds || [];
      if (participantIds.length === 0) {
        setMembers([]);
        return;
      }

      // Fetch member profiles from supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', participantIds.slice(0, 50));

      const profileMap = new Map((data || []).map((p) => [p.user_id, p]));

      const list: MemberDetail[] = participantIds.map((uid) => {
        const p = profileMap.get(uid);
        let role: 'owner' | 'admin' | 'member' = 'member';
        if (uid === conversation.createdBy) role = 'owner';
        else if (conversation.adminIds?.includes(uid)) role = 'admin';

        return {
          userId: uid,
          name: p?.display_name || p?.username || (uid === conversation.createdBy ? conversation.creatorName || 'Creator' : 'Member'),
          avatar: p?.avatar_url || (uid === conversation.createdBy ? conversation.avatarUrl : undefined),
          role,
        };
      });

      setMembers(list);
    } catch (err) {
      console.warn('Error loading group members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await updateGroupSettings(
        conversation.id,
        {
          name,
          description,
          avatarUrl,
          onlyAdminsCanPost,
          onlyAdminsCanEditInfo,
        },
        user.id,
        isPlatformAdmin
      );

      toast.success('Group settings updated!');
      setEditing(false);
      onConversationUpdated?.({
        name,
        description,
        avatarUrl,
        onlyAdminsCanPost,
        onlyAdminsCanEditInfo,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (targetId: string, targetName: string) => {
    if (!user) return;
    try {
      await promoteToGroupAdmin(conversation.id, targetId, user.id, isPlatformAdmin);
      toast.success(`Appointed ${targetName} as Group Admin!`);
      loadMembers();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    }
  };

  const handleDemote = async (targetId: string, targetName: string) => {
    if (!user) return;
    try {
      await demoteFromGroupAdmin(conversation.id, targetId, user.id, isPlatformAdmin);
      toast.success(`Removed admin privileges from ${targetName}.`);
      loadMembers();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    }
  };

  const handleRemove = async (targetId: string, targetName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove ${targetName} from the group?`)) return;
    try {
      await removeMemberFromGroup(conversation.id, targetId, user.id, isPlatformAdmin);
      toast.success(`Removed ${targetName} from the group.`);
      loadMembers();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to exit this group?')) return;
    try {
      await leaveGroup(conversation.id, user.id);
      toast.success('You have left the group.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!user) return;
    if (!confirm('PERMANENT ACTION: Delete this entire community group and all its history?')) return;
    try {
      await deleteGroup(conversation.id, user.id, isPlatformAdmin);
      toast.success('Group deleted.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete group');
    }
  };

  const handleStartDM = async (m: MemberDetail) => {
    if (!user || m.userId === user.id) return;
    try {
      const currentName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      const currentAvatar = user.user_metadata?.avatar_url || '';
      const dmConv = await getOrCreateDirectConversation(
        { id: user.id, name: currentName, avatar: currentAvatar },
        { id: m.userId, name: m.name, avatar: m.avatar }
      );
      onDirectMessageSelected?.(dmConv);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start direct chat');
    }
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <span className="p-1 rounded-lg bg-primary/10">
              <Users className="h-3.5 w-3.5" />
            </span>
            Group Control Center
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">{conversation.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {conversation.category || 'General'} Community • {conversation.participantIds?.length || 0} members
          </DialogDescription>
        </DialogHeader>

        {/* Group Hero Header */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/60">
          <img
            src={avatarUrl || conversation.avatarUrl || '/logo.png'}
            alt="Group Icon"
            className="h-16 w-16 rounded-2xl object-cover border border-primary/20 shadow-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-base font-black truncate">{name}</div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {description || 'No description provided.'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {conversation.type.toUpperCase()}
              </span>
              {onlyAdminsCanPost && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" /> Only Admins Post
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Admin Settings Section */}
        {(canEditInfo || isPlatformAdmin) && (
          <div className="space-y-3 p-4 rounded-2xl border border-border/80 bg-background/60">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Group Administration
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(!editing)}
                className="h-7 text-xs font-bold"
              >
                {editing ? 'Cancel' : <><Edit2 className="h-3 w-3 mr-1" /> Edit Info & Rules</>}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold">Group Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold">Description & Guidelines</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold">Icon URL</label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>

                <div className="space-y-2 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Only Admins can send messages</span>
                    <Switch
                      checked={onlyAdminsCanPost}
                      onCheckedChange={setOnlyAdminsCanPost}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Only Admins can edit group info</span>
                    <Switch
                      checked={onlyAdminsCanEditInfo}
                      onCheckedChange={setOnlyAdminsCanEditInfo}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full rounded-xl font-bold h-9 bg-primary"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Save Changes</>}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Member Roster with Search and Role Badges */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Members ({conversation.participantIds?.length || 0})
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search members in group..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-8 h-8 rounded-xl text-xs"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
            {loadingMembers ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" /> Loading roster...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No members found.</div>
            ) : (
              filteredMembers.map((m) => {
                const isTargetSelf = m.userId === user?.id;
                const isTargetOwner = m.role === 'owner';
                const isTargetAdmin = m.role === 'admin' || isTargetOwner;

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-2 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          m.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`
                        }
                        alt="avatar"
                        className="h-8 w-8 rounded-lg object-cover shrink-0 border border-border/80"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{m.name}</span>
                          {isTargetSelf && (
                            <span className="text-[9px] px-1 py-0.2 rounded-md bg-muted text-muted-foreground">
                              You
                            </span>
                          )}
                        </div>

                        {/* Role Badges */}
                        <div className="flex items-center gap-1 mt-0.5">
                          {isTargetOwner && (
                            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                              <Crown className="h-2.5 w-2.5 fill-current" /> Group Creator
                            </span>
                          )}
                          {m.role === 'admin' && !isTargetOwner && (
                            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                              <Shield className="h-2.5 w-2.5" /> Group Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Action Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isTargetSelf && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartDM(m)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                          title="Direct Message"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Admin Controls */}
                      {(isGroupAdmin || isPlatformAdmin) && !isTargetSelf && !isTargetOwner && (
                        <>
                          {m.role === 'admin' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDemote(m.userId, m.name)}
                              className="h-7 px-2 text-[10px] text-amber-600 hover:bg-amber-500/10 rounded-lg"
                              title="Dismiss as Admin"
                            >
                              Dismiss Admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePromote(m.userId, m.name)}
                              className="h-7 px-2 text-[10px] text-primary hover:bg-primary/10 rounded-lg font-bold"
                              title="Make Group Admin"
                            >
                              Make Admin
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemove(m.userId, m.name)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove from group"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
          {isMember ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" /> Leave Group
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={async () => {
                if (!user) return;
                await joinGroup(conversation.id, {
                  id: user.id,
                  name: user.user_metadata?.display_name || 'Member',
                  avatar: user.user_metadata?.avatar_url || '',
                });
                toast.success('Joined group!');
                loadMembers();
              }}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" /> Join Group
            </Button>
          )}

          {(isOwner || isPlatformAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteGroup}
              className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Group
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
