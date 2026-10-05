'use strict';

/** Clau de localStorage on es registren les fallades simulades ja consumides. */
const CLAU_INCIDENCIES = 'campusrpa.incidencies.v1';
const SEGONS_MINIMS = 1;
const SEGONS_MAXIMS = 120;

/**
 * Catàleg d'escenaris. Cada pàgina HTML n'indica un a <body data-escenari="...">.
 * - carrega: l'aplicació apareix després d'un retard.
 * - consulta: 'lenta' | 'senseResposta' | 'intermitent' | null.
 * - matricula: 'fallada' | 'confirmacioPerduda' | null.
 */
const ESCENARIS = Object.freeze({
  normal: Object.freeze({ nom: 'Normal', carrega: false, consulta: null, matricula: null, segons: 0 }),
  carrega: Object.freeze({ nom: 'Càrrega lenta', carrega: true, consulta: null, matricula: null, segons: 10 }),
  consultaLenta: Object.freeze({ nom: 'Consulta lenta', carrega: false, consulta: 'lenta', matricula: null, segons: 10 }),
  senseResposta: Object.freeze({ nom: 'Consulta sense resposta', carrega: false, consulta: 'senseResposta', matricula: null, segons: 0 }),
  intermitent: Object.freeze({ nom: 'Error intermitent', carrega: false, consulta: 'intermitent', matricula: null, segons: 0 }),
  errorMatricula: Object.freeze({ nom: 'Error de matrícula', carrega: false, consulta: null, matricula: 'fallada', segons: 0 }),
  confirmacioPerduda: Object.freeze({ nom: 'Confirmació perduda', carrega: false, consulta: null, matricula: 'confirmacioPerduda', segons: 0 })
});

/**
 * Obté la configuració d'un escenari.
 * @param {string} clau Clau de l'escenari.
 * @returns {{nom: string, carrega: boolean, consulta: string|null, matricula: string|null, segons: number}} Configuració.
 * @throws {Error} Si l'escenari no existeix.
 */
function obtenirEscenari(clau) {
  if (!Object.hasOwn(ESCENARIS, clau)) throw new Error(`Escenari desconegut: ${String(clau).slice(0, 40)}.`);
  return ESCENARIS[clau];
}

/**
 * Llegeix el paràmetre «segons» de la URL i el limita a un enter vàlid.
 * @param {URLSearchParams} parametres Paràmetres de la URL.
 * @param {number} perDefecte Valor si el paràmetre no existeix o és invàlid.
 * @returns {number} Segons entre 1 i 120, o el valor per defecte.
 */
function llegirSegons(parametres, perDefecte) {
  const text = parametres.get('segons');
  if (text === null || !/^\d{1,3}$/.test(text)) return perDefecte;
  const segons = Number(text);
  return segons >= SEGONS_MINIMS && segons <= SEGONS_MAXIMS ? segons : perDefecte;
}

/**
 * Registra quines combinacions ja han patit la fallada simulada, perquè el reintent funcioni.
 */
class RegistreIncidencies {
  #magatzem;

  /**
   * @param {{llegir: Function, desar: Function}} magatzem Persistència del registre.
   */
  constructor(magatzem = new MagatzemMemoria()) {
    this.#magatzem = magatzem;
  }

  /**
   * Indica si cal fallar ara: només la primera vegada per operació i combinació.
   * @param {string} operacio Tipus d'operació ('consulta' o 'matricula').
   * @param {string} clau Combinació alumne i assignatura.
   * @returns {boolean} true si és el primer intent i s'ha de simular la fallada.
   */
  registrarPrimeraFallada(operacio, clau) {
    const estat = this.#magatzem.llegir();
    const registre = estat && typeof estat === 'object' ? estat : {};
    const fallades = Array.isArray(registre[operacio]) ? registre[operacio].filter(valor => typeof valor === 'string') : [];
    if (fallades.includes(clau)) return false;
    this.#magatzem.desar({ ...registre, [operacio]: [...fallades, clau] });
    return true;
  }
}

/**
 * Esborra matrícules, places i fallades consumides de totes les pàgines.
 * @returns {void}
 */
function reiniciarDades() {
  new MagatzemLocal(CLAU_DADES).esborrar();
  new MagatzemLocal(CLAU_INCIDENCIES).esborrar();
}
