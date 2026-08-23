import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MiniApp from "@/components/blog/MiniApp";

/**
 * Renders the blog post content with:
 *  - admin-managed custom HTML/script blocks (location = "blog-inline")
 *    inserted at stable random positions between paragraphs, and
 *  - interactive mini-apps declared by the AI writer as shortcodes, e.g.
 *      [miniapp type="roi" title="ROI Calculator"]
 *      [miniapp type="checklist" items="Register CAC|Open account|Get TIN"]
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

    if (!injections || injections.length === 0) return;

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

    // Pick distinct insertion indexes, skipping the first 2 blocks
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
      // Re-create script tags so they execute
      tpl.content.querySelectorAll("script").forEach((oldScript) => {
        const s = document.createElement("script");
        [...oldScript.attributes].forEach((a) => s.setAttribute(a.name, a.value));
        s.text = oldScript.textContent || "";
        oldScript.replaceWith(s);
      });
      wrapper.appendChild(tpl.content);
      target.parentNode?.insertBefore(wrapper, target);
    });
  }, [html, postId, injections, title]);

  useEffect(() => () => {
    const roots = rootsRef.current;
    rootsRef.current = [];
    roots.forEach((r) => queueMicrotask(() => r.unmount()));
  }, []);

  return (
    <div
      ref={ref}
      className="prose prose-base md:prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-8 prose-li:leading-8 prose-img:rounded-xl prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:not-italic prose-blockquote:text-lg"
    />
  );
}
