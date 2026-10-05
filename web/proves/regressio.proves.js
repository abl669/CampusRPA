/**
 * Executa proves unitàries del servei i proves d'integració sobre la pàgina oberta.
 * Carrega aquest fitxer com a script a web/index.html, només en un entorn de proves, i executa
 * executarProvesAcademiques(). Les dades compartides es reinicien abans i després de les proves.
 * @returns {Promise<object>} Recompte i resultats individuals de les proves.
 */
async function executarProvesAcademiques() {
  reiniciarDades();
  invalidarConsulta();
  const proves = [];
  const resultats = [];
  const afegirProva = (nom, tipus, accio) => proves.push({ nom, tipus, accio });
  const comprovar = (condicio, missatge) => {
    if (!condicio) throw new Error(missatge);
  };
  const esperar = retard => new Promise(resoldre => setTimeout(resoldre, retard));
  const camp = id => document.getElementById(id);
  const introduir = (id, valor) => {
    camp(id).value = valor;
    camp(id).dispatchEvent(new Event('input', { bubbles: true }));
  };
  const omplir = (alumne, assignatura) => {
    introduir('student-input', alumne);
    introduir('subject-input', assignatura);
  };
  const esperarOperacio = async () => {
    const inici = performance.now();
    while (camp('search-button').disabled) {
      if (performance.now() - inici > 3000) throw new Error("L'operació hauria d'acabar abans de tres segons.");
      await esperar(20);
    }
  };
  const consultar = async (alumne, assignatura) => {
    omplir(alumne, assignatura);
    camp('academic-form').requestSubmit();
    await esperarOperacio();
  };
  const formalitzar = async () => {
    camp('enrollment-section').requestSubmit();
    await esperarOperacio();
  };
  const placesCataleg = (servei, codi) => servei.getCataleg().find(assignatura => assignatura.codi === codi).places;

  afegirProva('normalitzar_ambAccentsCaixaIEspais_retornaClauCanonica', 'unitat', () => {
    comprovar(normalitzar('  AUTOMATITZACIÓ   RPA  ') === 'automatitzacio rpa', 'Hauria de normalitzar accents, caixa i espais.');
    comprovar(normalitzar('Gestio\u0301 de Processos') === 'gestio de processos', 'Hauria de normalitzar els accents descompostos.');
  });
  afegirProva('consultar_totesLesAssignatures_lesTrobaAmbISenseAccents', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const assignatura of servei.getCataleg()) {
      for (const nom of [assignatura.nom, normalitzar(assignatura.nom).toUpperCase()]) {
        const resultat = servei.consultar(' alu001 ', nom);
        comprovar(resultat.assignatura.codi === assignatura.codi, "Hauria de trobar l'assignatura canònica.");
        comprovar(!Object.keys(resultat.errors).length, 'No hi hauria errors de cerca.');
      }
    }
  });
  afegirProva('consultar_ambCampsBuits_retornaErrorsDeTotsElsCamps', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar(' ', ' ');
    comprovar(resultat.errors.alumne && resultat.errors.assignatura, 'Hauria de validar els dos camps obligatoris.');
    comprovar(!resultat.potMatricular, 'No hauria de permetre matricular amb camps buits.');
  });
  afegirProva('consultar_ambIdentificadorMalformat_retornaErrorDeFormat', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const identificador of ['ALU1', 'ALU0001', 'ALU 001', '<script>', 'constructor', '__proto__']) {
      const resultat = servei.consultar(identificador, 'Power Automate');
      comprovar(Boolean(resultat.errors.alumne), "Hauria de rebutjar l'identificador invàlid.");
      comprovar(!resultat.potMatricular, 'No hauria de permetre una matrícula invàlida.');
    }
  });
  afegirProva('consultar_ambAlumneInexistent_retornaAlumneNoTrobat', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU999', 'Power Automate');
    comprovar(resultat.errors.alumne === 'Alumne no trobat.', "Hauria de diferenciar l'alumne inexistent del format incorrecte.");
    comprovar(resultat.alumne === null, 'No hauria de retornar un alumne fictici.');
  });
  afegirProva('consultar_ambAssignaturaInexistent_retornaErrorSenseInventarDades', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU007', 'Assignatura Inexistent');
    comprovar(resultat.errors.assignatura === 'Assignatura no trobada.', "Hauria d'indicar que l'assignatura no existeix.");
    comprovar(resultat.assignatura === null && !resultat.potMatricular, 'No hauria de permetre matricular.');
  });
  afegirProva('consultar_ambNomMassaLlarg_retornaErrorDeLongitud', 'unitat', () => {
    comprovar(Boolean(new ServeiAcademic().consultar('ALU001', 'a'.repeat(101)).errors.assignatura),
      'Hauria de rebutjar un nom de més de 100 caràcters.');
  });
  afegirProva('consultar_ambExpedientBloquejat_impedeixLaMatricula', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU010', 'Power Automate');
    comprovar(!resultat.potMatricular && resultat.tipus === 'error', "Hauria de bloquejar l'expedient.");
    comprovar(resultat.assignatura.places === 15, 'Hauria de mostrar les places reals.');
  });
  afegirProva('consultar_ambZeroPlaces_impedeixLaMatricula', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU008', 'Bases de Dades');
    comprovar(!resultat.potMatricular && resultat.estatAssignatura === 'Sense places', 'Hauria de detectar les zero places.');
  });
  afegirProva('formalitzar_ambDadesValides_descomptaUnaPlacaIRetornaReferencia', 'unitat', () => {
    const servei = new ServeiAcademic();
    const resultat = servei.formalitzar('alu001', 'Automatitzacio RPA', '  Prova  ');
    comprovar(resultat.tipus === 'success' && resultat.matricula.referencia === 'MAT-000001',
      'Hauria de retornar una matrícula confirmada amb referència.');
    comprovar(resultat.matricula.observacio === 'Prova', "Hauria de desar l'observació sense espais perifèrics.");
    comprovar(placesCataleg(servei, 'RPA-101') === 9, 'Hauria de descomptar exactament una plaça.');
    comprovar(!resultat.potMatricular && resultat.estatAssignatura === 'Matriculada', 'Hauria de bloquejar una nova matrícula duplicada.');
  });
  afegirProva('formalitzar_ambMatriculaDuplicada_noDescomptaUnaSegonaPlaca', 'unitat', () => {
    const servei = new ServeiAcademic();
    servei.formalitzar('ALU001', 'Automatització RPA');
    const resultat = servei.formalitzar(' alu001 ', ' AUTOMATITZACIO   RPA ');
    comprovar(resultat.tipus === 'warning' && resultat.matricula.referencia === 'MAT-000001',
      'Hauria de retornar la matrícula existent, no crear-ne una altra.');
    comprovar(placesCataleg(servei, 'RPA-101') === 9, 'No hauria de descomptar places per duplicats.');
  });
  afegirProva('formalitzar_ambAlumneBloquejatOInexistent_noModificaPlaces', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const alumne of ['ALU010', 'ALU999', '']) {
      const resultat = servei.formalitzar(alumne, 'Power Automate');
      comprovar(resultat.tipus === 'error' && !resultat.matricula, 'No hauria de registrar una matrícula invàlida.');
    }
    comprovar(placesCataleg(servei, 'PA-201') === 15, 'Hauria de conservar totes les places.');
  });
  afegirProva('formalitzar_ambObservacioMassaLlarga_noModificaPlaces', 'unitat', () => {
    const servei = new ServeiAcademic();
    const resultat = servei.formalitzar('ALU001', 'Power Automate', 'x'.repeat(501));
    comprovar(Boolean(resultat.errors.observacio), "Hauria de validar la longitud de l'observació.");
    comprovar(!resultat.matricula && placesCataleg(servei, 'PA-201') === 15, 'No hauria de consumir cap plaça.');
    comprovar(servei.formalitzar('ALU001', 'Power Automate', 'x'.repeat(500)).tipus === 'success',
      'Hauria de permetre exactament 500 caràcters.');
  });
  afegirProva('formalitzar_ambPlacesEsgotades_revalidaINoRetornaPlacesNegatives', 'unitat', () => {
    const servei = new ServeiAcademic();
    const consultaAnterior = servei.consultar('ALU006', 'Automatització Web');
    comprovar(consultaAnterior.potMatricular, 'La consulta inicial hauria de tenir places.');
    for (let numero = 1; numero <= 5; numero += 1) {
      const resultat = servei.formalitzar(`ALU00${numero}`, 'Automatització Web');
      comprovar(resultat.tipus === 'success', 'Hauria de permetre ocupar cada plaça disponible.');
    }
    const resultat = servei.formalitzar('ALU006', 'Automatització Web');
    comprovar(!resultat.matricula && resultat.estatAssignatura === 'Sense places',
      'Hauria de revalidar les places encara que la consulta anterior fos vàlida.');
    comprovar(placesCataleg(servei, 'WEB-210') === 0, 'Les places no haurien de ser negatives.');
  });
  afegirProva('formalitzar_ambMatriculesDiferents_generaReferenciesUniques', 'unitat', () => {
    const servei = new ServeiAcademic();
    const referencies = [
      servei.formalitzar('ALU001', 'Power Automate').matricula.referencia,
      servei.formalitzar('ALU002', 'Power Automate').matricula.referencia,
      servei.formalitzar('ALU001', 'Gestió de Processos').matricula.referencia
    ];
    comprovar(new Set(referencies).size === 3, 'Hauria de generar referències úniques per a cada matrícula.');
  });
  afegirProva('getCatalegIMatricula_ambDadesRetornades_noPermetenModificarEstatIntern', 'unitat', () => {
    const servei = new ServeiAcademic();
    servei.getCataleg()[0].places = -100;
    const consulta = servei.consultar('ALU001', 'Automatització RPA');
    consulta.assignatura.places = -100;
    consulta.alumne.estat = 'Bloquejat';
    const matricula = servei.formalitzar('ALU001', 'Automatització RPA');
    matricula.matricula.referencia = 'REFERENCIA-MODIFICADA';
    const resultat = servei.consultar('ALU001', 'Automatització RPA');
    comprovar(resultat.assignatura.places === 9 && resultat.alumne.estat === 'Actiu',
      'Les còpies retornades no haurien de modificar les dades internes.');
    comprovar(resultat.matricula.referencia === 'MAT-000001', 'Hauria de conservar la referència original.');
    comprovar(placesCataleg(new ServeiAcademic(), 'RPA-101') === 10, 'Les simulacions haurien de ser independents.');
  });

  afegirProva('formulari_ambCampsBuits_mostraErrorsAccessiblesIFocus', 'integracio', async () => {
    await consultar('', '');
    comprovar(camp('student-input').getAttribute('aria-invalid') === 'true', "Hauria de marcar l'alumne invàlid.");
    comprovar(camp('subject-input').getAttribute('aria-invalid') === 'true', "Hauria de marcar l'assignatura invàlida.");
    comprovar(!camp('student-error').hidden && !camp('subject-error').hidden, 'Hauria de mostrar els errors dels dos camps.');
    comprovar(document.activeElement === camp('student-input'), 'Hauria de dirigir el focus al primer error.');
    comprovar(camp('enrollment-section').hidden, 'Hauria de mantenir la matrícula oculta.');
    comprovar(camp('result-subject-details').textContent === '—' && camp('result-subject-credits').textContent === '—',
      'Hauria de mostrar el codi i els crèdits absents sense dades anteriors.');
  });
  afegirProva('desplegableAssignatura_ambCatalegCarregat_mostraOpcioBuidaITotesLesAssignatures', 'integracio', () => {
    const opcions = Array.from(camp('subject-input').options, opcio => opcio.value);
    comprovar(camp('subject-input').tagName === 'SELECT', "L'assignatura hauria de ser un desplegable.");
    comprovar(opcions[0] === '' && camp('subject-input').value === '', 'Hauria de començar sense cap assignatura seleccionada.');
    comprovar(JSON.stringify(opcions.slice(1)) === JSON.stringify(serveiAcademic.getCataleg().map(assignatura => assignatura.nom)),
      'Hauria de mostrar exactament les assignatures del catàleg.');
  });
  afegirProva('desplegableAssignatura_ambValorFora_delCataleg_quedaSenseSeleccio', 'integracio', async () => {
    await consultar('ALU001', 'Assignatura Inexistent');
    comprovar(camp('subject-input').value === '', 'No hauria de permetre seleccionar un valor fora del catàleg.');
    comprovar(camp('subject-error').textContent === "Introdueix el nom de l'assignatura.", "Hauria d'exigir una assignatura.");
  });
  afegirProva('consulta_ambIdentificadorAmbEspaisIMinuscules_mostraDadesCanoniquesIMatricula', 'integracio', async () => {
    await consultar(' alu001 ', 'Automatització RPA');
    comprovar(camp('result-student').textContent === 'ALU001', 'Hauria de mostrar el codi normalitzat.');
    comprovar(camp('result-student-name').textContent === 'Ana García', "Hauria de mostrar el nom de l'alumne.");
    comprovar(camp('result-subject').textContent === 'Automatització RPA', 'Hauria de mostrar el nom canònic.');
    comprovar(camp('result-subject-details').textContent === 'RPA-101', 'Hauria de mostrar només el codi.');
    comprovar(camp('result-subject-credits').textContent === '6', 'Hauria de mostrar només els crèdits.');
    comprovar(camp('result-subject-details').closest('.row') !== camp('result-subject-credits').closest('.row'),
      'Hauria de mostrar el codi i els crèdits en files diferents.');
    comprovar(camp('result-seats').textContent === '10', 'Hauria de mostrar les places inicials.');
    comprovar(!camp('enrollment-section').hidden, 'Hauria de permetre formalitzar la matrícula.');
    comprovar(camp('search-button').textContent === 'Consultar sol·licitud', 'Hauria de restaurar el botó de consulta.');
  });
  afegirProva('consulta_ambCanviDeFocusSenseCanviDeDades_conservaResultat', 'integracio', async () => {
    camp('subject-input').dispatchEvent(new Event('change', { bubbles: true }));
    comprovar(!camp('result-panel').hidden && !camp('enrollment-section').hidden,
      'Un canvi de focus sense modificar dades no hauria de cancel·lar la consulta.');
  });
  afegirProva('consulta_ambEntradaModificada_invalidaResultatINetejaObservacio', 'integracio', async () => {
    introduir('enrollment-note', 'Observació anterior');
    introduir('student-input', 'ALU002');
    comprovar(camp('result-panel').hidden && camp('enrollment-section').hidden, "Hauria d'ocultar la consulta anterior.");
    comprovar(camp('enrollment-note').value === '', "Hauria de netejar l'observació anterior.");
  });
  afegirProva('consulta_ambCanviDurantEspera_noPublicaResultatObsolet', 'integracio', async () => {
    omplir('ALU001', 'Power Automate');
    camp('academic-form').requestSubmit();
    comprovar(camp('search-button').disabled, "Hauria de desactivar consultes repetides durant l'espera.");
    introduir('student-input', 'ALU002');
    await esperar(750);
    comprovar(camp('result-panel').hidden, 'No hauria de publicar la consulta cancel·lada.');
    comprovar(!camp('search-button').disabled, 'Hauria de recuperar el botó de consulta.');
  });
  afegirProva('consulta_ambCanviProgramaticINomesChange_invalidaLaPeticioPendent', 'integracio', async () => {
    omplir('ALU001', 'Power Automate');
    camp('academic-form').requestSubmit();
    camp('student-input').value = 'ALU003';
    camp('student-input').dispatchEvent(new Event('change', { bubbles: true }));
    await esperar(750);
    comprovar(camp('result-panel').hidden && !camp('search-button').disabled, 'Hauria de cancel·lar també els canvis de tipus change.');
  });
  afegirProva('consulta_ambExpedientBloquejat_impedeixMatriculaIMostraMotiu', 'integracio', async () => {
    await consultar('ALU010', 'Power Automate');
    comprovar(camp('result-student-status').textContent === 'Bloquejat', "Hauria de mostrar l'expedient bloquejat.");
    comprovar(camp('enrollment-section').hidden && camp('message').classList.contains('error'), "Hauria de bloquejar la matrícula amb un missatge d'error.");
  });
  afegirProva('consulta_ambZeroPlaces_mostraAvisIMatriculaOculta', 'integracio', async () => {
    await consultar('ALU008', 'Bases de Dades');
    comprovar(camp('result-seats').textContent === '0', 'Hauria de representar zero places, no un valor absent.');
    comprovar(camp('enrollment-section').hidden && camp('message').classList.contains('warning'), 'Hauria de mostrar un avís sense permetre matrícula.');
  });
  afegirProva('consulta_ambTextHTMLAlIdentificador_mostraTextSenseExecutarMarcatge', 'integracio', async () => {
    await consultar('<img src=x onerror="throw new Error()">', 'Power Automate');
    comprovar(camp('result-student').textContent.startsWith('<IMG'), "Hauria de mostrar l'identificador com a text.");
    comprovar(!camp('result-panel').querySelector('img'), "No hauria de crear elements a partir de les dades d'entrada.");
  });
  afegirProva('matricula_senseConsultaValida_noConsumeixPlaces', 'integracio', async () => {
    formalitzarMatricula();
    comprovar(camp('search-status').textContent.includes('Consulta una sol·licitud vàlida'), 'Hauria de requerir una consulta vàlida.');
    comprovar(placesCataleg(serveiAcademic, 'RPA-101') === 10, 'No hauria de consumir places sense consulta.');
  });
  afegirProva('matricula_ambDadesModificadesSenseEsdeveniment_exigeixNovaConsulta', 'integracio', async () => {
    await consultar('ALU001', 'Automatització RPA');
    camp('student-input').value = 'ALU002';
    formalitzarMatricula();
    comprovar(camp('result-panel').hidden && camp('search-status').textContent.includes('Les dades han canviat'),
      'Hauria de rebutjar dades diferents de la consulta vigent.');
    comprovar(placesCataleg(serveiAcademic, 'RPA-101') === 10, 'No hauria de consumir places amb dades modificades.');
  });
  afegirProva('matricula_ambObservacioMassaLlarga_mostraErrorSenseConsumirPlaca', 'integracio', async () => {
    await consultar('ALU001', 'Automatització RPA');
    introduir('enrollment-note', 'x'.repeat(501));
    await formalitzar();
    comprovar(!camp('note-error').hidden && camp('enrollment-note').getAttribute('aria-invalid') === 'true',
      "Hauria de mostrar l'error de longitud de l'observació.");
    comprovar(placesCataleg(serveiAcademic, 'RPA-101') === 10, 'No hauria de consumir places per una observació invàlida.');
  });
  afegirProva('matricula_ambCanviDurantEspera_cancellaLaConfirmacio', 'integracio', async () => {
    introduir('enrollment-note', 'Prova cancel·lada');
    camp('enrollment-section').requestSubmit();
    comprovar(camp('create-enrollment-button').disabled, 'Hauria de bloquejar una segona confirmació.');
    introduir('subject-input', 'Power Automate');
    await esperar(850);
    comprovar(placesCataleg(serveiAcademic, 'RPA-101') === 10, 'Una matrícula cancel·lada no hauria de consumir places.');
    comprovar(camp('result-panel').hidden, 'No hauria de mostrar una confirmació cancel·lada.');
  });
  afegirProva('matricula_ambDobleEnviament_registraUnaSolaMatriculaIActualitzaCataleg', 'integracio', async () => {
    await consultar('ALU001', 'Automatització RPA');
    introduir('enrollment-note', '<b>Observació de prova</b>');
    camp('enrollment-section').requestSubmit();
    camp('enrollment-section').requestSubmit();
    formalitzarMatricula();
    await esperarOperacio();
    comprovar(camp('result-seats').textContent === '9', 'Hauria de consumir exactament una plaça.');
    comprovar(camp('message').textContent.includes('MAT-000001'), 'Hauria de mostrar la referència de confirmació.');
    comprovar(camp('message').textContent.includes('<b>Observació de prova</b>') && !camp('message').querySelector('b'),
      "Hauria de mostrar l'observació com a text, sense interpretar HTML.");
    comprovar(camp('enrollment-section').hidden, 'Hauria de retirar el formulari després de confirmar.');
    comprovar(camp('subject-catalog').firstElementChild.textContent.includes('9 places'), 'Hauria de sincronitzar el catàleg amb les places.');
  });
  afegirProva('consulta_ambMatriculaJaConfirmada_mostraReferenciaIImpedeixDuplicat', 'integracio', async () => {
    await consultar('ALU001', 'Automatització RPA');
    comprovar(camp('result-course-status').textContent === 'Matriculada', 'Hauria de detectar una matrícula existent.');
    comprovar(camp('message').textContent.includes('MAT-000001') && camp('enrollment-section').hidden,
      'Hauria de mostrar la referència anterior i impedir duplicats.');
    comprovar(camp('result-seats').textContent === '9', 'No hauria de descomptar places en consultar una matrícula.');
  });
  afegirProva('casDeProva_ambResultatAnterior_ompleCampsIInvalidaResultat', 'integracio', () => {
    document.querySelector('.cas[data-alumne="ALU010"]').click();
    comprovar(camp('student-input').value === 'ALU010' && camp('subject-input').value === 'Power Automate',
      'Hauria de carregar les dades del cas seleccionat.');
    comprovar(camp('result-panel').hidden, 'Hauria de retirar el resultat anterior.');
  });
  afegirProva('matricula_ambPlacesEsgotadesDespresDeConsulta_mostraRebuigActualitzat', 'integracio', async () => {
    await consultar('ALU006', 'Automatització Web');
    camp('enrollment-section').requestSubmit();
    for (let numero = 1; numero <= 5; numero += 1) {
      serveiAcademic.formalitzar(`ALU00${numero}`, 'Automatització Web');
    }
    await esperarOperacio();
    comprovar(camp('result-seats').textContent === '0' && camp('result-course-status').textContent === 'Sense places',
      'Hauria de revalidar les places abans de confirmar.');
    comprovar(camp('enrollment-section').hidden && camp('message').classList.contains('warning'),
      'No hauria de mostrar una confirmació de matrícula sense places.');
  });
  afegirProva('matricula_ambErrorInesperat_mostraErrorIRestitueixControls', 'integracio', async () => {
    await consultar('ALU004', 'Power Automate');
    const metodeOriginal = serveiAcademic.formalitzar;
    try {
      serveiAcademic.formalitzar = () => { throw new Error('Error de prova controlat.'); };
      await formalitzar();
      comprovar(camp('message').classList.contains('error') && camp('message').textContent.includes("No s'ha pogut completar"),
        "Hauria de comunicar l'error de l'operació.");
      comprovar(!camp('search-button').disabled && camp('enrollment-section').hidden,
        "Hauria de restituir els controls després d'un error.");
      comprovar(camp('result-seats').textContent === '—', 'No hauria de presentar dades anteriors com si fossin actuals.');
      comprovar(placesCataleg(serveiAcademic, 'PA-201') === 15, 'No hauria de consumir places si no es registra la matrícula.');
    } finally {
      serveiAcademic.formalitzar = metodeOriginal;
    }
    await consultar('ALU004', 'Power Automate');
    comprovar(!camp('enrollment-section').hidden, "Hauria de permetre tornar a consultar després de l'error.");
  });

  for (const prova of proves) {
    try {
      await prova.accio();
      resultats.push({ nom: prova.nom, tipus: prova.tipus, correcte: true });
    } catch (error) {
      resultats.push({ nom: prova.nom, tipus: prova.tipus, correcte: false, error: error.message });
      console.error(`Ha fallat la prova ${prova.nom}:`, error);
    }
  }
  invalidarConsulta();
  reiniciarDades();
  return {
    total: resultats.length,
    correctes: resultats.filter(resultat => resultat.correcte).length,
    fallides: resultats.filter(resultat => !resultat.correcte).length,
    unitat: resultats.filter(resultat => resultat.tipus === 'unitat').length,
    integracio: resultats.filter(resultat => resultat.tipus === 'integracio').length,
    resultats
  };
}
