  //typewriter
document.addEventListener("DOMContentLoaded", () => {
  const elements = document.querySelectorAll(".typewriter");
  const speed = 150;

  elements.forEach(el => {
    const text = el.getAttribute("data-text");
    let index = 0;

    function type() {
      if (index < text.length) {
        el.innerHTML += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    }

    type();
  });
});
