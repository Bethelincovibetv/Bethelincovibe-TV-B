import React from "react";
import { Link } from "react-router-dom";
import { Building2, User, ExternalLink, ShieldCheck, Store } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AuthorProfileData {
  user_id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  business?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    is_verified?: boolean | null;
    website?: string | null;
  } | null;
}

interface ForumAuthorBadgeProps {
  author?: AuthorProfileData | null;
  size?: "sm" | "md" | "lg";
  showBusinessTag?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function ForumAuthorBadge({
  author,
  size = "md",
  showBusinessTag = true,
  showSubtitle = true,
  className = "",
}: ForumAuthorBadgeProps) {
  const business = author?.business;
  const isBusiness = !!business && !!business.slug;
  const displayName = author?.display_name || author?.username || (isBusiness ? business.name : "Community Member");
  
  // Prefer business logo if registered business, otherwise user avatar
  const avatarUrl = business?.logo_url || author?.avatar_url;
  const initials = (isBusiness ? business.name : displayName || "U").slice(0, 2).toUpperCase();

  // Primary navigation target:
  // If user has a registered business, click takes to /businesses/:slug
  // If user only has a username, click takes to /u/:username
  const targetUrl = isBusiness
    ? `/businesses/${business.slug}`
    : author?.username
    ? `/u/${author.username}`
    : author?.user_id
    ? `/u/${author.user_id}`
    : null;

  const avatarSizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs sm:text-sm",
    lg: "h-12 w-12 text-sm sm:text-base",
  }[size];

  const logoBorderClasses = isBusiness
    ? "ring-2 ring-primary/40 hover:ring-primary shadow-xs"
    : "border border-border/80";

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const badgeContent = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* 3D Circular / Rounded Logo or Profile Picture */}
      <div className="relative shrink-0">
        <Avatar className={`${avatarSizeClasses} rounded-xl ${logoBorderClasses} bg-background transition-transform duration-200 group-hover:scale-105 overflow-hidden`}>
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt={isBusiness ? business.name : displayName}
              className="object-cover w-full h-full"
            />
          ) : null}
          <AvatarFallback className={`rounded-xl font-bold ${
            isBusiness
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {isBusiness ? <Building2 className="h-4 w-4" /> : initials}
          </AvatarFallback>
        </Avatar>

        {isBusiness && (
          <span
            className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm border border-background"
            title="Verified Business"
          >
            <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </span>
        )}
      </div>

      {/* Author & Business Information */}
      <div className="min-w-0 flex flex-col justify-center text-left">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[170px] sm:max-w-[240px]">
            {isBusiness ? business.name : displayName}
          </span>

          {isBusiness && showBusinessTag && (
            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.2 rounded-md shrink-0">
              <Store className="h-2.5 w-2.5" />
              <span>Store</span>
            </span>
          )}
        </div>

        {showSubtitle && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            {isBusiness ? (
              <>
                <span className="truncate">by {displayName}</span>
                <span className="opacity-40">•</span>
                <span className="text-primary font-semibold group-hover:underline inline-flex items-center gap-0.5 shrink-0">
                  Visit Site <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </>
            ) : (
              <span>@{author?.username || "member"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!targetUrl) {
    return badgeContent;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={targetUrl}
            onClick={handleLinkClick}
            className="inline-flex items-center max-w-full hover:opacity-95 transition-opacity"
          >
            {badgeContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {isBusiness ? `Visit ${business.name}'s Public Storefront` : `View @${author?.username || "user"}'s Profile`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
