(() => {
  const map = document.querySelector(".interests .frame-content");
  if (!map) return;
  const canvas = map.querySelector(".mind-map-lines");
  const context = canvas.getContext("2d");
  if (!context) return;
  const words = [...map.querySelectorAll(".interest")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Preserve the connections between the ideas in the original design.
  const connections = [
    ["mixed media", "programming"],
    ["mixed media", "the machine"],
    ["the physical body", "interactivity"],
    ["the physical body", "multi-sensory engagement"],
    ["interactivity", "multi-sensory engagement"],
    ["design beyond the screen", "the physical body"],
    ["design beyond the screen", "interactivity"],
    ["the machine", "subversive design"],
    ["multi-sensory engagement", "subversive design"],
    ["subversive design", "anti-design"],
    ["anti-design", "abstract typography"],
    ["subversive design", "abstract typography"],
    ["the machine", "wiring"],
    ["touchdesigner", "installation work"],
    ["installation work", "wiring"],
    ["coding", "programming"],
    ["programming", "the machine"],
    ["web design", "programming"],
    ["web design", "coding"],
    ["installation work", "design beyond the screen"],
  ];

  let nodes = [];
  let width = 0;
  let height = 0;
  let visible = false;
  let frame = 0;
  let lastTime = null;
  let elapsed = 0;

  function measure() {
    width = map.clientWidth;
    height = map.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    nodes = words.map((element, index) => {
      const text = element.querySelector("span");
      return {
        element,
        name: text.textContent.trim(),
        index,
        baseX: element.offsetLeft + text.offsetLeft + text.offsetWidth / 2,
        baseY: element.offsetTop + text.offsetTop + text.offsetHeight / 2,
        halfWidth: text.offsetWidth / 2,
        halfHeight: text.offsetHeight / 2,
      };
    });
    draw();
  }

  // Intersect the line with the text's bounds, leaving a small breathing gap.
  function attachment(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const padding = (7 * width) / 1280;
    const distance = Math.min(
      (from.halfWidth + padding) / (Math.abs(dx) || 0.001),
      (from.halfHeight + padding) / (Math.abs(dy) || 0.001),
    );
    return { x: from.x + dx * distance, y: from.y + dy * distance };
  }

  function draw() {
    const scale = width / 1280;
    const time = elapsed / 1000;
    const moving = !reducedMotion.matches;
    for (const node of nodes) {
      const phase = node.index * 2.399;
      // Different overlapping rhythms keep the motion soft and organic.
      const dx = moving
        ? scale *
          (28 * Math.sin(time * 0.34 + phase) +
            10 * Math.sin(time * 0.61 + phase * 1.7))
        : 0;
      const dy = moving
        ? scale *
          (22 * Math.sin(time * 0.29 + phase * 1.3) +
            8 * Math.cos(time * 0.53 + phase))
        : 0;
      node.x = Math.max(
        node.halfWidth + 12 * scale,
        Math.min(width - node.halfWidth - 12 * scale, node.baseX + dx),
      );
      node.y = Math.max(
        170 * scale,
        Math.min(height - node.halfHeight - 18 * scale, node.baseY + dy),
      );
      node.element.style.transform = `translate(${node.x - node.baseX}px, ${node.y - node.baseY}px)`;
    }
    context.clearRect(0, 0, width, height);
    context.strokeStyle = getComputedStyle(map).color;
    context.globalAlpha = 0.8;
    context.lineWidth = Math.max(0.65, scale);
    context.beginPath();
    const byName = new Map(nodes.map((node) => [node.name, node]));
    for (const [source, target] of connections) {
      const from = byName.get(source);
      const to = byName.get(target);
      if (!from || !to) continue;
      const start = attachment(from, to);
      const end = attachment(to, from);
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }
    context.stroke();
  }

  function tick(now) {
    if (lastTime !== null) elapsed += Math.min(now - lastTime, 64);
    lastTime = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = null;
    const running = visible && !document.hidden && !reducedMotion.matches;
    map.closest("section").classList.toggle("is-floating", running);
    if (running) frame = requestAnimationFrame(tick);
    else draw();
  }

  new ResizeObserver(measure).observe(map);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(map);
  document.addEventListener("visibilitychange", updatePlayback);
  reducedMotion.addEventListener("change", updatePlayback);
  document.fonts.ready.then(measure);
  measure();
})();

// Advance one frame per wheel/trackpad gesture, including momentum events.
(() => {
  const sections = [...document.querySelectorAll(".frame")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lockedUntil = 0;
  let lastWheel = 0;
  let accumulated = 0;
  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
        return;
      const now = performance.now();
      const idle = now - lastWheel;
      lastWheel = now;
      if (now < lockedUntil) {
        event.preventDefault();
        lockedUntil = Math.max(lockedUntil, now + 160);
        return;
      }
      if (idle > 180) accumulated = 0;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const direction = Math.sign(delta);
      if (!direction) return;
      const y = window.scrollY;
      const current = sections.find(
        (section) =>
          y >= section.offsetTop - 2 &&
          y < section.offsetTop + section.offsetHeight - 2,
      );
      // Taller sections retain ordinary scrolling so all their text is reachable.
      if (current && current.offsetHeight > innerHeight + 2) {
        const bottom = current.offsetTop + current.offsetHeight - innerHeight;
        if (
          (direction > 0 && y < bottom - 2) ||
          (direction < 0 && y > current.offsetTop + 2)
        )
          return;
      }
      const boundaries = sections.flatMap((section) => {
        const top = section.offsetTop;
        return section.offsetHeight > innerHeight + 2
          ? [top, top + section.offsetHeight - innerHeight]
          : [top];
      });
      const target =
        direction > 0
          ? boundaries.find((top) => top > y + 2)
          : boundaries.findLast((top) => top < y - 2);
      if (target === undefined) return;
      event.preventDefault();
      accumulated =
        Math.sign(accumulated) === direction ? accumulated + delta : delta;
      if (Math.abs(accumulated) < 18) return;
      accumulated = 0;
      lockedUntil = now + 650;
      window.scrollTo({
        top: target,
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    },
    { passive: false },
  );
})();

(() => {
  const sections = document.querySelectorAll(".frame");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.15)
          entry.target.classList.add("is-visible");
        else if (!entry.isIntersecting)
          entry.target.classList.remove("is-visible");
      }
    },
    { threshold: [0, 0.15] },
  );
  sections.forEach((section) => {
    section.classList.add("reveal-ready");
    observer.observe(section);
  });
})();

