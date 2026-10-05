'use strict';

const RETARD_CONSULTA = 600;
const RETARD_MATRICULA = 700;
const IDS_ELEMENTS = [
  'academic-form', 'student-input', 'subject-input', 'student-error', 'subject-error',
  'search-button', 'search-status', 'result-panel', 'result-title', 'result-student',
  'result-student-name', 'result-degree', 'result-student-status', 'result-subject',
  'result-subject-details', 'result-subject-credits', 'result-seats', 'result-course-status', 'message',
  'enrollment-section', 'enrollment-note', 'note-error', 'create-enrollment-button',
  'subject-options', 'subject-catalog'
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
 * Actualitza les opcions de consulta i les places visibles del catàleg.
 * @returns {void}
 */
function mostrarCataleg() {
  elements['subject-options'].replaceChildren();
  elements['subject-catalog'].replaceChildren();
  for (const assignatura of serveiAcademic.getCataleg()) {
    const opcio = document.createElement('option');
    opcio.value = assignatura.nom;
    elements['subject-options'].append(opcio);
    const fila = document.createElement('li');
    const nom = document.createElement('strong');
    const detall = document.createElement('span');
    nom.textContent = assignatura.nom;
    detall.textContent = `${assignatura.codi} · ${assignatura.credits} crèdits · ${assignatura.places} places`;
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
  elements['create-enrollment-button'].disabled = enCurs;
  elements['enrollment-note'].disabled = operacio === 'matricula';
  elements['academic-form'].setAttribute('aria-busy', String(operacio === 'consulta'));
  elements['enrollment-section'].setAttribute('aria-busy', String(operacio === 'matricula'));
  elements['search-button'].textContent = operacio === 'consulta' ? 'Consultant...' : 'Consultar sol·licitud';
  elements['create-enrollment-button'].textContent = operacio === 'matricula' ? 'Formalitzant...' : 'Formalitzar matrícula';
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
  elements['result-panel'].hidden = true;
  elements['enrollment-section'].hidden = true;
  elements['message'].textContent = '';
  delete elements['message'].dataset.tipusError;
  elements['enrollment-note'].value = '';
  mostrarErrorCamp('student-input', 'student-error');
  mostrarErrorCamp('subject-input', 'subject-error');
  mostrarErrorCamp('enrollment-note', 'note-error');
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
  delete elements['message'].dataset.tipusError;
  elements['result-panel'].hidden = false;
  elements['result-student'].textContent = resultat.codiAlumne || '—';
  elements['result-student-name'].textContent = resultat.alumne ? resultat.alumne.nom : '—';
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
}

/**
 * Informa d'un error de l'operació sense deixar controls bloquejats ni dades antigues visibles.
 * @param {Error} error Error de l'operació.
 * @param {string} missatge Missatge tècnic que es vol mostrar.
 * @returns {void}
 */
function mostrarErrorOperacio(error, missatge = "No s'ha pogut completar l'operació. Torna a consultar la sol·licitud.") {
  console.error("No s'ha pogut completar l'operació acadèmica.", error);
  consultaActual = null;
  elements['result-panel'].hidden = false;
  elements['enrollment-section'].hidden = true;
  for (const dada of elements['result-panel'].querySelectorAll('dd')) {
    dada.textContent = '—';
    dada.className = '';
  }
  elements['message'].textContent = missatge;
  elements['message'].className = 'message error';
  elements['message'].dataset.tipusError = 'tecnic';
  elements['result-title'].focus();
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
  const incidencia = determinarIncidencia(tipus, clau);
  const versio = ++operacioActual;
  delete elements['message'].dataset.tipusError;
  indicarOperacio(tipus);
  if (incidencia === 'senseResposta') return;
  const retardBase = tipus === 'consulta' ? RETARD_CONSULTA : RETARD_MATRICULA;
  temporitzador = setTimeout(() => {
    if (versio !== operacioActual) return;
    temporitzador = null;
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
    elements[resultat.errors.alumne ? 'student-input' : 'subject-input'].focus();
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
  if (observacio.trim().length > 500) {
    mostrarErrorCamp('enrollment-note', 'note-error', "L'observació no pot superar els 500 caràcters.");
    elements['enrollment-note'].focus();
    return;
  }
  const consulta = { ...consultaActual };
  executarOperacio('matricula', `${consulta.identificador}:${consulta.codiAssignatura}`, incidencia => {
    const resultat = serveiAcademic.formalitzar(consulta.identificador, consulta.nomAssignatura, observacio);
    consultaActual = null;
    if (incidencia === 'confirmacioPerduda' && resultat.tipus === 'success') {
      elements['result-panel'].hidden = true;
      elements['enrollment-section'].hidden = true;
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
  elements['enrollment-section'].addEventListener('submit', esdeveniment => {
    esdeveniment.preventDefault();
    formalitzarMatricula();
  });
  for (const id of ['student-input', 'subject-input']) {
    elements[id].addEventListener('input', invalidarConsulta);
    elements[id].addEventListener('change', invalidarSiCanvienDades);
  }
  elements['enrollment-note'].addEventListener('input', () => mostrarErrorCamp('enrollment-note', 'note-error'));
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
  mostrarCataleg();
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
