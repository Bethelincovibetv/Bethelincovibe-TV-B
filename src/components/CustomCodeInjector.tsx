import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function matchRoute(pattern: string, path: string): boolean {
  if (!pattern || pattern === "*") return true;
  // Support exact, prefix with /*, and comma-separated lists
  return pattern.split(",").map((s) => s.trim()).some((p) => {
    if (p === "*") return true;
    if (p.endsWith("/*")) return path.startsWith(p.slice(0, -2));
    return path === p;
  });
}

function injectHTML(html: string, target: HTMLElement, marker: string) {
  const wrapper = document.createElement("div");
  wrapper.dataset.injection = marker;
  // Parse and re-create script tags so they execute
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("script").forEach((oldScript) => {
    const s = document.createElement("script");
    [...oldScript.attributes].forEach((a) => s.setAttribute(a.name, a.value));
    s.text = oldScript.textContent || "";
    s.onerror = () => {};
    oldScript.replaceWith(s);
  });
  wrapper.appendChild(tpl.content);
  target.appendChild(wrapper);
}

export default function CustomCodeInjector() {
  const { pathname } = useLocation();
  const { data: rules } = useQuery({
    queryKey: ["custom-code-injections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("custom_code_injections")
        .select("*")
        .eq("active", true)
        .order("display_order");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!rules) return;
    // Cleanup previous
    document.querySelectorAll('[data-injection^="cci-"]').forEach((n) => n.remove());

    rules.forEach((r: any) => {
      if (!matchRoute(r.route_pattern, pathname)) return;
      const target = r.location === "body" ? document.body : document.head;
      if (!target || !r.code) return;
      // Block Adsterra ad scripts
      if (/adsterra|alwingulla|highperformancegate/i.test(r.code)) return;
      injectHTML(r.code, target, `cci-${r.id}`);
    });
  }, [rules, pathname]);

  return null;
}
