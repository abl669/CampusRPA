'use strict';

/**
 * Executa proves unitàries de generació i validació del repte de selectors.
 * @returns {object} Recompte i detall de les proves.
 */
function executarProvesRepte() {
  const resultats = [];
  const prova = (nom, accio) => {
    try { accio(); resultats.push({ nom, correcte: true }); }
    catch (error) { console.error(`Ha fallat la prova ${nom}.`, error); resultats.push({ nom, correcte: false, error: error.message }); }
  };
  const comprovar = (condicio, missatge) => { if (!condicio) throw new Error(missatge); };
  const respostaCorrecta = dades => ({ codiAlumne: dades.objectiu.codi, trampa: '', assignatura: dades.objectiu.assignatura,
    nota: dades.notaFinal, confirmat: true, confirmacioEsquer: false, codi: dades.codi, esquers: 0 });
  prova('generarDadesRepte_ambMateixaLlavor_retornaMateixesDades', () => {
    comprovar(JSON.stringify(generarDadesRepte(42)) === JSON.stringify(generarDadesRepte(42)),
      'La mateixa llavor hauria de generar el mateix repte.');
    comprovar(JSON.stringify(generarDadesRepte(42)) !== JSON.stringify(generarDadesRepte(43)),
      'Llavors diferents haurien de generar reptes diferents.');
  });
  prova('generarDadesRepte_ambLlavorInvalida_llancaError', () => {
    for (const llavor of [0, -1, 1.5, 1000000, Number.NaN, '42', null]) {
      let rebutjat = false;
      try { generarDadesRepte(llavor); } catch (error) { rebutjat = error instanceof RangeError; }
      comprovar(rebutjat, `Hauria de rebutjar la llavor «${llavor}».`);
    }
  });
  prova('generarDadesRepte_ambQualsevolLlavor_inclouObjectiuEnDuesFilesAmbNotesDiferents', () => {
    for (let llavor = 1; llavor <= 200; llavor += 1) {
      const dades = generarDadesRepte(llavor);
      const files = dades.files.filter(fila => fila.codi === dades.objectiu.codi);
      const fila = files.find(element => element.assignatura === dades.objectiu.assignatura);
      comprovar(files.length === 2 && fila?.final === dades.notaFinal &&
        files[0].final !== files[1].final && files[0].assignatura !== files[1].assignatura,
        `La llavor ${llavor} hauria de tenir dues files distingibles de l’alumne objectiu.`);
      comprovar(dades.exemple.codi !== dades.objectiu.codi, 'L’exemple no hauria de ser l’alumne objectiu.');
    }
  });
  prova('generarDadesRepte_ambLlavor_generaCodiIOrdresValids', () => {
    for (let llavor = 1; llavor <= 200; llavor += 1) {
      const dades = generarDadesRepte(llavor);
      comprovar(/^[A-HJKMNP-Z2-9]{6}$/.test(dades.codi), `El codi ${dades.codi} no hauria de tenir caràcters confusos.`);
      comprovar([...dades.columnes].sort().join() === 'assignatura,codi,final,nom,parcial',
        'Les columnes haurien de ser una permutació completa.');
      comprovar(dades.botons.length === 5 && new Set(dades.botons).size === 5, 'Hauria d’haver-hi cinc botons diferents.');
      comprovar(dades.esperaMs >= 1500 && dades.esperaMs < 3500, 'L’espera hauria d’estar entre 1,5 i 3,5 segons.');
    }
  });
  prova('normalitzarNota_ambComaOPunt_retornaNumero', () => {
    comprovar(normalitzarNota('7,5') === 7.5 && normalitzarNota(' 7.50 ') === 7.5 && normalitzarNota('10') === 10,
      'Hauria d’acceptar coma, punt i enters.');
    for (const valor of ['', 'set', '7,5,1', '<b>7</b>', null, '100']) {
      comprovar(Number.isNaN(normalitzarNota(valor)), `Hauria de rebutjar «${valor}».`);
    }
  });
  prova('validarRespostaRepte_ambRespostaCorrecta_superaTotsElsReptes', () => {
    const dades = generarDadesRepte(42);
    const avaluacio = validarRespostaRepte(dades, { ...respostaCorrecta(dades), codiAlumne: dades.objectiu.codi.toLowerCase(),
      nota: dades.notaFinal.replace(',', '.'), codi: ` ${dades.codi.toLowerCase()} ` });
    comprovar(avaluacio.superat && avaluacio.correctes === 6, 'Una resposta correcta hauria de superar els sis reptes.');
  });
  prova('validarRespostaRepte_ambEsquersITrampa_marcaNomesElsReptesFallats', () => {
    const dades = generarDadesRepte(42);
    const avaluacio = validarRespostaRepte(dades, { ...respostaCorrecta(dades), trampa: dades.objectiu.codi,
      confirmacioEsquer: true, esquers: 2 });
    const fallats = avaluacio.resultats.filter(resultat => !resultat.correcte).map(resultat => resultat.repte);
    comprovar(!avaluacio.superat && fallats.join() === 'Camp localitzat per text,Shadow DOM,Botó correcte',
      'Només haurien de fallar el camp trampa, la casella esquer i el botó esquer.');
  });
  prova('validarRespostaRepte_ambNotaDeLaFilaDistractora_fallaTaula', () => {
    const dades = generarDadesRepte(42);
    const distractora = dades.files.find(fila => fila.codi === dades.objectiu.codi && fila.assignatura !== dades.objectiu.assignatura);
    const avaluacio = validarRespostaRepte(dades, { ...respostaCorrecta(dades), nota: distractora.final,
      assignatura: 'Power Automate Avançat' === dades.objectiu.assignatura ? 'Power Automate' : 'Power Automate Avançat' });
    comprovar(avaluacio.correctes === 4 && !avaluacio.resultats[1].correcte && !avaluacio.resultats[2].correcte,
      'Hauria de fallar l’assignatura i la nota de la fila distractora.');
  });
  return { total: resultats.length, correctes: resultats.filter(resultat => resultat.correcte).length, resultats };
}

