'use strict';

const CLAU_CONFIG_DIDACTICA = 'campusrpa.didactica.v1';
const CLAU_REGISTRE_DIDACTIC = 'campusrpa.registre.v1';

/**
 * Llegeix les pràctiques habilitades pel docent, desactivades per defecte.
 * @returns {{controls: boolean, avis: boolean, sessio: boolean, segons: number}} Configuració validada.
 */
function getConfigDidactica() {
  const dades = new MagatzemLocal(CLAU_CONFIG_DIDACTICA).llegir();
  return {
    controls: dades?.controls === true, avis: dades?.avis === true, sessio: dades?.sessio === true,
    segons: Number.isInteger(dades?.segons) && dades.segons >= 5 && dades.segons <= 120 ? dades.segons : 30
  };
}

/**
 * Afegeix un esdeveniment al registre docent, limitat als últims 200.
 * @param {string} operacio Operació observada.
 * @param {string} clau Combinació d'alumne i assignatura.
 * @param {string} estat Estat de l'operació.
 * @returns {void}
 */
function registrarOperacioDidactica(operacio, clau, estat) {
  const magatzem = new MagatzemLocal(CLAU_REGISTRE_DIDACTIC);
  const anterior = magatzem.llegir();
  const registre = Array.isArray(anterior) ? anterior : [];
  magatzem.desar([...registre.slice(-199), { data: new Date().toISOString(), operacio, clau, estat }]);
}

/**
 * Crea un diàleg fictici sense credencials per practicar avisos o inici de sessió.
 * @param {string} id Identificador estable.
 * @param {string} titol Títol del diàleg.
 * @param {string} missatge Explicació de la pràctica.
 * @param {string} botoText Text del botó.
 * @param {Function} confirmar Acció en acceptar.
 * @returns {void}
 */
function mostrarDialegDidactic(id, titol, missatge, botoText, confirmar) {
  if (document.getElementById(id)) return;
  const dialeg = document.createElement('dialog');
  dialeg.id = id;
  dialeg.className = 'targeta modal-resultat';
  const capcalera = document.createElement('h2');
  capcalera.id = `${id}-title`;
  capcalera.textContent = titol;
  dialeg.setAttribute('aria-labelledby', capcalera.id);
  const text = document.createElement('p');
  text.textContent = missatge;
  const boto = document.createElement('button');
  boto.id = `${id}-button`;
  boto.className = 'boto';
  boto.textContent = botoText;
  boto.addEventListener('click', () => {
    confirmar();
    dialeg.close();
    dialeg.remove();
    document.getElementById('student-input')?.focus();
  });
  dialeg.addEventListener('cancel', esdeveniment => esdeveniment.preventDefault());
  dialeg.append(capcalera, text, boto);
  document.body.append(dialeg);
  dialeg.showModal();
}

/**
 * Comprova la sessió fictícia abans de modificar o consultar dades.
 * @returns {boolean} Si la sessió permet continuar.
 */
function comprovarSessioDidactica() {
  const config = getConfigDidactica();
  if (!config.sessio) return true;
  const text = new MagatzemLocal('campusrpa.sessio.v1').llegir();
  if (typeof text === 'number' && Date.now() < text) return true;
  document.getElementById('notice-dialog')?.remove();
  if (typeof invalidarConsulta === 'function') invalidarConsulta();
  mostrarDialegDidactic('session-dialog', 'Sessió fictícia caducada',
    'No introdueixis credencials. Renova la sessió i torna a consultar la sol·licitud.',
    'Iniciar sessió de prova', () => {
      new MagatzemLocal('campusrpa.sessio.v1').desar(Date.now() + config.segons * 1000);
    });
  registrarOperacioDidactica('sessió', '', 'caducada');
  return false;
}

/**
 * Inicia els avisos opcionals sense alterar el mode bàsic.
 * @returns {void}
 */
function iniciarPractiquesDidactiques() {
  if (getConfigDidactica().avis && new MagatzemLocal('campusrpa.avis.v1').llegir() !== true) {
    mostrarDialegDidactic('notice-dialog', 'Avís de pràctiques',
      'Aquest avís és fictici. Tanca’l abans d’interactuar amb el formulari.',
      'Acceptar avís', () => new MagatzemLocal('campusrpa.avis.v1').desar(true));
  }
}

