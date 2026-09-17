// =============================================================
// VIRTUO CONDUCTOR & HUMANIZED BAND TEST SUITE
// test-virtuo-conductor.js
// Validação formal do Virtuo Conductor, Humanização e Visual Systems
// =============================================================

import assert from "node:assert";
import { 
  virtuoConductor, 
  VirtuoConductor, 
  CONDUCTOR_STATES, 
  CONDUCTOR_EVENTS 
} from "./src/audio/virtuo-conductor.js";
import { virtuoBand } from "./src/audio/band-engine.js";
import { GrooveEngine } from "./src/audio/groove-engine.js";
import { HarmonicEngine } from "./src/audio/harmonic-engine.js";
import { ArrangementEngine } from "./src/audio/arrangement-engine.js";
import { HorizonWaveManager } from "./src/design/horizon-wave.js";
import { virtuoPulse, PULSE_STATES } from "./src/features/pulse/pulse.js";

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(err);
    failed++;
  }
}

console.log("\n=================================================");
console.log("🎼 TEST SUITE: VIRTUO CONDUCTOR & REAL BAND 2.0");
console.log("=================================================");

console.log("\n--- 1. Virtuo Conductor: Ciclo de Vida e Estados ---");

it("VirtuoConductor inicia no estado IDLE", () => {
  const conductor = new VirtuoConductor();
  assert.strictEqual(conductor.getState().currentState, CONDUCTOR_STATES.IDLE);
  assert.strictEqual(conductor.getState().currentSection, "intro");
});

it("Transição de seções calcula intensidade sugerida correta", () => {
  const conductor = new VirtuoConductor();
  
  conductor.setSection("verse");
  assert.strictEqual(conductor.getState().currentSection, "verse");
  assert.strictEqual(conductor.getState().intensity, 2);

  conductor.setSection("chorus");
  assert.strictEqual(conductor.getState().currentSection, "chorus");
  assert.strictEqual(conductor.getState().intensity, 4);

  conductor.setSection("break");
  assert.strictEqual(conductor.getState().currentSection, "break");
  assert.strictEqual(conductor.getState().intensity, 1);

  conductor.setSection("solo");
  assert.strictEqual(conductor.getState().currentSection, "solo");
  assert.strictEqual(conductor.getState().intensity, 4);
});

it("Emite eventos ao alterar tom e seção", () => {
  const conductor = new VirtuoConductor();
  let receivedKeyPayload = null;
  let receivedSectionPayload = null;

  conductor.on(CONDUCTOR_EVENTS.KEY_CHANGED, (payload) => {
    receivedKeyPayload = payload;
  });

  conductor.on(CONDUCTOR_EVENTS.SECTION_CHANGE, (payload) => {
    receivedSectionPayload = payload;
  });

  conductor.notifyKeyChanged("G");
  assert.ok(receivedKeyPayload);
  assert.strictEqual(receivedKeyPayload.newKey, "G");

  conductor.setSection("bridge");
  assert.ok(receivedSectionPayload);
  assert.strictEqual(receivedSectionPayload.section, "bridge");
  assert.strictEqual(receivedSectionPayload.suggestedIntensity, 3);
});

console.log("\n--- 2. Real Band Humanization & Condução Orgânica ---");

it("GrooveEngine ativa condução de Ride no Refrão e Solo com alta intensidade", () => {
  const groove = new GrooveEngine();
  const patternChorus = groove.getPattern("chorus", 4);
  assert.ok(patternChorus);
  assert.ok(patternChorus.ride, "Deve possuir linha de condução no ride");
  assert.ok(patternChorus.ride.length > 0, "Ride deve conter toques na seção chorus");

  const patternSolo = groove.getPattern("solo", 4);
  assert.ok(patternSolo.ride.length > 0, "Ride deve conter toques na seção solo");
});

it("GrooveEngine gera ghost notes dinâmicas na caixa para humanização", () => {
  const groove = new GrooveEngine();
  const pattern = groove.getPattern("verse", 3);
  assert.ok(pattern.snareGhost, "Deve conter trilha de ghost notes de caixa");
  assert.ok(pattern.snareGhost.length > 0, "Ghost notes ativas");
});

it("HarmonicEngine preserva integridade de acordes e extensões", () => {
  const harmonic = new HarmonicEngine();
  const chordInfo = harmonic.getCurrentChordInfo("Cmaj7", false);
  assert.strictEqual(chordInfo.originalChord, "Cmaj7");
  assert.ok(chordInfo.notes.length >= 3, "Acorde não pode ser reduzido a uma única nota");

  const easyInfo = harmonic.getCurrentChordInfo("Cmaj7", true);
  assert.strictEqual(easyInfo.easyPlayChord, "C");
  assert.strictEqual(easyInfo.originalChord, "Cmaj7");
});

it("ArrangementEngine calcula micro-timing determinístico sem quebrar sincronismo", () => {
  const harmonic = new HarmonicEngine();
  const arrangement = new ArrangementEngine(null, harmonic);

  const offsetKick = arrangement._getDeterministicOffset(1, "kick", 2);
  const offsetSnare = arrangement._getDeterministicOffset(1, "snare", 2);
  const offsetBass = arrangement._getDeterministicOffset(1, "bass", 2);

  assert.ok(Math.abs(offsetKick) <= 0.008, "Offset do kick dentro do teto de 8ms");
  assert.ok(Math.abs(offsetSnare) <= 0.008, "Offset da snare dentro do teto de 8ms");
  assert.ok(Math.abs(offsetBass) <= 0.008, "Offset do bass dentro do teto de 8ms");
  assert.notStrictEqual(offsetKick, offsetBass, "Instrumentos distintos têm offsets diferentes");
});

console.log("\n--- 3. Visual Systems: Pulse 2.0 & Horizon Wave ---");

it("Pulse 2.0 reage a estados e limpa após transição", () => {
  virtuoPulse.setState(PULSE_STATES.SECTION_ACTIVE, { section: "refrão", intensity: 4 });
  let state = virtuoPulse.getState();
  assert.strictEqual(state.state, PULSE_STATES.SECTION_ACTIVE);
  assert.strictEqual(state.data.section, "refrão");
  assert.strictEqual(state.isActive, true);

  virtuoPulse.clear();
  state = virtuoPulse.getState();
  assert.strictEqual(state.isActive, false);
});

it("HorizonWaveManager possui métodos estáticos seguros para SSR e DOM", () => {
  assert.doesNotThrow(() => {
    HorizonWaveManager.triggerHorizonWave("test");
    HorizonWaveManager.triggerMissionGold();
    HorizonWaveManager.setCultoAura(true);
    HorizonWaveManager.setCultoAura(false);
  });
});

console.log("\n--- 4. Integração do Virtuo Conductor com BandEngine ---");

it("BandEngine inicializa e sincroniza com Virtuo Conductor", () => {
  assert.ok(virtuoBand);
  virtuoBand.setKey("D");
  assert.strictEqual(virtuoConductor.getState().currentKey, "D");

  virtuoBand.setBpm(85);
  assert.strictEqual(virtuoConductor.getState().bpm, 85);

  virtuoBand.setSection("bridge");
  assert.strictEqual(virtuoConductor.getState().currentSection, "bridge");
});

console.log("\n=================================================");
console.log(`TOTAL: ${passed + failed} | PASSOU: ${passed} | FALHOU: ${failed}`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
