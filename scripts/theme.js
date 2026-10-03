(() => {
  const STORAGE_KEY = "theme";
  const TOGGLE_SELECTOR =
    ".documentation-theme-toggle, .home-theme-toggle";
  const root = document.documentElement;

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function syncToggle(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll(TOGGLE_SELECTOR).forEach((button) => {
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
      button.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      const icon = button.querySelector(
        ".documentation-theme-toggle-icon, .home-theme-toggle-icon"
      );
      if (icon) {
        const iconClass = icon.className.includes("home-theme-toggle-icon")
          ? "home-theme-toggle-icon"
          : "documentation-theme-toggle-icon";
        icon.className = isDark
          ? `fa-solid fa-sun ${iconClass}`
          : `fa-solid fa-moon ${iconClass}`;
      }
      const label = button.querySelector(
        ".documentation-theme-toggle-label, .home-theme-toggle-label"
      );
      if (label) {
        label.textContent = isDark ? "Light mode" : "Dark mode";
      }
    });
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    syncToggle(theme);
  }

  applyTheme(getPreferredTheme());

  document.addEventListener("DOMContentLoaded", () => {
    syncToggle(root.getAttribute("data-theme") || "light");
    document.querySelectorAll(TOGGLE_SELECTOR).forEach((button) => {
      button.addEventListener("click", () => {
        const next =
          root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    });
  });
})();
