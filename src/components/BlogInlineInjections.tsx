import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MiniApp from "@/components/blog/MiniApp";

/**
 * Renders the blog post content with:
 *  - admin-managed custom HTML/script blocks (location = "blog-inline")
 *  - interactive mini-apps declared by the AI writer as shortcodes
 *  - contextual admin-managed referral & affiliate partner cards
 */

const SHORTCODE = /\[miniapp\s+([^\]]+)\]/gi;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w[\w-]*)\s*=\s*"([^"]*)"|(\w[\w-]*)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    attrs[(m[1] || m[3]).toLowerCase()] = m[2] ?? m[4] ?? "";
  }
  return attrs;
}

/** Replace shortcodes with mount points and return the collected specs. */
function extractMiniApps(rawHtml: string) {
  let content = rawHtml || "";

  // Check if content already includes a table or mini-app shortcode
  const hasTableOrApp = /<table\b/i.test(content) || /\[miniapp/i.test(content);
  if (!hasTableOrApp && content.trim()) {
    content += `\n\n[miniapp type="comparison" title="Quick Comparison & Summary"]`;
  }

  const specs: { type: string; props: Record<string, string> }[] = [];
  const out = content.replace(SHORTCODE, (_full, body: string) => {
    const attrs = parseAttrs(body);
    const type = attrs.type || attrs.app || "";
    if (!type) return "";
    const idx = specs.length;
    specs.push({ type, props: attrs });
    return `<div data-miniapp-mount="${idx}"></div>`;
  });

  return { html: out, specs };
}

export default function BlogInlineInjections({
  html,
  postId,
  title = "",
}: {
  html: string;
  postId: string;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  const { data: injections } = useQuery({
    queryKey: ["blog-inline-injections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("custom_code_injections")
        .select("id, code, name")
        .eq("active", true)
        .eq("location", "blog-inline")
        .order("display_order");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: affiliateLinks } = useQuery({
    queryKey: ["blog-affiliate-links-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stable seeded RNG (mulberry32) so positions don't shuffle on re-render
  const seededRand = (seed: number) => {
    let t = seed;
    return () => {
      t |= 0; t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Tear down any mini-apps from a previous render
    const previous = rootsRef.current;
    rootsRef.current = [];
    previous.forEach((r) => queueMicrotask(() => r.unmount()));

    const { html: cleaned, specs } = extractMiniApps(html || "");
    root.innerHTML = cleaned;

    // Enhance all standard HTML tables to be mobile-friendly and responsive
    root.querySelectorAll("table").forEach((tbl) => {
      if (tbl.parentElement?.classList.contains("table-responsive-wrapper")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-responsive-wrapper my-6 overflow-x-auto rounded-xl border border-border/80 shadow-sm bg-card text-card-foreground p-0 no-scrollbar";
      tbl.parentNode?.insertBefore(wrapper, tbl);
      wrapper.appendChild(tbl);
    });

    // Mount interactive mini-apps
    root.querySelectorAll<HTMLElement>("[data-miniapp-mount]").forEach((node) => {
      const spec = specs[Number(node.dataset.miniappMount)];
      if (!spec) return;
      const r = createRoot(node);
      r.render(<MiniApp type={spec.type} props={spec.props} contextTitle={title} />);
      rootsRef.current.push(r);
    });

    // Find top-level block candidates between which we can insert
    const blocks = Array.from(root.children).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return ["p", "h2", "h3", "ul", "ol", "figure", "div", "details"].includes(tag);
    });
    if (blocks.length < 3) return;

    // Seed from postId so layout is stable per post
    let seed = 0;
    for (let i = 0; i < postId.length; i++) seed = (seed * 31 + postId.charCodeAt(i)) | 0;
    const rand = seededRand(seed);

    // 1. Insert Custom Code Injections
    if (injections && injections.length > 0) {
      const used = new Set<number>();
      injections.forEach((inj) => {
        let tries = 0;
        while (tries < 10) {
          const idx = 2 + Math.floor(rand() * (blocks.length - 2));
          if (!used.has(idx)) { used.add(idx); break; }
          tries++;
        }
        const targetIdx = [...used][used.size - 1];
        const target = blocks[targetIdx];
        if (!target) return;

        const wrapper = document.createElement("div");
        wrapper.className = "my-6";
        wrapper.dataset.injection = `bi-${inj.id}`;
        const tpl = document.createElement("template");
        tpl.innerHTML = inj.code || "";
        tpl.content.querySelectorAll("script").forEach((oldScript) => {
          const s = document.createElement("script");
          [...oldScript.attributes].forEach((a) => s.setAttribute(a.name, a.value));
          s.text = oldScript.textContent || "";
          oldScript.replaceWith(s);
        });
        wrapper.appendChild(tpl.content);
        target.parentNode?.insertBefore(wrapper, target);
      });
    }

    // 2. Contextual Referral Link Fallback Injection
    if (affiliateLinks && affiliateLinks.length > 0) {
      const pageText = (root.textContent || "").toLowerCase() + " " + title.toLowerCase();
      const matchedAffiliates = affiliateLinks.filter((aff: any) => {
        if (!aff.keywords || aff.keywords.length === 0) return false;
        return aff.keywords.some((k: string) => pageText.includes(k.toLowerCase().trim()));
      });

      if (matchedAffiliates.length > 0) {
        const aff = matchedAffiliates[0];
        // Check if link already exists in the page
        const alreadyHasLink = root.querySelector(`a[href*="${aff.url}"]`);
        if (!alreadyHasLink) {
          const targetIndex = Math.min(blocks.length - 1, 3);
          const target = blocks[targetIndex];
          if (target) {
            const card = document.createElement("div");
            card.className = "my-8 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 border border-primary/20 shadow-sm";
            const isExt = aff.url.startsWith("http");
            card.innerHTML = `
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                    <span class="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <span>Verified Partner Recommendation</span>
                  </div>
                  <h4 class="text-base font-extrabold text-foreground m-0">${aff.label}</h4>
                  <p class="text-xs text-muted-foreground m-0">${aff.description || "Discover verified deals, tools, and supplier partnerships."}</p>
                </div>
                <a href="${aff.url}" ${isExt ? 'target="_blank" rel="noopener noreferrer"' : ""} class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 no-underline">
                  <span>Visit ${aff.label}</span>
                  <span>→</span>
                </a>
              </div>
            `;
            target.parentNode?.insertBefore(card, target);
          }
        }
      }
    }
  }, [html, postId, injections, affiliateLinks, title]);

  useEffect(() => () => {
    const roots = rootsRef.current;
    rootsRef.current = [];
    roots.forEach((r) => queueMicrotask(() => r.unmount()));
  }, []);

  return (
    <div
      ref={ref}
      className="blog-article-content prose prose-lg md:prose-xl max-w-none font-medium text-foreground leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-headings:text-foreground prose-p:font-medium prose-p:text-foreground/95 prose-p:leading-8 prose-p:text-[17.5px] md:prose-p:text-[19px] prose-li:font-medium prose-li:text-foreground/95 prose-li:leading-8 prose-strong:font-black prose-strong:text-foreground prose-img:rounded-2xl prose-a:font-bold prose-a:text-primary prose-a:underline prose-blockquote:font-semibold prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:text-foreground prose-blockquote:bg-muted/40 prose-blockquote:p-4.5 prose-blockquote:rounded-r-xl"
    />
  );
}