/**
 * Executa proves d'integració a RepteSelectors.html, resolent el repte amb selectors semàntics.
 * Cal obrir la pàgina amb ?llavor=N&espera=0.
 * @returns {Promise<object>} Recompte i errors.
 */
async function executarProvesIntegracioRepte() {
  const resultats = [];
  const comprovar = (condicio, missatge) => { if (!condicio) throw new Error(missatge); };
  const esperar = async condicio => {
    const inici = performance.now();
    while (!condicio()) {
      if (performance.now() - inici > 4000) throw new Error('La condició hauria de complir-se abans del timeout.');
      await new Promise(resoldre => setTimeout(resoldre, 20));
    }
  };
  const prova = async (nom, accio) => {
    try { await accio(); resultats.push({ nom, correcte: true }); }
    catch (error) { console.error(`Ha fallat la prova ${nom}.`, error); resultats.push({ nom, correcte: false, error: error.message }); }
  };
  const zona = () => document.querySelector('[data-zona-repte]');
  const perText = (selector, text, arrel = zona()) =>
    [...arrel.querySelectorAll(selector)].filter(element => element.textContent.trim() === text);
  const isVisible = element => element.checkVisibility() && element.getBoundingClientRect().right > 0;
  const getLlavor = () => Number(document.getElementById('repte-llavor').textContent.replace(/\D/g, ''));
  const escriure = (camp, valor) => { camp.value = valor; camp.dispatchEvent(new Event('input', { bubbles: true })); };
  const resoldre = async ({ ambEsquer = false } = {}) => {
    const dades = generarDadesRepte(getLlavor());
    const fitxa = perText('h2', 'Alumne a processar')[0].closest('article');
    const valorFitxa = etiqueta => perText('dt', etiqueta, fitxa)[0].nextElementSibling.textContent.trim();
    const codiAlumne = valorFitxa('Codi d’alumne');
    const assignatura = valorFitxa('Assignatura');
    await esperar(() => zona().querySelector('table'));
    const encapcalats = [...zona().querySelectorAll('table th')].map(th => th.textContent.trim());
    const fila = [...zona().querySelectorAll('table tbody tr')].map(tr => [...tr.cells].map(td => td.textContent.trim()))
      .find(celes => celes[encapcalats.indexOf('Codi d’alumne')] === codiAlumne &&
        celes[encapcalats.indexOf('Assignatura')] === assignatura);
    const nota = fila[encapcalats.indexOf('Nota final')];
    const campCodi = perText('span', 'Codi d’alumne').map(span => span.nextElementSibling).find(isVisible);
    escriure(campCodi, codiAlumne);
    const combo = zona().querySelector('[role="combobox"]');
    combo.click();
    perText('[role="option"]', assignatura)[0].click();
    const marc = zona().querySelector('iframe[title="Formulari de nota"]');
    await esperar(() => marc.contentDocument?.querySelector('input'));
    escriure(marc.contentDocument.querySelector('input'), nota);
    const amfitrio = [...zona().querySelectorAll('*')].find(element => element.shadowRoot);
    amfitrio.shadowRoot.querySelector('input[type="checkbox"]').click();
    escriure(zona().querySelector('input[placeholder="Escriu el codi de la imatge"]'), dades.codi);
    if (ambEsquer) perText('button', 'Enviar esborrany')[0].click();
    [...zona().querySelectorAll('button[type="submit"]')].find(boto => !boto.disabled && isVisible(boto)).click();
    return zona().querySelector('[data-resultat]');
  };
  if (document.body.dataset.pagina !== 'repte') throw new Error('Obre RepteSelectors.html per executar aquestes proves.');
  await prova('repte_ambSelectorsSemantics_superaTotsElsReptes', async () => {
    const resultat = await resoldre();
    comprovar(resultat.dataset.estat === 'superat' && resultat.textContent.includes('Repte superat: 6/6'),
      `Hauria de superar el repte: ${resultat.textContent}`);
  });
  await prova('repte_ambBotoEsquer_noSuperaElRepte', async () => {
    document.getElementById('repte-nou').click();
    const resultat = await resoldre({ ambEsquer: true });
    comprovar(resultat.dataset.estat === 'no-superat' && resultat.textContent.includes('5/6') &&
      resultat.textContent.includes('botó(ns) esquer'), 'El clic a un esquer hauria de fer fallar el repte del botó.');
  });
  await prova('repte_ambNouRepte_canviaIdentificadorsIClasses', () => {
    const signatura = () => [...zona().querySelectorAll('input, [role="combobox"], button')]
      .map(element => `${element.id}|${element.className}`).join();
    const abans = signatura();
    document.getElementById('repte-nou').click();
    comprovar(signatura() !== abans, 'Els identificadors i les classes haurien de canviar.');
    comprovar(!zona().querySelector('[role="option"]'), 'Les opcions no haurien d’existir amb la llista tancada.');
  });
  await prova('repte_ambLlistaPersonalitzada_funcionaAmbTeclat', () => {
    const combo = zona().querySelector('[role="combobox"]');
    const tecla = key => combo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    tecla('ArrowDown');
    comprovar(combo.getAttribute('aria-expanded') === 'true', 'La fletxa hauria d’obrir la llista.');
    tecla('ArrowDown');
    const esperat = zona().querySelectorAll('[role="option"]')[1].textContent;
    tecla('Enter');
    comprovar(combo.textContent === esperat && combo.getAttribute('aria-expanded') === 'false',
      'Enter hauria de seleccionar l’opció activa i tancar la llista.');
  });
  return { total: resultats.length, correctes: resultats.filter(resultat => resultat.correcte).length, resultats };
}
