'use strict';

/**
 * Executa proves unitàries de l'historial, justificants i controls opcionals.
 * @returns {object} Recompte i detall de les proves.
 */
function executarProvesDidactiques() {
  const resultats = [];
  const prova = (nom, accio) => {
    try { accio(); resultats.push({ nom, correcte: true }); }
    catch (error) { console.error(`Ha fallat la prova ${nom}.`, error); resultats.push({ nom, correcte: false, error: error.message }); }
  };
  const comprovar = (condicio, missatge) => { if (!condicio) throw new Error(missatge); };
  const magatzem = new MagatzemMemoria();
  const servei = new ServeiAcademic(magatzem);
  for (let numero = 1; numero <= 8; numero += 1) {
    servei.formalitzar(`ALU${String(numero).padStart(3, '0')}`, 'Programació Python');
  }
  prova('getMatricules_ambDadesRegistrades_retornaHistorialAmbDataICorreu', () => {
    const historial = servei.getMatricules();
    comprovar(historial.length === 8 && historial[0].alumne.email === 'anna.ferrer@campusrpa.test' &&
      Number.isFinite(Date.parse(historial[0].data)), 'Hauria de retornar dades completes i data vàlida.');
    historial[0].alumne.nom = 'Modificat';
    comprovar(servei.getMatricules()[0].alumne.nom === 'Anna Ferrer', 'Les còpies no haurien de modificar les dades internes.');
  });
  prova('paginarMatricules_ambVuitFiles_retornaCincITresSenseDuplicats', () => {
    const primera = paginarMatricules(servei.getMatricules(), '', '', 1, 5);
    const segona = paginarMatricules(servei.getMatricules(), '', '', 2, 5);
    comprovar(primera.files.length === 5 && segona.files.length === 3 && primera.pagines === 2,
      'Hauria de dividir les vuit matrícules en dues pàgines.');
    comprovar(new Set([...primera.files, ...segona.files].map(fila => fila.referencia)).size === 8,
      'No hauria de duplicar registres entre pàgines.');
  });
  prova('paginarMatricules_ambCercaIFiltre_retornaNomesCoincidencies', () => {
    comprovar(paginarMatricules(servei.getMatricules(), 'ANNA FERRER', 'PY001', 8, 5).total === 1,
      'Hauria de cercar sense distingir majúscules i limitar la pàgina.');
    comprovar(paginarMatricules(servei.getMatricules(), 'núria', '', 1, 5).total === 1,
      'Hauria de normalitzar accents.');
    comprovar(paginarMatricules(servei.getMatricules(), 'anna.ferrer@campusrpa.test', 'PA001', 1, 5).total === 0,
      'Hauria de combinar el filtre i la cerca.');
  });
  prova('paginarMatricules_ambHistorialBuit_retornaPaginaBuidaValida', () => {
    const resultat = paginarMatricules([], '', '', 4, 5);
    comprovar(resultat.pagina === 1 && resultat.pagines === 1 && resultat.total === 0,
      'Hauria de mantenir paginació vàlida sense registres.');
  });
  prova('paginarMatricules_ambMidaInvalida_llancaError', () => {
    let rebutjat = false;
    try { paginarMatricules([], '', '', 1, 0); } catch (error) { rebutjat = error instanceof Error; }
    comprovar(rebutjat, 'Hauria de rebutjar la mida zero explícitament.');
  });
  prova('generarJustificant_ambMatricula_retornaTextFicticiAmbReferencia', () => {
    const text = generarJustificant(servei.getMatricules()[0]);
    comprovar(text.includes('SENSE VALIDESA OFICIAL') && text.includes('MAT-000001') &&
      text.includes('Anna Ferrer') && text.includes('PY001'), 'El justificant hauria de contenir les dades reals de la simulació.');
  });
  prova('getUrlDescarregaJustificant_ambReferenciaValida_retornaUrlPropia', () => {
    comprovar(getUrlDescarregaJustificant('MAT-000007') === 'Descarrega.html?referencia=MAT-000007',
      'Hauria de generar la URL de descàrrega de la referència.');
  });
  prova('getUrlDescarregaJustificant_ambReferenciaInvalida_llancaError', () => {
    for (const referencia of ['', 'MAT-1', 'MAT-000001&x=<script>', null]) {
      let rebutjat = false;
      try { getUrlDescarregaJustificant(referencia); } catch (error) { rebutjat = error instanceof Error; }
      comprovar(rebutjat, `Hauria de rebutjar la referència «${referencia}».`);
    }
  });
  prova('formalitzar_ambControlsInvalids_noConsumeixPlaces', () => {
    const altre = new ServeiAcademic();
    const resultat = altre.formalitzar('ALU011', 'Power Automate', '', {
      modalitat: 'presencial', destinacio: 'Barcelona', acceptades: false
    });
    comprovar(resultat.tipus === 'error' && !resultat.matricula && resultat.assignatura.places === 15,
      'No hauria de registrar sense acceptar condicions.');
    comprovar(resultat.errors.acceptades && !resultat.errors.observacio && !resultat.errors.modalitat &&
      !resultat.errors.destinacio, 'Només les condicions haurien de tenir error.');
  });
  prova('getErrorsOpcionsMatricula_ambCampsIncomplets_identificaNomesElsCampsInvalids', () => {
    const incompletes = getErrorsOpcionsMatricula({ modalitat: '', destinacio: '', acceptades: false });
    comprovar(incompletes.modalitat && incompletes.acceptades && !incompletes.destinacio,
      'Hauria de marcar modalitat i condicions, no la destinació encara oculta.');
    for (const modalitat of ['presencial', 'online']) {
      const errors = getErrorsOpcionsMatricula({ modalitat, destinacio: '', acceptades: true });
      comprovar(Object.keys(errors).join() === 'destinacio', 'Només hauria de faltar la destinació.');
    }
    comprovar(!isOpcionsMatriculaValides(null) && !isOpcionsMatriculaValides({ modalitat: 'inexistent' }),
      'Hauria de rebutjar opcions nul·les o modalitats desconegudes.');
  });
  prova('formalitzar_ambControlsValids_conservaOpcionsEntreInstancies', () => {
    const altre = new ServeiAcademic(magatzem);
    altre.formalitzar('ALU011', 'Power Automate', '', { modalitat: 'online', destinacio: 'Tarda', acceptades: true });
    comprovar(new ServeiAcademic(magatzem).getMatricules().at(-1).opcions.destinacio === 'Tarda',
      'Hauria de conservar les opcions de matrícula.');
  });
  prova('formalitzar_senseControls_conservaFuncionamentBasic', () => {
    comprovar(new ServeiAcademic().formalitzar('ALU011', 'Power Automate').tipus === 'success',
      'La matrícula bàsica hauria de funcionar sense opcions avançades.');
  });
  return { total: resultats.length, correctes: resultats.filter(resultat => resultat.correcte).length, resultats };
}

