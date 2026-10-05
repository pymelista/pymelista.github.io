// PymeLista — único script del sitio: botón de modo claro/oscuro.
(function () {
  var boton = document.querySelector("[data-tema-toggle]");
  if (!boton) return;

  var raiz = document.documentElement;
  var sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

  function efectivo() {
    return raiz.dataset.tema || (sistemaOscuro.matches ? "oscuro" : "claro");
  }

  function pintar() {
    boton.setAttribute("aria-pressed", efectivo() === "oscuro" ? "true" : "false");
  }

  boton.hidden = false;
  pintar();

  boton.addEventListener("click", function () {
    var siguiente = efectivo() === "oscuro" ? "claro" : "oscuro";
    raiz.dataset.tema = siguiente;
    try { localStorage.setItem("pymelista-tema", siguiente); } catch (e) { /* sin almacenamiento */ }
    pintar();
  });

  if (sistemaOscuro.addEventListener) sistemaOscuro.addEventListener("change", pintar);
})();
