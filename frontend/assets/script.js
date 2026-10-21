// Mobile menu
const toggle = document.getElementById("menuToggle");
const links = document.getElementById("navLinks");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
  toggle.textContent = open ? "✕" : "☰";
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => { links.classList.remove("open"); toggle.textContent = "☰"; })
);

// Slideshow
const slider = document.querySelector(".slider");
const slides = [...document.querySelectorAll(".slide")];
const dotsBox = document.getElementById("dots");
const textBox = document.getElementById("slideText");
let current = 0;
let timer;

slides.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
  dot.addEventListener("click", () => { show(i); restart(); });
  dotsBox.appendChild(dot);
});
const dots = [...dotsBox.children];

function show(i) {
  current = (i + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle("active", n === current));
  dots.forEach((d, n) => d.classList.toggle("active", n === current));
  const s = slides[current].dataset;
  document.getElementById("sKicker").textContent = s.kicker;
  document.getElementById("sTitle").textContent = s.title;
  document.getElementById("sAccent").textContent = s.accent;
  document.getElementById("sText").textContent = s.text;
  textBox.classList.remove("animate");
  void textBox.offsetWidth; // restart animation
  textBox.classList.add("animate");
}

function start() { timer = setInterval(() => show(current + 1), 6000); }
function stop() { clearInterval(timer); }
function restart() { stop(); start(); }

document.getElementById("next").addEventListener("click", () => { show(current + 1); restart(); });
document.getElementById("prev").addEventListener("click", () => { show(current - 1); restart(); });
slider.addEventListener("mouseenter", stop);
slider.addEventListener("mouseleave", start);

// Swipe on phones
let startX = 0;
slider.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
slider.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) > 50) { show(current + (dx < 0 ? 1 : -1)); restart(); }
});

show(0);
start();

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();
