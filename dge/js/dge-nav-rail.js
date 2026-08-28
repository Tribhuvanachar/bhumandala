/* DGE UI Contract: sitewide right-side global nav rail.
 *
 * One persistent way to jump to another corpus/tool without backing out
 * through the header menu (project lead's framing, 28 Aug 2026 — see
 * dge/DGE_UI_CONTRACT.md's "new formalized requirement" section for the
 * exact policy this implements).
 *
 * Built as a self-contained custom element, deliberately independent of
 * modals.js/main.css/vyakarana-base.css's own token systems (same reasoning
 * the Ashtadhyayi retrofit used for its scoped CSS — see DGE_UI_CONTRACT.md
 * Part IV §1): this rail has to render identically on dge/index.html
 * (tokens.css/main.css), the Vyakarana cluster (vyakarana-base.css, its own
 * --panel/--line/--ink vars), and Guru Parampara (guru-parampara.css) alike,
 * without requiring any of them to load a shared stylesheet first. It reads
 * --accent-red when the host page defines it (identity/navigation chrome,
 * per the semantic color table) and falls back to a fixed value otherwise.
 *
 * Usage: <dge-nav-rail current="dhatu"></dge-nav-rail>, placed anywhere in
 * the body (position is fixed, so DOM location doesn't matter), after this
 * script tag. `current` is one of the ids in ITEMS below, or omitted.
 *
 * Responsive contract (documented in DGE_UI_CONTRACT.md):
 *   >= 760px (the breakpoint main.css/kavya.css/dasa-sahitya.css already use
 *   sitewide for the mobile/desktop split): a fixed vertical rail docked to
 *   the right edge, icon + label per corpus/tool, current page marked.
 *   < 760px: the rail itself is not shown (no room for it without covering
 *   content) — it collapses into a small docked edge tab in the same visual
 *   family as dge/index.html's existing `.dge-qa-tab` (same fixed-edge-tab
 *   pattern, deliberately not the same element or job: qa-tab is the
 *   Kosha/Search/Ask-Acharya entry point and only exists on dge/index.html;
 *   this is cross-corpus navigation and needs to exist on every page,
 *   including ones with no qa-tab at all). Docked at a different vertical
 *   offset (see CSS below) so the two never overlap on dge/index.html, the
 *   one page that has both. Tapping the tab opens a small link-list sheet
 *   with the same items as the desktop rail.
 */