/**
 * Afegeix controls dependents al formulari només si el docent els habilita.
 * @returns {void}
 */
function prepararControlsDidactics() {
  if (!getConfigDidactica().controls) return;
  const formulari = document.getElementById('enrollment-section');
  const bloc = document.createElement('fieldset');
  bloc.id = 'enrollment-options';
  bloc.innerHTML = `<legend>Opcions de matrícula</legend>
    <label for="enrollment-mode">Modalitat</label>
    <select id="enrollment-mode" required aria-describedby="mode-error"><option value="">Selecciona una modalitat</option>
      <option value="presencial">Presencial</option><option value="online">En línia</option></select>
    <span id="mode-error" class="camp-error" hidden></span>
    <div id="destination-group" hidden><label id="destination-label" for="enrollment-destination">Destinació</label>
      <select id="enrollment-destination" required aria-describedby="destination-error" disabled></select>
      <span id="destination-error" class="camp-error" hidden></span></div>
    <label class="opcio"><input id="enrollment-terms" type="checkbox" required aria-describedby="terms-error"> Accepto les condicions fictícies</label>
    <span id="terms-error" class="camp-error" hidden></span>`;
  formulari.prepend(bloc);
  const modalitat = bloc.querySelector('#enrollment-mode');
  modalitat.addEventListener('change', () => {
    const presencial = modalitat.value === 'presencial';
    const opcions = presencial ? ['Barcelona', 'Girona'] : ['Matí', 'Tarda'];
    const destinacio = bloc.querySelector('#enrollment-destination');
    destinacio.replaceChildren(new Option('Selecciona una opció', ''), ...opcions.map(valor => new Option(valor, valor)));
    destinacio.disabled = !modalitat.value;
    bloc.querySelector('#destination-group').hidden = !modalitat.value;
    bloc.querySelector('#destination-label').textContent = presencial ? 'Campus' : 'Franja horària';
  });
  bloc.addEventListener('change', () => {
    if (bloc.querySelector('[aria-invalid="true"]')) {
      mostrarErrorsControlsDidactics(getErrorsOpcionsMatricula(llegirControlsDidactics()));
    }
  });
}

/**
 * Mostra els errors al camp corresponent i opcionalment enfoca el primer.
 * @param {object} errors Missatges indexats per modalitat, destinació o acceptades.
 * @param {boolean} enfocar Si cal situar el focus al primer camp invàlid.
 * @returns {void}
 */
function mostrarErrorsControlsDidactics(errors = {}, enfocar = false) {
  let primerCamp = null;
  for (const [clau, idCamp, idError] of [
    ['modalitat', 'enrollment-mode', 'mode-error'],
    ['destinacio', 'enrollment-destination', 'destination-error'],
    ['acceptades', 'enrollment-terms', 'terms-error']
  ]) {
    const camp = document.getElementById(idCamp);
    if (!camp) continue;
    const missatge = errors[clau] || '';
    camp.setAttribute('aria-invalid', String(Boolean(missatge)));
    const elementError = document.getElementById(idError);
    elementError.textContent = missatge;
    elementError.hidden = !missatge;
    if (missatge && !primerCamp) primerCamp = camp;
  }
  if (enfocar && primerCamp) primerCamp.focus();
}

/**
 * Retorna les opcions introduïdes o null quan la pràctica està desactivada.
 * @returns {object|null} Opcions de matrícula.
 */
function llegirControlsDidactics() {
  const bloc = document.getElementById('enrollment-options');
  if (!bloc) return null;
  return {
    modalitat: bloc.querySelector('#enrollment-mode').value,
    destinacio: bloc.querySelector('#enrollment-destination').value,
    acceptades: bloc.querySelector('#enrollment-terms').checked
  };
}

/**
 * Filtra i pagina l'historial sense modificar les dades d'origen.
 * @param {Array<object>} matricules Historial disponible.
 * @param {string} cerca Text de cerca.
 * @param {string} codiAssignatura Filtre de codi o cadena buida.
 * @param {number} pagina Pàgina sol·licitada, començant per 1.
 * @param {number} mida Nombre de files per pàgina.
 * @returns {object} Files, totals i pàgina efectiva.
 */
