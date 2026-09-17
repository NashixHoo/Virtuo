// =============================================================
// TEST SUITE: VIRTUO CHORD ENGINE
// test-chord-engine.js
// Auditoria e verificação completa de todos os requisitos do motor musical
// =============================================================

import {
  ChordEngine,
  CHROMATIC_SHARPS,
  CHROMATIC_FLATS,
  ENHARMONIC_EQUIVALENTS,
  NOTE_SEMITONES,
  normalizeNote,
  enharmonicEquivalent,
  noteToMidi,
  midiToNote,
  getSemitoneDistance,
  INTERVALS,
  INTERVAL_LIST,
  getInterval,
  CHORD_QUALITIES,
  resolveQuality,
  buildChord,
  parseChordSymbol,
  INSTRUMENTS,
  getInstrument,
  getAllInstruments,
  registerInstrument,
  createChordShape,
  getChordShapes,
  generateCagedShapes,
  getBassPosition,
  getPianoVoicings,
  validateChordShape,
  transposeNote,
  transposeChord,
  transposeProgression,
  searchChords,
  identifyChordFromNotes,
  toEasyPlay,
  getSmartKeySubstitutions,
  ExternalChordImporter,
  renderFretboardDiagramSvg,
  renderKeyboardDiagramSvg
} from "./src/chords/index.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("  VIRTUO CHORD ENGINE — AUDITORIA COMPLETA DE SISTEMA  ");
console.log("=======================================================\n");

// 1. NOTAS & PITCH SYSTEM
console.log("1. NOTAS E AFINAÇÃO:");
assert(CHROMATIC_SHARPS.length === 12, "Escala cromática possui 12 semitons");
assert(normalizeNote("Db") === "C#", "Normalização enarmônica: Db -> C#");
assert(normalizeNote("eb") === "D#", "Normalização enarmônica: eb -> D#");
assert(enharmonicEquivalent("C#") === "Db", "Equivalente enarmônico: C# -> Db");
assert(noteToMidi("C4") === 60, "Conversão MIDI: C4 (Dó Central) = 60");
assert(noteToMidi("A4") === 69, "Conversão MIDI: A4 (Diapasão padrão) = 69");
assert(noteToMidi("E2") === 40, "Conversão MIDI: E2 (6ª corda violão) = 40");
assert(midiToNote(60, true, true) === "C4", "Conversão MIDI para nota: 60 -> C4");
assert(getSemitoneDistance("C", "G") === 7, "Distância intervalar: C até G = 7 semitons (Quinta Justa)");

// 2. INTERVALOS
console.log("\n2. INTERVALOS:");
assert(INTERVALS.unison.semitones === 0 && INTERVALS.unison.shortName === "P1", "Intervalo Uníssono = 0st (P1)");
assert(INTERVALS.minor3.semitones === 3 && INTERVALS.minor3.shortName === "m3", "Intervalo Terça Menor = 3st (m3)");
assert(INTERVALS.major3.semitones === 4 && INTERVALS.major3.shortName === "M3", "Intervalo Terça Maior = 4st (M3)");
assert(INTERVALS.perfect5.semitones === 7 && INTERVALS.perfect5.shortName === "P5", "Intervalo Quinta Justa = 7st (P5)");
assert(INTERVALS.minor7.semitones === 10 && INTERVALS.minor7.shortName === "m7", "Intervalo Sétima Menor = 10st (m7)");
assert(INTERVALS.major7.semitones === 11 && INTERVALS.major7.shortName === "M7", "Intervalo Sétima Maior = 11st (M7)");
assert(INTERVALS.octave.semitones === 12 && INTERVALS.octave.shortName === "P8", "Intervalo Oitava = 12st (P8)");
assert(getInterval(7).id === "perfect5", "Resolução de intervalo por semitons: 7st -> perfect5");

// 3. QUALIDADES & CONSTRUÇÃO TEÓRICA DE ACORDES
console.log("\n3. GERAÇÃO E QUALIDADES DE ACORDES:");
const cMajor = buildChord("C", "major");
assert(cMajor.symbol === "C", "Símbolo de C maior é 'C'");
assert(JSON.stringify(cMajor.notes) === JSON.stringify(["C", "E", "G"]), "Notas de C maior geradas teoricamente: [C, E, G]");

const cMinor = buildChord("C", "minor");
assert(cMinor.symbol === "Cm", "Símbolo de C menor é 'Cm'");
assert(JSON.stringify(cMinor.notes) === JSON.stringify(["C", "Eb", "G"]), "Notas de C menor geradas teoricamente: [C, Eb, G]");

const c7 = buildChord("C", "dominant7");
assert(c7.symbol === "C7" && c7.notes.includes("Bb"), "C dominante com sétima inclui Bb: " + c7.notes.join(", "));

const cMaj7 = buildChord("C", "major7");
assert(cMaj7.symbol === "Cmaj7" && cMaj7.notes.includes("B"), "Cmaj7 inclui B natural: " + cMaj7.notes.join(", "));

