(() => {
  const DURATION_MS = 200;
  const controllers = new Map();

  document.querySelectorAll(".documentation-main-section").forEach((section) => {
    const toggle = section.querySelector(".documentation-main-toggle");
    const panel = section.querySelector(":scope > .documentation-main-panel");
    if (!toggle || !panel) return;

    let animation = null;
    let isOpen = section.classList.contains("is-open");

    panel.style.height = isOpen ? "" : "0px";
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

    function stopAnimation() {
      if (!animation) return;
      animation.cancel();
      animation = null;
      section.classList.remove("is-animating");
    }

    function animateHeight(from, to, onDone) {
      stopAnimation();
      section.classList.add("is-animating");

      const running = panel.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: DURATION_MS, easing: "ease" }
      );
      animation = running;

      running.finished
        .then(() => {
          if (animation !== running) return;
          animation = null;
          onDone();
          section.classList.remove("is-animating");
        })
        .catch(() => {});
    }

    function setOpen(open, instant) {
      if (open === isOpen) return;

      const from = panel.getBoundingClientRect().height;
      isOpen = open;
      section.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");

      if (instant) {
        stopAnimation();
        panel.style.height = open ? "" : "0px";
        return;
      }

      if (open) {
        panel.style.height = "";
        const to = panel.getBoundingClientRect().height;
        animateHeight(from, to, () => {});
        return;
      }

      panel.style.height = "0px";
      animateHeight(from, 0, () => {});
    }

    toggle.addEventListener("click", () => setOpen(!isOpen, false));
    controllers.set(section, setOpen);
  });

  function revealHash(hash) {
    if (!hash || hash.length < 2) return null;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    const section = target?.closest(".documentation-main-section");
    controllers.get(section)?.(true, true);
    return target;
  }

  // Capture phase so the section is open before any scroll handler measures the target.
  document.addEventListener(
    "click",
    (event) => {
      revealHash(event.target.closest('a[href^="#"]')?.getAttribute("href"));
    },
    true
  );

  revealHash(location.hash)?.scrollIntoView();
})();
