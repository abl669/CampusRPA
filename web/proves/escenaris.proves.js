/**
 * Executa les proves unitàries dels escenaris i les proves d'integració de la pàgina oberta.
 * Carrega aquest fitxer com a script a qualsevol de les pàgines web/*.html amb aplicació
 * i executa executarProvesEscenaris(). Les dades compartides es reinicien abans i després.
 * @returns {Promise<object>} Recompte i resultats individuals de les proves.
 */
async function executarProvesEscenaris() {
  const proves = [];
  const resultats = [];
  const afegirProva = (nom, tipus, accio) => proves.push({ nom, tipus, accio });
  const comprovar = (condicio, missatge) => {
    if (!condicio) throw new Error(missatge);
  };
  const esperar = retard => new Promise(resoldre => setTimeout(resoldre, retard));
  const camp = id => document.getElementById(id);
  const esOcult = id => !camp(id) || camp(id).hidden;
  const esperarCondicio = async (condicio, maxim, missatge) => {
    const inici = performance.now();
    while (!condicio()) {
      if (performance.now() - inici > maxim) throw new Error(missatge);
      await esperar(25);
    }
  };
  const introduir = (id, valor) => {
    camp(id).value = valor;
    camp(id).dispatchEvent(new Event('input', { bubbles: true }));
  };
  const enviarConsulta = (alumne, assignatura) => {
    introduir('student-input', alumne);
    introduir('subject-input', assignatura);
    camp('academic-form').requestSubmit();
  };
  const esperarOperacio = (maxim = 3000) =>
    esperarCondicio(() => !camp('search-button').disabled, maxim, "L'operació hauria d'acabar dins del temps previst.");
  const consultar = async (alumne, assignatura) => {
    enviarConsulta(alumne, assignatura);
    await esperarOperacio();
  };
  const formalitzar = async () => {
    camp('enrollment-section').requestSubmit();
    await esperarOperacio();
  };
  const esErrorTecnic = () => camp('message').dataset.tipusError === 'tecnic' && camp('message').classList.contains('error');
  const places = (servei, codi) => servei.getCataleg().find(assignatura => assignatura.codi === codi).places;
  const serveiPersistent = () => new ServeiAcademic(new MagatzemLocal(CLAU_DADES));
  const escenariPagina = document.body.dataset.escenari;

  afegirProva('obtenirEscenari_ambClausDesconegudesOHeretades_llancaError', 'unitat', () => {
    for (const clau of ['inexistent', '__proto__', 'constructor', 'toString', '']) {
      let error = null;
      try {
        obtenirEscenari(clau);
      } catch (excepcio) {
        error = excepcio;
      }
      comprovar(error instanceof Error, `Hauria de rebutjar l'escenari «${clau}».`);
    }
  });
  afegirProva('obtenirEscenari_ambClausValides_retornaConfiguracioImmutable', 'unitat', () => {
    for (const clau of Object.keys(ESCENARIS)) {
      const configuracio = obtenirEscenari(clau);
      comprovar(Object.isFrozen(configuracio), "La configuració de l'escenari no s'hauria de poder modificar.");
    }
    comprovar(obtenirEscenari('consultaLenta').consulta === 'lenta', 'Hauria de retornar la incidència de consulta.');
    comprovar(obtenirEscenari('confirmacioPerduda').matricula === 'confirmacioPerduda', 'Hauria de retornar la incidència de matrícula.');
  });
  afegirProva('llegirSegons_ambValorsValids_retornaElNombre', 'unitat', () => {
    comprovar(llegirSegons(new URLSearchParams('segons=1'), 10) === 1, 'Hauria d\'acceptar el mínim.');
    comprovar(llegirSegons(new URLSearchParams('segons=120'), 10) === 120, "Hauria d'acceptar el màxim.");
    comprovar(llegirSegons(new URLSearchParams(''), 10) === 10, 'Hauria de retornar el valor per defecte si no hi és.');
  });
  afegirProva('llegirSegons_ambValorsInvalids_retornaValorPerDefecte', 'unitat', () => {
    for (const valor of ['0', '121', 'abc', '5.5', '-3', '', '1e2', '0x10', '9999']) {
      comprovar(llegirSegons(new URLSearchParams({ segons: valor }), 7) === 7, `Hauria de rebutjar «${valor}».`);
    }
  });
  afegirProva('registrarPrimeraFallada_ambMateixaCombinacio_nomesFallaLaPrimeraVegada', 'unitat', () => {
    const registre = new RegistreIncidencies();
    comprovar(registre.registrarPrimeraFallada('consulta', 'ALU011:RPA001'), 'El primer intent hauria de fallar.');
    comprovar(!registre.registrarPrimeraFallada('consulta', 'ALU011:RPA001'), 'El reintent hauria de funcionar.');
    comprovar(registre.registrarPrimeraFallada('consulta', 'ALU012:RPA001'), 'Una altra combinació hauria de fallar el primer cop.');
    comprovar(registre.registrarPrimeraFallada('matricula', 'ALU011:RPA001'), 'Les operacions haurien de ser independents.');
  });
  afegirProva('registrarPrimeraFallada_ambEstatManipulat_noProvocaErrors', 'unitat', () => {
    for (const estat of [{ consulta: 'ALU011:RPA001' }, { consulta: [1, null, {}] }, 'text', 42]) {
      const magatzem = new MagatzemMemoria();
      magatzem.desar(estat);
      comprovar(new RegistreIncidencies(magatzem).registrarPrimeraFallada('consulta', 'ALU011:RPA001'),
        "Hauria d'ignorar un registre manipulat.");
    }
  });
  afegirProva('serveiAcademic_ambMagatzemCompartit_conservaMatriculesEntreInstancies', 'unitat', () => {
    const magatzem = new MagatzemMemoria();
    const referencia = new ServeiAcademic(magatzem).formalitzar('ALU011', 'Power Automate').matricula.referencia;
    const altreServei = new ServeiAcademic(magatzem);
    const resultat = altreServei.consultar('alu011', 'power automate');
    comprovar(resultat.estatAssignatura === 'Matriculada' && resultat.matricula.referencia === referencia,
      'Una altra pàgina hauria de veure la matrícula desada.');
    comprovar(places(altreServei, 'PA001') === 14, 'Hauria de conservar les places descomptades.');
  });
  afegirProva('serveiAcademic_ambEstatManipulat_descartaDadesInvalides', 'unitat', () => {
    const magatzem = new MagatzemMemoria();
    magatzem.desar({
      places: { 'RPA001': -5, 'PA001': 999, 'WEB001': '3', 'GP-110': 4.5, 'BDD001': 0, __proto__: { 'RPA001': 1 } },
      matricules: [
        { referencia: '<img>', codiAlumne: 'ALU011', codiAssignatura: 'RPA001', observacio: '' },
        { referencia: 'MAT-000001', codiAlumne: 'ALU999', codiAssignatura: 'RPA001', observacio: '' },
        { referencia: 'MAT-000002', codiAlumne: 'ALU011', codiAssignatura: 'XXX', observacio: '' },
        { referencia: 'MAT-000003', codiAlumne: 'ALU011', codiAssignatura: 'PA001', observacio: 'x'.repeat(501) },
        null
      ]
    });
    const servei = new ServeiAcademic(magatzem);
    comprovar(places(servei, 'RPA001') === 20 && places(servei, 'PA001') === 15 &&
      places(servei, 'WEB001') === 12 && places(servei, 'GP-110') === 20, 'Hauria de restaurar places invàlides.');
    for (const assignatura of ['Automatització RPA', 'Power Automate']) {
      comprovar(servei.consultar('ALU011', assignatura).potMatricular, 'Hauria de descartar matrícules invàlides.');
    }
  });
  afegirProva('serveiAcademic_ambEstatIllegible_comencaAmbDadesInicials', 'unitat', () => {
    for (const estat of [null, 'text', 42, [], { places: null, matricules: 'x' }]) {
      const magatzem = new MagatzemMemoria();
      if (estat !== null) magatzem.desar(estat);
      comprovar(places(new ServeiAcademic(magatzem), 'RPA001') === 20, 'Hauria de començar amb les dades inicials.');
    }
  });
  afegirProva('formalitzar_ambReferenciesDesades_continuaLaNumeracio', 'unitat', () => {
    const magatzem = new MagatzemMemoria();
    magatzem.desar({ places: { 'RPA001': 9 },
      matricules: [{ referencia: 'MAT-000005', codiAlumne: 'ALU012', codiAssignatura: 'RPA001', observacio: '' }] });
    const resultat = new ServeiAcademic(magatzem).formalitzar('ALU011', 'Automatització RPA');
    comprovar(resultat.matricula.referencia === 'MAT-000006', 'No hauria de reutilitzar números de referència.');
  });
  afegirProva('magatzemLocal_ambJsonCorrupte_retornaNullSenseExcepcio', 'unitat', () => {
    const clau = 'campusrpa.proves.temporal';
    try {
      localStorage.setItem(clau, '{json trencat');
      comprovar(new MagatzemLocal(clau).llegir() === null, 'Hauria de tractar el JSON corrupte com a estat absent.');
      const magatzem = new MagatzemLocal(clau);
      magatzem.desar({ valor: 1 });
      comprovar(new MagatzemLocal(clau).llegir().valor === 1, 'Hauria de desar i llegir JSON vàlid.');
    } finally {
      localStorage.removeItem(clau);
    }
  });
  afegirProva('reiniciarDades_ambDadesIFalladesDesades_lesEsborra', 'unitat', () => {
    serveiPersistent().formalitzar('ALU013', 'Power Automate');
    new RegistreIncidencies(new MagatzemLocal(CLAU_INCIDENCIES)).registrarPrimeraFallada('consulta', 'ALU013:PA001');
    reiniciarDades();
    comprovar(localStorage.getItem(CLAU_DADES) === null && localStorage.getItem(CLAU_INCIDENCIES) === null,
      'Hauria d\'esborrar totes les claus de la simulació.');
    comprovar(places(serveiPersistent(), 'PA001') === 15, 'Hauria de restaurar les places inicials.');
  });

  const generadorSequencial = (valors) => { let posicio = 0; return () => valors[posicio++]; };
  afegirProva('triarDestiAleatori_ambSorteigSuperiorALaProbabilitat_esQuedaEnModeNormal', 'unitat', () => {
    comprovar(triarDestiAleatori(() => PROBABILITAT_ERROR) === null, 'El llindar hauria de quedar-se en mode normal.');
    comprovar(triarDestiAleatori(() => 0.999999) === null, 'Un valor alt hauria de quedar-se en mode normal.');
  });
  afegirProva('triarDestiAleatori_ambSorteigInferiorALaProbabilitat_retornaPaginaError', 'unitat', () => {
    comprovar(triarDestiAleatori(generadorSequencial([0, 0])) === PAGINES_ERROR[0], 'Hauria de triar la primera pàgina d\'error.');
    comprovar(triarDestiAleatori(generadorSequencial([0.1, 0.999999])) === 'ErrorServei.html', "Hauria de triar l'última pàgina d'error.");
    comprovar(triarDestiAleatori(generadorSequencial([0, 1])) === 'ErrorServei.html'
      && triarDestiAleatori(generadorSequencial([0, -1])) === PAGINES_ERROR[0],
      'Els valors fora de rang no haurien de retornar destins inexistents.');
  });
  afegirProva('triarDestiAleatori_ambGeneradorUniforme_potArribarATotesLesPaginesError', 'unitat', () => {
    const destins = new Set();
    for (let posicio = 0; posicio < PAGINES_ERROR.length; posicio += 1) {
      destins.add(triarDestiAleatori(generadorSequencial([0, (posicio + 0.5) / PAGINES_ERROR.length])));
    }
    comprovar(destins.size === PAGINES_ERROR.length, "Cada pàgina d'error hauria de tenir la seva franja de probabilitat.");
    comprovar(!PAGINES_ERROR.includes('Matricula.html'), 'No hauria de redirigir a Matricula.html per evitar bucles.');
  });
  afegirProva('triarDestiAleatori_ambMoltesCarregues_errorAproximadamentUnDeCadaTres', 'unitat', () => {
    let llavor = 12345;
    const generador = () => { llavor = (llavor * 1103515245 + 12345) % 2147483648; return llavor / 2147483648; };
    const intents = 6000;
    let errors = 0;
    for (let i = 0; i < intents; i += 1) if (triarDestiAleatori(generador) !== null) errors += 1;
    const proporcio = errors / intents;
    comprovar(proporcio > 0.29 && proporcio < 0.38, `La proporció d'errors hauria de ser propera a 1/3 (${proporcio.toFixed(3)}).`);
  });
  afegirProva('setModeAleatori_ambActivacioIDesactivacio_esDesaIEsLlegeix', 'unitat', () => {
    const anterior = localStorage.getItem(CLAU_MODE_ALEATORI);
    try {
      localStorage.removeItem(CLAU_MODE_ALEATORI);
      comprovar(isModeAleatoriActiu(), 'Per defecte hauria d\'estar activat.');
      comprovar(setModeAleatori(false) && !isModeAleatoriActiu(), 'Hauria de poder-se desactivar.');
      comprovar(setModeAleatori(true) && isModeAleatoriActiu(), 'Hauria de poder-se reactivar.');
      localStorage.setItem(CLAU_MODE_ALEATORI, 'valor-manipulat');
      comprovar(isModeAleatoriActiu(), 'Un valor desconegut hauria de mantenir el comportament per defecte.');
    } finally {
      if (anterior === null) localStorage.removeItem(CLAU_MODE_ALEATORI);
      else localStorage.setItem(CLAU_MODE_ALEATORI, anterior);
    }
  });
  afegirProva('reiniciarDades_ambModeAleatoriDesactivat_conservaLaPreferencia', 'unitat', () => {
    const anterior = isModeAleatoriActiu();
    try {
      setModeAleatori(false);
      reiniciarDades();
      comprovar(!isModeAleatoriActiu(), 'Reiniciar dades no hauria de canviar el mode aleatori.');
    } finally {
      setModeAleatori(anterior);
    }
  });

  const provesIntegracio = {
    normal: () => {
      afegirProva('matricula_ambPaginaNormal_esDesaPerALesAltresPagines', 'integracio', async () => {
        await consultar('ALU012', 'Gestió de Processos');
        await formalitzar();
        const resultat = serveiPersistent().consultar('ALU012', 'Gestió de Processos');
        comprovar(resultat.estatAssignatura === 'Matriculada' && resultat.matricula.referencia === 'MAT-000001',
          'La matrícula hauria de quedar desada per a qualsevol pàgina.');
      });
    },
    carrega: () => {
      afegirProva('pagina_ambCarregaLenta_mostraCarregadorIDespresElFormulari', 'integracio', async () => {
        comprovar(camp('loading-indicator') && !camp('student-input'),
          'Durant la càrrega no hauria d\'existir el formulari. Obre la pàgina amb ?segons=4 o més.');
        comprovar(document.readyState === 'complete', 'El navegador ja hauria de considerar la pàgina carregada.');
        await esperarCondicio(() => camp('student-input'), 130000, 'El formulari hauria d\'aparèixer després del retard.');
        comprovar(!camp('loading-indicator'), "Hauria de retirar l'indicador de càrrega.");
        await consultar('ALU011', 'Power Automate');
        comprovar(!esOcult('enrollment-section'), 'Després de carregar, hauria de funcionar amb normalitat.');
      });
    },
    consultaLenta: () => {
      afegirProva('consulta_ambEscenariLent_superaElTimeoutPeroRespon', 'integracio', async () => {
        const inici = performance.now();
        enviarConsulta('ALU011', 'Power Automate');
        await esperar(900);
        comprovar(camp('search-button').disabled && esOcult('result-panel'), 'La consulta hauria de continuar en curs.');
        await esperarOperacio(segonsEscenari * 1000 + 2000);
        comprovar(performance.now() - inici >= segonsEscenari * 1000 - 50, 'Hauria de respectar el retard configurat.');
        comprovar(!esOcult('enrollment-section'), 'Hauria d\'acabar mostrant el resultat correcte.');
      });
    },
    senseResposta: () => {
      afegirProva('consulta_ambEscenariSenseResposta_noRespon', 'integracio', async () => {
        enviarConsulta('ALU011', 'Power Automate');
        await esperar(1500);
        comprovar(camp('search-button').disabled && esOcult('result-panel'), 'La consulta no hauria de respondre.');
        comprovar(camp('search-status').textContent.includes('Consultant'), "Hauria de mostrar l'estat d'espera.");
      });
      afegirProva('consulta_ambEsperaICanviDeDades_recuperaElsControls', 'integracio', async () => {
        introduir('student-input', 'ALU012');
        comprovar(!camp('search-button').disabled && !enCurs, 'Canviar les dades hauria de cancel·lar l\'espera.');
      });
    },
    intermitent: () => {
      afegirProva('consulta_ambEscenariIntermitent_fallaElPrimerIntentIElReintentFunciona', 'integracio', async () => {
        await consultar('ALU011', 'Power Automate');
        comprovar(esErrorTecnic() && camp('result-seats').textContent === '—', 'El primer intent hauria de ser un error tècnic.');
        await consultar('ALU011', 'Power Automate');
        comprovar(!esErrorTecnic() && !esOcult('enrollment-section'), 'El reintent hauria de funcionar.');
      });
      afegirProva('consulta_ambEscenariIntermitentIAltraCombinacio_tornaAFallar', 'integracio', async () => {
        await consultar('ALU012', 'Power Automate');
        comprovar(esErrorTecnic(), 'Cada combinació nova hauria de fallar el primer cop.');
      });
      afegirProva('consulta_ambErrorDeValidacio_noConsumeixLaFallada', 'integracio', async () => {
        await consultar('ALU999', 'Power Automate');
        comprovar(!esErrorTecnic() && camp('student-error').textContent === 'Alumne no trobat.',
          'Els errors de validació no haurien de ser errors tècnics.');
      });
    },
    errorMatricula: () => {
      afegirProva('matricula_ambEscenariErrorMatricula_fallaSenseRegistrarIElReintentFunciona', 'integracio', async () => {
        await consultar('ALU001', 'Automatització RPA');
        await formalitzar();
        comprovar(esErrorTecnic() && esOcult('enrollment-section'), 'El primer intent hauria de ser un error tècnic.');
        comprovar(places(serveiPersistent(), 'RPA001') === 20, 'La matrícula fallida no hauria de consumir places.');
        await consultar('ALU001', 'Automatització RPA');
        comprovar(!esOcult('enrollment-section'), 'Hauria de permetre reintentar després de consultar.');
        await formalitzar();
        comprovar(camp('message').textContent.includes('MAT-000001') && camp('result-seats').textContent === '19',
          'El reintent hauria de registrar una única matrícula.');
      });
    },
    confirmacioPerduda: () => {
      afegirProva('matricula_ambConfirmacioPerduda_registraPeroNoConfirma', 'integracio', async () => {
        await consultar('ALU001', 'Automatització RPA');
        camp('enrollment-section').requestSubmit();
        await esperar(1500);
        comprovar(enCurs && !camp('create-enrollment-button') && !camp('result-panel'),
          'La pàgina hauria de quedar esperant la confirmació.');
        comprovar(camp('search-status').textContent.includes('Esperant la confirmació'), "Hauria d'indicar l'espera.");
        const resultat = serveiPersistent().consultar('ALU001', 'Automatització RPA');
        comprovar(resultat.estatAssignatura === 'Matriculada', 'La matrícula hauria de quedar registrada.');
      });
      afegirProva('consulta_despresDeConfirmacioPerduda_recuperaLaReferenciaSenseDuplicar', 'integracio', async () => {
        invalidarConsulta();
        await consultar('ALU001', 'Automatització RPA');
        comprovar(camp('result-course-status').textContent === 'Matriculada' && camp('message').textContent.includes('MAT-000001'),
          'Hauria de recuperar la referència en tornar a consultar.');
        comprovar(camp('result-seats').textContent === '19' && esOcult('enrollment-section'),
          'No hauria de permetre una matrícula duplicada.');
      });
    }
  };

  reiniciarDades();
  if (typeof invalidarConsulta === 'function' && camp('student-input')) invalidarConsulta();
  if (Object.hasOwn(provesIntegracio, escenariPagina)) provesIntegracio[escenariPagina]();
  afegirProva('botoModeAleatori_ambClics_commutaIAnunciaElCanvi', 'integracio', async () => {
    await esperarCondicio(() => camp('random-mode-button'), 130000, "Hauria d'existir el botó del mode aleatori.");
    const boto = camp('random-mode-button');
    const anterior = isModeAleatoriActiu();
    try {
      boto.click();
      comprovar(isModeAleatoriActiu() === !anterior && boto.getAttribute('aria-pressed') === String(!anterior),
        'El botó hauria de commutar el mode i el seu estat accessible.');
      comprovar(camp('random-mode-status').textContent.length > 0, "Hauria d'anunciar el canvi.");
      boto.click();
      comprovar(isModeAleatoriActiu() === anterior, 'Un segon clic hauria de restaurar el mode.');
    } finally {
      setModeAleatori(anterior);
    }
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
  if (camp('student-input')) invalidarConsulta();
  reiniciarDades();
  return {
    escenari: escenariPagina,
    total: resultats.length,
    correctes: resultats.filter(resultat => resultat.correcte).length,
    fallides: resultats.filter(resultat => !resultat.correcte).length,
    unitat: resultats.filter(resultat => resultat.tipus === 'unitat').length,
    integracio: resultats.filter(resultat => resultat.tipus === 'integracio').length,
    resultats
  };
}