function paginarMatricules(matricules, cerca, codiAssignatura, pagina, mida) {
  if (!Number.isInteger(mida) || mida < 1 || !Number.isInteger(pagina) || pagina < 1) {
    throw new Error('La pàgina i la mida han de ser enters positius.');
  }
  const clau = normalitzar(cerca);
  const filtrades = matricules.filter(matricula =>
    (!codiAssignatura || matricula.codiAssignatura === codiAssignatura) &&
    normalitzar([matricula.referencia, matricula.codiAlumne, matricula.alumne.nom,
      matricula.alumne.email, matricula.assignatura.nom, matricula.codiAssignatura].join(' ')).includes(clau));
  const pagines = Math.max(1, Math.ceil(filtrades.length / mida));
  const actual = Math.min(pagina, pagines);
  return { files: filtrades.slice((actual - 1) * mida, actual * mida),
    total: filtrades.length, pagines, pagina: actual };
}

/**
 * Genera un justificant fictici de text, mai executable.
 * @param {object} matricula Matrícula registrada i enriquida.
 * @returns {string} Contingut descarregable.
 */
function generarJustificant(matricula) {
  return ['CAMPUSRPA — JUSTIFICANT FICTICI, SENSE VALIDESA OFICIAL',
    `Referència: ${matricula.referencia}`, `Alumne: ${matricula.codiAlumne} · ${matricula.alumne.nom}`,
    `Correu: ${matricula.alumne.email}`, `Assignatura: ${matricula.codiAssignatura} · ${matricula.assignatura.nom}`,
    `Crèdits: ${matricula.assignatura.credits}`, `Data: ${matricula.data || 'No disponible (registre anterior)'}`,
    `Modalitat: ${matricula.opcions?.modalitat || 'No especificada'}`,
    `Destinació: ${matricula.opcions?.destinacio || 'No especificada'}`,
    `Observació: ${matricula.observacio}`, '', 'Document de pràctiques. No acredita cap matrícula real.'].join('\r\n');
}

/**
 * Comprova que una referència tingui el format MAT-000000.
 * @param {string} referencia Referència de matrícula.
 * @returns {void}
 * @throws {Error} Si la referència és invàlida.
 */
function validarReferencia(referencia) {
  if (!/^MAT-\d{6}$/.test(referencia)) throw new Error('Referència de matrícula invàlida.');
}

/**
 * Construeix la URL pròpia que descarrega el justificant sense mostrar-lo.
 * @param {string} referencia Referència de matrícula.
 * @returns {string} URL relativa de descàrrega.
 */
function getUrlDescarregaJustificant(referencia) {
  validarReferencia(referencia);
  return `Descarrega.html?referencia=${encodeURIComponent(referencia)}`;
}

/**
 * Desa el justificant d'una matrícula existent. Obre el diàleg «Desa com a» quan el navegador
 * l'admet (Chrome i Edge) i, si no, en fa una descàrrega automàtica amb un nom segur.
 * @param {object} matricula Matrícula de l'historial.
 * @param {Function|null} selectorFitxers Selector de fitxers; per defecte, window.showSaveFilePicker. Null força la descàrrega automàtica.
 * @returns {Promise<string>} 'desat', 'cancel·lat' o 'descarregat'.
 */
async function descarregarJustificant(matricula, selectorFitxers = window.showSaveFilePicker) {
  validarReferencia(matricula.referencia);
  const nom = `Justificant-${matricula.referencia}.txt`;
  const contingut = new Blob([generarJustificant(matricula)], { type: 'text/plain;charset=utf-8' });
  if (typeof selectorFitxers !== 'function') {
    descarregarAutomaticament(contingut, nom);
    return 'descarregat';
  }
  let fitxer;
  try {
    fitxer = await selectorFitxers.call(window, {
      suggestedName: nom,
      types: [{ description: 'Justificant de text', accept: { 'text/plain': ['.txt'] } }]
    });
  } catch (error) {
    if (error.name === 'AbortError') return 'cancel·lat';
    throw error;
  }
  const escriptor = await fitxer.createWritable();
  try {
    await escriptor.write(contingut);
  } finally {
    await escriptor.close();
  }
  return 'desat';
}

/**
 * Descarrega un contingut a la carpeta predeterminada del navegador.
 * @param {Blob} contingut Contingut del fitxer.
 * @param {string} nom Nom del fitxer.
 * @returns {void}
 */