/**
 * Executa proves d'integració a la consulta normal, historial o laboratori i restaura les dades.
 * @returns {Promise<object>} Recompte i errors de la pàgina oberta.
 */
async function executarProvesIntegracioDidactica() {
  const resultats = [];
  const comprovar = (condicio, missatge) => { if (!condicio) throw new Error(missatge); };
  const esperar = async condicio => {
    const inici = performance.now();
    while (!condicio()) {
      if (performance.now() - inici > 3500) throw new Error('La condició hauria de complir-se abans del timeout.');
      await new Promise(resoldre => setTimeout(resoldre, 20));
    }
  };
  const prova = async (nom, accio) => {
    try { await accio(); resultats.push({ nom, correcte: true }); }
    catch (error) { console.error(`Ha fallat la prova ${nom}.`, error); resultats.push({ nom, correcte: false, error: error.message }); }
  };
  const magatzemDades = new MagatzemLocal(CLAU_DADES);
  const magatzemConfig = new MagatzemLocal(CLAU_CONFIG_DIDACTICA);
  const dadesAbans = magatzemDades.llegir();
  const configAbans = magatzemConfig.llegir();
  const altresClaus = ['campusrpa.avis.v1', 'campusrpa.sessio.v1', CLAU_REGISTRE_DIDACTIC];
  const altresDades = altresClaus.map(clau => [clau, new MagatzemLocal(clau).llegir()]);
  try {
    const pagina = document.body.dataset.pagina;
    await prova('capcalera_ambDistintiuVariable_mantePosicioDelsEnllacos', () => {
      const capcalera = document.querySelector('.capcalera-interior');
      const navegacio = capcalera.querySelector('.navegacio');
      const distintiuOriginal = capcalera.querySelector('.distintiu');
      const distintiu = distintiuOriginal || document.createElement('span');
      const textOriginal = distintiu.textContent;
      const posicions = () => Array.from(navegacio.querySelectorAll('a'), enllac => {
        const rectangle = enllac.getBoundingClientRect();
        return [rectangle.x, rectangle.y];
      });
      const abans = JSON.stringify(posicions());
      comprovar(!navegacio.contains(distintiu), 'El distintiu hauria de quedar fora del menú.');
      try {
        distintiu.classList.add('distintiu');
        capcalera.append(distintiu);
        for (const text of ['Entorn de pràctiques', 'Escenari: consulta sense resposta', 'Escenari: confirmació perduda']) {
          distintiu.textContent = text;
          comprovar(JSON.stringify(posicions()) === abans, 'El text no hauria de desplaçar els enllaços.');
        }
        distintiu.remove();
        comprovar(JSON.stringify(posicions()) === abans, 'Eliminar el distintiu no hauria de desplaçar el menú.');
      } finally {
        if (distintiuOriginal) {
          distintiu.textContent = textOriginal;
          capcalera.append(distintiu);
        } else distintiu.remove();
      }
    });
    if (pagina === 'historial') {
      magatzemDades.esborrar();
      const servei = new ServeiAcademic(magatzemDades);
      for (let numero = 1; numero <= 8; numero += 1) {
        servei.formalitzar(`ALU${String(numero).padStart(3, '0')}`, 'Programació Python');
      }
      await prova('historial_ambVuitMatricules_mostraPaginacioICerca', async () => {
        document.getElementById('history-search').value = '';
        document.getElementById('history-subject').value = '';
        document.getElementById('history-size').value = '5';
        document.getElementById('history-form').requestSubmit();
        comprovar(document.querySelectorAll('#history-rows tr').length === 5, 'La primera pàgina hauria de tenir cinc files.');
        comprovar(!document.getElementById('history-previous') && document.getElementById('history-next'),
          'A la primera pàgina només hauria d’existir el botó Següent.');
        document.getElementById('history-next').click();
        comprovar(document.querySelectorAll('#history-rows tr').length === 3, 'La segona pàgina hauria de tenir tres files.');
        comprovar(!document.getElementById('history-next') && document.getElementById('history-previous'),
          'A l’última pàgina el botó Següent no hauria d’existir perquè el paginador s’aturi.');
        document.getElementById('history-previous').click();
        comprovar(document.querySelectorAll('#history-rows tr').length === 5 && document.getElementById('history-next'),
          'Tornar enrere hauria de recuperar la primera pàgina i el botó Següent.');
        document.getElementById('history-search').value = 'anna';
        document.getElementById('history-form').requestSubmit();
        comprovar(document.querySelectorAll('#history-rows tr').length === 1 &&
          document.getElementById('history-rows').textContent.includes('Anna Ferrer'), 'La cerca hauria de retornar Anna Ferrer.');
        comprovar(document.querySelector('#history-rows a').getAttribute('href') === 'Justificant.html?referencia=MAT-000001',
          'La previsualització hauria de referenciar la matrícula correcta.');
        const boto = document.querySelector('#history-rows a.accio-justificant');
        comprovar(boto.getAttribute('href') === 'Descarrega.html?referencia=MAT-000001' &&
          boto.textContent === 'Descarregar' &&
          boto.getAttribute('aria-label').includes('MAT-000001') && boto.getBoundingClientRect().height < 46,
          'La descàrrega hauria de ser un enllaç compacte, accessible i amb URL pròpia.');
        let nomDescarregat = null;
        const interceptar = esdeveniment => {
          if (esdeveniment.target instanceof HTMLAnchorElement && esdeveniment.target.download) {
            esdeveniment.preventDefault();
            nomDescarregat = esdeveniment.target.download;
          }
        };
        document.addEventListener('click', interceptar, true);
        const adreca = location.href;
        try { boto.click(); } finally { document.removeEventListener('click', interceptar, true); }
        await new Promise(resoldre => setTimeout(resoldre, 50));
        comprovar(nomDescarregat === 'Justificant-MAT-000001.txt' && location.href === adreca &&
          document.getElementById('history-status').textContent.includes('Descàrrega iniciada'),
          'El clic hauria de descarregar sense sortir de l’historial.');
        comprovar(Array.from(document.querySelectorAll('#history-table th')).every(capcalera =>
          getComputedStyle(capcalera).whiteSpace === 'nowrap'), 'Les capçaleres haurien de mantenir-se en una línia.');
      });
      await prova('historial_ambFiltreSenseCoincidencies_mostraEstatBuit', () => {
        document.getElementById('history-subject').value = 'PA001';
        document.getElementById('history-subject').dispatchEvent(new Event('change'));
        comprovar(!document.getElementById('history-empty').hidden &&
          document.querySelectorAll('#history-rows tr').length === 0, 'Hauria de mostrar l’estat buit sense files antigues.');
      });
    } else if (pagina === 'docent') {
      await prova('docent_ambConfiguracioOpcional_desaPractiquesSenseActivarAleatorietat', () => {
        const aleatori = localStorage.getItem('campusrpa.aleatori.v1');
        document.getElementById('teacher-controls').checked = true;
        document.getElementById('teacher-avis').checked = true;
        document.getElementById('teacher-sessio').checked = true;
        document.getElementById('teacher-seconds').value = '10';
        document.getElementById('teacher-form').requestSubmit();
        const config = getConfigDidactica();
        comprovar(config.controls && config.avis && config.sessio && config.segons === 10,
          'El panel hauria de desar totes les pràctiques i la durada.');
        comprovar(localStorage.getItem('campusrpa.aleatori.v1') === aleatori,
          'El panel no hauria de modificar la preferència aleatòria.');
      });
      await prova('docent_ambConjuntReproduible_creaVuitMatriculesReals', () => {
        document.getElementById('teacher-seed').click();
        comprovar(new ServeiAcademic(magatzemDades).getMatricules().length === 8,
          'El conjunt docent hauria de contenir exactament vuit matrícules.');
        comprovar(new ServeiAcademic(magatzemDades).getCataleg().find(fila => fila.codi === 'PY001').places === 17,
          'El conjunt hauria de consumir vuit places.');
      });
    } else if (pagina === 'laboratori') {
      await prova('laboratori_ambIdentificadorsVariables_conservaSelectorsSemantics', () => {
        const mode = document.getElementById('lab-mode');
        mode.value = 'ordre';
        mode.dispatchEvent(new Event('change'));
        const abans = document.querySelector('#lab-form input[name="alumne"]').id;
        document.getElementById('lab-regenerate').click();
        comprovar(document.querySelector('#lab-form input[name="alumne"]').id !== abans,
          'Els identificadors haurien de canviar en regenerar.');
        document.querySelector('#lab-form input[name="alumne"]').value = 'ALU001';
        document.querySelector('#lab-form input[name="assignatura"]').value = 'Power Automate';
        document.getElementById('lab-form').requestSubmit();
        comprovar(document.getElementById('lab-status').textContent.includes('ALU001 · Power Automate'),
          'Els selectors semàntics haurien de permetre enviar el formulari.');
      });
    } else if (document.body.dataset.escenari === 'normal') {
      magatzemConfig.desar({ controls: true, avis: false, sessio: false, segons: 5 });
      magatzemDades.esborrar();
      invalidarConsulta();
      await prova('matricula_ambControlsDependents_rebutjaCondicionsNoAcceptadesIRegistraOpcionsValides', async () => {
        document.getElementById('student-input').value = 'ALU011';
        document.getElementById('subject-input').value = 'Power Automate';
        consultarSollicitud();
        await esperar(() => !enCurs);
        const modalitat = document.getElementById('enrollment-mode');
        formalitzarMatricula();
        comprovar(modalitat.getAttribute('aria-invalid') === 'true' &&
          document.getElementById('enrollment-terms').getAttribute('aria-invalid') === 'true' &&
          document.activeElement === modalitat && document.getElementById('note-error').hidden &&
          document.getElementById('enrollment-note').getAttribute('aria-invalid') !== 'true',
          'Hauria de marcar modalitat i condicions i enfocar la modalitat, no l’observació opcional.');
        modalitat.value = 'presencial';
        modalitat.dispatchEvent(new Event('change'));
        comprovar(document.getElementById('destination-label').textContent === 'Campus',
          'La modalitat presencial hauria de mostrar campus.');
        modalitat.value = 'online';
        modalitat.dispatchEvent(new Event('change'));
        comprovar(document.getElementById('destination-label').textContent === 'Franja horària' &&
          document.getElementById('enrollment-destination').value === '', 'Canviar modalitat hauria de reiniciar la destinació.');
        formalitzarMatricula();
        comprovar(document.getElementById('enrollment-destination').getAttribute('aria-invalid') === 'true' &&
          document.getElementById('enrollment-terms').getAttribute('aria-invalid') === 'true' &&
          modalitat.getAttribute('aria-invalid') === 'false' && document.getElementById('note-error').hidden &&
          document.activeElement.id === 'enrollment-destination', 'Hauria de marcar només destinació i condicions.');
        document.getElementById('enrollment-destination').value = 'Tarda';
        document.getElementById('enrollment-destination').dispatchEvent(new Event('change', { bubbles: true }));
        formalitzarMatricula();
        comprovar(document.getElementById('enrollment-destination').getAttribute('aria-invalid') === 'false' &&
          document.activeElement.id === 'enrollment-terms' && !document.getElementById('terms-error').hidden,
          'Només hauria de faltar acceptar les condicions.');
        document.getElementById('enrollment-terms').checked = true;
        document.getElementById('enrollment-terms').dispatchEvent(new Event('change', { bubbles: true }));
        comprovar(!document.querySelector('#enrollment-options [aria-invalid="true"]') &&
          document.getElementById('terms-error').hidden, 'Corregir els camps hauria de netejar els errors.');
        formalitzarMatricula();
        await esperar(() => !enCurs);
        const matricula = new ServeiAcademic(magatzemDades).getMatricules()[0];
        comprovar(matricula.opcions.modalitat === 'online' && matricula.opcions.destinacio === 'Tarda',
          'La matrícula hauria de conservar les opcions introduïdes.');
        comprovar(matricula.observacio === '', 'Hauria de permetre matricular sense observació.');
      });
      await prova('avis_ambPracticaActivada_bloquejaFinsAcceptacioINoEsRepeteix', () => {
        invalidarConsulta();
        magatzemConfig.desar({ controls: false, avis: true, sessio: false, segons: 5 });
        new MagatzemLocal('campusrpa.avis.v1').esborrar();
        iniciarPractiquesDidactiques();
        comprovar(document.getElementById('notice-dialog').open, 'L’avís hauria de ser modal.');
        document.getElementById('notice-dialog-button').click();
        iniciarPractiquesDidactiques();
        comprovar(!document.getElementById('notice-dialog'), 'L’avís acceptat no hauria de reaparèixer.');
      });
      await prova('sessio_ambCaducitat_exigeixRenovacioSenseMatricular', async () => {
        magatzemConfig.desar({ controls: false, avis: false, sessio: true, segons: 5 });
        new MagatzemLocal('campusrpa.sessio.v1').esborrar();
        document.getElementById('student-input').value = 'ALU012';
        document.getElementById('subject-input').value = 'Power Automate';
        consultarSollicitud();
        comprovar(document.getElementById('session-dialog').open && !document.getElementById('result-panel'),
          'La sessió caducada hauria d’impedir la consulta i obrir el diàleg.');
        document.getElementById('session-dialog-button').click();
        consultarSollicitud();
        await esperar(() => !enCurs);
        comprovar(document.getElementById('result-panel').dataset.estat === 'resposta',
          'La sessió renovada hauria de permetre consultar.');
        tancarModalResultat();
        new MagatzemLocal('campusrpa.sessio.v1').desar(Date.now() - 1);
        consultarSollicitud();
        comprovar(document.getElementById('session-dialog').open,
          'Una sessió expirada hauria de requerir una altra renovació.');
        document.getElementById('session-dialog-button').click();
        comprovar(new ServeiAcademic(magatzemDades).getMatricules().length === 1,
          'La renovació de sessió no hauria de registrar matrícules.');
      });
    } else {
      throw new Error('Obre la consulta normal, l’historial, el panel docent o el laboratori per executar aquestes proves.');
    }
  } finally {
    if (dadesAbans === null) magatzemDades.esborrar(); else magatzemDades.desar(dadesAbans);
    if (configAbans === null) magatzemConfig.esborrar(); else magatzemConfig.desar(configAbans);
    for (const [clau, dades] of altresDades) {
      if (dades === null) new MagatzemLocal(clau).esborrar(); else new MagatzemLocal(clau).desar(dades);
    }
    document.getElementById('notice-dialog')?.remove();
    document.getElementById('session-dialog')?.remove();
    if (typeof invalidarConsulta === 'function') { invalidarConsulta(); mostrarCataleg(); }
    document.getElementById('history-refresh')?.click();
  }
  return { total: resultats.length, correctes: resultats.filter(resultat => resultat.correcte).length, resultats };
}

