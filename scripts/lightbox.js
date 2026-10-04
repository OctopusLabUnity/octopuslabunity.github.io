(() => {
  const content = document.querySelector(".documentation-content");
  if (!content) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const TAP_MOVE_THRESHOLD = 8;
  const DOUBLE_TAP_MS = 280;

  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image preview");
  lightbox.hidden = true;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "image-lightbox-close";
  closeButton.setAttribute("aria-label", "Close image preview");

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "image-lightbox-nav image-lightbox-prev";
  prevButton.setAttribute("aria-label", "Previous image");
  prevButton.hidden = true;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "image-lightbox-nav image-lightbox-next";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.hidden = true;

  const image = document.createElement("img");
  image.className = "image-lightbox-image";
  image.alt = "";
  image.draggable = false;

  lightbox.append(closeButton, prevButton, nextButton, image);
  document.body.append(lightbox);

  let lastFocused = null;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let pointers = new Map();
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchStartPanX = 0;
  let pinchStartPanY = 0;
  let pinchMidX = 0;
  let pinchMidY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let moved = false;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let pointerDownTarget = null;
  let galleryImages = [];
  let galleryIndex = -1;

  function applyTransform(withTransition = false) {
    image.style.transition = withTransition ? "transform 0.2s ease" : "none";
    image.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    lightbox.classList.toggle("is-zoomed", scale > 1);
  }

  function resetTransform(withTransition = false) {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform(withTransition);
  }

  function clampPan() {
    if (scale <= 1) {
      panX = 0;
      panY = 0;
      return;
    }

    const rect = image.getBoundingClientRect();
    const baseWidth = rect.width / scale;
    const baseHeight = rect.height / scale;
    const maxX = Math.max(0, (baseWidth * scale - window.innerWidth) / 2);
    const maxY = Math.max(0, (baseHeight * scale - window.innerHeight) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function isControlTarget(target) {
    return (
      target === closeButton ||
      closeButton.contains(target) ||
      target === prevButton ||
      prevButton.contains(target) ||
      target === nextButton ||
      nextButton.contains(target)
    );
  }

  function updateNavVisibility() {
    const showNav = galleryImages.length > 1;
    prevButton.hidden = !showNav;
    nextButton.hidden = !showNav;
  }

  function showImage(source) {
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "";
    resetTransform();
  }

  function openLightbox(source) {
    const gallery = source.closest(".documentation-gallery");
    if (gallery) {
      galleryImages = [...gallery.querySelectorAll("img")];
      galleryIndex = galleryImages.indexOf(source);
    } else {
      galleryImages = [];
      galleryIndex = -1;
    }

    lastFocused = document.activeElement;
    showImage(source);
    updateNavVisibility();
    lightbox.hidden = false;
    requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
    });
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains("is-open")) return;

    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    pointers.clear();
    galleryImages = [];
    galleryIndex = -1;
    updateNavVisibility();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      lightbox.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      resetTransform();
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    };

    lightbox.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 250);
  }

  function stepGallery(delta) {
    if (galleryImages.length < 2) return;
    galleryIndex =
      (galleryIndex + delta + galleryImages.length) % galleryImages.length;
    showImage(galleryImages[galleryIndex]);
  }

  content.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!content.contains(target)) return;
    event.preventDefault();
    openLightbox(target);
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });

  closeButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  prevButton.addEventListener("click", (event) => {
    event.stopPropagation();
    stepGallery(-1);
  });

  nextButton.addEventListener("click", (event) => {
    event.stopPropagation();
    stepGallery(1);
  });

  prevButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  nextButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepGallery(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepGallery(1);
    }
  });

  lightbox.addEventListener("pointerdown", (event) => {
    if (isControlTarget(event.target)) return;

    lightbox.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerDownTarget = event.target;
    moved = false;

    if (pointers.size === 1) {
      panStartX = event.clientX;
      panStartY = event.clientY;
      panOriginX = panX;
      panOriginY = panY;
    }

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDistance = distance(a, b) || 1;
      pinchStartScale = scale;
      pinchStartPanX = panX;
      pinchStartPanY = panY;
      const mid = midpoint(a, b);
      pinchMidX = mid.x;
      pinchMidY = mid.y;
    }
  });

  lightbox.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const nextDistance = distance(a, b) || 1;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchStartScale * (nextDistance / pinchStartDistance)),
      );
      const mid = midpoint(a, b);
      const ratio = nextScale / pinchStartScale;

      scale = nextScale;
      panX = pinchStartPanX * ratio + (mid.x - pinchMidX);
      panY = pinchStartPanY * ratio + (mid.y - pinchMidY);
      clampPan();
      applyTransform();
      moved = true;
      return;
    }

    if (pointers.size === 1 && scale > 1) {
      const dx = event.clientX - panStartX;
      const dy = event.clientY - panStartY;
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) moved = true;
      panX = panOriginX + dx;
      panY = panOriginY + dy;
      clampPan();
      applyTransform();
    } else if (pointers.size === 1) {
      const dx = event.clientX - panStartX;
      const dy = event.clientY - panStartY;
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) moved = true;
    }
  });

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;

    const wasPinching = pointers.size >= 2;
    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      panStartX = remaining.x;
      panStartY = remaining.y;
      panOriginX = panX;
      panOriginY = panY;
      return;
    }

    if (pointers.size === 0) {
      const tapTarget = pointerDownTarget;
      pointerDownTarget = null;

      if (scale < 1.05) {
        resetTransform(true);
      } else {
        clampPan();
        applyTransform(true);
      }

      if (wasPinching || moved) return;

      const now = Date.now();
      const isDoubleTap =
        now - lastTapTime < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY) < 28;

      lastTapTime = now;
      lastTapX = event.clientX;
      lastTapY = event.clientY;

      if (isDoubleTap && tapTarget === image) {
        lastTapTime = 0;
        if (scale > 1) {
          resetTransform(true);
        } else {
          scale = 2.5;
          panX = (window.innerWidth / 2 - event.clientX) * (scale - 1);
          panY = (window.innerHeight / 2 - event.clientY) * (scale - 1);
          clampPan();
          applyTransform(true);
        }
        return;
      }

      if (scale > 1 && tapTarget === image) {
        resetTransform(true);
        return;
      }

      if (scale <= 1 && tapTarget === lightbox) {
        closeLightbox();
      }
    }
  }

  lightbox.addEventListener("pointerup", endPointer);
  lightbox.addEventListener("pointercancel", endPointer);

  lightbox.addEventListener(
    "wheel",
    (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      event.preventDefault();

      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
      const ratio = nextScale / scale;
      const cx = event.clientX - window.innerWidth / 2;
      const cy = event.clientY - window.innerHeight / 2;

      panX = cx - (cx - panX) * ratio;
      panY = cy - (cy - panY) * ratio;
      scale = nextScale;

      if (scale <= 1) {
        resetTransform();
      } else {
        clampPan();
        applyTransform();
      }
    },
    { passive: false },
  );
})();
