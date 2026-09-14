import React, { useState, useMemo } from "react";
import { Smile, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOJI_CATEGORIES = [
  {
    id: "business",
    name: "Trade & Commerce",
    icon: "💼",
    emojis: [
      { char: "💼", name: "briefcase business trade" },
      { char: "💰", name: "money bag cash naira dollar" },
      { char: "💵", name: "dollar money cash payment" },
      { char: "💳", name: "credit card pos bank atm" },
      { char: "📦", name: "package box delivery parcel order" },
      { char: "🚚", name: "delivery truck shipping logistics dispatch" },
      { char: "🚢", name: "cargo ship container import export freight" },
      { char: "🤝", name: "handshake deal agreement partnership" },
      { char: "📈", name: "chart increasing growth sales profit" },
      { char: "💎", name: "gem diamond vip luxury premium" },
      { char: "👑", name: "crown king boss verified leader" },
      { char: "🛡️", name: "shield security protection escrow safe" },
      { char: "🧾", name: "receipt invoice bill payment" },
      { char: "🏪", name: "store shop market merchant" },
      { char: "🏷️", name: "label tag price discount sale" },
      { char: "🛒", name: "shopping cart supermarket buy" },
    ],
  },
  {
    id: "smileys",
    name: "Smileys & Emotions",
    icon: "😀",
    emojis: [
      { char: "😀", name: "grinning face happy smile" },
      { char: "😃", name: "smiling big eyes cheerful" },
      { char: "😄", name: "laughing happy joy" },
      { char: "😁", name: "beaming grin proud" },
      { char: "😆", name: "squinting laughing lol" },
      { char: "😅", name: "sweat smile relief nervous" },
      { char: "🤣", name: "rofl laughing floor tears" },
      { char: "😂", name: "joy tears of joy funny" },
      { char: "🙂", name: "slightly smiling calm" },
      { char: "😉", name: "winking eye tease" },
      { char: "😊", name: "blushing warm proud" },
      { char: "😇", name: "halo angel innocent" },
      { char: "🥰", name: "hearts love adore" },
      { char: "😍", name: "heart eyes love wonderful" },
      { char: "🤩", name: "star struck excited amazed" },
      { char: "😘", name: "kiss blow kiss affection" },
      { char: "😎", name: "sunglasses cool suave" },
      { char: "🥳", name: "partying celebration excited" },
      { char: "🤔", name: "thinking pondering consider" },
      { char: "🤫", name: "shushing quiet secret" },
      { char: "🤗", name: "hugging warm friendly" },
      { char: "🫡", name: "saluting respect yes sir" },
      { char: "🙌", name: "raising hands celebration bless" },
      { char: "🙏", name: "folded hands please thank you prayer amen" },
    ],
  },
  {
    id: "gestures",
    name: "Gestures & Reactions",
    icon: "👍",
    emojis: [
      { char: "👍", name: "thumbs up good approved like agree" },
      { char: "👎", name: "thumbs down dislike disagree" },
      { char: "👌", name: "ok hand perfect fine" },
      { char: "✌️", name: "victory peace two" },
      { char: "🤞", name: "crossed fingers luck hope" },
      { char: "👏", name: "clapping hands bravo congrats" },
      { char: "🔥", name: "fire flame lit hot trend" },
      { char: "✨", name: "sparkles shiny magical special new" },
      { char: "💯", name: "hundred points perfect score truth" },
      { char: "🚀", name: "rocket ship fast launch growth" },
      { char: "❤️", name: "red heart love favorite" },
      { char: "💚", name: "green heart nigeria nature" },
      { char: "💙", name: "blue heart verified trust" },
      { char: "💜", name: "purple heart luxury royalty" },
      { char: "⭐", name: "star rating review best" },
      { char: "🌟", name: "glowing star featured top" },
    ],
  },
  {
    id: "tech_comms",
    name: "Tech & Media",
    icon: "📱",
    emojis: [
      { char: "📱", name: "mobile phone whatsapp call text" },
      { char: "💻", name: "laptop computer tech code website" },
      { char: "📺", name: "tv television video broadcast stream" },
      { char: "🎥", name: "movie camera video production film" },
      { char: "🎙️", name: "microphone podcast voice audio sound" },
      { char: "🎧", name: "headphones audio listen music" },
      { char: "📸", name: "camera photo product picture shoot" },
      { char: "🎨", name: "artist palette graphic design logo creative" },
      { char: "⚡", name: "high voltage fast speed instant power" },
      { char: "🔔", name: "bell notification alert reminder" },
      { char: "📢", name: "loudspeaker announcement broadcast news" },
      { char: "📍", name: "round pushpin location map lagos abuja" },
      { char: "🇳🇬", name: "nigeria flag naija lagos abuja" },
      { char: "🌍", name: "globe earth africa world global" },
    ],
  },
];

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPickerPopover({ onSelectEmoji, disabled }: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("business");

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { char: string; name: string }[] = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((e) => {
        if (e.name.includes(q) || e.char.includes(q)) {
          if (!results.some((r) => r.char === e.char)) {
            results.push(e);
          }
        }
      });
    });
    return results;
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/70 shrink-0 transition-transform active:scale-95"
          title="Add emoji or sticker"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[calc(100vw-32px)] max-w-[340px] p-3 rounded-2xl shadow-2xl border-border bg-card/95 backdrop-blur-xl z-50 animate-in zoom-in-95"
      >
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search emojis (naira, package, fire...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs rounded-xl bg-background/80"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Tabs if not searching */}
        {!search && (
          <div className="flex items-center gap-1 mb-2 pb-1.5 border-b border-border/60 overflow-x-auto scrollbar-none">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-[11px]">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="max-h-[220px] overflow-y-auto pr-1">
          {search ? (
            filteredEmojis && filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-7 gap-1.5 p-1">
                {filteredEmojis.map((e) => (
                  <button
                    key={e.char}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(e.char);
                      setOpen(false);
                    }}
                    title={e.name}
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-xl hover:bg-muted/80 hover:scale-120 active:scale-95 transition-all select-none"
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No emojis match "{search}"
              </div>
            )
          ) : (
            EMOJI_CATEGORIES.filter((c) => c.id === activeCategory).map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="grid grid-cols-7 gap-1.5 p-1">
                  {cat.emojis.map((e) => (
                    <button
                      key={e.char}
                      type="button"
                      onClick={() => {
                        onSelectEmoji(e.char);
                        setOpen(false);
                      }}
                      title={e.name}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-xl hover:bg-muted/80 hover:scale-120 active:scale-95 transition-all select-none"
                    >
                      {e.char}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Footer */}
        <div className="pt-2 mt-1 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Click to insert into message</span>
          <span className="font-bold text-primary">Bethel Express</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
