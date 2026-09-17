// =============================================================
// TEST SUITE: VIRTUO ACADEMY & MUSICAL EDUCATION FOUNDATION
// test-academy.js
// =============================================================

import assert from "node:assert";
import {
  ACADEMY_LEVELS,
  ACADEMY_INSTRUMENTS,
  createEmptyAcademyCourse,
  createEmptyAcademyModule,
  createEmptyAcademyLesson,
  createEmptyUserAcademyProgress
} from "./src/database/schema.js";
import { CANONICAL_COURSES } from "./src/academy/canonical-curriculum.js";
import { VirtuoAcademyService } from "./src/academy/academy-service.js";
import { renderAcademyScreen } from "./src/academy/academy-view.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`    Erro: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`    Erro: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=================================================");
  console.log("🎓 TEST SUITE: VIRTUO ACADEMY (ENSINO MUSICAL)");
  console.log("=================================================");

  console.log("\n--- 1. Estrutura de Níveis Pedagógicos (0 ao 5) ---");
  test("Todos os 6 níveis (0 a 5) existem e estão configurados", () => {
    for (let i = 0; i <= 5; i++) {
      const key = `LEVEL_${i}`;
      assert.ok(ACADEMY_LEVELS[key], `Nível ${key} deve existir`);
      assert.strictEqual(ACADEMY_LEVELS[key].level, i);
      assert.ok(ACADEMY_LEVELS[key].title.length > 0);
      assert.ok(ACADEMY_LEVELS[key].description.length > 0);
    }
  });

  console.log("\n--- 2. Instrumentos & Prioridade de Cordas ---");
  test("Instrumentos prioritários de cordas e teoria configurados", () => {
    assert.ok(ACADEMY_INSTRUMENTS.VIOLAO);
    assert.strictEqual(ACADEMY_INSTRUMENTS.VIOLAO.family, "cordas");
    assert.strictEqual(ACADEMY_INSTRUMENTS.VIOLAO.priority, 1);

    assert.ok(ACADEMY_INSTRUMENTS.GUITARRA);
    assert.strictEqual(ACADEMY_INSTRUMENTS.GUITARRA.family, "cordas");

    assert.ok(ACADEMY_INSTRUMENTS.BAIXO);
    assert.strictEqual(ACADEMY_INSTRUMENTS.BAIXO.family, "cordas");

    assert.ok(ACADEMY_INSTRUMENTS.CORDAS_ORQUESTRAIS);
    assert.strictEqual(ACADEMY_INSTRUMENTS.CORDAS_ORQUESTRAIS.family, "cordas");

    assert.ok(ACADEMY_INSTRUMENTS.TEORIA_MUSICAL);
    assert.strictEqual(ACADEMY_INSTRUMENTS.TEORIA_MUSICAL.family, "teoria");
  });

  console.log("\n--- 3. Schemas e Fábricas de Entidades ---");
  test("createEmptyAcademyCourse gera formato válido", () => {
    const course = createEmptyAcademyCourse({ title: "Curso Teste" });
    assert.strictEqual(course.title, "Curso Teste");
    assert.strictEqual(course.levelMin, 0);
    assert.strictEqual(course.levelMax, 5);
  });

  test("createEmptyAcademyModule gera formato válido", () => {
    const mod = createEmptyAcademyModule({ level: 1, title: "Fundamentos" });
    assert.strictEqual(mod.level, 1);
    assert.strictEqual(mod.title, "Fundamentos");
  });

  test("createEmptyAcademyLesson gera formato válido com exercício", () => {
    const lesson = createEmptyAcademyLesson({ title: "Primeira Aula", targetBpm: 60 });
    assert.strictEqual(lesson.title, "Primeira Aula");
    assert.strictEqual(lesson.targetBpm, 60);
    assert.ok(lesson.exercise);
  });

  test("createEmptyUserAcademyProgress gera formato válido", () => {
    const prog = createEmptyUserAcademyProgress({ userId: "u123" });
    assert.strictEqual(prog.userId, "u123");
    assert.strictEqual(prog.currentLevel, 0);
    assert.deepStrictEqual(prog.completedLessons, []);
  });

  console.log("\n--- 4. Acervo Curricular Canônico ---");
  test("Cursos canônicos cobrem Violão, Guitarra, Baixo, Orquestra e Teoria", () => {
    assert.ok(CANONICAL_COURSES.length >= 5);
    const instruments = CANONICAL_COURSES.map(c => c.instrumentId);
    assert.ok(instruments.includes("violao"));
    assert.ok(instruments.includes("guitarra"));
    assert.ok(instruments.includes("baixo"));
    assert.ok(instruments.includes("cordas_orquestrais"));
    assert.ok(instruments.includes("teoria_musical"));
  });

  test("Curso de Violão possui percurso didático estruturado", () => {
    const violao = CANONICAL_COURSES.find(c => c.instrumentId === "violao");
    assert.ok(violao);
    assert.ok(violao.modules.length > 0);
    const mod0 = violao.modules.find(m => m.level === 0);
    assert.ok(mod0);
    assert.ok(mod0.lessons.length >= 3);
    assert.ok(mod0.lessons[0].title.includes("Anatomia"));
  });

  console.log("\n--- 5. Serviço da Virtuo Academy (Persistência & Progresso) ---");
  await testAsync("getCourses retorna a lista de cursos", async () => {
    const courses = await VirtuoAcademyService.getCourses();
    assert.ok(Array.isArray(courses));
    assert.ok(courses.length > 0);
  });

  await testAsync("completeLesson registra progresso e recalcula nível", async () => {
    const testUserId = "user-test-academy-" + Date.now();
    const initialProg = await VirtuoAcademyService.getUserProgress(testUserId);
    assert.strictEqual(initialProg.completedLessons.length, 0);

    const updated = await VirtuoAcademyService.completeLesson(
      testUserId,
      "curso-violao-completo",
      "mod-violao-lvl0",
      "les-violao-0-1",
      100,
      15
    );

    assert.ok(updated.completedLessons.includes("les-violao-0-1"));
    assert.strictEqual(updated.practiceTimeMinutes, 15);
  });

  await testAsync("setStudentInstrument altera instrumento do aluno", async () => {
    const testUserId = "user-test-academy-" + Date.now();
    const updated = await VirtuoAcademyService.setStudentInstrument(testUserId, "guitarra");
    assert.strictEqual(updated.currentInstrument, "guitarra");
  });

  console.log("\n--- 6. Renderização da Interface (Virtuo Academy Screen) ---");
  test("renderAcademyScreen produz HTML válido com elementos essenciais", () => {
    const html = renderAcademyScreen();
    assert.ok(html.includes("VIRTUO ACADEMY"), "HTML deve conter título da academia");
    assert.ok(html.includes("Escolha seu Instrumento de Foco"), "HTML deve conter seletor de instrumentos");
    assert.ok(html.includes("Trilhas de Formação Musical por Nível"), "HTML deve conter barra de níveis");
    assert.ok(html.includes("Violão"), "HTML deve listar violão");
  });

  console.log("\n=================================================");
  console.log(`TOTAL DE TESTES DA VIRTUO ACADEMY: ${passed + failed}`);
  console.log(`PASSOU: ${passed}`);
  console.log(`FALHOU: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 TODOS OS TESTES DA VIRTUO ACADEMY PASSARAM COM SUCESSO!\n");
  }
}

runTests();
