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
})();
