// Contact form handling
(function() {
  const form = document.getElementById('contact-form');
  
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const name = formData.get('name');
      
      // This is a demo form - in production, this would send to a backend
      alert(`Thanks for your message, ${name}! This is a demo contact form. In a production site, this would send your message.`);
      
      // Reset form
      form.reset();
    });
  }
})();
