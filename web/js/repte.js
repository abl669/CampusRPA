'use strict';

const ALUMNES_REPTE = Object.freeze([
  ['ALU001', 'Anna Ferrer'], ['ALU002', 'Pau Vidal'], ['ALU003', 'Laia Serra'], ['ALU004', 'Marc Torres'],
  ['ALU005', 'Núria Costa'], ['ALU006', 'Joan Riera'], ['ALU008', 'Enric Pons'], ['ALU009', 'Marta Soler'],
  ['ALU011', 'Ana García'], ['ALU012', 'Bruno López'], ['ALU013', 'Carla Martín'], ['ALU015', 'Elena Costa']
]);
const ASSIGNATURES_REPTE = Object.freeze(['Power Automate', 'Power Automate Avançat', 'Automatització RPA',
  'Automatització Web', 'Programació Python', 'Python avançat', 'Bases de dades', 'Gestió de Processos']);
const COLUMNES_REPTE = Object.freeze({ codi: 'Codi d’alumne', nom: 'Nom', assignatura: 'Assignatura',
  parcial: 'Nota parcial', final: 'Nota final' });
const CARACTERS_CODI_REPTE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LLAVOR_MAXIMA_REPTE = 999999;
const ESTIL_FORA_PANTALLA = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden';

/**
 * Crea un generador pseudoaleatori reproduïble (mulberry32).
 * @param {number} llavor Enter positiu inicial.
 * @returns {function(): number} Funció que retorna valors entre 0 (inclòs) i 1 (exclòs).
 */
