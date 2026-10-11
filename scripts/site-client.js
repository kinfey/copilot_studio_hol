const menu = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const closeMenu = () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("visible");
  menu.setAttribute("aria-expanded", "false");
};
menu.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  overlay.classList.toggle("visible", open);
  menu.setAttribute("aria-expanded", String(open));
});
overlay.addEventListener("click", closeMenu);
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  const url = new URL(location.href);
  url.searchParams.set("scoutTheme", theme);
  history.replaceState(null, "", url);
  document.querySelectorAll('a[href]').forEach(link => {
    const target = new URL(link.href, location.href);
    if (target.origin === location.origin && target.pathname.endsWith(".html")) {
      target.searchParams.set("scoutTheme", theme);
      link.href = target.href;
    }
  });
});
const search = document.getElementById("search-input");
const results = document.getElementById("search-results");
const data = JSON.parse(document.getElementById("search-data").textContent);
search.addEventListener("input", () => {
  const query = search.value.trim().toLocaleLowerCase();
  results.replaceChildren();
  results.classList.toggle("visible", Boolean(query));
  if (!query) return;
  const matches = data.filter(item => (item.title + " " + item.text).toLocaleLowerCase().includes(query)).slice(0, 8);
  for (const item of matches) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.title;
    results.append(link);
  }
  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = results.dataset.empty;
    results.append(empty);
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    results.classList.remove("visible");
    closeMenu();
    search.blur();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".search-shell")) results.classList.remove("visible");
});
const topButton = document.getElementById("scroll-top");
window.addEventListener("scroll", () => topButton.classList.toggle("visible", scrollY > 500), { passive: true });
topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
const tocLinks = [...document.querySelectorAll(".article-toc-link")];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      tocLinks.forEach(link => link.classList.toggle("active", link.hash === "#" + entry.target.id));
    }
  }
}, { rootMargin: "-72px 0px -65% 0px" });
document.querySelectorAll("article h2").forEach(heading => observer.observe(heading));
