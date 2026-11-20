import { renderCover } from "./cover.js";

const canvas = document.getElementById("cover");
const params = new URLSearchParams(location.search);

const state = {
  title: "VICE CITY",
  subtitle: "GRAND THEFT AUTO",
  tagline: "Welcome back to the neon shore.",
  theme: "sunset",
  layout: "classic",
  backdrop: "painted",
  stars: true,
  badge: true,
  grain: 35,
};

// Screenshot / deep-link presets: ?theme=neon&layout=poster&backdrop=boulevard&view=cover
for (const key of ["theme", "layout", "backdrop"]) {
  const v = params.get(key);
  if (v) state[key] = v;
}
if (params.get("title")) state.title = params.get("title");
if (params.get("subtitle")) state.subtitle = params.get("subtitle");
if (params.get("tagline")) state.tagline = params.get("tagline");
if (params.get("grain")) state.grain = Number(params.get("grain")) || 0;
if (params.get("view") === "cover") document.body.classList.add("view-cover");

const photos = {};
function loadPhoto(key, src) {
  const img = new Image();
  img.onload = () => render();
  img.src = src;
  photos[key] = img;
}
loadPhoto("boulevard", "samples/boulevard.jpg");
loadPhoto("pier", "samples/pier.jpg");

function render() {
  renderCover(canvas, state, photos);
}

// ---------- Text inputs ----------
const titleIn = document.getElementById("in-title");
const subtitleIn = document.getElementById("in-subtitle");
const taglineIn = document.getElementById("in-tagline");
titleIn.value = state.title;
subtitleIn.value = state.subtitle;
taglineIn.value = state.tagline;
titleIn.addEventListener("input", () => { state.title = titleIn.value; render(); });
subtitleIn.addEventListener("input", () => { state.subtitle = subtitleIn.value; render(); });
taglineIn.addEventListener("input", () => { state.tagline = taglineIn.value; render(); });

// ---------- Segmented / swatch groups ----------
function bindGroup(rowId, attr, key) {
  const row = document.getElementById(rowId);
  const buttons = row.querySelectorAll("button");
  function sync() {
    buttons.forEach((b) => {
      const active = b.dataset[attr] === state[key];
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", active ? "true" : "false");
    });
  }
  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      state[key] = b.dataset[attr];
      sync();
      render();
    });
  });
  sync();
}
bindGroup("theme-row", "theme", "theme");
bindGroup("layout-row", "layout", "layout");
bindGroup("backdrop-row", "backdrop", "backdrop");

// ---------- Toggles & grain ----------
const starsIn = document.getElementById("in-stars");
const badgeIn = document.getElementById("in-badge");
const grainIn = document.getElementById("in-grain");
const grainOut = document.getElementById("grain-out");
starsIn.checked = state.stars;
badgeIn.checked = state.badge;
grainIn.value = String(state.grain);
grainOut.textContent = String(state.grain);
starsIn.addEventListener("change", () => { state.stars = starsIn.checked; render(); });
badgeIn.addEventListener("change", () => { state.badge = badgeIn.checked; render(); });
grainIn.addEventListener("input", () => {
  state.grain = Number(grainIn.value) || 0;
  grainOut.textContent = grainIn.value;
  render();
});

// ---------- Export ----------
document.getElementById("btn-export").addEventListener("click", () => {
  const a = document.createElement("a");
  const name = (state.title || "vice-cover").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "vice-cover";
  a.download = `${name}-1080.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
});

render();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => render()).catch(() => {});
}
