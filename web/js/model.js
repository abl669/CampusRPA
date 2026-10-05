'use strict';

/** Clau de localStorage on es desen places i matrícules de la simulació. */
const CLAU_DADES = 'campusrpa.dades.v1';

const alumnes = new Map([
  ['ALU001', { nom: 'Ana García', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU002', { nom: 'Bruno López', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU003', { nom: 'Carla Martín', titulacio: 'Màster en Transformació Digital', estat: 'Actiu' }],
  ['ALU004', { nom: 'Diego Serra', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU005', { nom: 'Elena Costa', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU006', { nom: 'Ferran Vidal', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU007', { nom: 'Gemma Pons', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU008', { nom: 'Hugo Riera', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU009', { nom: 'Irene Mas', titulacio: 'Màster en Transformació Digital', estat: 'Actiu' }],
  ['ALU010', { nom: 'Joan Serra', titulacio: 'Grau en Enginyeria', estat: 'Bloquejat' }]
]);
const assignatures = Object.freeze([
  { nom: 'Automatització RPA', places: 10, credits: 6, codi: 'RPA-101' },
  { nom: 'Power Automate', places: 15, credits: 6, codi: 'PA-201' },
  { nom: 'Automatització Web', places: 5, credits: 6, codi: 'WEB-210' },
  { nom: 'Gestió de Processos', places: 20, credits: 12, codi: 'GP-110' },
  { nom: 'Bases de Dades', places: 0, credits: 6, codi: 'BD-301' }
]);

/**
 * Normalitza un nom per comparar-lo sense accents, caixa ni espais redundants.
 * @param {string} text Nom que es vol comparar.
 * @returns {string} Clau normalitzada.
 */
function normalitzar(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toLocaleLowerCase('ca');
}

/**
 * Magatzem volàtil: les dades només existeixen mentre viu la instància.
 */
class MagatzemMemoria {
  #estat = null;

  /**
   * Retorna una còpia de l'estat desat.
   * @returns {object|null} Estat desat o null si no n'hi ha.
   */
  llegir() {
    return this.#estat === null ? null : structuredClone(this.#estat);
  }

  /**
   * Desa una còpia de l'estat.
   * @param {object} estat Estat serialitzable.
   * @returns {void}
   */
  desar(estat) {
    this.#estat = structuredClone(estat);
  }

  /**
   * Elimina l'estat desat.
   * @returns {void}
   */
  esborrar() {
    this.#estat = null;
  }
}

/**
 * Magatzem persistent al navegador, compartit entre pàgines i recàrregues.
 * Si localStorage no està disponible, continua en memòria i ho registra.
 */
class MagatzemLocal {
  #clau;
  #alternatiu = new MagatzemMemoria();
  #disponible = true;

  /**
   * @param {string} clau Clau de localStorage.
   */
  constructor(clau) {
    this.#clau = clau;
  }

  /**
   * Llegeix i interpreta l'estat desat.
   * @returns {object|null} Estat desat o null si no existeix o és il·legible.
   */
  llegir() {
    if (!this.#disponible) return this.#alternatiu.llegir();
    try {
      const text = localStorage.getItem(this.#clau);
      return text === null ? null : JSON.parse(text);
    } catch (error) {
      return this.#gestionarError("No s'ha pogut llegir l'estat desat.", error, () => this.#alternatiu.llegir());
    }
  }

  /**
   * Desa l'estat en format JSON.
   * @param {object} estat Estat serialitzable.
   * @returns {void}
   */
  desar(estat) {
    this.#alternatiu.desar(estat);
    if (!this.#disponible) return;
    try {
      localStorage.setItem(this.#clau, JSON.stringify(estat));
    } catch (error) {
      this.#gestionarError("No s'ha pogut desar l'estat; es continua en memòria.", error);
    }
  }

  /**
   * Elimina l'estat desat.
   * @returns {void}
   */
  esborrar() {
    this.#alternatiu.esborrar();
    try {
      localStorage.removeItem(this.#clau);
    } catch (error) {
      this.#gestionarError("No s'ha pogut esborrar l'estat desat.", error);
    }
  }

  #gestionarError(missatge, error, alternativa = () => null) {
    console.warn(missatge, error);
    if (error instanceof DOMException && error.name === 'SecurityError') this.#disponible = false;
    return alternativa();
  }
}

/**
 * Gestiona les consultes, les places i les matrícules de la simulació.
 */
class ServeiAcademic {
  #magatzem;
  #assignatures = new Map();
  #matricules = new Map();

  /**
   * @param {{llegir: Function, desar: Function}} magatzem Persistència de l'estat; per defecte, en memòria.
   */
  constructor(magatzem = new MagatzemMemoria()) {
    this.#magatzem = magatzem;
    this.#sincronitzar();
  }

  /**
   * Retorna el catàleg actual sense permetre modificar les places internes.
   * @returns {Array<{nom: string, places: number, credits: number, codi: string}>} Assignatures disponibles.
   */
  getCataleg() {
    this.#sincronitzar();
    return Array.from(this.#assignatures.values(), assignatura => ({ ...assignatura }));
  }

  /**
   * Comprova les dades, l'expedient, les places i l'existència d'una matrícula.
   * @param {string} identificador Identificador de l'alumne.
   * @param {string} nomAssignatura Nom de l'assignatura.
   * @returns {object} Resultat de la consulta, errors i disponibilitat de matrícula.
   */
  consultar(identificador, nomAssignatura) {
    this.#sincronitzar();
    const codiAlumne = identificador.trim().toUpperCase();
    const clauAssignatura = normalitzar(nomAssignatura);
    const alumne = alumnes.get(codiAlumne);
    const assignatura = this.#assignatures.get(clauAssignatura);
    const errors = {};
    if (!codiAlumne) errors.alumne = "Introdueix l'ID de l'alumne.";
    else if (!/^ALU\d{3}$/.test(codiAlumne)) errors.alumne = "L'ID ha de tenir el format ALU i tres dígits.";
    else if (!alumne) errors.alumne = 'Alumne no trobat.';
    if (!clauAssignatura) errors.assignatura = "Introdueix el nom de l'assignatura.";
    else if (nomAssignatura.trim().length > 100) errors.assignatura = 'El nom no pot superar els 100 caràcters.';
    else if (!assignatura) errors.assignatura = 'Assignatura no trobada.';
    const resultat = {
      codiAlumne, clauAssignatura, nomAssignatura: assignatura ? assignatura.nom : nomAssignatura.trim(),
      alumne: alumne ? { ...alumne } : null,
      assignatura: assignatura ? { ...assignatura } : null,
      errors, potMatricular: false,
      estatAssignatura: assignatura ? (assignatura.places > 0 ? 'Disponible' : 'Sense places') : 'No trobada',
      missatge: '', tipus: 'error', matricula: null
    };
    if (Object.keys(errors).length) {
      resultat.missatge = Object.values(errors).join(' ');
    } else if (alumne.estat !== 'Actiu') {
      resultat.missatge = "L'expedient de l'alumne està bloquejat. No es pot formalitzar la matrícula.";
    } else {
      const matricula = this.#matricules.get(this.#clauMatricula(codiAlumne, assignatura.codi));
      if (matricula) {
        resultat.matricula = { ...matricula };
        resultat.estatAssignatura = 'Matriculada';
        resultat.missatge = `Aquest alumne ja està matriculat. Referència: ${matricula.referencia}.`;
        resultat.tipus = 'warning';
      } else if (assignatura.places === 0) {
        resultat.missatge = 'No hi ha places disponibles.';
        resultat.tipus = 'warning';
      } else {
        resultat.potMatricular = true;
        resultat.missatge = 'La sol·licitud és vàlida. Pots formalitzar la matrícula.';
        resultat.tipus = 'success';
      }
    }
    return resultat;
  }

  /**
   * Revalida la sol·licitud i registra una matrícula, descomptant una única plaça.
   * @param {string} identificador Identificador de l'alumne.
   * @param {string} nomAssignatura Nom de l'assignatura.
   * @param {string} observacio Observació opcional, de fins a 500 caràcters.
   * @returns {object} Resultat actualitzat amb la matrícula o l'error de validació.
   */
  formalitzar(identificador, nomAssignatura, observacio = '') {
    const resultat = this.consultar(identificador, nomAssignatura);
    if (!resultat.potMatricular) return resultat;
    const nota = observacio.trim();
    if (nota.length > 500) {
      return { ...resultat, potMatricular: false, tipus: 'error',
        errors: { observacio: "L'observació no pot superar els 500 caràcters." },
        missatge: "L'observació no pot superar els 500 caràcters." };
    }
    const matricula = {
      referencia: `MAT-${String(this.#seguentNumero()).padStart(6, '0')}`,
      codiAlumne: resultat.codiAlumne, codiAssignatura: resultat.assignatura.codi, observacio: nota
    };
    this.#matricules.set(this.#clauMatricula(matricula.codiAlumne, matricula.codiAssignatura), matricula);
    this.#assignatures.get(resultat.clauAssignatura).places -= 1;
    this.#desar();
    return { ...this.consultar(identificador, nomAssignatura), tipus: 'success',
      missatge: `Matrícula formalitzada correctament. Referència: ${matricula.referencia}.` +
        (nota ? ` Observació: ${nota}` : '') };
  }

  #clauMatricula(codiAlumne, codiAssignatura) {
    return `${codiAlumne}:${codiAssignatura}`;
  }

  #seguentNumero() {
    let maxim = 0;
    for (const { referencia } of this.#matricules.values()) maxim = Math.max(maxim, Number(referencia.slice(4)));
    return maxim + 1;
  }

  /** Reconstrueix l'estat a partir del magatzem, descartant dades manipulades o incoherents. */
  #sincronitzar() {
    const estat = this.#magatzem.llegir();
    const places = estat && typeof estat.places === 'object' && estat.places !== null ? estat.places : {};
    this.#assignatures = new Map(assignatures.map(assignatura => {
      const desades = Object.hasOwn(places, assignatura.codi) ? places[assignatura.codi] : assignatura.places;
      const valides = Number.isInteger(desades) && desades >= 0 && desades <= assignatura.places;
      return [normalitzar(assignatura.nom), { ...assignatura, places: valides ? desades : assignatura.places }];
    }));
    this.#matricules = new Map();
    const codisAssignatura = new Set(assignatures.map(assignatura => assignatura.codi));
    for (const matricula of Array.isArray(estat && estat.matricules) ? estat.matricules : []) {
      if (matricula && /^MAT-\d{6}$/.test(matricula.referencia) && alumnes.has(matricula.codiAlumne) &&
          codisAssignatura.has(matricula.codiAssignatura) &&
          typeof matricula.observacio === 'string' && matricula.observacio.length <= 500) {
        const { referencia, codiAlumne, codiAssignatura, observacio } = matricula;
        this.#matricules.set(this.#clauMatricula(codiAlumne, codiAssignatura), { referencia, codiAlumne, codiAssignatura, observacio });
      }
    }
  }

  #desar() {
    this.#magatzem.desar({
      places: Object.fromEntries(Array.from(this.#assignatures.values(), assignatura => [assignatura.codi, assignatura.places])),
      matricules: Array.from(this.#matricules.values())
    });
  }
}
