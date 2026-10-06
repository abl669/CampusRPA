'use strict';

/** Clau de localStorage on es desen places i matrícules de la simulació. */
const CLAU_DADES = 'campusrpa.dades.v2';

/** Sol·licituds de CampusRPA_dades.xlsx; els crèdits sol·licitats no són els del catàleg. */
const SOLLICITUDS_EXCEL = Object.freeze([
  { identificador: 'SOL001', codiAlumne: 'ALU001', nom: 'Anna Ferrer', assignatura: 'Automatització RPA', credits: 6, email: 'anna.ferrer@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL002', codiAlumne: 'ALU002', nom: 'Pau Vidal', assignatura: 'Power Automate', credits: 12, email: 'pau.vidal@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL003', codiAlumne: 'ALU003', nom: 'Laia Serra', assignatura: 'Bases de dades', credits: 18, email: 'laia.serra@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL004', codiAlumne: 'ALU004', nom: 'Marc Torres', assignatura: 'Arquitectura de sistemes', credits: 30, email: 'marc.torres@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL005', codiAlumne: 'ALU005', nom: 'Núria Costa', assignatura: 'Programació Python', credits: 6, email: 'nuria.costa@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL006', codiAlumne: 'ALU006', nom: 'Joan Riera', assignatura: 'Automatització Web', credits: 0, email: 'joan.riera@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL007', codiAlumne: 'ALU007', nom: 'Clara Bosch', assignatura: 'Assignatura Inexistent', credits: 6, email: 'clara.bosch@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL008', codiAlumne: 'ALU008', nom: 'Enric Pons', assignatura: 'Bases de dades', credits: 6, email: 'enric.pons@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL009', codiAlumne: 'ALU009', nom: 'Marta Soler', assignatura: 'Python avançat', credits: 12, email: 'marta.soler@campusrpa.test', estat: 'Actiu' },
  { identificador: 'SOL010', codiAlumne: 'ALU010', nom: 'Toni Mir', assignatura: 'Power Automate', credits: 6, email: 'toni.mir@campusrpa.test', estat: 'Bloquejat' }
].map(sollicitud => Object.freeze(sollicitud)));