function descarregarAutomaticament(contingut, nom) {
  const url = URL.createObjectURL(contingut);
  const enllac = document.createElement('a');
  enllac.href = url;
  enllac.download = nom;
  document.body.append(enllac);
  enllac.click();
  enllac.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Desa el justificant i informa del resultat en un element d'estat accessible.
 * @param {object} matricula Matrícula de l'historial.
 * @param {HTMLElement} estat Element on es mostra el resultat.
 * @returns {Promise<void>}
 */
async function desarJustificantAmbEstat(matricula, estat) {
  const missatges = {
    desat: `Justificant ${matricula.referencia} desat.`,
    'cancel·lat': `S'ha cancel·lat el desament del justificant ${matricula.referencia}.`,
    descarregat: `Descàrrega sol·licitada: ${matricula.referencia}. Comprova el fitxer al navegador.`
  };
  try {
    estat.textContent = missatges[await descarregarJustificant(matricula)];
  } catch (error) {
    console.error("No s'ha pogut desar el justificant.", error);
    estat.textContent = `No s'ha pogut desar el justificant ${matricula.referencia}. Torna-ho a provar.`;
  }
}

/**
 * Afegeix o elimina un botó de paginació. Sense botó, el paginador de PAD detecta el final.
 * @param {HTMLButtonElement} boto Botó de paginació.
 * @param {string} idEspai Identificador del contenidor que reserva l'espai del botó.
 * @param {boolean} disponible Si hi ha pàgina a la qual navegar.
 * @returns {void}
 */
function mostrarBotoPaginacio(boto, idEspai, disponible) {
  const espai = document.getElementById(idEspai);
  if (disponible && !espai.contains(boto)) espai.append(boto);
  else if (!disponible) boto.remove();
}

/**
 * Presenta l'historial amb cerca, filtre, paginació i justificants.
 * @returns {void}
 */
function iniciarHistorial() {
  const servei = new ServeiAcademic(new MagatzemLocal(CLAU_DADES));
  const camp = id => document.getElementById(id);
  let pagina = 1;
  for (const assignatura of servei.getCataleg()) camp('history-subject').add(new Option(assignatura.nom, assignatura.codi));
  const mostrar = () => {
    const resultat = paginarMatricules(servei.getMatricules(), camp('history-search').value,
      camp('history-subject').value, pagina, Number(camp('history-size').value));
    pagina = resultat.pagina;
    camp('history-rows').replaceChildren();
    for (const matricula of resultat.files) {
      const fila = document.createElement('tr');
      for (const text of [matricula.referencia, matricula.codiAlumne, matricula.alumne.nom,
        matricula.alumne.email, matricula.assignatura.nom,
        matricula.data ? new Date(matricula.data).toLocaleString('ca') : 'No disponible', 'Matriculada']) {
        const cela = document.createElement('td');
        cela.textContent = text;
        fila.append(cela);
      }
      const cela = document.createElement('td');
      const enllac = document.createElement('a');
      enllac.href = `Justificant.html?referencia=${encodeURIComponent(matricula.referencia)}`;
      enllac.textContent = 'Veure justificant';
      const descarrega = document.createElement('a');
      descarrega.className = 'accio-justificant';
      descarrega.href = getUrlDescarregaJustificant(matricula.referencia);
      descarrega.textContent = 'Descarregar';
      descarrega.setAttribute('aria-label', `Descarregar justificant ${matricula.referencia}`);
      descarrega.dataset.referencia = matricula.referencia;
      // Clic normal: descàrrega sense sortir de l'historial; l'href es manté per a PAD i noves pestanyes.
      descarrega.addEventListener('click', esdeveniment => {
        if (esdeveniment.ctrlKey || esdeveniment.metaKey || esdeveniment.shiftKey || esdeveniment.button !== 0) return;
        esdeveniment.preventDefault();
        descarregarJustificantDirecte(matricula, camp('history-status'));
      });
      cela.append(enllac, document.createElement('br'), descarrega);
      fila.append(cela);
      camp('history-rows').append(fila);
    }
    camp('history-empty').hidden = resultat.total !== 0;
    camp('history-page').textContent = `Pàgina ${pagina} de ${resultat.pagines} · ${resultat.total} matrícules`;
    mostrarBotoPaginacio(botoAnterior, 'history-previous-slot', pagina > 1);
    mostrarBotoPaginacio(botoSeguent, 'history-next-slot', pagina < resultat.pagines);
  };
  const botoAnterior = camp('history-previous');
  const botoSeguent = camp('history-next');
  camp('history-form').addEventListener('submit', esdeveniment => { esdeveniment.preventDefault(); pagina = 1; mostrar(); });
  for (const id of ['history-subject', 'history-size']) camp(id).addEventListener('change', () => { pagina = 1; mostrar(); });
  botoAnterior.addEventListener('click', () => { pagina -= 1; mostrar(); });
  botoSeguent.addEventListener('click', () => { pagina += 1; mostrar(); });
  camp('history-refresh').addEventListener('click', mostrar);
  window.addEventListener('storage', mostrar);
  mostrar();
}

/**
 * Connecta el panel docent amb configuració opcional i dades reproduïbles.
 * @returns {void}
 */
function iniciarDocent() {
  const camp = id => document.getElementById(id);
  const config = getConfigDidactica();
  for (const clau of ['controls', 'avis', 'sessio']) camp(`teacher-${clau}`).checked = config[clau];
  camp('teacher-seconds').value = config.segons;
  camp('teacher-form').addEventListener('submit', esdeveniment => {
    esdeveniment.preventDefault();
    if (!camp('teacher-form').reportValidity()) return;
    new MagatzemLocal(CLAU_CONFIG_DIDACTICA).desar({
      controls: camp('teacher-controls').checked, avis: camp('teacher-avis').checked,
      sessio: camp('teacher-sessio').checked, segons: Number(camp('teacher-seconds').value)
    });
    new MagatzemLocal('campusrpa.avis.v1').esborrar();
    new MagatzemLocal('campusrpa.sessio.v1').esborrar();
    camp('teacher-status').textContent = 'Configuració desada. Obre o recarrega la consulta.';
  });
  camp('teacher-launch').addEventListener('click', () => {
    if (!camp('teacher-delay').reportValidity()) return;
    const desti = camp('teacher-scenario').value;
    if (!['Matricula.html', 'ErrorCarga.html', 'ErrorConsultaLenta.html', 'ErrorSenseResposta.html',
      'ErrorIntermitent.html', 'ErrorMatricula.html', 'ErrorConfirmacio.html', 'ErrorServei.html'].includes(desti)) {
      throw new Error('Escenari docent invàlid.');
    }
    location.href = `${desti}?aleatori=0&segons=${camp('teacher-delay').value}`;
  });
  camp('teacher-seed').addEventListener('click', () => {
    reiniciarDades();
    const servei = new ServeiAcademic(new MagatzemLocal(CLAU_DADES));
    for (let numero = 1; numero <= 8; numero += 1) {
      const resultat = servei.formalitzar(`ALU${String(numero).padStart(3, '0')}`, 'Programació Python', 'Conjunt docent');
      if (resultat.tipus !== 'success') throw new Error('No s’ha pogut preparar el conjunt docent.');
    }
    camp('teacher-status').textContent = 'Preparades 8 matrícules de Programació Python. Les dades anteriors s’han reiniciat.';
    mostrarRegistre();
  });
  camp('teacher-reset').addEventListener('click', () => {
    reiniciarDades();
    for (const clau of [CLAU_CONFIG_DIDACTICA, CLAU_REGISTRE_DIDACTIC, 'campusrpa.avis.v1', 'campusrpa.sessio.v1']) {
      new MagatzemLocal(clau).esborrar();
    }
    location.reload();
  });
  const mostrarRegistre = () => {
    const dades = new MagatzemLocal(CLAU_REGISTRE_DIDACTIC).llegir();
    camp('teacher-log').textContent = Array.isArray(dades) ?
      dades.map(fila => `${fila.data} · ${fila.operacio} · ${fila.clau} · ${fila.estat}`).join('\n') : 'Sense operacions.';
  };
  camp('teacher-log-refresh').addEventListener('click', mostrarRegistre);
  mostrarRegistre();
}

/**
 * Munta un formulari de selectores variables, independent del procés de matrícula.
 * @returns {void}
 */
function iniciarLaboratori() {
  const mode = document.getElementById('lab-mode');
  const parametre = new URLSearchParams(location.search).get('mode');
  if (['estable', 'dinamic', 'ordre'].includes(parametre)) mode.value = parametre;
  const formulari = document.getElementById('lab-form');
  const mostrar = () => {
    formulari.replaceChildren();
    const camps = [['alumne', 'Alumne'], ['assignatura', 'Assignatura']];
    if (mode.value === 'ordre' && Math.random() < 0.5) camps.reverse();
    for (const [clau, nom] of camps) {
      const grup = document.createElement('div');
      const entrada = document.createElement('input');
      entrada.id = mode.value === 'estable' ? `lab-${clau}` : `lab-${clau}-${crypto.randomUUID()}`;
      entrada.name = clau;
      entrada.dataset.camp = clau;
      entrada.required = true;
      const etiqueta = document.createElement('label');
      etiqueta.htmlFor = entrada.id;
      etiqueta.textContent = nom;
      grup.append(etiqueta, entrada);
      formulari.append(grup);
    }
    const boto = document.createElement('button');
    boto.className = 'boto';
    boto.textContent = 'Enviar pràctica';
    formulari.append(boto);
    document.getElementById('lab-status').textContent = '';
  };
  mode.addEventListener('change', () => {
    const parametres = new URLSearchParams(location.search);
    parametres.set('mode', mode.value);
    history.replaceState(null, '', `${location.pathname}?${parametres.toString()}`);
    mostrar();
  });
  document.getElementById('lab-regenerate').addEventListener('click', mostrar);
  formulari.addEventListener('submit', esdeveniment => {
    esdeveniment.preventDefault();
    document.getElementById('lab-status').textContent =
      `Rebut: ${formulari.elements.namedItem('alumne').value} · ${formulari.elements.namedItem('assignatura').value}. No s’ha creat cap matrícula.`;
  });
  mostrar();
}

/**
 * Mostra i permet descarregar un justificant d'una referència existent.
 * @returns {void}
 */
function iniciarJustificant() {
  const referencia = new URLSearchParams(location.search).get('referencia');
  const matricula = cercarMatricula(referencia);
  if (!matricula) {
    document.getElementById('receipt-text').textContent = 'Matrícula no trobada. Torna a l’historial i selecciona una referència registrada.';
    document.getElementById('receipt-download').disabled = true;
    return;
  }
  const estat = document.getElementById('receipt-status');
  document.getElementById('receipt-text').textContent = generarJustificant(matricula);
  document.getElementById('receipt-download').addEventListener('click', () => desarJustificantAmbEstat(matricula, estat));
}

/**
 * Cerca una matrícula registrada per referència.
 * @param {string|null} referencia Referència de matrícula.
 * @returns {object|undefined} Matrícula trobada o undefined.
 */
function cercarMatricula(referencia) {
  return new ServeiAcademic(new MagatzemLocal(CLAU_DADES)).getMatricules()
    .find(fila => fila.referencia === referencia);
}

/**
 * Descarrega el justificant indicat a la URL sense mostrar-lo i torna a la pàgina anterior.
 * @param {number} esperaMs Temps abans de tornar perquè el navegador iniciï la descàrrega.
 * @returns {Promise<void>}
 */
async function iniciarDescarrega(esperaMs = 800) {
  const estat = document.getElementById('download-status');
  const matricula = cercarMatricula(new URLSearchParams(location.search).get('referencia'));
  if (!matricula) {
    estat.textContent = 'Matrícula no trobada. Torna a l’historial i selecciona una referència registrada.';
    return;
  }
  await descarregarJustificantDirecte(matricula, estat);
  if (history.length > 1) setTimeout(() => history.back(), esperaMs);
}

/**
 * Descarrega el justificant sense diàleg i informa del resultat.
 * @param {object} matricula Matrícula de l'historial.
 * @param {HTMLElement} estat Element on es mostra el resultat.
 * @returns {Promise<void>}
 */
async function descarregarJustificantDirecte(matricula, estat) {
  try {
    await descarregarJustificant(matricula, null);
    estat.textContent = `Descàrrega iniciada: Justificant-${matricula.referencia}.txt.`;
  } catch (error) {
    console.error("No s'ha pogut descarregar el justificant.", error);
    estat.textContent = `No s'ha pogut descarregar el justificant ${matricula.referencia}.`;
  }
}
