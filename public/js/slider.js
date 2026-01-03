/**
 * public/js/slider.js
 *
 * Lightweight image slider behavior (left/right navigation).
 */
const slides = document.querySelectorAll(".slide");
const arrowLeft = document.getElementById("arrow-left");
const arrowRight = document.getElementById("arrow-right");
let currentIndex = 0;

function ensureSlideLoaded(slide) {
  if (!slide) return;
  if (slide.dataset && slide.dataset.src && !slide.dataset.loaded) {
    slide.src = slide.dataset.src;
    slide.dataset.loaded = 'true';
  }
}

function showSlide(index) {
  slides.forEach((slide, i) => {
    if (i === index) {
      ensureSlideLoaded(slide);
    }
    slide.style.display = i === index ? "block" : "none";
  });
}

function nextSlide() {
  currentIndex = (currentIndex + 1) % slides.length;
  showSlide(currentIndex);
}

function prevSlide() {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  showSlide(currentIndex);
}

arrowLeft.addEventListener("click", prevSlide);
arrowRight.addEventListener("click", nextSlide);

// Show the first slide initially
showSlide(currentIndex);