const alumnes = new Map([
  ...SOLLICITUDS_EXCEL.map(sollicitud => [sollicitud.codiAlumne, {
    nom: sollicitud.nom, email: sollicitud.email, estat: sollicitud.estat,
    titulacio: 'Grau en Informàtica'
  }]),
  ['ALU011', { nom: 'Ana García', email: 'ana.garcia@campusrpa.test', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU012', { nom: 'Bruno López', email: 'bruno.lopez@campusrpa.test', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU013', { nom: 'Carla Martín', email: 'carla.martin@campusrpa.test', titulacio: 'Màster en Transformació Digital', estat: 'Actiu' }],
  ['ALU014', { nom: 'Diego Serra', email: 'diego.serra@campusrpa.test', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU015', { nom: 'Elena Costa', email: 'elena.costa@campusrpa.test', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU016', { nom: 'Ferran Vidal', email: 'ferran.vidal@campusrpa.test', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU017', { nom: 'Gemma Pons', email: 'gemma.pons@campusrpa.test', titulacio: 'Grau en Informàtica', estat: 'Actiu' }],
  ['ALU018', { nom: 'Hugo Riera', email: 'hugo.riera@campusrpa.test', titulacio: 'Grau en Enginyeria', estat: 'Actiu' }],
  ['ALU019', { nom: 'Irene Mas', email: 'irene.mas@campusrpa.test', titulacio: 'Màster en Transformació Digital', estat: 'Actiu' }],
  ['ALU020', { nom: 'Joan Serra', email: 'joan.serra@campusrpa.test', titulacio: 'Grau en Enginyeria', estat: 'Bloquejat' }]
]);
const assignatures = Object.freeze([
  { nom: 'Automatització RPA', places: 20, credits: 6, codi: 'RPA001', estat: 'Activa' },
  { nom: 'Power Automate', places: 15, credits: 12, codi: 'PA001', estat: 'Activa' },
  { nom: 'Bases de dades', places: 0, credits: 6, codi: 'BDD001', estat: 'Activa' },
  { nom: 'Arquitectura de sistemes', places: 8, credits: 6, codi: 'SYS001', estat: 'Activa' },
  { nom: 'Programació Python', places: 25, credits: 6, codi: 'PY001', estat: 'Activa' },
  { nom: 'Automatització Web', places: 12, credits: 6, codi: 'WEB001', estat: 'Activa' },
  { nom: 'Python avançat', places: 5, credits: 12, codi: 'PYA001', estat: 'Inactiva' },
  { nom: 'Gestió de Processos', places: 20, credits: 12, codi: 'GP-110', estat: 'Activa' }
].map(assignatura => Object.freeze(assignatura)));

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
   * @returns {Array<{nom: string, places: number, credits: number, codi: string, estat: string}>} Assignatures del catàleg.
   */
  getCataleg() {
    this.#sincronitzar();
    return Array.from(this.#assignatures.values(), assignatura => ({ ...assignatura }));
  }

  /**
   * Retorna les matrícules registrades amb les dades de l'alumne i l'assignatura.
   * @returns {Array<object>} Historial independent de l'estat intern.
   */
  getMatricules() {
    this.#sincronitzar();
    return Array.from(this.#matricules.values(), matricula => ({
      ...matricula, alumne: { ...alumnes.get(matricula.codiAlumne) },
      assignatura: { ...assignatures.find(assignatura => assignatura.codi === matricula.codiAssignatura) }
    }));
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
      sollicitud: SOLLICITUDS_EXCEL.find(sollicitud =>
        sollicitud.codiAlumne === codiAlumne && normalitzar(sollicitud.assignatura) === clauAssignatura) || null,
      errors, potMatricular: false,
      estatAssignatura: assignatura ? (assignatura.estat !== 'Activa' ? 'Inactiva' :
        (assignatura.places > 0 ? 'Disponible' : 'Sense places')) : 'No trobada',
      missatge: '', tipus: 'error', matricula: null
    };
    if (Object.keys(errors).length) {
      resultat.missatge = Object.values(errors).join(' ');
    } else if (alumne.estat !== 'Actiu') {
      resultat.missatge = "L'expedient de l'alumne està bloquejat. No es pot formalitzar la matrícula.";
    } else if (assignatura.estat !== 'Activa') {
      resultat.missatge = "L'assignatura està inactiva. No es pot formalitzar la matrícula.";
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
   * @param {object|null} opcions Opcions de la pràctica avançada o null per al mode bàsic.
   * @returns {object} Resultat actualitzat amb la matrícula o l'error de validació.
   */
  formalitzar(identificador, nomAssignatura, observacio = '', opcions = null) {
    const resultat = this.consultar(identificador, nomAssignatura);
    if (!resultat.potMatricular) return resultat;
    const nota = observacio.trim();
    if (opcions !== null && !isOpcionsMatriculaValides(opcions)) {
      return { ...resultat, potMatricular: false, tipus: 'error',
        errors: getErrorsOpcionsMatricula(opcions),
        missatge: 'Revisa la modalitat, el campus o la franja i accepta les condicions.' };
    }
    if (nota.length > 500) {
      return { ...resultat, potMatricular: false, tipus: 'error',
        errors: { observacio: "L'observació no pot superar els 500 caràcters." },
        missatge: "L'observació no pot superar els 500 caràcters." };
    }
    const matricula = {
      referencia: `MAT-${String(this.#seguentNumero()).padStart(6, '0')}`,
      codiAlumne: resultat.codiAlumne, codiAssignatura: resultat.assignatura.codi, observacio: nota,
      data: new Date().toISOString(), opcions: opcions === null ? null : { ...opcions }
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
        const data = typeof matricula.data === 'string' && Number.isFinite(Date.parse(matricula.data)) ? matricula.data : null;
        const opcions = isOpcionsMatriculaValides(matricula.opcions) ? { ...matricula.opcions } : null;
        this.#matricules.set(this.#clauMatricula(codiAlumne, codiAssignatura),
          { referencia, codiAlumne, codiAssignatura, observacio, data, opcions });
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

/**
 * Valida els controls opcionals de la pràctica de matrícula.
 * @param {object|null} opcions Modalitat, destinació i acceptació.
 * @returns {boolean} Si les opcions són vàlides.
 */
function isOpcionsMatriculaValides(opcions) {
  return opcions !== null && opcions !== undefined && Object.keys(getErrorsOpcionsMatricula(opcions)).length === 0;
}

/**
 * Identifica els errors dels camps obligatoris de les opcions de matrícula.
 * @param {object|null} opcions Modalitat, destinació i acceptació introduïdes.
 * @returns {object} Missatges indexats pel camp invàlid.
 */
function getErrorsOpcionsMatricula(opcions) {
  const errors = {};
  const destinacions = { presencial: ['Barcelona', 'Girona'], online: ['Matí', 'Tarda'] };
  const modalitatValida = opcions?.modalitat === 'presencial' || opcions?.modalitat === 'online';
  if (!modalitatValida) errors.modalitat = 'Selecciona una modalitat.';
  else if (!destinacions[opcions.modalitat].includes(opcions.destinacio)) {
    errors.destinacio = opcions.modalitat === 'presencial' ? 'Selecciona un campus.' : 'Selecciona una franja horària.';
  }
  if (opcions?.acceptades !== true) errors.acceptades = 'Accepta les condicions fictícies per continuar.';
  return errors;
}