/**
 * Verifica el diàleg «Desa com a», la cancel·lació i la descàrrega alternativa sense crear fitxers.
 * @returns {Promise<object>} Recompte i resultats de les proves del justificant.
 */
async function executarProvaDescarrega() {
  const resultats = [];
  const comprovar = (condicio, missatge) => { if (!condicio) throw new Error(missatge); };
  const prova = async (nom, accio) => {
    try { await accio(); resultats.push({ nom, correcte: true }); }
    catch (error) { console.error(`Ha fallat la prova ${nom}.`, error); resultats.push({ nom, correcte: false, error: error.message }); }
  };
  const servei = new ServeiAcademic();
  servei.formalitzar('ALU001', 'Automatització RPA', '<script>text de prova</script>');
  const matricula = servei.getMatricules()[0];
  const comprovarContingut = async blob => {
    const text = await blob.text();
    comprovar(text.includes('SENSE VALIDESA OFICIAL') && text.includes('RPA001') &&
      text.includes('<script>text de prova</script>') && blob.type.includes('text/plain'),
      'El contingut hauria de ser text pla, amb referència i sense execució de marcatge.');
  };

  await prova('descarregarJustificant_ambSelectorDisponible_desaAlFitxerTriat', async () => {
    let opcions = null;
    let escrit = null;
    let tancat = false;
    const selector = async parametres => {
      opcions = parametres;
      return { createWritable: async () => ({
        write: async contingut => { escrit = contingut; },
        close: async () => { tancat = true; }
      }) };
    };
    comprovar(await descarregarJustificant(matricula, selector) === 'desat', 'Hauria de retornar desat.');
    comprovar(opcions.suggestedName === 'Justificant-MAT-000001.txt' &&
      opcions.types[0].accept['text/plain'][0] === '.txt', 'Hauria de suggerir un nom segur de text.');
    comprovar(tancat, 'Hauria de tancar el fitxer.');
    await comprovarContingut(escrit);
  });
  await prova('descarregarJustificant_ambDialegCancellat_noDesaIRetornaCancellat', async () => {
    const selector = async () => { throw new DOMException('Cancel·lat', 'AbortError'); };
    comprovar(await descarregarJustificant(matricula, selector) === 'cancel·lat', 'Hauria de retornar cancel·lat.');
  });
  await prova('descarregarJustificant_ambErrorDelSelector_propagaError', async () => {
    const selector = async () => { throw new DOMException('Denegat', 'NotAllowedError'); };
    let rebutjat = false;
    try { await descarregarJustificant(matricula, selector); } catch (error) { rebutjat = error.name === 'NotAllowedError'; }
    comprovar(rebutjat, 'Hauria de propagar els errors que no són cancel·lacions.');
  });
  await prova('descarregarJustificant_senseSelector_descarregaAutomaticament', async () => {
    let enllac = null;
    const interceptar = esdeveniment => {
      if (esdeveniment.target instanceof HTMLAnchorElement && esdeveniment.target.download) {
        esdeveniment.preventDefault();
        enllac = { nom: esdeveniment.target.download, url: esdeveniment.target.href };
      }
    };
    document.addEventListener('click', interceptar, true);
    try {
      comprovar(await descarregarJustificant(matricula, null) === 'descarregat', 'Hauria de retornar descarregat.');
      comprovar(enllac && enllac.nom === 'Justificant-MAT-000001.txt' && enllac.url.startsWith('blob:'),
        'L’enllaç hauria de tenir un nom segur i un URL local de tipus Blob.');
      await comprovarContingut(await (await fetch(enllac.url)).blob());
    } finally {
      document.removeEventListener('click', interceptar, true);
    }
  });
  await prova('descarregarJustificantDirecte_ambMatriculaValida_iniciaDescarregaSenseDialeg', async () => {
    let nom = null;
    const interceptar = esdeveniment => {
      if (esdeveniment.target instanceof HTMLAnchorElement && esdeveniment.target.download) {
        esdeveniment.preventDefault();
        nom = esdeveniment.target.download;
      }
    };
    const estat = document.createElement('p');
    document.addEventListener('click', interceptar, true);
    try {
      await descarregarJustificantDirecte(matricula, estat);
      comprovar(nom === 'Justificant-MAT-000001.txt' && estat.textContent.includes('Descàrrega iniciada'),
        'Hauria de descarregar directament i informar de l’estat.');
    } finally {
      document.removeEventListener('click', interceptar, true);
    }
  });
  await prova('descarregarJustificant_ambReferenciaInvalida_rebutjaSenseObrirDialeg', async () => {
    let obert = false;
    let rebutjat = false;
    try {
      await descarregarJustificant({ ...matricula, referencia: '../x' }, async () => { obert = true; });
    } catch (error) { rebutjat = true; }
    comprovar(rebutjat && !obert, 'No hauria d’obrir el diàleg amb referències invàlides.');
  });
  return { total: resultats.length, correctes: resultats.filter(resultat => resultat.correcte).length, resultats };
}