function crearGeneradorRepte(llavor) {
  let estat = llavor >>> 0;
  return () => {
    estat = (estat + 0x6D2B79F5) >>> 0;
    let valor = Math.imul(estat ^ (estat >>> 15), estat | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Retorna una còpia barrejada d'una llista.
 * @param {Array} llista Elements originals.
 * @param {function(): number} aleatori Generador pseudoaleatori.
 * @returns {Array} Nova llista barrejada.
 */
function barrejarRepte(llista, aleatori) {
  const copia = [...llista];
  for (let index = copia.length - 1; index > 0; index -= 1) {
    const altre = Math.floor(aleatori() * (index + 1));
    [copia[index], copia[altre]] = [copia[altre], copia[index]];
  }
  return copia;
}

/**
 * Converteix una nota escrita amb coma o punt decimal en número.
 * @param {string} text Nota introduïda.
 * @returns {number} Valor numèric o NaN si el format no és vàlid.
 */
function normalitzarNota(text) {
  const net = String(text ?? '').trim();
  return /^\d{1,2}([.,]\d{1,2})?$/.test(net) ? Number(net.replace(',', '.')) : Number.NaN;
}

/**
 * Formata una nota amb coma decimal.
 * @param {number} nota Valor entre 0 i 10.
 * @returns {string} Nota amb un decimal.
 */
function formatarNotaRepte(nota) {
  return nota.toFixed(1).replace('.', ',');
}

/**
 * Genera les dades d'un repte de selectors de manera reproduïble.
 * @param {number} llavor Enter entre 1 i 999999.
 * @returns {object} Alumne objectiu, exemple, files de notes, ordre de columnes i botons, codi i espera.
 * @throws {RangeError} Si la llavor no és vàlida.
 */
function generarDadesRepte(llavor) {
  if (!Number.isInteger(llavor) || llavor < 1 || llavor > LLAVOR_MAXIMA_REPTE) {
    throw new RangeError(`La llavor ha de ser un enter entre 1 i ${LLAVOR_MAXIMA_REPTE}.`);
  }
  const aleatori = crearGeneradorRepte(llavor);
  const nota = () => (6 + Math.floor(aleatori() * 15)) / 2;
  const alumnes = barrejarRepte(ALUMNES_REPTE, aleatori).map(([codi, nom]) => ({ codi, nom }));
  const assignatures = barrejarRepte(ASSIGNATURES_REPTE, aleatori);
  const objectiu = { ...alumnes[0], assignatura: assignatures[0] };
  const exemple = { ...alumnes[1], assignatura: assignatures[2] };
  const notaObjectiu = nota();
  let notaDistractora = nota();
  while (notaDistractora === notaObjectiu) notaDistractora = nota();
  const fila = (alumne, assignatura, final) => ({ codi: alumne.codi, nom: alumne.nom, assignatura,
    parcial: formatarNotaRepte(nota()), final: formatarNotaRepte(final ?? nota()) });
  const files = [fila(objectiu, objectiu.assignatura, notaObjectiu), fila(objectiu, assignatures[1], notaDistractora),
    fila(exemple, exemple.assignatura), ...alumnes.slice(2, 7).map(alumne =>
      fila(alumne, assignatures[Math.floor(aleatori() * assignatures.length)]))];
  const codi = Array.from({ length: 6 }, () =>
    CARACTERS_CODI_REPTE[Math.floor(aleatori() * CARACTERS_CODI_REPTE.length)]).join('');
  return {
    llavor, objectiu, exemple, assignatures, codi,
    notaFinal: formatarNotaRepte(notaObjectiu),
    files: barrejarRepte(files, aleatori),
    columnes: barrejarRepte(Object.keys(COLUMNES_REPTE), aleatori),
    botons: barrejarRepte(['real', 'amagat', 'desactivat', 'fora', 'esborrany'], aleatori),
    exempleAbans: aleatori() < 0.5,
    trampaAbans: aleatori() < 0.5,
    esquerAbans: aleatori() < 0.5,
    rotacions: Array.from({ length: 6 }, () => (aleatori() - 0.5) * 0.24),
    esperaMs: 1500 + Math.floor(aleatori() * 2000)
  };
}

/**
 * Comprova la resposta enviada i avalua cada repte per separat.
 * @param {object} dades Dades generades per generarDadesRepte.
 * @param {object} resposta Valors recollits del formulari.
 * @returns {{superat: boolean, correctes: number, resultats: Array<{repte: string, correcte: boolean, missatge: string}>}}
 */
function validarRespostaRepte(dades, resposta) {
  const text = valor => String(valor ?? '').trim();
  const avaluar = (repte, correcte, error) => ({ repte, correcte, missatge: correcte ? 'Correcte.' : error });
  const resultats = [
    avaluar('Camp localitzat per text', text(resposta.codiAlumne).toUpperCase() === dades.objectiu.codi && !text(resposta.trampa),
      text(resposta.trampa) ? 'Has omplert un camp ocult amb la mateixa etiqueta.' : 'El codi no és el de l’alumne a processar.'),
    avaluar('Llista personalitzada', resposta.assignatura === dades.objectiu.assignatura,
      'L’assignatura seleccionada no és exactament la de la fitxa.'),
    avaluar('Taula i iframe', normalitzarNota(resposta.nota) === normalitzarNota(dades.notaFinal),
      'La nota no coincideix amb la nota final de l’alumne i l’assignatura indicats.'),
    avaluar('Shadow DOM', resposta.confirmat === true && resposta.confirmacioEsquer !== true,
      resposta.confirmacioEsquer ? 'Has marcat la casella esquer.' : 'Falta marcar la confirmació de dades correctes.'),
    avaluar('Text en imatge', text(resposta.codi).toUpperCase() === dades.codi,
      'El codi de verificació no coincideix amb la imatge.'),
    avaluar('Botó correcte', resposta.esquers === 0,
      `Has fet clic en ${resposta.esquers} botó(ns) esquer abans d’enviar.`)
  ];
  const correctes = resultats.filter(resultat => resultat.correcte).length;
  return { superat: correctes === resultats.length, correctes, resultats };
}

/**
 * Genera un identificador o classe aleatòria sense significat.
 * @returns {string} Identificador vàlid per a HTML i CSS.
 */
function getIdentificadorRepte() {
  return `x${crypto.getRandomValues(new Uint32Array(2)).reduce((acc, valor) => acc + valor.toString(36), '')}`;
}

/**
 * Crea un element amb una classe aleatòria i propietats opcionals.
 * @param {string} etiqueta Nom de l'etiqueta HTML.
 * @param {object} [propietats] Propietats DOM a assignar.
 * @param {Array<Node|string>} [fills] Contingut fill.
 * @returns {HTMLElement} Element creat.
 */
function crearElementRepte(etiqueta, propietats = {}, fills = []) {
  const element = document.createElement(etiqueta);
  element.classList.add(getIdentificadorRepte());
  const { classes = [], atributs = {}, ...resta } = propietats;
  element.classList.add(...classes);
  Object.assign(element, resta);
  for (const [nom, valor] of Object.entries(atributs)) element.setAttribute(nom, valor);
  element.append(...fills);
  return element;
}

/**
 * Crea una fitxa d'alumne amb llista de definicions sense identificadors estables.
 * @param {string} titol Títol visible de la fitxa.
 * @param {object} alumne Codi, nom i assignatura.
 * @returns {HTMLElement} Article de la fitxa.
 */
function crearFitxaRepte(titol, alumne) {
  const idTitol = getIdentificadorRepte();
  const llista = crearElementRepte('dl', { classes: ['dades'] });
  for (const [etiqueta, valor] of [['Codi d’alumne', alumne.codi], ['Nom', alumne.nom], ['Assignatura', alumne.assignatura]]) {
    llista.append(crearElementRepte('div', { classes: ['row'] }, [
      crearElementRepte('dt', { textContent: etiqueta }), crearElementRepte('dd', { textContent: valor })]));
  }
  return crearElementRepte('article', { classes: ['targeta'], atributs: { 'aria-labelledby': idTitol } },
    [crearElementRepte('h2', { id: idTitol, textContent: titol }), llista]);
}

/**
 * Crea la taula de notes amb columnes i files en ordre variable.
 * @param {object} dades Dades del repte.
 * @returns {HTMLElement} Contenidor desplaçable amb la taula.
 */
function crearTaulaRepte(dades) {
  const capcalera = crearElementRepte('tr', {}, dades.columnes.map(columna =>
    crearElementRepte('th', { textContent: COLUMNES_REPTE[columna], atributs: { scope: 'col' } })));
  const cos = crearElementRepte('tbody', {}, dades.files.map(fila =>
    crearElementRepte('tr', {}, dades.columnes.map(columna => crearElementRepte('td', { textContent: fila[columna] })))));
  return crearElementRepte('div', { classes: ['taula-scroll'] }, [crearElementRepte('table', {}, [
    crearElementRepte('caption', { textContent: 'Notes del trimestre' }), crearElementRepte('thead', {}, [capcalera]), cos])]);
}

/**
 * Crea el camp de codi i un camp trampa ocult amb la mateixa etiqueta.
 * @param {object} dades Dades del repte.
 * @returns {{grup: HTMLElement, real: HTMLInputElement, trampa: HTMLInputElement}} Camps creats.
 */
function crearCampCodiRepte(dades) {
  const crear = () => crearElementRepte('input', { type: 'text', name: getIdentificadorRepte(), autocomplete: 'off' });
  const real = crear();
  const trampa = crear();
  trampa.tabIndex = -1;
  const etiquetaReal = crearElementRepte('span', { classes: ['etiqueta-repte'], textContent: 'Codi d’alumne' });
  const etiquetaTrampa = crearElementRepte('span', { classes: ['etiqueta-repte'], textContent: 'Codi d’alumne' });
  const blocReal = crearElementRepte('div', {}, [etiquetaReal, real]);
  const blocTrampa = crearElementRepte('div', { atributs: { 'aria-hidden': 'true', style: ESTIL_FORA_PANTALLA } },
    [etiquetaTrampa, trampa]);
  const grup = crearElementRepte('div', {}, dades.trampaAbans ? [blocTrampa, blocReal] : [blocReal, blocTrampa]);
  return { grup, real, trampa };
}

/**
 * Crea una llista desplegable personalitzada amb rols ARIA i opcions generades en obrir-la.
 * @param {string[]} opcions Textos de les opcions.
 * @returns {{grup: HTMLElement, getValor: function(): string}} Control i lector del valor seleccionat.
 */
function crearLlistaPersonalitzadaRepte(opcions) {
  let valor = '';
  let actiu = -1;
  const idEtiqueta = getIdentificadorRepte();
  const llista = crearElementRepte('ul', { id: getIdentificadorRepte(), hidden: true, atributs: { role: 'listbox' } });
  const control = crearElementRepte('div', { tabIndex: 0, textContent: 'Selecciona…', atributs: {
    role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
    'aria-labelledby': idEtiqueta, 'aria-controls': llista.id } });
  const marcarActiu = index => {
    actiu = (index + opcions.length) % opcions.length;
    [...llista.children].forEach((element, posicio) => element.toggleAttribute('data-actiu', posicio === actiu));
    control.setAttribute('aria-activedescendant', llista.children[actiu].id);
  };
  const tancar = () => {
    llista.hidden = true;
    llista.replaceChildren();
    control.setAttribute('aria-expanded', 'false');
    control.removeAttribute('aria-activedescendant');
  };
  const seleccionar = text => { valor = text; control.textContent = text; tancar(); control.focus(); };
  const obrir = () => {
    llista.replaceChildren(...opcions.map(text => {
      const opcio = crearElementRepte('li', { id: getIdentificadorRepte(), textContent: text,
        atributs: { role: 'option', 'aria-selected': String(text === valor) } });
      opcio.addEventListener('mousedown', esdeveniment => esdeveniment.preventDefault());
      opcio.addEventListener('click', () => seleccionar(text));
      return opcio;
    }));
    llista.hidden = false;
    control.setAttribute('aria-expanded', 'true');
    marcarActiu(Math.max(0, opcions.indexOf(valor)));
  };
  control.addEventListener('click', () => (llista.hidden ? obrir() : tancar()));
  control.addEventListener('blur', () => setTimeout(() => { if (!llista.contains(document.activeElement)) tancar(); }, 150));
  control.addEventListener('keydown', esdeveniment => {
    const tecla = esdeveniment.key;
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape'].includes(tecla)) return;
    esdeveniment.preventDefault();
    if (tecla === 'Escape') tancar();
    else if (llista.hidden) obrir();
    else if (tecla === 'ArrowDown' || tecla === 'ArrowUp') marcarActiu(actiu + (tecla === 'ArrowDown' ? 1 : -1));
    else seleccionar(opcions[actiu]);
  });
  const grup = crearElementRepte('div', { classes: ['llista-repte'] }, [
    crearElementRepte('span', { id: idEtiqueta, classes: ['etiqueta-repte'], textContent: 'Assignatura' }), control, llista]);
  return { grup, getValor: () => valor };
}

/**
 * Crea un iframe amb el camp de nota i en manté sincronitzat el valor.
 * @returns {{grup: HTMLElement, getValor: function(): string, aturar: function(): void}} Control, lector i neteja.
 */
function crearIframeNotaRepte() {
  const idCamp = getIdentificadorRepte();
  let valor = '';
  const marc = crearElementRepte('iframe', { title: 'Formulari de nota' });
  marc.srcdoc = `<!DOCTYPE html><html lang="ca"><head><meta charset="UTF-8"><style>
body{margin:0;padding:.2rem;font:1rem/1.6 system-ui,sans-serif;color:#172b3a}
label{display:block;font-weight:650;margin-bottom:.4rem}
input{box-sizing:border-box;width:100%;padding:.75rem;border:1px solid #93a6b5;border-radius:.5rem;font:inherit}
</style></head><body><label for="${idCamp}">Nota final</label><input id="${idCamp}" inputmode="decimal" autocomplete="off">
<script>const camp=document.getElementById('${idCamp}');const avisar=()=>parent.postMessage({tipus:'campusrpa-repte-nota',valor:camp.value},'*');
camp.addEventListener('input',avisar);camp.addEventListener('change',avisar);</script></body></html>`;
  const rebre = esdeveniment => {
    if (esdeveniment.source === marc.contentWindow && esdeveniment.data?.tipus === 'campusrpa-repte-nota' &&
      typeof esdeveniment.data.valor === 'string') valor = esdeveniment.data.valor.slice(0, 10);
  };
  window.addEventListener('message', rebre);
  const getValor = () => {
    try {
      const camp = marc.contentDocument?.getElementById(idCamp);
      if (camp) return camp.value;
    } catch (error) {
      console.warn('No es pot llegir l’iframe directament; s’usa l’últim valor rebut.', error);
    }
    return valor;
  };
  return { grup: marc, getValor, aturar: () => window.removeEventListener('message', rebre) };
}

/**
 * Crea la confirmació real dins d'un Shadow DOM i una casella esquer al DOM principal.
 * @param {object} dades Dades del repte.
 * @returns {{grup: HTMLElement, isConfirmat: function(): boolean, isEsquer: function(): boolean}} Controls creats.
 */
function crearConfirmacioRepte(dades) {
  const amfitrio = crearElementRepte('div');
  const arrel = amfitrio.attachShadow({ mode: 'open' });
  const idCasella = getIdentificadorRepte();
  const estil = document.createElement('style');
  estil.textContent = 'div{display:flex;gap:.6rem;align-items:center;margin:.6rem 0}label{font-weight:650}';
  const casella = Object.assign(document.createElement('input'), { type: 'checkbox', id: idCasella });
  const etiqueta = Object.assign(document.createElement('label'), { htmlFor: idCasella,
    textContent: 'Confirmo que les dades són correctes' });
  const bloc = document.createElement('div');
  bloc.append(casella, etiqueta);
  arrel.append(estil, bloc);
  const esquer = crearElementRepte('input', { type: 'checkbox' });
  const etiquetaEsquer = crearElementRepte('label', { classes: ['opcio'] }, [esquer, 'Confirmo que les dades són d’exemple']);
  const grup = crearElementRepte('div', {}, dades.esquerAbans ? [etiquetaEsquer, amfitrio] : [amfitrio, etiquetaEsquer]);
  return { grup, isConfirmat: () => casella.checked, isEsquer: () => esquer.checked };
}

/**
 * Dibuixa el codi de verificació en un canvas i crea el camp per escriure'l.
 * @param {object} dades Dades del repte.
 * @returns {{grup: HTMLElement, camp: HTMLInputElement}} Control i camp de text.
 */
function crearCodiImatgeRepte(dades) {
  const llenc = crearElementRepte('canvas', { width: 280, height: 80, atributs: { role: 'img',
    'aria-label': 'Codi de verificació en imatge' } });
  const context = llenc.getContext('2d');
  context.fillStyle = '#eef4f7';
  context.fillRect(0, 0, llenc.width, llenc.height);
  context.fillStyle = '#172b3a';
  context.font = 'bold 40px Consolas, "Courier New", monospace';
  context.textBaseline = 'middle';
  [...dades.codi].forEach((caracter, index) => {
    context.save();
    context.translate(28 + index * 42, 42);
    context.rotate(dades.rotacions[index]);
    context.fillText(caracter, -11, 0);
    context.restore();
  });
  const camp = crearElementRepte('input', { type: 'text', placeholder: 'Escriu el codi de la imatge',
    autocomplete: 'off', atributs: { 'aria-label': 'Codi de verificació', maxlength: '6' } });
  return { grup: crearElementRepte('div', { classes: ['codi-repte'] }, [llenc, camp]), camp };
}

/**
 * Crea el botó d'enviament real i els botons esquer en ordre variable.
 * @param {object} dades Dades del repte.
 * @param {function(string): void} enClicEsquer Acció en prémer un esquer actiu.
 * @returns {HTMLElement} Contenidor de botons.
 */
function crearBotonsRepte(dades, enClicEsquer) {
  const crear = (tipus, text, classes = ['boto']) => crearElementRepte('button', { type: tipus, textContent: text, classes });
  const botons = {
    real: crear('submit', 'Enviar'),
    amagat: Object.assign(crear('submit', 'Enviar'), { hidden: true }),
    desactivat: Object.assign(crear('submit', 'Enviar'), { disabled: true }),
    fora: Object.assign(crear('button', 'Enviar'), { tabIndex: -1 }),
    esborrany: crear('button', 'Enviar esborrany', ['boto', 'secundari'])
  };
  botons.fora.setAttribute('aria-hidden', 'true');
  botons.fora.setAttribute('style', ESTIL_FORA_PANTALLA);
  botons.fora.addEventListener('click', () => enClicEsquer('Has premut un botó «Enviar» situat fora de la pantalla.'));
  botons.esborrany.addEventListener('click', () => enClicEsquer('Esborrany desat. Aquest no és l’enviament definitiu.'));
  return crearElementRepte('div', { classes: ['accions'] }, dades.botons.map(nom => botons[nom]));
}

/**
 * Mostra el resultat de la validació en una regió viva.
 * @param {HTMLElement} contenidor Regió de resultat.
 * @param {object} avaluacio Resultat de validarRespostaRepte.
 * @returns {void}
 */
function mostrarResultatRepte(contenidor, avaluacio) {
  contenidor.dataset.estat = avaluacio.superat ? 'superat' : 'no-superat';
  const total = avaluacio.resultats.length;
  const resum = crearElementRepte('p', { classes: ['message', avaluacio.superat ? 'success' : 'error'],
    textContent: avaluacio.superat ? `Repte superat: ${total}/${total}.` : `Repte no superat: ${avaluacio.correctes}/${total}.` });
  const llista = crearElementRepte('ul', {}, avaluacio.resultats.map(resultat => crearElementRepte('li', {
    classes: [resultat.correcte ? 'success' : 'error'], textContent: `${resultat.repte}: ${resultat.missatge}` })));
  contenidor.replaceChildren(resum, llista);
}

/**
 * Llegeix la llavor i l'espera opcionals de la URL.
 * @returns {{llavor: number|null, esperaMs: number|null}} Paràmetres vàlids o null.
 */
function llegirParametresRepte() {
  const parametres = new URLSearchParams(location.search);
  const llavor = Number(parametres.get('llavor'));
  const espera = parametres.has('espera') ? Number(parametres.get('espera')) : Number.NaN;
  return {
    llavor: Number.isInteger(llavor) && llavor >= 1 && llavor <= LLAVOR_MAXIMA_REPTE ? llavor : null,
    esperaMs: Number.isInteger(espera) && espera >= 0 && espera <= 10 ? espera * 1000 : null
  };
}

/**
 * Inicia la pàgina del repte de selectors i permet generar-ne de nous.
 * @returns {void}
 */
function iniciarRepteSelectors() {
  const zona = document.querySelector('main > [data-zona-repte]');
  const indicadorLlavor = document.getElementById('repte-llavor');
  const parametres = llegirParametresRepte();
  let netejar = () => {};
  const muntar = llavor => {
    netejar();
    const dades = generarDadesRepte(llavor);
    const espera = parametres.esperaMs ?? dades.esperaMs;
    indicadorLlavor.textContent = `Llavor: ${llavor}`;
    const fitxes = [crearFitxaRepte('Alumne a processar', dades.objectiu),
      crearFitxaRepte('Alumne d’exemple (no processar)', dades.exemple)];
    if (dades.exempleAbans) fitxes.reverse();
    const carregant = crearElementRepte('p', { classes: ['estat-consulta'], textContent: 'Carregant notes…' });
    const seccioNotes = crearElementRepte('section', { classes: ['targeta'] }, [
      crearElementRepte('h2', { textContent: 'Notes' }), carregant]);
    const temporitzador = setTimeout(() => carregant.replaceWith(crearTaulaRepte(dades)), espera);
    let esquers = 0;
    const resultat = crearElementRepte('div', { atributs: { 'data-resultat': '', role: 'status', 'aria-live': 'polite' } });
    const avisarEsquer = missatge => {
      esquers += 1;
      resultat.dataset.estat = 'esquer';
      resultat.replaceChildren(crearElementRepte('p', { classes: ['message', 'warning'], textContent: missatge }));
    };
    const codiAlumne = crearCampCodiRepte(dades);
    const llista = crearLlistaPersonalitzadaRepte(dades.assignatures);
    const nota = crearIframeNotaRepte();
    const confirmacio = crearConfirmacioRepte(dades);
    const codiImatge = crearCodiImatgeRepte(dades);
    const formulari = crearElementRepte('form', { noValidate: true, classes: ['practica'] }, [
      codiAlumne.grup, llista.grup, nota.grup, confirmacio.grup, codiImatge.grup, crearBotonsRepte(dades, avisarEsquer)]);
    formulari.addEventListener('submit', esdeveniment => {
      esdeveniment.preventDefault();
      mostrarResultatRepte(resultat, validarRespostaRepte(dades, {
        codiAlumne: codiAlumne.real.value, trampa: codiAlumne.trampa.value, assignatura: llista.getValor(),
        nota: nota.getValor(), confirmat: confirmacio.isConfirmat(), confirmacioEsquer: confirmacio.isEsquer(),
        codi: codiImatge.camp.value, esquers }));
    });
    zona.replaceChildren(crearElementRepte('div', { classes: ['fitxes-repte'] }, fitxes), seccioNotes,
      crearElementRepte('section', { classes: ['targeta'] }, [crearElementRepte('h2', { textContent: 'Formulari' }),
        formulari, resultat]));
    netejar = () => { clearTimeout(temporitzador); nota.aturar(); };
  };
  document.getElementById('repte-nou').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname + (parametres.esperaMs === null ? '' : `?espera=${parametres.esperaMs / 1000}`));
    muntar(1 + Math.floor(Math.random() * LLAVOR_MAXIMA_REPTE));
  });
  muntar(parametres.llavor ?? 1 + Math.floor(Math.random() * LLAVOR_MAXIMA_REPTE));
}

try {
  iniciarRepteSelectors();
} catch (error) {
  console.error('No s’ha pogut iniciar el repte de selectors.', error);
  const avis = document.createElement('p');
  avis.className = 'message error';
  avis.setAttribute('role', 'alert');
  avis.textContent = 'No s’ha pogut iniciar el repte. Recarrega la pàgina.';
  document.getElementById('contingut').prepend(avis);
}
