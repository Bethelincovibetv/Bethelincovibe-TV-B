// Serves a tiny JS snippet that any external site can <script src=...> include.
// Renders a rotating banner ad from our network into the parent element.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "public, max-age=60",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const base = Deno.env.get("SUPABASE_URL") || "";
  const reqUrl = new URL(req.url);
  const placement = reqUrl.searchParams.get("placement") || "blog";
  const apiKey = reqUrl.searchParams.get("key") || "";

  const js = `(function(){
  var SCRIPT = document.currentScript;
  if(!SCRIPT) return;
  var slot = SCRIPT.getAttribute('data-slot') || '${placement}';
  var container = document.createElement('div');
  container.className = 'bivtv-ad-slot';
  container.style.cssText = 'max-width:728px;margin:16px auto;text-align:center;';
  SCRIPT.parentNode.insertBefore(container, SCRIPT);
  var headers = { 'Content-Type': 'application/json' };
  ${apiKey ? `headers['x-api-key'] = '${apiKey}';` : ""}
  fetch('${base}/functions/v1/ad-server?placement='+encodeURIComponent(slot)+'&page='+encodeURIComponent(location.pathname), { headers: headers })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(!d || !d.ad) return;
      var a = d.ad;
      container.innerHTML = '<a href="'+a.click_url+'" target="_blank" rel="noopener sponsored" style="display:inline-block;text-decoration:none;color:inherit"><img src="'+a.image_url+'" alt="'+(a.title||'').replace(/"/g,'')+'" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:auto" loading="lazy" /><div style="font-size:11px;color:#888;margin-top:4px">Ad &middot; Bethelincovibe TV</div></a>';
    }).catch(function(){});
})();`;
  return new Response(js, { headers: corsHeaders });
});