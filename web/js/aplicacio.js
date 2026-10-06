'use strict';

const RETARD_CONSULTA = 600;
const RETARD_MATRICULA = 700;
const IDS_ELEMENTS = [
  'academic-form', 'student-input', 'subject-input', 'student-error', 'subject-error',
  'search-button', 'search-status', 'result-panel', 'result-title', 'result-student',
  'result-student-name', 'result-degree', 'result-student-status', 'result-subject',
  'result-student-email',
  'result-subject-details', 'result-subject-credits', 'result-seats', 'result-course-status', 'message',
  'enrollment-section', 'enrollment-note', 'note-error', 'create-enrollment-button',
  'subject-catalog'
];

let escenari = ESCENARIS.normal;
let segonsEscenari = 0;
let serveiAcademic = null;
let registreIncidencies = null;
let elements = {};
let consultaActual = null;
let dadesConsultades = null;
let temporitzador = null;
let operacioActual = 0;
let enCurs = false;

/**
 * Elimina el modal i les referències als seus camps, sense alterar l'operació pendent.
 * @returns {void}
 */
function eliminarModalResultat() {
  const modal = elements['result-panel'];
  if (!modal) return;
  const ids = Array.from(modal.querySelectorAll('[id]'), element => element.id);
  if (modal instanceof HTMLDialogElement && modal.open) modal.close();
  modal.remove();
  for (const id of ['result-panel', ...ids]) delete elements[id];
}

/**
 * Prepara el modal i connecta els controls quan arriba la primera resposta.
 * @returns {void}
 */
function prepararModalResultat() {
  if (elements['result-panel']) return;
  const modal = crearModalResultat(document.getElementById('aplicacio'));
  elements['result-panel'] = modal;
  for (const element of modal.querySelectorAll('[id]')) elements[element.id] = element;
  elements['close-result-button'].addEventListener('click', tancarModalResultat);
  modal.addEventListener('keydown', esdeveniment => {
    if (esdeveniment.key !== 'Escape') return;
    esdeveniment.preventDefault();
    tancarModalResultat();
  });
  modal.addEventListener('cancel', esdeveniment => {
    esdeveniment.preventDefault();
    tancarModalResultat();
  });
  modal.addEventListener('close', () => {
    if (elements['result-panel'] === modal) tancarModalResultat();
  });
  elements['enrollment-section'].addEventListener('submit', esdeveniment => {
    esdeveniment.preventDefault();
    formalitzarMatricula();
  });
  elements['enrollment-note'].addEventListener('input', () => mostrarErrorCamp('enrollment-note', 'note-error'));
  prepararControlsDidactics();
}

/**
 * Tanca el resultat, cancel·la qualsevol confirmació pendent i retorna el focus al formulari.
 * @returns {void}
 */
function tancarModalResultat() {
  invalidarConsulta();
  elements['student-input'].focus();
  elements['search-status'].textContent = 'Resultat tancat. Pots consultar una altra sol·licitud.';
}

/**
 * Obre el resultat com a modal accessible i situa el focus al seu títol.
 * @returns {void}
 */
