'use strict';

/** Clau de localStorage amb la preferència del mode aleatori. */
const CLAU_MODE_ALEATORI = 'campusrpa.aleatori.v1';

/** Destins possibles en carregar index.html. null vol dir quedar-se en mode normal. */
const DESTINS_ALEATORIS = Object.freeze([
  null,
  'ErrorCarga.html',
  'ErrorConsultaLenta.html',
  'ErrorSenseResposta.html',
  'ErrorIntermitent.html',
  'ErrorMatricula.html',
  'ErrorConfirmacio.html',
  'ErrorServei.html'
]);

/**
 * Indica si el mode aleatori està activat. Per defecte, i si no es pot llegir la preferència, ho està.
 * @returns {boolean} true si index.html ha de redirigir aleatòriament.
 */
function isModeAleatoriActiu() {
  try {
    return localStorage.getItem(CLAU_MODE_ALEATORI) !== 'desactivat';
  } catch (error) {
    console.warn("No s'ha pogut llegir el mode aleatori; es considera activat.", error);
    return true;
  }
}

/**
 * Activa o desactiva el mode aleatori per a totes les pàgines del navegador.
 * @param {boolean} actiu Nou estat del mode.
 * @returns {boolean} true si la preferència s'ha pogut desar.
 */
function setModeAleatori(actiu) {
  try {
    localStorage.setItem(CLAU_MODE_ALEATORI, actiu ? 'activat' : 'desactivat');
    return true;
  } catch (error) {
    console.error("No s'ha pogut desar el mode aleatori.", error);
    return false;
  }
}

/**
 * Tria un destí amb la mateixa probabilitat per a cada opció.
 * @param {Function} generador Funció que retorna un nombre a [0, 1).
 * @returns {string|null} Fitxer de destí o null per quedar-se a la pàgina normal.
 */
function triarDestiAleatori(generador = Math.random) {
  const index = Math.min(Math.floor(generador() * DESTINS_ALEATORIS.length), DESTINS_ALEATORIS.length - 1);
  return DESTINS_ALEATORIS[Math.max(index, 0)];
}

/**
 * Redirigeix index.html a un escenari aleatori si el mode està actiu i la URL no ho impedeix (?aleatori=0).
 * Conserva la resta de paràmetres (per exemple, reiniciar o segons). Usa replace per no trencar el botó Enrere.
 * @returns {void}
 */
function redirigirAleatoriament() {
  const parametres = new URLSearchParams(location.search);
  if (parametres.get('aleatori') === '0' || !isModeAleatoriActiu()) return;
  const desti = triarDestiAleatori();
  if (desti === null) return;
  const cerca = parametres.toString();
  location.replace(desti + (cerca ? `?${cerca}` : '') + location.hash);
}

/**
 * Connecta un botó commutador amb el mode aleatori i el manté sincronitzat entre pestanyes.
 * @param {HTMLButtonElement} boto Botó amb aria-pressed.
 * @param {HTMLElement} estat Element on s'anuncia el canvi.
 * @returns {void}
 */
function connectarBotoModeAleatori(boto, estat) {
  const actualitzar = () => {
    const actiu = isModeAleatoriActiu();
    boto.setAttribute('aria-pressed', String(actiu));
    boto.textContent = actiu ? 'Mode aleatori: activat' : 'Mode aleatori: desactivat';
  };
  boto.addEventListener('click', () => {
    const actiu = !isModeAleatoriActiu();
    estat.textContent = setModeAleatori(actiu) ?
      (actiu ? 'Activat: index.html obrirà un escenari aleatori a cada càrrega.' :
        'Desactivat: index.html funcionarà sempre en mode normal.') :
      "No s'ha pogut desar la preferència. Usa index.html?aleatori=0.";
    actualitzar();
  });
  window.addEventListener('storage', esdeveniment => {
    if (esdeveniment.key === null || esdeveniment.key === CLAU_MODE_ALEATORI) actualitzar();
  });
  actualitzar();
}

if (document.currentScript && document.currentScript.dataset.redirigir === 'true') {
  redirigirAleatoriament();
} else if (document.getElementById('random-mode-button')) {
  // Pàgines estàtiques: el botó ja existeix. A les pàgines amb formulari el connecta aplicacio.js en renderitzar-lo.
  connectarBotoModeAleatori(document.getElementById('random-mode-button'), document.getElementById('random-mode-status'));
}
