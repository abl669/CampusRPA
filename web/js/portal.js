'use strict';

/**
 * Connecta el botó del portal d'escenaris que reinicia les dades compartides.
 * @returns {void}
 */
function iniciarPortal() {
  const boto = document.getElementById('reset-data-button');
  const estat = document.getElementById('reset-status');
  boto.addEventListener('click', () => {
    reiniciarDades();
    estat.textContent = 'Dades reiniciades: places inicials, cap matrícula i cap fallada consumida.';
  });
}

iniciarPortal();