(function () {
  "use strict";
  if (window.customElements && window.customElements.get("dge-nav-rail")) return;

  var ITEMS = [
    { id: "home", label: "DGE Home", glyph: "⌂", href: "dge/index.html" },
    { id: "ashtadhyayi", label: "Aṣṭādhyāyī", glyph: "अ", href: "dge/vyakarana/ashtadhyayi.html" },
    { id: "dhatu", label: "Dhātu", glyph: "ध", href: "dge/vyakarana/dhatu.html" },
    { id: "shabda", label: "Śabda", glyph: "श", href: "dge/vyakarana/shabda.html" },
    { id: "kavya", label: "Kāvya", glyph: "का", href: "dge/kavya/index.html" },
    { id: "tirtha", label: "Tīrtha", glyph: "ती", href: "dge/tirtha/index.html" },
    { id: "guru-parampara", label: "Guru Paramparā", glyph: "गु", href: "dge/guru-parampara/index.html" },
    { id: "dasa-sahitya", label: "Dāsa Sāhitya", glyph: "दा", href: "dge/dasa-sahitya/index.html" }
  ];

  function siteRoot() {
    // Resolve relative to this script's own known location (dge/js/), not
    // the including page's location, so the same markup works unmodified
    // whether the host page is at site root, dge/, dge/vyakarana/, or
    // dge/guru-parampara/.
    var cur = document.currentScript;
    var src = cur && cur.getAttribute("src");
    if (!src) return "./";
    return new URL("../../", new URL(src, document.baseURI)).href;
  }

  var ROOT = siteRoot();

  var STYLE_ID = "dge-nav-rail-style";
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      "dge-nav-rail{display:contents;}" +
      ".dge-nr-rail{position:fixed;top:50%;right:0;transform:translateY(-50%);" +
      "z-index:9200;display:flex;flex-direction:column;gap:2px;" +
      "background:rgba(20,16,12,0.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      "border:1px solid rgba(232,178,77,0.18);border-right:none;" +
      "border-radius:10px 0 0 10px;padding:6px 0;box-shadow:-2px 2px 12px rgba(0,0,0,.22);}" +
      ".dge-nr-link{display:flex;align-items:center;gap:8px;padding:7px 14px 7px 10px;" +
      "text-decoration:none;color:#F3E7D4;font-size:12.5px;line-height:1.15;white-space:nowrap;" +
      "border-left:2px solid transparent;font-family:inherit;}" +
      ".dge-nr-link:hover{background:rgba(255,255,255,0.07);}" +
      ".dge-nr-link[aria-current=page]{border-left-color:var(--accent-red,#9A1B1B);" +
      "color:var(--accent-red,#E2664A);font-weight:600;cursor:default;}" +
      ".dge-nr-glyph{display:inline-flex;align-items:center;justify-content:center;" +
      "width:20px;height:20px;flex:none;font-size:13px;}" +
      "@media (max-width:759px){.dge-nr-rail{display:none;}}" +
      ".dge-nr-tab{display:none;position:fixed;right:0;bottom:calc(230px + env(safe-area-inset-bottom));" +
      "z-index:9190;width:26px;height:52px;border:none;border-radius:8px 0 0 8px;" +
      "background:var(--accent-red,#9A1B1B);color:#fff;font-size:15px;line-height:1;" +
      "box-shadow:-2px 2px 8px rgba(0,0,0,.25);cursor:pointer;" +
      "align-items:center;justify-content:center;}" +
      "@media (max-width:759px){.dge-nr-tab{display:flex;}}" +
      ".dge-nr-sheet{display:none;position:fixed;right:8px;bottom:calc(286px + env(safe-area-inset-bottom));" +
      "z-index:9195;min-width:180px;background:rgba(20,16,12,0.94);backdrop-filter:blur(8px);" +
      "-webkit-backdrop-filter:blur(8px);border:1px solid rgba(232,178,77,0.22);border-radius:10px;" +
      "padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,.35);}" +
      ".dge-nr-sheet.open{display:block;}" +
      ".dge-nr-sheet .dge-nr-link{padding:9px 16px;font-size:13.5px;}" +
      ".dge-nr-backdrop{display:none;position:fixed;inset:0;z-index:9192;background:transparent;}" +
      ".dge-nr-backdrop.open{display:block;}";
    document.head.appendChild(s);
  }

  function itemHTML(it, current, sheetVariant) {
    var isCurrent = it.id === current;
    return (
      '<a class="dge-nr-link" href="' + ROOT + it.href + '"' +
      (isCurrent ? ' aria-current="page"' : "") +
      ' title="' + it.label + '" aria-label="Go to ' + it.label + '">' +
      '<span class="dge-nr-glyph" aria-hidden="true">' + it.glyph + "</span>" +
      "<span>" + it.label + "</span></a>"
    );
  }

  function DgeNavRail() {
    return Reflect.construct(HTMLElement, [], DgeNavRail);
  }
  DgeNavRail.prototype = Object.create(HTMLElement.prototype);
  DgeNavRail.prototype.constructor = DgeNavRail;
  Object.setPrototypeOf(DgeNavRail, HTMLElement);

  DgeNavRail.prototype.connectedCallback = function () {
    ensureStyle();
    var current = this.getAttribute("current") || "";
    var rail = document.createElement("nav");
    rail.className = "dge-nr-rail";
    rail.setAttribute("aria-label", "Other DGE corpora and tools");
    rail.innerHTML = ITEMS.map(function (it) { return itemHTML(it, current); }).join("");

    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "dge-nr-tab";
    tab.title = "Other DGE corpora and tools";
    tab.setAttribute("aria-label", "Open corpus and tool navigation");
    tab.setAttribute("aria-haspopup", "true");
    tab.setAttribute("aria-expanded", "false");
    tab.textContent = "⋯";

    var sheet = document.createElement("div");
    sheet.className = "dge-nr-sheet";
    sheet.setAttribute("role", "menu");
    sheet.innerHTML = ITEMS.map(function (it) { return itemHTML(it, current, true); }).join("");

    var backdrop = document.createElement("div");
    backdrop.className = "dge-nr-backdrop";

    function closeSheet() {
      sheet.classList.remove("open");
      backdrop.classList.remove("open");
      tab.setAttribute("aria-expanded", "false");
    }
    function toggleSheet() {
      var open = sheet.classList.toggle("open");
      backdrop.classList.toggle("open", open);
      tab.setAttribute("aria-expanded", open ? "true" : "false");
    }
    tab.addEventListener("click", toggleSheet);
    backdrop.addEventListener("click", closeSheet);
    sheet.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeSheet();
    });

    this.appendChild(rail);
    this.appendChild(tab);
    this.appendChild(sheet);
    this.appendChild(backdrop);
  };

  window.customElements.define("dge-nav-rail", DgeNavRail);
})();