function obrirModalResultat() {
  const resultat = elements['result-panel'];
  if (resultat instanceof HTMLDialogElement) {
    if (!resultat.open) resultat.showModal();
  } else {
    resultat.setAttribute('open', '');
    resultat.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  elements['result-title'].focus();
}

/**
 * Mostra o elimina un error accessible associat a un camp.
 * @param {string} idCamp Identificador del camp.
 * @param {string} idError Identificador del missatge d'error.
 * @param {string} missatge Error o cadena buida per eliminar-lo.
 * @returns {void}
 */
function mostrarErrorCamp(idCamp, idError, missatge = '') {
  elements[idCamp].setAttribute('aria-invalid', String(Boolean(missatge)));
  elements[idError].textContent = missatge;
  elements[idError].hidden = !missatge;
}

/**
 * Actualitza el desplegable compartit i conserva la selecció, inclòs el cas d'assignatura inexistent.
 * @param {Array<{nom: string}>} cataleg Assignatures disponibles.
 * @returns {void}
 */
function mostrarOpcionsAssignatura(cataleg) {
  const desplegable = elements['subject-input'];
  const seleccionada = desplegable.value;
  const opcioBuida = new Option('Selecciona una assignatura', '');
  desplegable.replaceChildren(opcioBuida, ...cataleg.map(assignatura => new Option(assignatura.nom, assignatura.nom)));
  const noms = new Set(cataleg.map(assignatura => normalitzar(assignatura.nom)));
  for (const sollicitud of SOLLICITUDS_EXCEL) {
    if (noms.has(normalitzar(sollicitud.assignatura))) continue;
    desplegable.add(new Option(sollicitud.assignatura, sollicitud.assignatura));
    noms.add(normalitzar(sollicitud.assignatura));
  }
  desplegable.value = Array.from(desplegable.options).some(opcio => opcio.value === seleccionada) ? seleccionada : '';
}

/**
 * Actualitza les opcions de consulta i les places visibles del catàleg.
 * @returns {void}
 */
function mostrarCataleg() {
  const cataleg = serveiAcademic.getCataleg();
  mostrarOpcionsAssignatura(cataleg);
  elements['subject-catalog'].replaceChildren();
  for (const assignatura of cataleg) {
    const fila = document.createElement('li');
    const nom = document.createElement('strong');
    const detall = document.createElement('span');
    nom.textContent = assignatura.nom;
    detall.textContent = `${assignatura.codi} · ${assignatura.credits} crèdits · ${assignatura.places} places · ${assignatura.estat}`;
    fila.append(nom, detall);
    elements['subject-catalog'].append(fila);
  }
}

/**
 * Actualitza els controls i l'estat accessible d'una operació.
 * @param {string|null} operacio Tipus d'operació o null si no n'hi ha cap.
 * @returns {void}
 */
function indicarOperacio(operacio) {
  enCurs = operacio !== null;
  elements['search-button'].disabled = enCurs;
  if (elements['create-enrollment-button']) {
    elements['create-enrollment-button'].disabled = enCurs;
    elements['enrollment-note'].disabled = operacio === 'matricula';
    elements['enrollment-section'].setAttribute('aria-busy', String(operacio === 'matricula'));
    elements['create-enrollment-button'].textContent = operacio === 'matricula' ? 'Formalitzant...' : 'Formalitzar matrícula';
    elements['enrollment-status'].textContent = operacio === 'matricula' ? 'Formalitzant la matrícula…' : '';
  }
  elements['academic-form'].setAttribute('aria-busy', String(operacio === 'consulta'));
  elements['search-button'].textContent = operacio === 'consulta' ? 'Consultant...' : 'Consultar sol·licitud';
  elements['search-status'].textContent = operacio === 'consulta' ? 'Consultant la sol·licitud…' : '';
}

/**
 * Cancel·la l'operació pendent i invalida qualsevol resultat anterior.
 * @returns {void}
 */
function invalidarConsulta() {
  operacioActual += 1;
  clearTimeout(temporitzador);
  temporitzador = null;
  consultaActual = null;
  dadesConsultades = null;
  indicarOperacio(null);
  eliminarModalResultat();
  mostrarErrorCamp('student-input', 'student-error');
  mostrarErrorCamp('subject-input', 'subject-error');
}

/**
 * Invalida una consulta si un canvi de camp modifica les dades consultades.
 * @returns {void}
 */
function invalidarSiCanvienDades() {
  if (dadesConsultades &&
      (elements['student-input'].value !== dadesConsultades.identificador ||
       elements['subject-input'].value !== dadesConsultades.nomAssignatura)) {
    invalidarConsulta();
  }
}

/**
 * Presenta el resultat amb les dades canòniques i els errors de cada camp.
 * @param {object} resultat Consulta o matrícula validada pel servei.
 * @returns {void}
 */
function mostrarResultat(resultat) {
  registrarOperacioDidactica('resultat', `${resultat.codiAlumne}:${resultat.assignatura?.codi || ''}`, resultat.tipus);
  prepararModalResultat();
  elements['result-panel'].dataset.estat = 'resposta';
  delete elements['message'].dataset.tipusError;
  elements['result-panel'].hidden = false;
  elements['result-student'].textContent = resultat.codiAlumne || '—';
  elements['result-student-name'].textContent = resultat.alumne ? resultat.alumne.nom : '—';
  elements['result-student-email'].textContent = resultat.alumne && resultat.alumne.email ? resultat.alumne.email : '—';
  elements['result-degree'].textContent = resultat.alumne ? resultat.alumne.titulacio : '—';
  const estatAlumne = resultat.alumne ? resultat.alumne.estat : '—';
  elements['result-student-status'].textContent = estatAlumne;
  elements['result-student-status'].className = resultat.alumne ? (estatAlumne === 'Actiu' ? 'success' : 'error') : '';
  elements['result-subject'].textContent = resultat.nomAssignatura || '—';
  elements['result-subject-details'].textContent = resultat.assignatura ? resultat.assignatura.codi : '—';
  elements['result-subject-credits'].textContent = resultat.assignatura ? String(resultat.assignatura.credits) : '—';
  elements['result-seats'].textContent = resultat.assignatura ? String(resultat.assignatura.places) : '—';
  elements['result-course-status'].textContent = resultat.estatAssignatura;
  elements['result-course-status'].className = resultat.assignatura ?
    (resultat.estatAssignatura === 'Disponible' ? 'success' : 'warning') : 'error';
  elements['message'].textContent = resultat.missatge;
  elements['message'].className = `message ${resultat.tipus}`;
  elements['enrollment-section'].hidden = !resultat.potMatricular;
  mostrarErrorCamp('student-input', 'student-error', resultat.errors.alumne);
  mostrarErrorCamp('subject-input', 'subject-error', resultat.errors.assignatura);
  mostrarErrorCamp('enrollment-note', 'note-error', resultat.errors.observacio);
  mostrarErrorsControlsDidactics(resultat.errors);
  obrirModalResultat();
}

/**
 * Informa d'un error de l'operació sense deixar controls bloquejats ni dades antigues visibles.
 * @param {Error} error Error de l'operació.
 * @param {string} missatge Missatge tècnic que es vol mostrar.
 * @returns {void}
 */
function mostrarErrorOperacio(error, missatge = "No s'ha pogut completar l'operació. Torna a consultar la sol·licitud.") {
  console.error("No s'ha pogut completar l'operació acadèmica.", error);
  registrarOperacioDidactica('error tècnic', dadesConsultades?.identificador || '', missatge);
  consultaActual = null;
  prepararModalResultat();
  elements['result-panel'].dataset.estat = 'resposta';
  elements['result-panel'].hidden = false;
  elements['enrollment-section'].hidden = true;
  for (const dada of elements['result-panel'].querySelectorAll('dd')) {
    dada.textContent = '—';
    dada.className = '';
  }
  elements['message'].textContent = missatge;
  elements['message'].className = 'message error';
  elements['message'].dataset.tipusError = 'tecnic';
  obrirModalResultat();
}

/**
 * Decideix quina incidència de l'escenari s'aplica a l'operació.
 * @param {string} tipus 'consulta' o 'matricula'.
 * @param {string} clau Combinació alumne i assignatura.
 * @returns {string|null} Incidència que s'ha d'aplicar o null.
 */
function determinarIncidencia(tipus, clau) {
  const incidencia = tipus === 'consulta' ? escenari.consulta : escenari.matricula;
  if (incidencia === 'intermitent' || incidencia === 'fallada') {
    return registreIncidencies.registrarPrimeraFallada(tipus, clau) ? incidencia : null;
  }
  return incidencia;
}

/**
 * Executa una operació simulada aplicant l'escenari i rebutja respostes cancel·lades o obsoletes.
 * @param {string} tipus Tipus d'operació.
 * @param {string} clau Combinació alumne i assignatura.
 * @param {Function} accio Operació que rep la incidència i retorna false si queda sense confirmació.
 * @returns {void}
 */
function executarOperacio(tipus, clau, accio) {
  if (!comprovarSessioDidactica()) return;
  registrarOperacioDidactica(tipus, clau, 'inici');
  const incidencia = determinarIncidencia(tipus, clau);
  const versio = ++operacioActual;
  if (elements['message']) delete elements['message'].dataset.tipusError;
  if (elements['result-panel']) {
    elements['result-panel'].dataset.estat = 'pendent';
    elements['message'].textContent = '';
  }
  indicarOperacio(tipus);
  if (incidencia === 'senseResposta') return;
  const retardBase = tipus === 'consulta' ? RETARD_CONSULTA : RETARD_MATRICULA;
  temporitzador = setTimeout(() => {
    if (versio !== operacioActual) return;
    temporitzador = null;
    if (!comprovarSessioDidactica()) return;
    let completada = true;
    try {
      if (incidencia === 'intermitent') {
        mostrarErrorOperacio(new Error('Error intermitent simulat.'),
          'Error tècnic: servei de consulta temporalment no disponible. Torna a consultar.');
        return;
      }
      if (incidencia === 'fallada') {
        mostrarErrorOperacio(new Error('Error de matrícula simulat.'),
          "Error tècnic: no s'ha registrat la matrícula. Torna a consultar abans de reintentar.");
        return;
      }
      completada = accio(incidencia) !== false;
    } catch (error) {
      mostrarErrorOperacio(error);
    } finally {
      registrarOperacioDidactica(tipus, clau, completada ? 'resposta' : 'sense confirmació');
      if (completada) indicarOperacio(null);
    }
  }, incidencia === 'lenta' ? segonsEscenari * 1000 : retardBase);
}

/**
 * Valida i consulta les dades del formulari, sense reutilitzar resultats anteriors.
 * @returns {void}
 */
function consultarSollicitud() {
  if (enCurs) return;
  invalidarConsulta();
  const identificador = elements['student-input'].value;
  const nomAssignatura = elements['subject-input'].value;
  dadesConsultades = { identificador, nomAssignatura };
  const resultat = serveiAcademic.consultar(identificador, nomAssignatura);
  if (Object.keys(resultat.errors).length) {
    mostrarResultat(resultat);
    return;
  }
  executarOperacio('consulta', `${resultat.codiAlumne}:${resultat.assignatura.codi}`, () => {
    const consulta = serveiAcademic.consultar(identificador, nomAssignatura);
    consultaActual = consulta.potMatricular ?
      { identificador: consulta.codiAlumne, nomAssignatura: consulta.nomAssignatura, codiAssignatura: consulta.assignatura.codi } : null;
    mostrarResultat(consulta);
    mostrarCataleg();
    elements['result-title'].focus();
  });
}

/**
 * Formalitza exclusivament la consulta vigent i revalida les places al confirmar.
 * @returns {void}
 */
function formalitzarMatricula() {
  if (enCurs) return;
  if (!consultaActual || elements['enrollment-section'].hidden) {
    elements['search-status'].textContent = 'Consulta una sol·licitud vàlida abans de formalitzar la matrícula.';
    elements['student-input'].focus();
    return;
  }
  if (elements['student-input'].value.trim().toUpperCase() !== consultaActual.identificador ||
      normalitzar(elements['subject-input'].value) !== normalitzar(consultaActual.nomAssignatura)) {
    invalidarConsulta();
    elements['search-status'].textContent = 'Les dades han canviat. Torna a consultar la sol·licitud.';
    return;
  }
  const observacio = elements['enrollment-note'].value;
  const opcions = llegirControlsDidactics();
  const errorsOpcions = opcions === null ? {} : getErrorsOpcionsMatricula(opcions);
  mostrarErrorsControlsDidactics(errorsOpcions, true);
  mostrarErrorCamp('enrollment-note', 'note-error');
  if (observacio.trim().length > 500) {
    mostrarErrorCamp('enrollment-note', 'note-error', "L'observació no pot superar els 500 caràcters.");
    elements['enrollment-note'].focus();
    return;
  }
  if (Object.keys(errorsOpcions).length > 0) return;
  const consulta = { ...consultaActual };
  executarOperacio('matricula', `${consulta.identificador}:${consulta.codiAssignatura}`, incidencia => {
    const resultat = serveiAcademic.formalitzar(consulta.identificador, consulta.nomAssignatura, observacio, opcions);
    consultaActual = null;
    if (incidencia === 'confirmacioPerduda' && resultat.tipus === 'success') {
      eliminarModalResultat();
      elements['search-status'].textContent = 'Esperant la confirmació de matrícula…';
      return false;
    }
    mostrarResultat(resultat);
    mostrarCataleg();
    elements['result-title'].focus();
  });
}

/**
 * Connecta els esdeveniments del formulari, de la matrícula i dels casos de prova.
 * @returns {void}
 */
function connectarEsdeveniments() {
  elements['academic-form'].addEventListener('submit', esdeveniment => {
    esdeveniment.preventDefault();
    consultarSollicitud();
  });
  for (const id of ['student-input', 'subject-input']) {
    elements[id].addEventListener('input', invalidarConsulta);
    elements[id].addEventListener('change', invalidarSiCanvienDades);
  }
  for (const boto of document.querySelectorAll('.cas')) {
    boto.addEventListener('click', () => {
      invalidarConsulta();
      elements['student-input'].value = boto.dataset.alumne;
      elements['subject-input'].value = boto.dataset.assignatura;
      elements['student-input'].focus();
      elements['search-status'].textContent = 'Cas carregat. Prem «Consultar sol·licitud» per validar-lo.';
    });
  }
  window.addEventListener('storage', esdeveniment => {
    if (esdeveniment.key === null || esdeveniment.key === CLAU_DADES) mostrarCataleg();
  });
}

/**
 * Renderitza l'aplicació i en prepara l'estat.
 * @param {HTMLElement} contenidor Element principal de la pàgina.
 * @returns {void}
 */
function muntarAplicacio(contenidor) {
  renderitzarAplicacio(contenidor);
  elements = Object.fromEntries(IDS_ELEMENTS.map(id => [id, document.getElementById(id)]));
  connectarEsdeveniments();
  connectarBotoModeAleatori(document.getElementById('random-mode-button'), document.getElementById('random-mode-status'));
  mostrarCataleg();
  iniciarPractiquesDidactiques();
}

/**
 * Llegeix l'escenari de la pàgina, aplica els paràmetres de la URL i inicia l'aplicació.
 * Paràmetres admesos: ?reiniciar=1 (esborra les dades) i ?segons=N (1-120, retard dels escenaris lents).
 * @returns {void}
 */
function iniciarAplicacio() {
  const contenidor = document.getElementById('aplicacio');
  try {
    escenari = obtenirEscenari(document.body.dataset.escenari || 'normal');
    const parametres = new URLSearchParams(location.search);
    if (parametres.get('reiniciar') === '1') {
      reiniciarDades();
      parametres.delete('reiniciar');
      const cerca = parametres.toString();
      history.replaceState(null, '', location.pathname + (cerca ? `?${cerca}` : '') + location.hash);
    }
    segonsEscenari = llegirSegons(parametres, escenari.segons);
    serveiAcademic = new ServeiAcademic(new MagatzemLocal(CLAU_DADES));
    registreIncidencies = new RegistreIncidencies(new MagatzemLocal(CLAU_INCIDENCIES));
  } catch (error) {
    console.error("No s'ha pogut iniciar l'aplicació.", error);
    mostrarErrorInicial(contenidor, "No s'ha pogut iniciar l'aplicació. Torna-ho a provar més tard.");
    return;
  }
  if (escenari.carrega) {
    mostrarCarregador(contenidor);
    setTimeout(() => muntarAplicacio(contenidor), segonsEscenari * 1000);
  } else {
    muntarAplicacio(contenidor);
  }
}

iniciarAplicacio();
