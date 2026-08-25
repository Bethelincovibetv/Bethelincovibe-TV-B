/**
 * Safe clipboard copy helper that works across all browsers, iframes,
 * focused/unfocused windows, and insecure/mobile contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard if supported and window has focus
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Failed (e.g. Document is not focused, permission denied, iframe restriction)
      // Fall through to fallback
    }
  }

  // 2. Fallback using temporary textarea and document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.setAttribute("readonly", "");

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
