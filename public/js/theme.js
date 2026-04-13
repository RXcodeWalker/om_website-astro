// Theme management
(function() {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  const savedPalette = localStorage.getItem('palette') || 'arctic';
  
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  document.documentElement.setAttribute('data-palette', savedPalette);
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      playSound('click');
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      
      localStorage.setItem('theme', newTheme);
    });
  }
  
  // Palette switcher
  const paletteToggle = document.getElementById('palette-toggle');
  const palettePanel = document.getElementById('palette-panel');
  const paletteButtons = document.querySelectorAll('.palette-btn');
  
  if (paletteToggle && palettePanel) {
    paletteToggle.addEventListener('click', () => {
      playSound('whoosh')
      palettePanel.classList.toggle('active');
    });
    
    // Close palette panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.palette-container')) {
        palettePanel.classList.remove('active');
      }
    });
  }
  
  // Set active palette button
  const currentPalette = document.documentElement.getAttribute('data-palette');
  paletteButtons.forEach(btn => {
    if (btn.dataset.palette === currentPalette) {
      btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => { 
      const palette = btn.dataset.palette;
      const html = document.documentElement;

      html.dataset.tuning = 'true';
      html.style.transition = "all 0.4s ease";
      html.setAttribute('data-palette', palette);
      localStorage.setItem('palette', palette);

      paletteButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      setTimeout(() => { delete html.dataset.tuning; }, 420);
    });

  });
})();

/// the TYPEWRITER EFFECT
document.addEventListener("DOMContentLoaded", () => {
  const text = "Beyond The Basics";
  const element = document.getElementById("brand-text");

  // Safety check: Only run the typewriter if the element exists
  if (!element) return; 

  let i = 0;
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, 60); // typing speed
    }
  }

  type();
});