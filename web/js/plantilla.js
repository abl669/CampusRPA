'use strict';

/* Marcatge estàtic compartit per totes les pàgines. No conté dades d'usuari: és segur assignar-lo amb innerHTML. */
const MARCATGE_APLICACIO = `
  <h1 id="page-title">Consulta i matrícula acadèmica</h1>
  <p class="subtitle">Consulta l'expedient, comprova les places i formalitza una matrícula de prova.
    Un entorn fictici per practicar automatitzacions amb Power Automate Desktop.</p>
  <div class="distribucio">
    <div>
      <section id="academic-search" class="targeta" aria-labelledby="search-title" tabindex="-1">
        <p class="pas">Pas 1 · Consulta</p>
        <h2 id="search-title">Consulta una sol·licitud</h2>
        <p class="ajuda">Introdueix l'identificador de l'alumne i tria l'assignatura del desplegable.</p>
        <form id="academic-form" novalidate>
          <div class="grid">
            <div>
              <label for="student-input">ID de l'alumne</label>
              <input id="student-input" name="student" type="text" placeholder="Ex.: ALU001"
                autocomplete="off" spellcheck="false" maxlength="20" required
                aria-describedby="student-help student-error">
              <span id="student-help" class="camp-ajuda">Format: ALU i tres dígits.</span>
              <span id="student-error" class="camp-error" hidden></span>
            </div>
            <div>
              <label for="subject-input">Assignatura</label>
              <select id="subject-input" name="subject" required aria-describedby="subject-help subject-error">
                <option value="">Selecciona una assignatura</option>
              </select>
              <span id="subject-help" class="camp-ajuda">Tria una assignatura del catàleg.</span>
              <span id="subject-error" class="camp-error" hidden></span>
            </div>
          </div>
          <div class="accions">
            <button id="search-button" class="boto" data-testid="search-academic" type="submit">Consultar sol·licitud</button>
            <span id="search-status" class="estat-consulta" role="status" aria-live="polite"></span>
          </div>
        </form>
      </section>
    </div>
    <aside aria-label="Ajuda i dades de prova">
      <section class="targeta" aria-labelledby="random-title">
        <h2 id="random-title">Mode aleatori</h2>
        <p class="ajuda">Si està activat, cada càrrega de Matricula.html pot obrir un escenari d'error (aprox. 1 de cada 3 vegades).</p>
        <button id="random-mode-button" class="boto secundari" type="button" aria-pressed="true">Mode aleatori: activat</button>
        <p id="random-mode-status" class="ajuda" role="status" aria-live="polite"></p>
      </section>
      <section class="targeta" aria-labelledby="catalog-title">
        <h2 id="catalog-title">Catàleg d'assignatures</h2>
        <p class="ajuda">Les places s'actualitzen després de cada matrícula.</p>
        <ul id="subject-catalog" class="cataleg"></ul>
      </section>
      <section class="targeta" aria-labelledby="examples-title">
        <h2 id="examples-title">Casos de prova</h2>
        <p class="ajuda">Alumnes disponibles: ALU001–ALU020. Tots utilitzen el mateix catàleg.
          Selecciona un cas per omplir el formulari i comprovar una situació diferent.</p>
        <div class="casos">
          <button class="cas" type="button" data-alumne="ALU011" data-assignatura="Automatització RPA">
            <strong>Matrícula disponible</strong><span>ALU011 · Automatització RPA</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU017" data-assignatura="">
            <strong>Assignatura no seleccionada</strong><span>ALU017 · sense assignatura</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU007" data-assignatura="Assignatura Inexistent">
            <strong>Assignatura inexistent</strong><span>ALU007 · Assignatura Inexistent</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU018" data-assignatura="Bases de dades">
            <strong>Sense places</strong><span>ALU018 · Bases de dades</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU009" data-assignatura="Python avançat">
            <strong>Assignatura inactiva</strong><span>ALU009 · Python avançat</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU020" data-assignatura="Power Automate">
            <strong>Expedient bloquejat</strong><span>ALU020 · Power Automate</span>
          </button>
          <button class="cas" type="button" data-alumne="ALU999" data-assignatura="Power Automate">
            <strong>Alumne inexistent</strong><span>ALU999 · Power Automate</span>
          </button>
        </div>
      </section>
    </aside>
  </div>`;

