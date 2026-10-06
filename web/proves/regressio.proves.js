/**
 * Executa proves unitàries del servei i proves d'integració sobre la pàgina oberta.
 * Carrega aquest fitxer com a script a web/Matricula.html, només en un entorn de proves, i executa
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
  const resultatObert = () => camp('result-panel')?.hasAttribute('open') === true;
  const esOcult = id => !camp(id) || camp(id).hidden;
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
  const ocuparPlacesWeb = servei => {
    const disponibles = placesCataleg(servei, 'WEB001');
    const candidats = Array.from(alumnes).filter(([codi, alumne]) => codi !== 'ALU016' && alumne.estat === 'Actiu');
    comprovar(candidats.length >= disponibles, 'Hi hauria prou alumnes actius per ocupar les places.');
    for (const [codi] of candidats.slice(0, disponibles)) {
      comprovar(servei.formalitzar(codi, 'Automatització Web').tipus === 'success',
        'Hauria de permetre ocupar cada plaça disponible.');
    }
  };

  afegirProva('normalitzar_ambAccentsCaixaIEspais_retornaClauCanonica', 'unitat', () => {
    comprovar(normalitzar('  AUTOMATITZACIÓ   RPA  ') === 'automatitzacio rpa', 'Hauria de normalitzar accents, caixa i espais.');
    comprovar(normalitzar('Gestio\u0301 de Processos') === 'gestio de processos', 'Hauria de normalitzar els accents descompostos.');
  });
  afegirProva('consultar_totesLesAssignatures_lesTrobaAmbISenseAccents', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const assignatura of servei.getCataleg()) {
      for (const nom of [assignatura.nom, normalitzar(assignatura.nom).toUpperCase()]) {
        const resultat = servei.consultar(' alu011 ', nom);
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
    const resultat = new ServeiAcademic().consultar('ALU017', 'Assignatura Inexistent');
    comprovar(resultat.errors.assignatura === 'Assignatura no trobada.', "Hauria d'indicar que l'assignatura no existeix.");
    comprovar(resultat.assignatura === null && !resultat.potMatricular, 'No hauria de permetre matricular.');
  });
  afegirProva('consultar_ambNomMassaLlarg_retornaErrorDeLongitud', 'unitat', () => {
    comprovar(Boolean(new ServeiAcademic().consultar('ALU011', 'a'.repeat(101)).errors.assignatura),
      'Hauria de rebutjar un nom de més de 100 caràcters.');
  });
  afegirProva('consultar_ambExpedientBloquejat_impedeixLaMatricula', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU020', 'Power Automate');
    comprovar(!resultat.potMatricular && resultat.tipus === 'error', "Hauria de bloquejar l'expedient.");
    comprovar(resultat.assignatura.places === 15, 'Hauria de mostrar les places reals.');
  });
  afegirProva('consultar_ambZeroPlaces_impedeixLaMatricula', 'unitat', () => {
    const resultat = new ServeiAcademic().consultar('ALU018', 'Bases de dades');
    comprovar(!resultat.potMatricular && resultat.estatAssignatura === 'Sense places', 'Hauria de detectar les zero places.');
  });
  afegirProva('formalitzar_ambDadesValides_descomptaUnaPlacaIRetornaReferencia', 'unitat', () => {
    const servei = new ServeiAcademic();
    const resultat = servei.formalitzar('alu011', 'Automatitzacio RPA', '  Prova  ');
    comprovar(resultat.tipus === 'success' && resultat.matricula.referencia === 'MAT-000001',
      'Hauria de retornar una matrícula confirmada amb referència.');
    comprovar(resultat.matricula.observacio === 'Prova', "Hauria de desar l'observació sense espais perifèrics.");
    comprovar(placesCataleg(servei, 'RPA001') === 19, 'Hauria de descomptar exactament una plaça.');
    comprovar(!resultat.potMatricular && resultat.estatAssignatura === 'Matriculada', 'Hauria de bloquejar una nova matrícula duplicada.');
  });
  afegirProva('formalitzar_ambMatriculaDuplicada_noDescomptaUnaSegonaPlaca', 'unitat', () => {
    const servei = new ServeiAcademic();
    servei.formalitzar('ALU011', 'Automatització RPA');
    const resultat = servei.formalitzar(' alu011 ', ' AUTOMATITZACIO   RPA ');
    comprovar(resultat.tipus === 'warning' && resultat.matricula.referencia === 'MAT-000001',
      'Hauria de retornar la matrícula existent, no crear-ne una altra.');
    comprovar(placesCataleg(servei, 'RPA001') === 19, 'No hauria de descomptar places per duplicats.');
  });
  afegirProva('formalitzar_ambAlumneBloquejatOInexistent_noModificaPlaces', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const alumne of ['ALU020', 'ALU999', '']) {
      const resultat = servei.formalitzar(alumne, 'Power Automate');
      comprovar(resultat.tipus === 'error' && !resultat.matricula, 'No hauria de registrar una matrícula invàlida.');
    }
    comprovar(placesCataleg(servei, 'PA001') === 15, 'Hauria de conservar totes les places.');
  });
  afegirProva('formalitzar_ambObservacioMassaLlarga_noModificaPlaces', 'unitat', () => {
    const servei = new ServeiAcademic();
    const resultat = servei.formalitzar('ALU011', 'Power Automate', 'x'.repeat(501));
    comprovar(Boolean(resultat.errors.observacio), "Hauria de validar la longitud de l'observació.");
    comprovar(!resultat.matricula && placesCataleg(servei, 'PA001') === 15, 'No hauria de consumir cap plaça.');
    comprovar(servei.formalitzar('ALU011', 'Power Automate', 'x'.repeat(500)).tipus === 'success',
      'Hauria de permetre exactament 500 caràcters.');
  });
  afegirProva('formalitzar_ambPlacesEsgotades_revalidaINoRetornaPlacesNegatives', 'unitat', () => {
    const servei = new ServeiAcademic();
    const consultaAnterior = servei.consultar('ALU016', 'Automatització Web');
    comprovar(consultaAnterior.potMatricular, 'La consulta inicial hauria de tenir places.');
    ocuparPlacesWeb(servei);
    const resultat = servei.formalitzar('ALU016', 'Automatització Web');
    comprovar(!resultat.matricula && resultat.estatAssignatura === 'Sense places',
      'Hauria de revalidar les places encara que la consulta anterior fos vàlida.');
    comprovar(placesCataleg(servei, 'WEB001') === 0, 'Les places no haurien de ser negatives.');
  });
  afegirProva('formalitzar_ambMatriculesDiferents_generaReferenciesUniques', 'unitat', () => {
    const servei = new ServeiAcademic();
    const referencies = [
      servei.formalitzar('ALU011', 'Power Automate').matricula.referencia,
      servei.formalitzar('ALU012', 'Power Automate').matricula.referencia,
      servei.formalitzar('ALU011', 'Gestió de Processos').matricula.referencia
    ];
    comprovar(new Set(referencies).size === 3, 'Hauria de generar referències úniques per a cada matrícula.');
  });
  afegirProva('getCatalegIMatricula_ambDadesRetornades_noPermetenModificarEstatIntern', 'unitat', () => {
    const servei = new ServeiAcademic();
    servei.getCataleg()[0].places = -100;
    const consulta = servei.consultar('ALU011', 'Automatització RPA');
    consulta.assignatura.places = -100;
    consulta.alumne.estat = 'Bloquejat';
    const matricula = servei.formalitzar('ALU011', 'Automatització RPA');
    matricula.matricula.referencia = 'REFERENCIA-MODIFICADA';
    const resultat = servei.consultar('ALU011', 'Automatització RPA');
    comprovar(resultat.assignatura.places === 19 && resultat.alumne.estat === 'Actiu',
      'Les còpies retornades no haurien de modificar les dades internes.');
    comprovar(resultat.matricula.referencia === 'MAT-000001', 'Hauria de conservar la referència original.');
    comprovar(placesCataleg(new ServeiAcademic(), 'RPA001') === 20, 'Les simulacions haurien de ser independents.');
  });

  afegirProva('formulari_ambCampsBuits_mostraErrorsAccessiblesIFocus', 'integracio', async () => {
    await consultar('', '');
    comprovar(camp('student-input').getAttribute('aria-invalid') === 'true', "Hauria de marcar l'alumne invàlid.");
    comprovar(camp('subject-input').getAttribute('aria-invalid') === 'true', "Hauria de marcar l'assignatura invàlida.");
    comprovar(!camp('student-error').hidden && !camp('subject-error').hidden, 'Hauria de mostrar els errors dels dos camps.');
    comprovar(document.activeElement === camp('result-title') && resultatObert(),
      'Hauria de dirigir el focus al resultat dins del modal.');
    comprovar(esOcult('enrollment-section'), 'Hauria de mantenir la matrícula oculta.');
    comprovar(camp('result-subject-details').textContent === '—' && camp('result-subject-credits').textContent === '—',
      'Hauria de mostrar el codi i els crèdits absents sense dades anteriors.');
  });
  afegirProva('desplegableAssignatura_ambCatalegCarregat_mostraOpcioBuidaITotesLesAssignatures', 'integracio', () => {
    const opcions = Array.from(camp('subject-input').options, opcio => opcio.value);
    comprovar(camp('subject-input').tagName === 'SELECT', "L'assignatura hauria de ser un desplegable.");
    comprovar(opcions[0] === '' && camp('subject-input').value === '', 'Hauria de començar sense cap assignatura seleccionada.');
    const cataleg = serveiAcademic.getCataleg().map(assignatura => assignatura.nom);
    comprovar(JSON.stringify(opcions.slice(1)) === JSON.stringify([...cataleg, 'Assignatura Inexistent']),
      'Hauria de mostrar les assignatures del catàleg en ordre.');
    comprovar(opcions.at(-1) === 'Assignatura Inexistent',
      "Hauria de permetre consultar el cas invàlid de l'Excel sense afegir-lo al catàleg.");
  });
  afegirProva('desplegableAssignatura_ambValorFora_delCataleg_quedaSenseSeleccio', 'integracio', async () => {
    await consultar('ALU011', 'Assignatura fora del catàleg');
    comprovar(camp('subject-input').value === '', 'No hauria de permetre seleccionar un valor fora del catàleg.');
    comprovar(camp('subject-error').textContent === "Introdueix el nom de l'assignatura.", "Hauria d'exigir una assignatura.");
  });
  afegirProva('consulta_ambIdentificadorAmbEspaisIMinuscules_mostraDadesCanoniquesIMatricula', 'integracio', async () => {
    await consultar(' alu011 ', 'Automatització RPA');
    comprovar(camp('result-student').textContent === 'ALU011', 'Hauria de mostrar el codi normalitzat.');
    comprovar(camp('result-student-name').textContent === 'Ana García', "Hauria de mostrar el nom de l'alumne.");
    comprovar(camp('result-subject').textContent === 'Automatització RPA', 'Hauria de mostrar el nom canònic.');
    comprovar(camp('result-subject-details').textContent === 'RPA001', 'Hauria de mostrar només el codi.');
    comprovar(camp('result-subject-credits').textContent === '6', 'Hauria de mostrar només els crèdits.');
    comprovar(camp('result-subject-details').closest('.row') !== camp('result-subject-credits').closest('.row'),
      'Hauria de mostrar el codi i els crèdits en files diferents.');
    comprovar(camp('result-seats').textContent === '20', 'Hauria de mostrar les places inicials.');
    comprovar(!esOcult('enrollment-section'), 'Hauria de permetre formalitzar la matrícula.');
    comprovar(camp('search-button').textContent === 'Consultar sol·licitud', 'Hauria de restaurar el botó de consulta.');
  });
  afegirProva('consulta_ambCanviDeFocusSenseCanviDeDades_conservaResultat', 'integracio', async () => {
    camp('subject-input').dispatchEvent(new Event('change', { bubbles: true }));
    comprovar(!esOcult('result-panel') && !esOcult('enrollment-section'),
      'Un canvi de focus sense modificar dades no hauria de cancel·lar la consulta.');
  });
  afegirProva('consulta_ambEntradaModificada_invalidaResultatINetejaObservacio', 'integracio', async () => {
    introduir('enrollment-note', 'Observació anterior');
    introduir('student-input', 'ALU012');
    comprovar(esOcult('result-panel') && esOcult('enrollment-section'), "Hauria d'ocultar la consulta anterior.");
    comprovar(!camp('enrollment-note'), "Hauria d'eliminar l'observació anterior juntament amb el modal.");
  });
  afegirProva('consulta_ambCanviDurantEspera_noPublicaResultatObsolet', 'integracio', async () => {
    omplir('ALU011', 'Power Automate');
    camp('academic-form').requestSubmit();
    comprovar(camp('search-button').disabled, "Hauria de desactivar consultes repetides durant l'espera.");
    introduir('student-input', 'ALU012');
    await esperar(750);
    comprovar(esOcult('result-panel'), 'No hauria de publicar la consulta cancel·lada.');
    comprovar(!camp('search-button').disabled, 'Hauria de recuperar el botó de consulta.');
  });
  afegirProva('consulta_ambCanviProgramaticINomesChange_invalidaLaPeticioPendent', 'integracio', async () => {
    omplir('ALU011', 'Power Automate');
    camp('academic-form').requestSubmit();
    camp('student-input').value = 'ALU013';
    camp('student-input').dispatchEvent(new Event('change', { bubbles: true }));
    await esperar(750);
    comprovar(esOcult('result-panel') && !camp('search-button').disabled, 'Hauria de cancel·lar també els canvis de tipus change.');
  });
  afegirProva('consulta_ambExpedientBloquejat_impedeixMatriculaIMostraMotiu', 'integracio', async () => {
    await consultar('ALU020', 'Power Automate');
    comprovar(camp('result-student-status').textContent === 'Bloquejat', "Hauria de mostrar l'expedient bloquejat.");
    comprovar(esOcult('enrollment-section') && camp('message').classList.contains('error'), "Hauria de bloquejar la matrícula amb un missatge d'error.");
  });
  afegirProva('consulta_ambZeroPlaces_mostraAvisIMatriculaOculta', 'integracio', async () => {
    await consultar('ALU018', 'Bases de dades');
    comprovar(camp('result-seats').textContent === '0', 'Hauria de representar zero places, no un valor absent.');
    comprovar(esOcult('enrollment-section') && camp('message').classList.contains('warning'), 'Hauria de mostrar un avís sense permetre matrícula.');
  });
  afegirProva('consulta_ambTextHTMLAlIdentificador_mostraTextSenseExecutarMarcatge', 'integracio', async () => {
    await consultar('<img src=x onerror="throw new Error()">', 'Power Automate');
    comprovar(camp('result-student').textContent.startsWith('<IMG'), "Hauria de mostrar l'identificador com a text.");
    comprovar(!camp('result-panel').querySelector('img'), "No hauria de crear elements a partir de les dades d'entrada.");
  });
  afegirProva('matricula_senseConsultaValida_noConsumeixPlaces', 'integracio', async () => {
    formalitzarMatricula();
    comprovar(camp('search-status').textContent.includes('Consulta una sol·licitud vàlida'), 'Hauria de requerir una consulta vàlida.');
    comprovar(placesCataleg(serveiAcademic, 'RPA001') === 20, 'No hauria de consumir places sense consulta.');
  });
  afegirProva('matricula_ambDadesModificadesSenseEsdeveniment_exigeixNovaConsulta', 'integracio', async () => {
    await consultar('ALU011', 'Automatització RPA');
    camp('student-input').value = 'ALU012';
    formalitzarMatricula();
    comprovar(esOcult('result-panel') && camp('search-status').textContent.includes('Les dades han canviat'),
      'Hauria de rebutjar dades diferents de la consulta vigent.');
    comprovar(placesCataleg(serveiAcademic, 'RPA001') === 20, 'No hauria de consumir places amb dades modificades.');
  });
  afegirProva('matricula_ambObservacioMassaLlarga_mostraErrorSenseConsumirPlaca', 'integracio', async () => {
    await consultar('ALU011', 'Automatització RPA');
    introduir('enrollment-note', 'x'.repeat(501));
    await formalitzar();
    comprovar(!camp('note-error').hidden && camp('enrollment-note').getAttribute('aria-invalid') === 'true',
      "Hauria de mostrar l'error de longitud de l'observació.");
    comprovar(placesCataleg(serveiAcademic, 'RPA001') === 20, 'No hauria de consumir places per una observació invàlida.');
  });
  afegirProva('matricula_ambCanviDurantEspera_cancellaLaConfirmacio', 'integracio', async () => {
    introduir('enrollment-note', 'Prova cancel·lada');
    camp('enrollment-section').requestSubmit();
    comprovar(camp('create-enrollment-button').disabled, 'Hauria de bloquejar una segona confirmació.');
    introduir('subject-input', 'Power Automate');
    await esperar(850);
    comprovar(placesCataleg(serveiAcademic, 'RPA001') === 20, 'Una matrícula cancel·lada no hauria de consumir places.');
    comprovar(esOcult('result-panel'), 'No hauria de mostrar una confirmació cancel·lada.');
  });
  afegirProva('matricula_ambDobleEnviament_registraUnaSolaMatriculaIActualitzaCataleg', 'integracio', async () => {
    await consultar('ALU011', 'Automatització RPA');
    introduir('enrollment-note', '<b>Observació de prova</b>');
    camp('enrollment-section').requestSubmit();
    camp('enrollment-section').requestSubmit();
    formalitzarMatricula();
    await esperarOperacio();
    comprovar(camp('result-seats').textContent === '19', 'Hauria de consumir exactament una plaça.');
    comprovar(camp('message').textContent.includes('MAT-000001'), 'Hauria de mostrar la referència de confirmació.');
    comprovar(camp('message').textContent.includes('<b>Observació de prova</b>') && !camp('message').querySelector('b'),
      "Hauria de mostrar l'observació com a text, sense interpretar HTML.");
    comprovar(esOcult('enrollment-section'), 'Hauria de retirar el formulari després de confirmar.');
    comprovar(Array.from(camp('subject-catalog').children).some(fila =>
      fila.textContent.includes('RPA001') && fila.textContent.includes('19 places')),
      'Hauria de sincronitzar el catàleg amb les places.');
  });
  afegirProva('consulta_ambMatriculaJaConfirmada_mostraReferenciaIImpedeixDuplicat', 'integracio', async () => {
    await consultar('ALU011', 'Automatització RPA');
    comprovar(camp('result-course-status').textContent === 'Matriculada', 'Hauria de detectar una matrícula existent.');
    comprovar(camp('message').textContent.includes('MAT-000001') && esOcult('enrollment-section'),
      'Hauria de mostrar la referència anterior i impedir duplicats.');
    comprovar(camp('result-seats').textContent === '19', 'No hauria de descomptar places en consultar una matrícula.');
  });
  afegirProva('casDeProva_ambResultatAnterior_ompleCampsIInvalidaResultat', 'integracio', () => {
    document.querySelector('.cas[data-alumne="ALU020"]').click();
    comprovar(camp('student-input').value === 'ALU020' && camp('subject-input').value === 'Power Automate',
      'Hauria de carregar les dades del cas seleccionat.');
    comprovar(esOcult('result-panel'), 'Hauria de retirar el resultat anterior.');
  });
  afegirProva('matricula_ambPlacesEsgotadesDespresDeConsulta_mostraRebuigActualitzat', 'integracio', async () => {
    await consultar('ALU016', 'Automatització Web');
    camp('enrollment-section').requestSubmit();
    ocuparPlacesWeb(serveiAcademic);
    await esperarOperacio();
    comprovar(camp('result-seats').textContent === '0' && camp('result-course-status').textContent === 'Sense places',
      'Hauria de revalidar les places abans de confirmar.');
    comprovar(esOcult('enrollment-section') && camp('message').classList.contains('warning'),
      'No hauria de mostrar una confirmació de matrícula sense places.');
  });
  afegirProva('matricula_ambErrorInesperat_mostraErrorIRestitueixControls', 'integracio', async () => {
    await consultar('ALU014', 'Power Automate');
    const metodeOriginal = serveiAcademic.formalitzar;
    try {
      serveiAcademic.formalitzar = () => { throw new Error('Error de prova controlat.'); };
      await formalitzar();
      comprovar(camp('message').classList.contains('error') && camp('message').textContent.includes("No s'ha pogut completar"),
        "Hauria de comunicar l'error de l'operació.");
      comprovar(!camp('search-button').disabled && esOcult('enrollment-section'),
        "Hauria de restituir els controls després d'un error.");
      comprovar(camp('result-seats').textContent === '—', 'No hauria de presentar dades anteriors com si fossin actuals.');
      comprovar(placesCataleg(serveiAcademic, 'PA001') === 15, 'No hauria de consumir places si no es registra la matrícula.');
    } finally {
      serveiAcademic.formalitzar = metodeOriginal;
    }
    await consultar('ALU014', 'Power Automate');
    comprovar(!esOcult('enrollment-section'), "Hauria de permetre tornar a consultar després de l'error.");
  });

  const filesExcel = [
    ['SOL001', 'ALU001', 'Anna Ferrer', 'Automatització RPA', 6, 'anna.ferrer@campusrpa.test', 'Actiu'],
    ['SOL002', 'ALU002', 'Pau Vidal', 'Power Automate', 12, 'pau.vidal@campusrpa.test', 'Actiu'],
    ['SOL003', 'ALU003', 'Laia Serra', 'Bases de dades', 18, 'laia.serra@campusrpa.test', 'Actiu'],
    ['SOL004', 'ALU004', 'Marc Torres', 'Arquitectura de sistemes', 30, 'marc.torres@campusrpa.test', 'Actiu'],
    ['SOL005', 'ALU005', 'Núria Costa', 'Programació Python', 6, 'nuria.costa@campusrpa.test', 'Actiu'],
    ['SOL006', 'ALU006', 'Joan Riera', 'Automatització Web', 0, 'joan.riera@campusrpa.test', 'Actiu'],
    ['SOL007', 'ALU007', 'Clara Bosch', 'Assignatura Inexistent', 6, 'clara.bosch@campusrpa.test', 'Actiu'],
    ['SOL008', 'ALU008', 'Enric Pons', 'Bases de dades', 6, 'enric.pons@campusrpa.test', 'Actiu'],
    ['SOL009', 'ALU009', 'Marta Soler', 'Python avançat', 12, 'marta.soler@campusrpa.test', 'Actiu'],
    ['SOL010', 'ALU010', 'Toni Mir', 'Power Automate', 6, 'toni.mir@campusrpa.test', 'Bloquejat']
  ];
  afegirProva('consultar_ambFilesExcel_conservaNomsCodisCorreuICreditsSollicitats', 'unitat', () => {
    const servei = new ServeiAcademic();
    comprovar(SOLLICITUDS_EXCEL.length === filesExcel.length, "Hauria de conservar les deu sol·licituds de l'Excel.");
    for (const [identificador, codi, nom, assignatura, credits, email, estat] of filesExcel) {
      const resultat = servei.consultar(codi, assignatura);
      comprovar(resultat.alumne.nom === nom && resultat.alumne.email === email && resultat.alumne.estat === estat,
        `Hauria de conservar les dades de ${codi}.`);
      comprovar(resultat.sollicitud.identificador === identificador && resultat.sollicitud.credits === credits,
        `Hauria de conservar els crèdits sol·licitats de ${identificador}, inclòs el zero.`);
    }
    comprovar(servei.consultar('ALU004', 'Power Automate').sollicitud === null,
      "No hauria d'atribuir una sol·licitud a una assignatura diferent.");
  });
  afegirProva('getCataleg_ambDadesExcel_conservaOrdreCodisPlacesCreditsIEstat', 'unitat', () => {
    const esperades = [
      ['RPA001', 'Automatització RPA', 6, 20, 'Activa'],
      ['PA001', 'Power Automate', 12, 15, 'Activa'],
      ['BDD001', 'Bases de dades', 6, 0, 'Activa'],
      ['SYS001', 'Arquitectura de sistemes', 6, 8, 'Activa'],
      ['PY001', 'Programació Python', 6, 25, 'Activa'],
      ['WEB001', 'Automatització Web', 6, 12, 'Activa'],
      ['PYA001', 'Python avançat', 12, 5, 'Inactiva']
    ];
    const cataleg = new ServeiAcademic().getCataleg();
    comprovar(JSON.stringify(cataleg.slice(0, 7).map(assignatura =>
      [assignatura.codi, assignatura.nom, assignatura.credits, assignatura.places, assignatura.estat])) === JSON.stringify(esperades),
      "Hauria de reproduir exactament el catàleg de l'Excel.");
    comprovar(cataleg.length === 8 && alumnes.size === 20 && cataleg.at(-1).nom === 'Gestió de Processos',
      'Hauria de conservar tots els alumnes i un únic catàleg compartit, sense duplicats.');
    comprovar(new Set(cataleg.map(assignatura => normalitzar(assignatura.nom))).size === cataleg.length,
      'No hi hauria noms ambigus al desplegable.');
  });
  afegirProva('formalitzar_ambAssignaturaInactivaInexistentSensePlacesOExpedientBloquejat_noRegistraMatricula', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const codi of ['ALU003', 'ALU007', 'ALU008', 'ALU009', 'ALU010']) {
      const sollicitud = SOLLICITUDS_EXCEL.find(fila => fila.codiAlumne === codi);
      const resultat = servei.formalitzar(codi, sollicitud.assignatura);
      comprovar(!resultat.matricula && !resultat.potMatricular, `Hauria de rebutjar ${sollicitud.identificador}.`);
    }
    comprovar(servei.consultar('ALU009', 'Python avançat').estatAssignatura === 'Inactiva',
      "Hauria d'indicar la inactivitat encara que hi hagi places.");
    comprovar(placesCataleg(servei, 'PYA001') === 5, 'No hauria de consumir places inactives.');
    comprovar(servei.consultar('ALU007', 'Assignatura Inexistent').errors.assignatura === 'Assignatura no trobada.',
      "No hauria d'inventar una assignatura per al cas negatiu de l'Excel.");
  });
  afegirProva('formalitzar_ambDadesExcel_conservaMatriculaEntrePaginesSenseDuplicar', 'unitat', () => {
    const magatzem = new MagatzemMemoria();
    const resultat = new ServeiAcademic(magatzem).formalitzar('ALU005', 'Programació Python');
    comprovar(resultat.tipus === 'success' && resultat.assignatura.places === 24,
      'Hauria de matricular amb el codi PY001 i descomptar una plaça.');
    const segon = new ServeiAcademic(magatzem).formalitzar('ALU005', 'Programació Python');
    comprovar(segon.matricula.referencia === resultat.matricula.referencia && segon.assignatura.places === 24,
      'Hauria de recuperar la mateixa matrícula sense consumir més places.');
    comprovar(segon.matricula.codiAssignatura === 'PY001', "Hauria de desar el codi de l'Excel.");
  });
  afegirProva('formulari_ambAlumnesExcel_mostraNomsICorreusSenseFilesDeSollicitud', 'integracio', async () => {
    comprovar(!camp('result-request') && !camp('result-request-credits'),
      "No hauria de mostrar les files de sol·licitud ni crèdits sol·licitats de l'Excel.");
    for (const [identificador, codi, nom, assignatura, , email] of filesExcel) {
      await consultar(codi, assignatura);
      comprovar(camp('result-student-name').textContent === nom && camp('result-student-email').textContent === email,
        `Hauria de mostrar el nom i el correu de ${identificador}.`);
      if (codi === 'ALU007') {
        comprovar(camp('subject-error').textContent === 'Assignatura no trobada.' && esOcult('enrollment-section'),
          "Hauria de poder seleccionar el cas inexistent però impedir-ne la matrícula.");
        mostrarCataleg();
        comprovar(camp('subject-input').value === 'Assignatura Inexistent',
          "Hauria de conservar la selecció del cas negatiu en actualitzar el catàleg.");
      }
      if (codi === 'ALU009') {
        comprovar(camp('result-course-status').textContent === 'Inactiva' && esOcult('enrollment-section'),
          'Hauria de mostrar la inactivitat i impedir la matrícula.');
      }
    }
    await consultar('ALU004', 'Arquitectura de sistemes');
    comprovar(camp('result-subject-credits').textContent === '6',
      'Hauria de mostrar únicament els crèdits del catàleg.');
  });
  afegirProva('consultar_ambTotsElsAlumnes_retornaCorreuAmbPatroDelCampus', 'unitat', () => {
    const servei = new ServeiAcademic();
    for (const [codi, alumne] of alumnes) {
      const esperat = normalitzar(alumne.nom).replace(/\s+/g, '.') + '@campusrpa.test';
      comprovar(servei.consultar(codi, 'Power Automate').alumne.email === esperat,
        `El correu de ${codi} hauria de seguir el patró nom.cognom sense accents.`);
    }
  });
  afegirProva('formalitzar_ambAlumnesDeDiferentsOrigens_comparteixPlacesICodis', 'unitat', () => {
    const servei = new ServeiAcademic();
    servei.formalitzar('ALU001', 'Automatització RPA');
    const resultat = servei.formalitzar('ALU011', 'Automatització RPA');
    comprovar(resultat.assignatura.codi === 'RPA001' && resultat.assignatura.places === 18,
      'Els alumnes dels dos orígens haurien de consumir places de la mateixa assignatura.');
    comprovar(servei.consultar('ALU001', 'Automatització RPA').assignatura.places === 18,
      'Tots els alumnes haurien de veure les mateixes places disponibles.');
  });
  afegirProva('serveiAcademic_ambEstatAnterior_conservaCodisActualsIDescartaAssignaturesRetirades', 'unitat', () => {
    const magatzem = new MagatzemMemoria();
    magatzem.desar({
      places: { RPA001: 19, 'RPA-101': 9 },
      matricules: [
        { referencia: 'MAT-000001', codiAlumne: 'ALU001', codiAssignatura: 'RPA001', observacio: '' },
        { referencia: 'MAT-000002', codiAlumne: 'ALU011', codiAssignatura: 'RPA-101', observacio: '' }
      ]
    });
    const servei = new ServeiAcademic(magatzem);
    comprovar(servei.consultar('ALU001', 'Automatització RPA').matricula.referencia === 'MAT-000001',
      'Hauria de conservar les matrícules del catàleg actual.');
    const anterior = servei.consultar('ALU011', 'Automatització RPA');
    comprovar(anterior.potMatricular && anterior.matricula === null && anterior.assignatura.places === 19,
      'No hauria de convertir una matrícula retirada en una del catàleg compartit.');
  });
  afegirProva('casosDeProva_ambCasosRepresentatius_cobreixSituacionsDiferentsSenseCodisSol', 'integracio', async () => {
    const esperats = [
      ['ALU011', 'Automatització RPA', null, null, 'Disponible'],
      ['ALU017', '', null, "Introdueix el nom de l'assignatura.", 'No trobada'],
      ['ALU007', 'Assignatura Inexistent', null, 'Assignatura no trobada.', 'No trobada'],
      ['ALU018', 'Bases de dades', null, null, 'Sense places'],
      ['ALU009', 'Python avançat', null, null, 'Inactiva'],
      ['ALU020', 'Power Automate', null, null, 'Disponible'],
      ['ALU999', 'Power Automate', 'Alumne no trobat.', null, 'Disponible']
    ];
    reiniciarDades();
    const botons = Array.from(document.querySelectorAll('.cas'));
    comprovar(botons.length === esperats.length && !camp('excel-cases'),
      'Hauria de mostrar només els set casos representatius.');
    comprovar(botons.every(boto => !/SOL\d{3}/.test(boto.textContent)),
      'No hi hauria codis de sol·licitud als casos de prova.');
    for (let posicio = 0; posicio < esperats.length; posicio += 1) {
      const [codi, assignatura, errorAlumne, errorAssignatura, estat] = esperats[posicio];
      botons[posicio].click();
      comprovar(camp('student-input').value === codi && camp('subject-input').value === assignatura,
        'Hauria de carregar les dades exactes del cas seleccionat.');
      camp('academic-form').requestSubmit();
      await esperarOperacio();
      comprovar(camp('student-error').textContent === (errorAlumne || '') &&
        camp('subject-error').textContent === (errorAssignatura || '') &&
        camp('result-course-status').textContent === estat,
        `Hauria de mostrar el resultat esperat per al cas ${posicio + 1}.`);
      comprovar(esOcult('enrollment-section') === (posicio !== 0),
        'Només el cas vàlid hauria de permetre matricular.');
      if (codi === 'ALU011') comprovar(camp('result-student-email').textContent === 'ana.garcia@campusrpa.test',
        "Hauria de mostrar el correu afegit a l'alumne anterior.");
    }
  });
  afegirProva('matricula_ambCasExcelValid_mostraConfirmacioICodiDelCataleg', 'integracio', async () => {
    await consultar('ALU005', 'Programació Python');
    await formalitzar();
    comprovar(camp('result-subject-details').textContent === 'PY001' && camp('result-seats').textContent === '24',
      'Hauria de mostrar el codi real i les places restants.');
    comprovar(camp('message').textContent.includes('Matrícula formalitzada correctament') && esOcult('enrollment-section'),
      'Hauria de confirmar la matrícula i impedir duplicats.');
  });

  afegirProva('modal_abansIDurantConsulta_noExisteixFinsQueArribaResposta', 'integracio', async () => {
    invalidarConsulta();
    comprovar(!camp('result-panel') && !camp('message') && !camp('enrollment-section'),
      'El resultat no hauria de formar part del DOM abans de consultar.');
    omplir('ALU014', 'Arquitectura de sistemes');
    camp('academic-form').requestSubmit();
    comprovar(!camp('result-panel') && !camp('message'),
      'El resultat no hauria de formar part del DOM durant la consulta.');
    await esperarOperacio();
    comprovar(camp('result-panel').tagName === (document.body.dataset.presentacio === 'pagina' ? 'SECTION' : 'DIALOG') && resultatObert() &&
      camp('result-panel').dataset.estat === 'resposta' && document.activeElement === camp('result-title'),
      'La resposta hauria de crear i obrir un modal amb el focus al títol.');
  });
  afegirProva('modal_ambBotoTancar_eliminaHtmlIRetornaFocusSenseMatricular', 'integracio', async () => {
    const placesAbans = placesCataleg(serveiAcademic, 'SYS001');
    camp('close-result-button').click();
    comprovar(!camp('result-panel') && !camp('message') && !camp('enrollment-note'),
      'Tancar hauria de retirar tota la informació del resultat del DOM.');
    comprovar(document.activeElement === camp('student-input') && !consultaActual && !enCurs,
      'Tancar hauria de retornar el focus i invalidar la consulta anterior.');
    comprovar(placesCataleg(serveiAcademic, 'SYS001') === placesAbans,
      'Tancar sense confirmar no hauria de consumir places.');
    await consultar('ALU014', 'Arquitectura de sistemes');
    comprovar(document.querySelectorAll('#result-panel').length === 1 && resultatObert(),
      'Una nova consulta hauria de crear exactament un modal.');
  });
  afegirProva('modal_ambEscape_cancelLaConsultaIEliminaResultat', 'integracio', () => {
    const cancelacio = new Event('cancel', { cancelable: true });
    camp('result-panel').dispatchEvent(cancelacio);
    comprovar(cancelacio.defaultPrevented && !camp('result-panel') && document.activeElement === camp('student-input'),
      'La cancel·lació amb Escape hauria de retirar el modal i retornar el focus.');
  });
  afegirProva('modal_ambTeclaEscape_eliminaResultatIRetornaFocus', 'integracio', async () => {
    await consultar('ALU014', 'Arquitectura de sistemes');
    camp('result-title').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    comprovar(!camp('result-panel') && document.activeElement === camp('student-input'),
      'La tecla Escape hauria de tancar el resultat des de qualsevol element del modal.');
  });
  afegirProva('modal_ambMatriculaPendentITancament_cancellaSenseConsumirPlaces', 'integracio', async () => {
    await consultar('ALU014', 'Arquitectura de sistemes');
    const placesAbans = placesCataleg(serveiAcademic, 'SYS001');
    camp('enrollment-section').requestSubmit();
    comprovar(camp('result-panel').dataset.estat === 'pendent' && !camp('message').textContent &&
      camp('enrollment-status').textContent.includes('Formalitzant'),
      'Durant la matrícula no hauria de presentar la resposta anterior com una confirmació nova.');
    camp('close-result-button').click();
    await esperar(850);
    comprovar(!camp('result-panel') && !enCurs && !camp('search-button').disabled,
      'Tancar hauria de cancel·lar la confirmació pendent sense reobrir el modal.');
    comprovar(placesCataleg(serveiAcademic, 'SYS001') === placesAbans,
      'La matrícula cancel·lada no hauria de consumir places.');
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
