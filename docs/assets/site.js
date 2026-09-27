/* 공통 UI: 다크 모드 토글, 검색 팔레트, 공유 버튼 */
(function () {
  "use strict";
  const root = document.documentElement;
  const tBtn = document.getElementById("toggle-theme");
  tBtn && tBtn.addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  const dlg = document.getElementById("search"), input = document.getElementById("search-input"), list = document.getElementById("search-list");
  const open = () => { if (!dlg.open) { dlg.showModal(); input.value = ""; render(""); input.focus(); } };
  document.getElementById("open-search").addEventListener("click", open);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); open(); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  let idx = 0, items = [];
  function render(q) {
    q = q.trim().toLowerCase();
    items = (window.NALSEM_INDEX || []).filter((c) => !q || c.title.toLowerCase().includes(q) || c.keys.some((k) => k.includes(q))).slice(0, 12);
    idx = 0;
    list.innerHTML = items.length ? items.map((c, i) => `<a href="/${c.slug}/" ${i === 0 ? 'aria-selected="true"' : ""}>${c.title}<small>${c.cat}</small></a>`).join("") : `<p class="search-empty">일치하는 계산기가 없습니다</p>`;
  }
  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    const as = list.querySelectorAll("a");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!as.length) return; as[idx].removeAttribute("aria-selected"); idx = (idx + (e.key === "ArrowDown" ? 1 : as.length - 1)) % as.length; as[idx].setAttribute("aria-selected", "true"); as[idx].scrollIntoView({ block: "nearest" }); }
    if (e.key === "Enter") { e.preventDefault(); if (as[idx]) location.href = as[idx].href; }
  });

  // 공유 버튼 (data-share)
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-share]"); if (!b) return;
    const r = await N.share(document.title, b.dataset.share || document.title);
    if (r === "copied") { const t = b.textContent; b.textContent = "링크 복사됨"; setTimeout(() => (b.textContent = t), 1600); }
  });
})();
