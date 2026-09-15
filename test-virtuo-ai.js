import assert from 'node:assert';

console.log('🧪 Iniciando Testes Automatizados da Virtuo AI...');

// Test 1: Algorithmic Advice Fallback & Structure
const testSong = {
  songTitle: "Mistério na Olaria",
  currentKey: "G",
  originalKey: "G",
  bpm: 74,
  chords: "[Intro] G  C  Em  D\n[Verso] G  Em  C  D",
  musicianLevel: "Intermediário"
};

// Test 2: AI Status Endpoint
const testHost = 'http://localhost:3000';

async function runTests() {
  let passed = 0;
  let total = 0;

  function it(description, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ ${description}`);
    } catch (err) {
      console.error(`  ✗ ${description}`);
      console.error(err);
    }
  }

  async function itAsync(description, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${description}`);
    } catch (err) {
      console.error(`  ✗ ${description}`);
      console.error(err);
    }
  }

  console.log('\n--- 1. Virtuo AI API Endpoints ---');

  await itAsync('GET /api/ai/status deve retornar status ativo', async () => {
    const res = await fetch(`${testHost}/api/ai/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.active, true);
    assert.ok(data.model);
    assert.ok(data.engine);
  });

  await itAsync('POST /api/ai/suggest deve gerar análise e diretrizes harmônicas', async () => {
    const res = await fetch(`${testHost}/api/ai/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSong)
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.advice, 'Deve conter advice');
    assert.ok(data.advice.summary, 'Deve conter summary');
    assert.ok(Array.isArray(data.advice.recommendations), 'Deve conter recommendations array');
    assert.ok(data.advice.recommendations.length >= 3, 'Deve conter ao menos 3 recomendações');
  });

  await itAsync('POST /api/ai/chat deve responder a dúvidas de transição e ensaio', async () => {
    const res = await fetch(`${testHost}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Como fazer transição de tom de G para D no louvor?' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply, 'Deve conter reply');
    assert.ok(data.reply.length > 20, 'Resposta deve ser substancial');
  });

  await itAsync('POST /api/ai/chat deve rejeitar mensagem vazia com status 400', async () => {
    const res = await fetch(`${testHost}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  console.log(`\n========================================`);
  console.log(`Resultados dos Testes Virtuo AI: ${passed}/${total} passaram.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Erro fatal no teste:", e);
  process.exit(1);
});
