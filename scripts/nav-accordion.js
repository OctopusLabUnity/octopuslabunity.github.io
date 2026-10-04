(() => {
  const DURATION_MS = 150;

  document.querySelectorAll(".documentation-nav-group").forEach((group) => {
    const toggle = group.querySelector(".documentation-nav-toggle");
    const panel = group.querySelector(".documentation-nav-panel");
    if (!toggle || !panel) return;

    let animation = null;
    let isOpen = group.classList.contains("is-open");

    panel.style.height = isOpen ? "auto" : "0px";
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

    function animateHeight(from, to, onDone) {
      if (animation) {
        animation.cancel();
        animation = null;
      }

      group.classList.add("is-animating");
      panel.style.height = `${from}px`;

      const running = panel.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: DURATION_MS,
        easing: "ease",
        fill: "forwards",
      });
      animation = running;

      running.finished
        .then(() => {
          if (animation !== running) return;
          onDone();
          running.cancel();
          animation = null;
          group.classList.remove("is-animating");
        })
        .catch(() => {
          if (animation === running) {
            animation = null;
            group.classList.remove("is-animating");
          }
        });
    }

    toggle.addEventListener("click", () => {
      const from = panel.getBoundingClientRect().height;

      if (isOpen) {
        isOpen = false;
        group.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        animateHeight(from, 0, () => {
          panel.style.height = "0px";
        });
        return;
      }

      isOpen = true;
      group.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");

      const previous = panel.style.height;
      panel.style.height = "auto";
      const to = panel.scrollHeight;
      panel.style.height = previous;

      animateHeight(from, to, () => {
        panel.style.height = "auto";
      });
    });
  });

  const nav = document.querySelector(".documentation-nav");
  if (!nav) return;

  const SCROLL_DURATION_MS = 250;
  const mobileQuery = window.matchMedia("(max-width: 960px)");
  const menuButton = nav.querySelector(".documentation-nav-menu");
  const navScroll = nav.querySelector(".documentation-nav-scroll");
  let scrollFrame = 0;

  function setMenuOpen(isOpen) {
    nav.classList.toggle("is-menu-open", isOpen);
    document.body.classList.toggle("nav-menu-open", isOpen);
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    }
  }

  function updateNavCompact() {
    const isCompact = mobileQuery.matches && window.scrollY > 8;
    nav.classList.toggle("is-compact", isCompact);
  }

  function handleBreakpointChange() {
    if (!mobileQuery.matches) {
      setMenuOpen(false);
    }
    updateNavCompact();
  }

  function getStickyOffset() {
    if (!mobileQuery.matches) return 0;
    return nav.getBoundingClientRect().height;
  }

  function lerpScrollTo(targetY) {
    if (scrollFrame) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    }

    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 1) {
      window.scrollTo(0, targetY);
      return;
    }

    const startTime = performance.now();

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    }

    function tick(now) {
      const t = Math.min(1, (now - startTime) / SCROLL_DURATION_MS);
      window.scrollTo(0, startY + delta * easeInOutCubic(t));
      if (t < 1) {
        scrollFrame = requestAnimationFrame(tick);
        return;
      }
      scrollFrame = 0;
    }

    scrollFrame = requestAnimationFrame(tick);
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") {
      lerpScrollTo(0);
      return true;
    }

    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!id) {
      lerpScrollTo(0);
      return true;
    }

    const target = document.getElementById(id);
    if (!target) return false;

    const top =
      target.getBoundingClientRect().top + window.scrollY - getStickyOffset();
    lerpScrollTo(Math.max(0, top));
    return true;
  }

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      if (!mobileQuery.matches) return;
      setMenuOpen(!nav.classList.contains("is-menu-open"));
    });
  }

  if (navScroll) {
    navScroll.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || !navScroll.contains(link)) return;

      const hash = link.getAttribute("href");
      if (!hash) return;

      event.preventDefault();
      if (mobileQuery.matches) setMenuOpen(false);
      if (scrollToHash(hash)) {
        history.pushState(null, "", hash === "#" ? location.pathname : hash);
      }
    });
  }

  window.addEventListener("scroll", updateNavCompact, { passive: true });
  mobileQuery.addEventListener("change", handleBreakpointChange);
  handleBreakpointChange();
})();
