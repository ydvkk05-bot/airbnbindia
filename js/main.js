/* Airbnb India — shared interactions */
(function () {
  "use strict";

  var DATA = window.AIRBNB_INDIA_DATA || { destinations: [], listings: [], posts: [] };

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---------- Active nav link ---------- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("/").pop();
    if (href === path) a.classList.add("active");
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var dec = el.getAttribute("data-dec") || "0";
        var suffix = el.getAttribute("data-suffix") || "";
        var t0 = performance.now();
        function tick(now) {
          var p = Math.min((now - t0) / 1600, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Back to top ---------- */
  var backTop = document.querySelector(".back-top");
  if (backTop) {
    window.addEventListener("scroll", function () {
      backTop.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    backTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------- Search ---------- */
  var searchInput = document.getElementById("search-input");
  var searchResults = document.getElementById("search-results");
  var searchForm = document.getElementById("search-form");

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function buildResults(query) {
    var q = query.trim().toLowerCase();
    var out = "";
    if (q.length === 0) return out;

    var hits = [];

    DATA.destinations.forEach(function (d) {
      var hay = (d.name + " " + d.state + " " + d.tagline + " " + (d.keywords || []).join(" ")).toLowerCase();
      if (hay.indexOf(q) !== -1) hits.push({ title: d.name + ", " + d.state, sub: d.tagline, url: d.url, tag: "Destination", thumb: d.name.charAt(0), color: "#14594d", img: d.img });
    });
    DATA.listings.forEach(function (l) {
      var hay = (l.name + " " + l.city + " " + l.state + " " + l.type + " " + (l.keywords || []).join(" ")).toLowerCase();
      if (hay.indexOf(q) !== -1) hits.push({ title: l.name, sub: l.city + ", " + l.state + " \u00b7 " + l.type, url: l.url, tag: "BNB", thumb: l.name.charAt(0), color: "#c2552f", img: l.img });
    });
    DATA.posts.forEach(function (p) {
      var hay = (p.title + " " + p.category + " " + (p.keywords || []).join(" ")).toLowerCase();
      if (hay.indexOf(q) !== -1) hits.push({ title: p.title, sub: "Blog \u00b7 " + p.category, url: p.url, tag: "Blog", thumb: "B", color: "#0b2b26", img: p.img });
    });

    if (hits.length === 0) {
      out = '<div class="search-result-item"><div><div class="res-title">No results for "' + esc(query) + '"</div><div class="res-sub">Try "Goa", "Udaipur", "beach" or "houseboat".</div></div></div>';
    } else {
      hits.slice(0, 7).forEach(function (h) {
        var imgHtml = h.img ? '<img class="thumb" src="' + h.img + '" alt="" loading="lazy">' : '<span class="thumb" style="background:' + h.color + '">' + esc(h.thumb) + '</span>';
        out += '<a class="search-result-item" href="' + h.url + '">' +
          imgHtml +
          '<span><span class="res-title">' + esc(h.title) + '</span><br><span class="res-sub">' + esc(h.sub) + '</span></span>' +
          '<span class="tag">' + esc(h.tag) + '</span></a>';
      });
    }
    return out;
  }

  function renderSearch() {
    if (!searchResults || !searchInput) return;
    var html = buildResults(searchInput.value);
    if (searchInput.value.trim().length === 0) {
      searchResults.classList.remove("open");
    } else {
      searchResults.innerHTML = html;
      searchResults.classList.add("open");
    }
  }

  if (searchInput && searchResults) {
    searchInput.addEventListener("input", renderSearch);
    searchInput.addEventListener("focus", renderSearch);
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-shell")) searchResults.classList.remove("open");
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      if (q.length === 0) { e.preventDefault(); return; }
      var url = "destinations.html";
      var match = null;
      DATA.destinations.forEach(function (d) {
        var hay = (d.name + " " + d.state + " " + (d.keywords || []).join(" ")).toLowerCase();
        if (hay.indexOf(q) !== -1 && !match) match = d;
      });
      if (!match) {
        DATA.listings.forEach(function (l) {
          if (!match && (l.name + " " + l.city + " " + l.state).toLowerCase().indexOf(q) !== -1) match = { url: l.url };
        });
      }
      if (!match) {
        DATA.destinations.forEach(function (d) {
          if (!match && d.keywords && d.keywords.some(function (k) { return q.indexOf(k) !== -1 || k.indexOf(q) !== -1; })) match = d;
        });
      }
      if (!match) {
        DATA.posts.forEach(function (p) {
          if (!match && p.title.toLowerCase().indexOf(q) !== -1) match = { url: p.url };
        });
      }
      e.preventDefault();
      window.location.href = match ? match.url : url;
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (o) {
        o.classList.remove("open");
        o.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!open) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---------- Save / wishlist heart ---------- */
  document.querySelectorAll(".bnb-heart").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.classList.toggle("saved");
      var toast = document.querySelector(".toast");
      if (toast) {
        toast.textContent = btn.classList.contains("saved") ? "Saved to your wishlist \u2661" : "Removed from wishlist";
        toast.classList.add("show");
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { toast.classList.remove("show"); }, 1800);
      }
    });
  });

  /* ---------- Blog category filter ---------- */
  var chips = document.querySelectorAll(".chip[data-cat]");
  var cards = document.querySelectorAll(".blog-card[data-cat]");
  if (chips.length) {
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.remove("active"); });
        c.classList.add("active");
        var cat = c.getAttribute("data-cat");
        cards.forEach(function (card) {
          card.style.display = (cat === "all" || card.getAttribute("data-cat") === cat) ? "" : "none";
        });
      });
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- External link redirect notice ---------- */
  document.querySelectorAll("a[data-airbnb]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var href = a.getAttribute("href");
      var toast = document.querySelector(".toast");
      if (toast) {
        toast.textContent = "Opening Airbnb \u2026";
        toast.classList.add("show");
        setTimeout(function () { toast.classList.remove("show"); }, 1200);
      }
      setTimeout(function () { window.open(href, "_blank", "noopener"); }, 250);
    });
  });

  /* ---------- One-time announcement popup ---------- */
  (function () {
    var notifs = (DATA.notifications || []);
    if (!notifs.length) return;
    var n = notifs[0];
    if (!n || !n.text) return;
    var KEY = "ai_notif_seen_" + n.id;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch (e) { /* storage blocked — still show */ }
    var ov = document.createElement("div");
    ov.className = "notif-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Announcement");
    ov.innerHTML =
      '<div class="notif-modal">' +
        '<button type="button" class="notif-close" aria-label="Close announcement"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<div class="notif-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>' +
        '<h3>Announcement</h3>' +
        '<p>' + esc(n.text) + '</p>' +
        (n.link ? '<a class="btn btn-primary notif-btn" href="' + n.link + '" target="_blank" rel="noopener">Learn more</a>' : '<button type="button" class="btn btn-primary notif-btn">Got it</button>') +
      '</div>';
    function dismiss() {
      ov.classList.remove("show");
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 350);
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
    }
    ov.addEventListener("click", function (e) {
      if (e.target === ov) dismiss();
    });
    var closeBtn = ov.querySelector(".notif-close");
    if (closeBtn) closeBtn.addEventListener("click", dismiss);
    var gotIt = ov.querySelector(".notif-btn:not([href])");
    if (gotIt) gotIt.addEventListener("click", dismiss);
    document.body.appendChild(ov);
    setTimeout(function () { ov.classList.add("show"); }, 400);
  })();
})();