/** Marcatge del modal, inserit només quan hi ha una resposta. */
const MARCATGE_RESULTAT = `
      <dialog id="result-panel" class="targeta modal-resultat" aria-labelledby="result-title" aria-describedby="message">
        <div class="capcalera-modal">
          <span class="ajuda">Resultat acadèmic</span>
          <button id="close-result-button" class="boto secundari" type="button">Tancar resultat</button>
        </div>
        <p class="pas">Pas 2 · Resultat</p>
        <h2 id="result-title" tabindex="-1">Resultat de la consulta</h2>
        <dl class="dades">
          <div class="row"><dt>Alumne</dt><dd id="result-student">—</dd></div>
          <div class="row"><dt>Nom i cognoms</dt><dd id="result-student-name">—</dd></div>
          <div class="row"><dt>Correu electrònic</dt><dd id="result-student-email">—</dd></div>
          <div class="row"><dt>Titulació</dt><dd id="result-degree">—</dd></div>
          <div class="row"><dt>Estat de l'expedient</dt><dd id="result-student-status">—</dd></div>
          <div class="row"><dt>Assignatura</dt><dd id="result-subject">—</dd></div>
          <div class="row"><dt>Codi</dt><dd id="result-subject-details">—</dd></div>
          <div class="row"><dt>Crèdits</dt><dd id="result-subject-credits">—</dd></div>
          <div class="row"><dt>Places disponibles</dt><dd id="result-seats">—</dd></div>
          <div class="row"><dt>Estat de l'assignatura</dt><dd id="result-course-status">—</dd></div>
        </dl>
        <div id="message" class="message" role="status" aria-live="polite" aria-atomic="true"></div>
        <form id="enrollment-section" class="seccio-matricula" novalidate hidden>
          <h3>Formalitza la matrícula</h3>
          <label for="enrollment-note">Observació de matrícula <span class="ajuda">(opcional)</span></label>
          <input id="enrollment-note" name="note" type="text" placeholder="Ex.: Sol·licitud automàtica"
            maxlength="500" aria-describedby="note-help note-error">
          <span id="note-help" class="camp-ajuda">Màxim 500 caràcters. No introdueixis dades personals reals.</span>
          <span id="note-error" class="camp-error" hidden></span>
          <div class="accions">
            <button id="create-enrollment-button" class="boto" data-testid="create-enrollment" type="submit">Formalitzar matrícula</button>
            <span id="enrollment-status" role="status" aria-live="polite"></span>
          </div>
        </form>
      </dialog>`;

/**
 * Crea el modal de resultat sense obrir-lo ni incloure dades d'usuari al marcatge.
 * @param {HTMLElement} contenidor Contenidor on s'insereix el modal.
 * @returns {HTMLElement} Modal o secció de resultat segons la versió de la pàgina.
 */
function crearModalResultat(contenidor) {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = MARCATGE_RESULTAT;
  let modal = plantilla.content.querySelector('dialog');
  if (document.body.dataset.presentacio === 'pagina') {
    const seccio = document.createElement('section');
    for (const atribut of modal.attributes) seccio.setAttribute(atribut.name, atribut.value);
    seccio.className = 'targeta result';
    seccio.setAttribute('role', 'region');
    seccio.append(...modal.childNodes);
    modal = seccio;
  }
  contenidor.append(modal);
  return modal;
}

/**
 * Insereix el formulari, el resultat i el catàleg dins del contenidor.
 * @param {HTMLElement} contenidor Element principal de la pàgina.
 * @returns {void}
 */
function renderitzarAplicacio(contenidor) {
  contenidor.innerHTML = MARCATGE_APLICACIO;
  contenidor.setAttribute('aria-busy', 'false');
}

/**
 * Mostra un indicador de càrrega accessible mentre l'aplicació no està disponible.
 * @param {HTMLElement} contenidor Element principal de la pàgina.
 * @returns {void}
 */
function mostrarCarregador(contenidor) {
  const carregador = document.createElement('div');
  const cercle = document.createElement('span');
  const text = document.createElement('p');
  carregador.id = 'loading-indicator';
  carregador.className = 'carregador';
  carregador.setAttribute('role', 'status');
  cercle.className = 'cercle';
  cercle.setAttribute('aria-hidden', 'true');
  text.textContent = 'Carregant el campus virtual…';
  carregador.append(cercle, text);
  contenidor.replaceChildren(carregador);
  contenidor.setAttribute('aria-busy', 'true');
}

/**
 * Mostra un error fatal d'inicialització sense deixar la pàgina en blanc.
 * @param {HTMLElement} contenidor Element principal de la pàgina.
 * @param {string} missatge Text que es vol mostrar.
 * @returns {void}
 */
function mostrarErrorInicial(contenidor, missatge) {
  const avis = document.createElement('p');
  avis.id = 'message';
  avis.className = 'message error';
  avis.setAttribute('role', 'alert');
  avis.dataset.tipusError = 'tecnic';
  avis.textContent = missatge;
  contenidor.replaceChildren(avis);
  contenidor.setAttribute('aria-busy', 'false');
}
