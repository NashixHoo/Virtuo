// =============================================================
// TEST SUITE: VIRTUO MUSICAL ENGINE
// test-musical-engine.js
// Validação automatizada de transposição harmônica e Easy Play
// =============================================================

import {
  transposeNote,
  transposeChord,
  transposeChordSheet,
  calculateKey
} from "./src/music/transposer.js";

import {
  parseChord,
  isChordToken,
  isChordLine
} from "./src/music/chord-parser.js";

import {
  simplifyChord,
  generateEasyPlaySheet,
  getEasyPlayCifra
} from "./src/music/easy-play.js";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertEqual(actual, expected, description) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  ✓ [PASS] ${description} -> ${actual}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(`     Esperado: "${expected}"`);
    console.error(`     Recebido: "${actual}"`);
  }
}

console.log("=== INICIANDO TESTES DO MOTOR MUSICAL VIRTUO ===\n");

// -------------------------------------------------------------
// 1. TESTES DE TRANSPOSIÇÃO OBRIGATÓRIOS DO ENUNCIADO
// -------------------------------------------------------------
console.log("--- 1. Casos de Teste Obrigatórios ---");
// G → G# (+1)
assertEqual(transposeChord("G", 1), "G#", "G +1 deve resultar em G#");

// G → F# (-1)
assertEqual(transposeChord("G", -1), "F#", "G -1 deve resultar em F#");

// Em → Fm (+1)
assertEqual(transposeChord("Em", 1), "Fm", "Em +1 deve resultar em Fm");

// C → C# (+1)
assertEqual(transposeChord("C", 1), "C#", "C +1 deve resultar em C#");

// D7 → D#7 (+1)
assertEqual(transposeChord("D7", 1), "D#7", "D7 +1 deve resultar em D#7");

// G → A (+2)
assertEqual(transposeChord("G", 2), "A", "G +2 deve resultar em A");

// -------------------------------------------------------------
// 2. TESTES DE ACORDES COM BAIXO INVERTIDO (SLASH CHORDS)
// -------------------------------------------------------------
console.log("\n--- 2. Testes de Baixo Invertido ---");
// D/F# + 2 → E/G#
assertEqual(transposeChord("D/F#", 2), "E/G#", "D/F# +2 deve resultar em E/G#");

// C/E + 1 → C#/F
assertEqual(transposeChord("C/E", 1), "C#/F", "C/E +1 deve resultar em C#/F");

// G/B - 1 → F#/A#
assertEqual(transposeChord("G/B", -1), "F#/A#", "G/B -1 deve resultar em F#/A#");

// -------------------------------------------------------------
// 3. TESTES DE CÁLCULO DE TONALIDADE (calculateKey)
// -------------------------------------------------------------
console.log("\n--- 3. Testes de Cálculo de Tonalidade ---");
assertEqual(calculateKey("G", 1), "G#", "Key G +1 -> G#");
assertEqual(calculateKey("G", -1), "F#", "Key G -1 -> F#");
assertEqual(calculateKey("G", -2), "F", "Key G -2 -> F");
assertEqual(calculateKey("Em", 1), "Fm", "Key Em +1 -> Fm");
assertEqual(calculateKey("D", 2), "E", "Key D +2 -> E");

// -------------------------------------------------------------
// 4. TESTES DE EASY PLAY E SIMPLIFICAÇÃO
// -------------------------------------------------------------
console.log("\n--- 4. Testes de Easy Play ---");
// Simplificação de acordes com extensões
assertEqual(simplifyChord("C9"), "C", "C9 simplificado -> C");
assertEqual(simplifyChord("Em7"), "Em", "Em7 simplificado -> Em");
assertEqual(simplifyChord("D/F#"), "D", "D/F# simplificado -> D");
assertEqual(simplifyChord("G4"), "G", "G4 simplificado -> G");
assertEqual(simplifyChord("Bm7"), "Bm", "Bm7 simplificado -> Bm");

// Transposição de Easy Play: G C Em D (+2) -> A D F#m E
const easyPlayOriginal = "G  C  Em  D";
const easyPlayPlus2 = transposeChordSheet(easyPlayOriginal, 2);
assertEqual(easyPlayPlus2, "A  D  F#m  E", "Easy Play G C Em D +2 deve resultar em A D F#m E");

// Teste em objeto de música
const mockSong = {
  title: "Mistério na Olaria",
  originalKey: "G",
  chords: "[Intro] G  C9  Em7  D/F#\n\nG               C9\nEu fui na olaria ver o vaso se formar",
  easyChords: "[Intro] G  C  Em  D\n\nG           C\nEu fui na olaria ver o vaso se formar"
};

const easyRendered = getEasyPlayCifra(mockSong, 2);
assertEqual(
  easyRendered.includes("[Intro] A  D  F#m  E"),
  true,
  "getEasyPlayCifra com +2 deve transpor easyChords para A D F#m E"
);

// -------------------------------------------------------------
// 5. TESTE DE NÃO-ALTERAÇÃO DE LETRAS (PRESERVAÇÃO DO TEXTO)
// -------------------------------------------------------------
console.log("\n--- 5. Teste de Preservação de Letra ---");
const sheetWithLyrics = `G               C9
Eu fui na olaria ver o vaso se formar
Em7               D
O oleiro trabalhava sem cessar`;

const transposedSheet = transposeChordSheet(sheetWithLyrics, 1);
const lines = transposedSheet.split("\n");

assertEqual(lines[0], "G#              C#9", "Linha 1: acordes transpostos G->G# e C9->C#9");
assertEqual(lines[1], "Eu fui na olaria ver o vaso se formar", "Linha 2: letra deve permanecer intacta");
assertEqual(lines[2], "Fm7               D#", "Linha 3: acordes transpostos Em7->Fm7 e D->D#");
assertEqual(lines[3], "O oleiro trabalhava sem cessar", "Linha 4: letra deve permanecer intacta");

// -------------------------------------------------------------
// RESUMO DOS RESULTADOS
// -------------------------------------------------------------
console.log("\n==============================================");
console.log(`TOTAL DE TESTES: ${totalTests}`);
console.log(`PASSOU: ${passedTests}`);
console.log(`FALHOU: ${failedTests}`);
console.log("==============================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("TODOS OS TESTES PASSARAM COM SUCESSO!");
}