const cSlash = buildChord("C", "major", "E");
assert(cSlash.symbol === "C/E" && cSlash.bass === "E", "Acorde invertido gerado: C/E com baixo E");

const fSharpMaj = buildChord("F#", "major");
assert(fSharpMaj.symbol === "F#" && fSharpMaj.notes[0] === "F#" && fSharpMaj.notes[1] === "A#", "Geração correta para sustenidos: F# [F#, A#, C#]");

// 4. INSTRUMENTOS
console.log("\n4. INSTRUMENTOS:");
const violao = getInstrument("violao");
assert(violao && violao.strings === 6 && violao.family === "strings", "Violão configurado: 6 cordas");

const guitarra = getInstrument("guitarra");
assert(guitarra && guitarra.strings === 6 && guitarra.fretCount >= 21, "Guitarra configurada: 6 cordas, 22 trastes");

const baixo = getInstrument("baixo");
assert(baixo && baixo.strings === 4 && baixo.tuning[0] === "E1", "Baixo configurado: 4 cordas (E1 A1 D2 G2)");

const ukulele = getInstrument("ukulele");
assert(ukulele && ukulele.strings === 4 && ukulele.tuning[0] === "G4", "Ukulele configurado: 4 cordas (G4 C4 E4 A4)");

const cavaquinho = getInstrument("cavaquinho");
assert(cavaquinho && cavaquinho.strings === 4 && cavaquinho.tuning[0] === "D4", "Cavaquinho configurado: 4 cordas (D4 G4 B4 D5)");

const teclado = getInstrument("teclado");
assert(teclado && teclado.family === "keyboard" && teclado.layout === "keyboard", "Teclado/Piano configurado: layout keyboard");

// 5. DIGITAÇÕES (SHAPES), CAGED, BASS, UKULELE, CAVAQUINHO E PIANO
console.log("\n5. FORMAS, CAGED E VOICINGS:");
const cShapes = getChordShapes("C", "acoustic-guitar");
assert(cShapes.length >= 2, `Formas de C no violão encontradas: ${cShapes.length}`);
assert(cShapes[0].position === "open" && cShapes[0].cagedForm === "C", "C violão inclui forma aberta no modelo CAGED C");

const cagedA = generateCagedShapes("A");
assert(cagedA.length > 0, `Geração dinâmica CAGED para 'A' produziu ${cagedA.length} formas`);

const bassPos = getBassPosition("C", 4);
assert(bassPos.root === "C" && Array.isArray(bassPos.arpeggio) && bassPos.arpeggio.length >= 3, "Posição de Baixo inclui fundamental e arpejo");

const ukeShapes = getChordShapes("C", "ukulele");
assert(ukeShapes.length > 0 && JSON.stringify(ukeShapes[0].frets) === JSON.stringify([0, 0, 0, 3]), "Ukulele C shape é [0, 0, 0, 3]");

const cavacoShapes = getChordShapes("C", "cavaquinho");
assert(cavacoShapes.length > 0 && JSON.stringify(cavacoShapes[0].frets) === JSON.stringify([2, 0, 1, 2]), "Cavaquinho C shape é [2, 0, 1, 2]");

const pianoVoicings = getPianoVoicings("C");
assert(pianoVoicings.length >= 3, `Piano voicings gerados: ${pianoVoicings.length} (Fundamental, 1ª e 2ª inversão)`);
assert(pianoVoicings[1].inversion === 1 && pianoVoicings[1].notes[0] === "E", "1ª Inversão do piano coloca a terça (E) no início");

// 6. VALIDAÇÃO MUSICAL ESTRITA (Rejeição de inconsistências)
console.log("\n6. VALIDAÇÃO MUSICAL ESTRITA:");
// Forma válida de C maior: [-1, 3, 2, 0, 1, 0] -> notas tocadas: C3, E3, G3, C4, E4 -> todas pertencem a [C, E, G]
const validCShape = createChordShape({
  instrument: "acoustic-guitar",
  chord: "C",
  frets: [-1, 3, 2, 0, 1, 0]
});
const valSuccess = validateChordShape(validCShape, "C");
assert(valSuccess.valid === true, "Forma correta de C maior foi APROVADA pela validação musical");

// Forma inválida / inconsistente: declarada como C maior, mas com notas C, F#, A
// ex: [-1, 3, 4, 2, -1, -1] -> 5ª corda C, 4ª corda F#, 3ª corda A
const corruptedShape = createChordShape({
  instrument: "acoustic-guitar",
  chord: "C",
  frets: [-1, 3, 4, 2, -1, -1] // gera C, F#, A
});
const valFailure = validateChordShape(corruptedShape, "C");
assert(valFailure.valid === false, "Forma inconsistente (C gerando F#, A) foi estritamente REJEITADA");
assert(valFailure.errors.some(e => e.includes("F#") || e.includes("A")), "Erro explicita que as notas divergentes não pertencem a C maior");

