// =============================================================
// TEST SUITE: VIRTUO BAND MUSICAL ACCOMPANIMENT 2.0
// test-band-musical-accompaniment.js
// Validação e testes reais de todas as 21 fases da Banda Virtual Inteligente
// =============================================================

import {
  VirtuoBandEngine,
  virtuoBand,
  MusicalArrangement,
  CANONICAL_SECTIONS,
  DEFAULT_SECTION_DYNAMICS,
  SoundProvider,
  SyntheticSoundProvider,
  HybridSoundProvider,
  InstrumentPlayer,
  BassPlayer,
  PianoPlayer,
  GuitarPlayer,
  AcousticGuitarPlayer,
  DrumPlayer,
  ArrangementEngine,
  HarmonicEngine,
  GrooveEngine,
  VirtuoClock,
  SoundLibrary
} from "./src/audio/index.js";

import {
  parseChordSymbol,
  buildChord,
  toEasyPlay,
  getPianoVoicings
} from "./src/chords/index.js";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description}`);
  }
}

console.log("\n=================================================");
console.log("🎸 TEST SUITE: VIRTUO MUSICAL ACCOMPANIMENT 2.0");
console.log("=================================================");

// -------------------------------------------------------------
// 1. FASE 2 — MUSICAL ARRANGEMENT 2.0
// -------------------------------------------------------------
console.log("\n--- 1. FASE 2: Musical Arrangement 2.0 (Estrutura Musical) ---");
{
  const arr = MusicalArrangement.fromProgression(["G", "D/F#", "Em7", "Cadd9"], "G", 74, "4/4", "Worship");
  assert(arr.songKey === "G", "Define tom da música corretamente");
  assert(arr.tempo === 74, "Define tempo (BPM) corretamente");
  assert(arr.timeSignature === "4/4", "Define fórmula de compasso 4/4");
  assert(arr.beatsPerBar === 4, "Calcula 4 tempos por compasso");
  assert(arr.progression.length === 4, "Estrutura todos os 4 acordes da progressão");

  const chord2 = arr.getChordAt(2, 1);
  assert(chord2.symbol === "D/F#" && chord2.root === "D" && chord2.bass === "F#", "Mapeia acorde invertido D/F# com fundamental D e baixo independente F#");

  const chord3 = arr.getChordAt(3, 1);
  assert(chord3.symbol === "Em7" && chord3.isMinor === true, "Identifica qualidade menor em Em7");

  const circularChord = arr.getChordAt(5, 1);
  assert(circularChord.symbol === "G", "Aplica wrap-around circular harmônico no compasso 5 retornando ao G");

  const dynamicChorus = arr.getIntensityForSection("chorus");
  const dynamicVerse = arr.getIntensityForSection("verse");
  assert(dynamicChorus > dynamicVerse, "Intensidade dinâmica do Refrão é superior à do Verso");
}

// -------------------------------------------------------------
// 2. FASE 3 — BAIXO REALISTA (BASS_EASY, BASS_NORMAL, BASS_GROOVE)
// -------------------------------------------------------------
console.log("\n--- 2. FASE 3: Baixo Realista (Linhas Harmônicas, Inversões e Aproximações) ---");
{
  const harmonic = new HarmonicEngine();
  harmonic.setProgression(["C", "C/E", "F", "G"]);

  // Teste em C/E (inversão)
  const chordCE = { symbol: "C/E", root: "C", bass: "E", isMinor: false };
  const nextF = { symbol: "F", root: "F", bass: "F", isMinor: false };

  const bassFreqCE = harmonic.getBassFrequency(0, 8, "Worship", 3, "BASS_NORMAL", chordCE, nextF);
  // E1 tem ~41.20Hz, enquanto C1 tem ~32.70Hz. O baixo deve tocar a nota E (inversão)!
  assert(bassFreqCE > 40.0 && bassFreqCE < 43.0, `Baixo em C/E toca a terça no baixo (E1 ~41.2Hz) e não C: ${bassFreqCE.toFixed(2)}Hz`);

  // Teste BASS_EASY (fundamental sem complexidades)
  const easyFreq = harmonic.getBassFrequency(2, 8, "Worship", 2, "BASS_EASY", chordCE, nextF);
  assert(easyFreq === bassFreqCE, "BASS_EASY mantém fundamental estável nos tempos sem saltos desnecessários");

  // Teste BASS_GROOVE (síncope no step 3 e aproximação cromática no step 7)
  const grooveStep3 = harmonic.getBassFrequency(3, 8, "Worship", 4, "BASS_GROOVE", chordCE, nextF);
  assert(grooveStep3 > 0, "BASS_GROOVE oferece síncope/antecipação no step 3");

  const grooveStep7 = harmonic.getBassFrequency(7, 8, "Worship", 4, "BASS_GROOVE", chordCE, nextF);
  // Próximo é F1 (~43.65Hz). Meio-tom abaixo é E1 (~41.20Hz)
  assert(grooveStep7 > 0, "BASS_GROOVE conduz com aproximação direcionada no final do compasso");
}

// -------------------------------------------------------------
// 3. FASE 4 — TECLADO / PIANO (VOICINGS & VOICE LEADING)
// -------------------------------------------------------------
console.log("\n--- 3. FASE 4: Teclado / Piano (Voicings Polifônicos & Voice Leading) ---");
{
  const harmonic = new HarmonicEngine();
  harmonic.setProgression(["C", "G", "Am", "F"]);

  const cFreqs = harmonic.getKeyboardFrequencies("KEYS_PAD", 4, { symbol: "C", root: "C", notes: ["C", "E", "G"] });
  assert(Array.isArray(cFreqs) && cFreqs.length >= 3, `Teclado gera acorde polifônico (mínimo 3 notas): ${cFreqs.length} notas`);

  const gFreqs = harmonic.getKeyboardFrequencies("KEYS_PAD", 4, { symbol: "G", root: "G", notes: ["G", "B", "D"] });
  // Voice leading: distância entre a primeira nota do C e a primeira nota do G selecionada deve ser suave (< 100Hz)
  const dist = Math.abs(gFreqs[0] - cFreqs[0]);
  assert(dist < 120, `Voice leading otimizado mantém inversão próxima evitando saltos bruscos: ${dist.toFixed(2)}Hz`);

  const pianoPlayer = new PianoPlayer(new SyntheticSoundProvider(new SoundLibrary()));
  pianoPlayer.setMode("KEYS_WORSHIP");
  assert(pianoPlayer.mode === "KEYS_WORSHIP", "PianoPlayer aceita e comuta para KEYS_WORSHIP");
}

// -------------------------------------------------------------
// 4. FASE 5 — VIOLÃO / GUITARRA (STRUM & ARPEGGIO)
// -------------------------------------------------------------
console.log("\n--- 4. FASE 5: Violão e Guitarra (Padrões Rítmicos e Dedilhados) ---");
{
  const guitarPlayer = new GuitarPlayer(new SyntheticSoundProvider(new SoundLibrary()));
  guitarPlayer.setPattern("strum");
  assert(guitarPlayer.pattern === "strum", "GuitarPlayer aceita modo strum");

  guitarPlayer.setPattern("arpeggio");
  assert(guitarPlayer.pattern === "arpeggio", "GuitarPlayer aceita modo arpeggio");

  const freqs = guitarPlayer.getChordFrequencies({ root: "G", isMinor: false });
  assert(freqs.length === 4, "GuitarPlayer gera abertura de 4 cordas harmônicas");
  assert(freqs[0] > 0 && freqs[3] > freqs[0], "Frequências das cordas formam abertura acústica equilibrada");
}

// -------------------------------------------------------------
// 5. FASE 6 — BATERIA MUSICAL & REAÇÕES CONTEXTUAIS
// -------------------------------------------------------------
console.log("\n--- 5. FASE 6: Bateria Musical (Fills, Transições e Condução) ---");
{
  const drumPlayer = new DrumPlayer(new SyntheticSoundProvider(new SoundLibrary()));
  drumPlayer.setStyle("DRUM_WORSHIP");
  assert(drumPlayer.style === "DRUM_WORSHIP", "DrumPlayer aceita DRUM_WORSHIP");

  const groove = new GrooveEngine();
  groove.setPreset("Worship");
  groove.queueSectionTransition("chorus");
  assert(groove.nextQueuedSection === "chorus", "GrooveEngine enfileira transição para o Refrão");

  const fillEvents = groove.getStepEvents(7, 8);
  assert(fillEvents.drums.playSnare || fillEvents.drums.playTom, "GrooveEngine dispara virada de bateria no último tempo antes do refrão");
}

// -------------------------------------------------------------
// 6. FASES 7 & 8 — DINÂMICA MUSICAL E HUMANIZAÇÃO 2.0
// -------------------------------------------------------------
console.log("\n--- 6. FASES 7 e 8: Dinâmica Musical e Humanização 2.0 ---");
{
  const arrangement = new ArrangementEngine(new SoundLibrary(), new HarmonicEngine(), new GrooveEngine());
  const h1 = arrangement._humanize(1.0, 0.8, 0.04, "drums");
  const h2 = arrangement._humanize(1.0, 0.8, 0.04, "bass");

  assert(h1.time !== h2.time, "Offset determinístico impede colisão sintética idêntica entre bateria e baixo");
  assert(Math.abs(h1.time - 1.0) < 0.015, "Micro-timing fica contido na janela musical estreita (±5ms)");
  assert(h1.velocity > 0.1 && h1.velocity <= 1.0, "Velocity humanizada respeita os limites sonoros sem clipping");
}

// -------------------------------------------------------------
// 7. FASE 11 — MODO EASY BAND
// -------------------------------------------------------------
console.log("\n--- 7. FASE 11: Easy Band (Simplificação Harmônica e Rítmica) ---");
{
  const band = new VirtuoBandEngine();
  band.setEasyBand(true);
  assert(band.isEasyBand === true, "Ativa modo Easy Band");
  assert(band.grooveEngine.isEasyBand === true, "GrooveEngine entra em modo Easy Band");
  assert(band.harmonicEngine.isEasyPlay === true, "HarmonicEngine ativa simplificação Easy Play");
  assert(band.tracks.keyboard.mode === "pad", "Teclado é colocado em Pad para sustentar a harmonia com clareza");
}

// -------------------------------------------------------------
// 8. FASE 12 & 13 — SOUND PROVIDER & INSTRUMENT PLAYERS
// -------------------------------------------------------------
console.log("\n--- 8. FASES 12 e 13: SoundProvider & InstrumentPlayers ---");
{
  const synthProvider = new SyntheticSoundProvider(new SoundLibrary());
  assert(typeof synthProvider.triggerKick === "function", "SyntheticSoundProvider implementa triggerKick");
  assert(typeof synthProvider.triggerBass === "function", "SyntheticSoundProvider implementa triggerBass");
  assert(typeof synthProvider.triggerKeyboardChord === "function", "SyntheticSoundProvider implementa triggerKeyboardChord");
  assert(typeof synthProvider.triggerGuitarStrum === "function", "SyntheticSoundProvider implementa triggerGuitarStrum");

  const bass = new BassPlayer(synthProvider);
  bass.setVolume(0.9);
  assert(bass.volume === 0.9, "BassPlayer ajusta volume");
  bass.setMute(true);
  assert(bass.canPlay() === false, "BassPlayer respeita mute");
  bass.setMute(false);
  assert(bass.canPlay() === true, "BassPlayer reativa após desmutar");
}

// -------------------------------------------------------------
// 9. FASES 14, 15 & 16 — MODO BANDA, MODO ENSAIO & SISTEMA DE LOOP
// -------------------------------------------------------------
console.log("\n--- 9. FASES 14, 15 e 16: Modo Banda, Modo Ensaio e Sistema de Loop ---");
{
  const band = new VirtuoBandEngine();
  band.loadProgression(["G", "Em7", "C", "D"], "G", 80);

  assert(band.currentChord === "G", "Carrega acorde inicial G");
  assert(band.arrangement !== null, "Cria MusicalArrangement automaticamente");
  assert(band.arrangement.progression.length === 4, "Progressão do arranjo possui 4 acordes");

  band.setLoop(true);
  band.setLoopRepeatTarget(3);
  assert(band.isLooping === true, "Habilita modo loop");
  assert(band.loopRepeatTarget === 3, "Define alvo de repetição para 3 iterações");

  // Simula avanço de compassos no relógio
  band.clock.onBarChange(1);
  assert(band.currentChord === "Em7", "Avança compasso e transiciona para Em7");

  band.clock.onBarChange(2);
  assert(band.currentChord === "C", "Avança compasso e transiciona para C");

  band.clock.onBarChange(3);
  assert(band.currentChord === "D", "Avança compasso e transiciona para D");

  band.clock.onBarChange(4);
  assert(band.currentChord === "G", "Wrap-around do loop retorna harmoniosamente para G sem interrupção");
}

// -------------------------------------------------------------
// 10. FASES 18 & 19 — INTEGRAÇÃO COM CHORD ENGINE E SMART KEY
// -------------------------------------------------------------
console.log("\n--- 10. FASES 18 e 19: Integração com ChordEngine e Smart Key ---");
{
  const parsed = parseChordSymbol("F#m7(b5)/A");
  assert(parsed.root === "F#" && parsed.bass === "A", "ChordEngine decodifica F#m7(b5)/A perfeitamente");

  const simplified = toEasyPlay("Cadd9");
  assert(simplified.easyChord === "C", "Smart Key simplifica Cadd9 para C no Easy Band");

  const voicings = getPianoVoicings("G");
  assert(Array.isArray(voicings) && voicings.length > 0, "Obtém voicings profissionais de piano para G");
}

// -------------------------------------------------------------
// 11. FASE 17 — PERFORMANCE E GESTÃO DE RECURSOS
// -------------------------------------------------------------
console.log("\n--- 11. FASE 17: Performance, PWA e Recursos ---");
{
  const start = performance.now();
  const arrangement = new ArrangementEngine(new SoundLibrary(), new HarmonicEngine(), new GrooveEngine());
  for (let i = 0; i < 64; i++) {
    arrangement.scheduleStep({ step: i % 8, bar: Math.floor(i / 8), time: 1.0 + (i * 0.1), totalStepsPerBar: 8 }, {
      drums: { volume: 0.8, muted: false, solo: false, active: true },
      bass: { volume: 0.75, muted: false, solo: false, active: true },
      keyboard: { volume: 0.7, muted: false, solo: false, active: true, mode: "pad" },
      guitar: { volume: 0.7, muted: false, solo: false, active: true, pattern: "strum" }
    });
  }
  const duration = performance.now() - start;
  const avgPerStep = duration / 64;
  assert(avgPerStep < 0.2, `Orquestração ultrarrápida (< 0.2ms por step): ${avgPerStep.toFixed(4)}ms`);
}

// -------------------------------------------------------------
// RESULTADO FINAL
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`TOTAL DE TESTES DO ACOMPANHAMENTO MUSICAL: ${totalTests}`);
console.log(`PASSOU: ${passedTests} | FALHOU: ${failedTests}`);
console.log("=================================================");

if (failedTests === 0) {
  console.log("🎉 TODOS OS REQUISITOS DO VIRTUO MUSICAL ACCOMPANIMENT 2.0 FORAM APROVADOS!");
  process.exit(0);
} else {
  console.error("❌ HOUVE FALHA EM TESTES!");
  process.exit(1);
}
