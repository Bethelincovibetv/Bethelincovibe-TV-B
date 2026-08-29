import React from "react";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

interface EmojiReactionsMenuProps {
  onSelectReaction: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiReactionsMenu: React.FC<EmojiReactionsMenuProps> = ({
  onSelectReaction,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-1 p-1.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl ring-1 ring-black/5 animate-in zoom-in-95 duration-150 z-30">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelectReaction(emoji);
            onClose();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-130 hover:bg-muted transition-transform active:scale-95 select-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
