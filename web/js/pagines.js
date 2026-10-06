'use strict';

/**
 * Inicia una pàgina de pràctiques i mostra qualsevol error d'inicialització.
 * @returns {void}
 */
function iniciarPaginaDidactica() {
  try {
    const iniciadors = { historial: iniciarHistorial, docent: iniciarDocent,
      laboratori: iniciarLaboratori, justificant: iniciarJustificant };
    const pagina = document.body.dataset.pagina;
    if (!Object.hasOwn(iniciadors, pagina)) throw new Error('Pàgina de pràctiques desconeguda.');
    iniciadors[pagina]();
  } catch (error) {
    console.error('No s’ha pogut iniciar la pàgina de pràctiques.', error);
    const avis = document.createElement('p');
    avis.className = 'message error';
    avis.setAttribute('role', 'alert');
    avis.textContent = 'No s’ha pogut iniciar la pàgina. Recarrega-la o restableix les dades des del panel docent.';
    document.getElementById('contingut').prepend(avis);
  }
}

iniciarPaginaDidactica();
