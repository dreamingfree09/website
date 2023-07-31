const express = require('express');
const app = express();
const path = require('path');

// Set up static file serving from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle the portfolio page
app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

// Route to handle the IT pathways page
app.get('/pathways', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pathways.html'));
});

// Route to handle the forum page
app.get('/forum', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forum.html'));
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Your existing server setup and routes
// ...

// Function to show the sign-in form and hide the register form
function showSignInForm() {
    document.getElementById('signInForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  }
  
  // Function to show the register form and hide the sign-in form
  function showRegisterForm() {
    document.getElementById('signInForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }
  
  // Event listeners for sign-in and register buttons
  document.getElementById('signInButton').addEventListener('click', showSignInForm);
  document.getElementById('registerButton').addEventListener('click', showRegisterForm);
  
 // JavaScript code for the image slider
const slides = document.querySelectorAll(".slide");
const arrowLeft = document.getElementById("arrow-left");
const arrowRight = document.getElementById("arrow-right");
let currentIndex = 0;

function showSlide(index) {
  slides.forEach((slide, i) => {
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