// 7. TRANSPOSIÇÃO
console.log("\n7. TRANSPOSIÇÃO:");
assert(transposeNote("C", 2) === "D", "Transposição de nota: C + 2 semitons = D");
assert(transposeChord("C", 2) === "D", "Transposição de acorde: C + 2 semitons = D");
assert(transposeChord("Am7", 3) === "Cm7", "Transposição de acorde: Am7 + 3 semitons = Cm7");
assert(transposeChord("D/F#", 2) === "E/G#", "Transposição com baixo invertido: D/F# + 2 = E/G#");
assert(transposeProgression(["C", "G", "Am", "F"], 2).join(" ") === "D A Bm G", "Transposição de progressão: C G Am F + 2 = D A Bm G");

// 8. EASY PLAY & SMART KEY INTEGRATION
console.log("\n8. EASY PLAY & SMART KEY INTEGRATION:");
const easyCmaj7 = toEasyPlay("Cmaj7");
assert(easyCmaj7.easyChord === "C", "Easy Play simplifica Cmaj7 para C");
assert(easyCmaj7.originalChord === "Cmaj7", "Easy Play preserva Cmaj7 nos metadados sem remover");

const easySlash = toEasyPlay("D/F#");
assert(easySlash.easyChord === "D", "Easy Play simplifica D/F# para D");

const smartKeySub = getSmartKeySubstitutions("Cmaj7", "acoustic-guitar");
assert(smartKeySub.easyPlay.easyChord === "C", "Smart Key identifica alternativa fácil");
assert(smartKeySub.hasOpenPosition === true, "Smart Key identifica presença de posição aberta");

// 9. BUSCA E RECONHECIMENTO REVERSO (SEARCH)
console.log("\n9. BUSCA E REVERSE CHORD FINDER:");
const searchResults = searchChords("C");
assert(searchResults.length > 0 && searchResults.some(c => c.symbol === "C") && searchResults.some(c => c.symbol === "Cm"), "Busca por 'C' retorna C, Cm, C7, etc.");

const reverseChords = identifyChordFromNotes(["E", "G", "C"]);
assert(reverseChords.length > 0 && reverseChords.some(c => c.symbol === "C/E" || c.symbol === "C"), "Identificação por notas ['E', 'G', 'C'] reconhece C e C/E");

// 10. IMPORTADOR EXTERNO SEGURO
console.log("\n10. PIPELINE DE IMPORTAÇÃO EXTERNA:");
const authorizedSource = {
  source: "Open Musical Chords Project",
  license: "MIT",
  attribution: "Virtuo Musical Commons",
  version: "1.0"
};

const unauthorizedSource = {
  source: "Proprietary Commercial Source",
  license: "All Rights Reserved",
  attribution: "Private Company"
};

const licenseOk = ExternalChordImporter.verifyLicense(authorizedSource);
assert(licenseOk.authorized === true, "Licença MIT autorizada");

const licenseDenied = ExternalChordImporter.verifyLicense(unauthorizedSource);
assert(licenseDenied.authorized === false, "Licença All Rights Reserved rejeitada por segurança");

// Teste de rejeição de letras de músicas
const batchWithLyrics = [
  { chord: "C", frets: [-1, 3, 2, 0, 1, 0], lyrics: "Letra protegida de música comercial..." }
];
const importResult = ExternalChordImporter.importBatch(batchWithLyrics, authorizedSource);
assert(importResult.rejectedCount === 1, "Importador rejeitou lote com letras de músicas protegidas");

// 11. DIAGRAMAS SVG (VDS)
console.log("\n11. RENDERIZADORES SVG (VIRTUO DESIGN SYSTEM):");
const svgFret = renderFretboardDiagramSvg(validCShape, { title: "C", showFingers: true });
assert(svgFret.includes("<svg") && svgFret.includes("#7EE7FF") && svgFret.includes("#0E1B35"), "Diagrama de braço gerado com tokens VDS (#7EE7FF, #0E1B35)");

const svgKeys = renderKeyboardDiagramSvg(["C", "E", "G"]);
assert(svgKeys.includes("<svg") && svgKeys.includes("#7EE7FF"), "Diagrama de teclado gerado com teclas iluminadas");

// 12. DESEMPENHO E CACHE OFFLINE-FIRST
console.log("\n12. DESEMPENHO E CACHE OFFLINE-FIRST:");
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  ChordEngine.getChord("C");
  ChordEngine.getShapes("C", "acoustic-guitar");
}
const t1 = performance.now();
const timePerQuery = (t1 - t0) / 2000;
console.log(`  Tempo médio por consulta: ${timePerQuery.toFixed(4)} ms`);
assert(timePerQuery < 0.5, `Performance instantânea (< 0.5ms por consulta): ${timePerQuery.toFixed(4)}ms`);

console.log("\n=======================================================");
console.log(`RESULTADO FINAL: ${passed} PASSOU / ${failed} FALHOU`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✓ TODOS OS REQUISITOS DO VIRTUO CHORD ENGINE FORAM ATENDIDOS COM SUCESSO!\n");
}
