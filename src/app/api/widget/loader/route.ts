export const runtime = "nodejs";

// GET /api/widget/loader?key=WIDGET_KEY — returns a tiny script that injects a
// floating help bubble. The bubble toggles an iframe pointing at /widget/<key>
// on our origin, so all data calls inside it are same-origin (no CORS).
export function GET(req: Request): Response {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const origin = url.origin;

  const js = `(function () {
  var KEY = ${JSON.stringify(key)};
  var ORIGIN = ${JSON.stringify(origin)};
  if (!KEY || document.getElementById("ticketos-widget-btn")) return;

  var open = false;
  var frame;

  var btn = document.createElement("button");
  btn.id = "ticketos-widget-btn";
  btn.setAttribute("aria-label", "Get help");
  btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483000;width:56px;height:56px;border:none;border-radius:9999px;background:#0b2a4a;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 8px 24px rgba(7,17,31,.28);transition:transform .15s ease;";
  btn.innerHTML = "&#128172;";
  btn.onmouseenter = function () { btn.style.transform = "scale(1.06)"; };
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };

  function ensureFrame() {
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.src = ORIGIN + "/widget/" + encodeURIComponent(KEY);
    frame.title = "Help assistant";
    frame.style.cssText = "position:fixed;bottom:88px;right:20px;z-index:2147483000;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);border:none;border-radius:16px;box-shadow:0 16px 48px rgba(7,17,31,.32);background:#fff;display:none;";
    document.body.appendChild(frame);
    return frame;
  }

  btn.onclick = function () {
    var f = ensureFrame();
    open = !open;
    f.style.display = open ? "block" : "none";
    btn.innerHTML = open ? "&#10005;" : "&#128172;";
  };

  document.body.appendChild(btn);
})();`;

  return new Response(js, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
