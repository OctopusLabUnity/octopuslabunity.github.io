(() => {
  const DRAG_THRESHOLD = 6;
  const FRICTION = 0.0035;
  const SETTLE = 0.014;
  const MIN_VELOCITY = 0.03;
  const MAX_VELOCITY = 3.2;
  const SNAP_EPSILON = 0.5;
  const RUBBER_LIMIT = 0.4;
  const VELOCITY_WINDOW_MS = 100;

  function rubberBand(overscroll, dimension) {
    const limit = Math.max(1, dimension * RUBBER_LIMIT);
    const sign = Math.sign(overscroll);
    const magnitude = Math.abs(overscroll);
    return sign * (1 - 1 / (magnitude / limit + 1)) * limit;
  }

  function initGallery(gallery) {
    if (gallery.dataset.galleryReady === "true") return;

    const images = [...gallery.querySelectorAll(":scope > img")];
    if (images.length === 0) return;

    const track = document.createElement("div");
    track.className = "documentation-gallery-track";

    const strip = document.createElement("div");
    strip.className = "documentation-gallery-strip";
    images.forEach((image) => strip.append(image));
    track.append(strip);

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "documentation-gallery-nav documentation-gallery-prev";
    prevButton.setAttribute("aria-label", "Previous image");
    prevButton.setAttribute("aria-hidden", "true");
    prevButton.tabIndex = -1;

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "documentation-gallery-nav documentation-gallery-next";
    nextButton.setAttribute("aria-label", "Next image");
    nextButton.setAttribute("aria-hidden", "true");
    nextButton.tabIndex = -1;

    gallery.append(prevButton, track, nextButton);
    gallery.dataset.galleryReady = "true";

    let x = 0;
    let vx = 0;
    let pointerId = null;
    let dragStartX = 0;
    let dragOrigin = 0;
    let didDrag = false;
    let isDragging = false;
    let rafId = 0;
    let lastTime = 0;
    let samples = [];
    let snapTarget = null;
    let cachedMaxX = 0;
    let trackWidth = 0;
    let showPrev = null;
    let showNext = null;

    function refreshBounds() {
      trackWidth = track.clientWidth;
      cachedMaxX = Math.max(0, strip.scrollWidth - trackWidth);
    }

    function clampX(value) {
      return Math.max(0, Math.min(cachedMaxX, value));
    }

    function rubberX(value) {
      if (value < 0) return rubberBand(value, trackWidth);
      if (value > cachedMaxX) {
        return cachedMaxX + rubberBand(value - cachedMaxX, trackWidth);
      }
      return value;
    }

    function displayX() {
      return isDragging ? rubberX(x) : x;
    }

    function setAnimating(active) {
      strip.style.willChange = active ? "transform" : "";
    }

    function render() {
      strip.style.transform = `translate3d(${-displayX()}px, 0, 0)`;
    }

    function setNavVisible(button, visible) {
      button.classList.toggle("is-visible", visible);
      button.setAttribute("aria-hidden", visible ? "false" : "true");
      button.tabIndex = visible ? 0 : -1;
    }

    function updateNav() {
      const current = displayX();
      const nextShowPrev = current > 1;
      const nextShowNext = current < cachedMaxX - 1;

      if (nextShowPrev !== showPrev) {
        showPrev = nextShowPrev;
        setNavVisible(prevButton, showPrev);
      }
      if (nextShowNext !== showNext) {
        showNext = nextShowNext;
        setNavVisible(nextButton, showNext);
      }
    }

    function stopMotion() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      vx = 0;
      snapTarget = null;
      lastTime = 0;
      if (!isDragging) setAnimating(false);
    }

    function recordSample(clientX, time) {
      samples.push({ x: clientX, t: time });
      while (samples.length > 1 && time - samples[0].t > VELOCITY_WINDOW_MS) {
        samples.shift();
      }
    }

    function releaseVelocity() {
      if (samples.length < 2) return 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      if (dt < 12) return 0;
      const velocity = (first.x - last.x) / dt;
      return Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
    }

    function tick(now) {
      if (!lastTime) lastTime = now;
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      if (snapTarget !== null) {
        const remaining = snapTarget - x;
        if (Math.abs(remaining) < SNAP_EPSILON) {
          x = snapTarget;
          stopMotion();
          render();
          updateNav();
          return;
        }
        x += remaining * (1 - Math.exp(-SETTLE * dt));
      } else if (x < 0 || x > cachedMaxX) {
        const target = x < 0 ? 0 : cachedMaxX;
        vx = 0;
        x += (target - x) * (1 - Math.exp(-SETTLE * dt));
        if (Math.abs(target - x) < SNAP_EPSILON) {
          x = target;
          stopMotion();
          render();
          updateNav();
          return;
        }
      } else {
        x += vx * dt;
        vx *= Math.exp(-FRICTION * dt);

        if (x < 0 || x > cachedMaxX) {
          vx = 0;
        } else if (Math.abs(vx) < MIN_VELOCITY) {
          vx = 0;
          x = clampX(x);
          stopMotion();
          render();
          updateNav();
          return;
        }
      }

      render();
      updateNav();
      rafId = requestAnimationFrame(tick);
    }

    function startMotion() {
      if (rafId) return;
      setAnimating(true);
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
    }

    function animateTo(target) {
      stopMotion();
      refreshBounds();
      x = displayX();
      snapTarget = clampX(target);
      startMotion();
    }

    function step(direction) {
      const items = [...strip.querySelectorAll("img")];
      if (items.length === 0) return;

      const current = displayX();

      if (direction > 0) {
        const next = items.find((image) => image.offsetLeft > current + 8);
        if (next) animateTo(next.offsetLeft);
        return;
      }

      const prev = [...items]
        .reverse()
        .find((image) => image.offsetLeft < current - 8);
      if (prev) animateTo(prev.offsetLeft);
    }

    prevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      step(-1);
    });

    nextButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      step(1);
    });

    track.addEventListener(
      "click",
      (event) => {
        if (!didDrag) return;
        event.preventDefault();
        event.stopPropagation();
        didDrag = false;
      },
      true,
    );

    track.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest(".documentation-gallery-nav")) return;

      stopMotion();
      refreshBounds();
      x = displayX();
      pointerId = event.pointerId;
      isDragging = false;
      dragStartX = event.clientX;
      dragOrigin = x;
      didDrag = false;
      samples = [];
      recordSample(event.clientX, event.timeStamp);
    });

    track.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;

      const dx = event.clientX - dragStartX;

      if (!didDrag) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        didDrag = true;
        isDragging = true;
        dragStartX = event.clientX;
        dragOrigin = x;
        setAnimating(true);
        track.classList.add("is-dragging");
        track.setPointerCapture(event.pointerId);
        recordSample(event.clientX, event.timeStamp);
        return;
      }

      x = dragOrigin - (event.clientX - dragStartX);
      recordSample(event.clientX, event.timeStamp);
      render();
      updateNav();
    });

    function endPointer(event) {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      track.classList.remove("is-dragging");

      if (!didDrag) {
        isDragging = false;
        samples = [];
        return;
      }

      recordSample(event.clientX, event.timeStamp);

      refreshBounds();
      x = rubberX(x);
      isDragging = false;
      vx = releaseVelocity();
      samples = [];

      if (x < 0 || x > cachedMaxX) {
        vx = 0;
      }

      render();

      if (x < 0 || x > cachedMaxX || Math.abs(vx) >= MIN_VELOCITY) {
        startMotion();
      } else {
        x = clampX(x);
        setAnimating(false);
        updateNav();
      }
    }

    track.addEventListener("pointerup", endPointer);
    track.addEventListener("pointercancel", endPointer);

    track.addEventListener(
      "wheel",
      (event) => {
        const horizontal =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.shiftKey
              ? event.deltaY
              : 0;
        if (!horizontal) return;

        event.preventDefault();
        stopMotion();
        refreshBounds();
        x = clampX(x + horizontal);
        render();
        updateNav();
      },
      { passive: false },
    );

    const resizeObserver = new ResizeObserver(() => {
      refreshBounds();
      x = clampX(x);
      render();
      updateNav();
    });
    resizeObserver.observe(track);
    resizeObserver.observe(strip);

    images.forEach((image) => {
      if (image.complete) return;
      image.addEventListener(
        "load",
        () => {
          refreshBounds();
          x = clampX(x);
          render();
          updateNav();
        },
        { once: true },
      );
    });

    refreshBounds();
    render();
    updateNav();
  }

  document.querySelectorAll(".documentation-gallery").forEach(initGallery);
})();