// Preload every illustration, then replace it once per second without a fade.
(() => {
  const images = [...document.querySelectorAll(".hobby-cycle img")];
  if (images.length < 2) return;
  Promise.allSettled(images.map((image) => image.decode())).then(() => {
    let current = 0;
    window.setInterval(() => {
      images[current].hidden = true;
      current = (current + 1) % images.length;
      images[current].hidden = false;
    }, 1000);
  });
})();

// Start as the original word, then let each letter take its own slow path.
(() => {
  const section = document.querySelector(".gradex");
  const title = section?.querySelector("h2");
  if (!title) return;
  const word = title.textContent.trim();
  title.setAttribute("aria-label", word);
  const paths = [
    [0.5, -2, -1, 36],
    [-0.6, 2.6, 1.4, 42],
    [0.7, -2.8, -1.4, 39],
    [-0.5, 2.2, 1, 35],
    [0.6, -2.4, -1, 44],
    [-0.5, 2.7, 1.4, 38],
  ];
  title.replaceChildren(
    ...[...word].map((character, index) => {
      const letter = document.createElement("span");
      letter.className = "gradex-letter";
      letter.textContent = character;
      letter.setAttribute("aria-hidden", "true");
      const [x, y, angle, duration] = paths[index % paths.length];
      letter.style.setProperty("--drift-x", `${x}cqw`);
      letter.style.setProperty("--drift-y", `${y}cqw`);
      letter.style.setProperty("--drift-angle", `${angle}deg`);
      letter.style.setProperty("--drift-duration", `${duration}s`);
      return letter;
    }),
  );
  new IntersectionObserver(
    ([entry]) => {
      if (entry.intersectionRatio >= 0.35)
        section.classList.add("letters-floating");
      else if (!entry.isIntersecting)
        section.classList.remove("letters-floating");
    },
    { threshold: [0, 0.35] },
  ).observe(section);
})();
