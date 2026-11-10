// =============================================================
// VIRTUO AUTOMATED TEST SUITE
// scripts/test-runner.js
// =============================================================

import assert from 'node:assert';

console.log('🎵 Starting Virtuo Automated Verification Tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Music Theory & Pitch Calculations
test('Music Theory: Semitone math and frequency mapping', () => {
  const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  assert.strictEqual(noteStrings.length, 12);
  assert.strictEqual(noteStrings[9], 'A'); // A is index 9

  // A4 is 440 Hz
  const a4Midi = 69;
  const a4Freq = 440 * Math.pow(2, (a4Midi - 69) / 12);
  assert.strictEqual(Math.round(a4Freq), 440);

  // C4 is midi 60
  const c4Freq = 440 * Math.pow(2, (60 - 69) / 12);
  assert.strictEqual(Math.round(c4Freq * 10) / 10, 261.6);
});

// 2. Chords & Transposer Rules
test('Transposition: Correct chromatic shift', () => {
  const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function transposeKey(key, semitones) {
    const idx = CHROMATIC_SHARP.indexOf(key);
    if (idx === -1) return key;
    const newIdx = (idx + semitones + 24) % 12;
    return CHROMATIC_SHARP[newIdx];
  }

  assert.strictEqual(transposeKey('G', 2), 'A');
  assert.strictEqual(transposeKey('C', 7), 'G');
  assert.strictEqual(transposeKey('D', -2), 'C');
  assert.strictEqual(transposeKey('F#', 1), 'G');
});

// 3. Backend Fallback & Davi Musical Logic
test('Backend: Algorithmic harmony advice generator', async () => {
  const { generateAlgorithmicHarmonicAdvice, generateFallbackChatReply } = await import('../backend/services/ai-service.ts');
  const advice = generateAlgorithmicHarmonicAdvice('Bondade de Deus', 'G', 74, 'Intermediário');
  
  assert.ok(advice.summary.includes('Bondade de Deus'));
  assert.ok(advice.summary.includes('74 BPM'));
  assert.ok(advice.recommendations.length >= 3);

  const reply = generateFallbackChatReply('como facilitar esta música', { songTitle: 'Bondade de Deus', key: 'G' });
  assert.ok(reply.includes('Easy Play'));
});

// 4. Security Rules Configuration Verification
test('Security: Firestore rules file exists and contains strict constraints', async () => {
  const fs = await import('node:fs');
  const rules = fs.readFileSync('./firestore.rules', 'utf8');
  assert.ok(rules.includes("rules_version = '2'"));
  assert.ok(rules.includes('function isAuthenticated()'));
  assert.ok(rules.includes('function isOwner(userId)'));
  assert.ok(rules.includes('match /users/{userId}'));
});

// 5. Build & Deployment Configuration
test('Config: firebase.json and .env.example are present and valid', async () => {
  const fs = await import('node:fs');
  const fbConfig = JSON.parse(fs.readFileSync('./firebase.json', 'utf8'));
  assert.strictEqual(fbConfig.firestore.rules, 'firestore.rules');
  assert.strictEqual(fbConfig.hosting.public, 'dist');

  const envExample = fs.readFileSync('./.env.example', 'utf8');
  assert.ok(envExample.includes('GEMINI_API_KEY'));
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
