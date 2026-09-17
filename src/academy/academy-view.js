// =============================================================
// VIRTUO ACADEMY: INTERFACE DE ENSINO MUSICAL
// src/academy/academy-view.js
// Design System Virtuo: Contraste WCAG AA, Tokens de Cor e Espaçamento
// =============================================================

import { ACADEMY_LEVELS, ACADEMY_INSTRUMENTS } from "../database/schema.js";
import { CANONICAL_COURSES } from "./canonical-curriculum.js";
import { VirtuoAcademyService } from "./academy-service.js";
import { ChordEngine } from "../chords/chord-engine.js";
import { getInterval } from "../chords/intervals.js";

// Estado de UI local do Academy
let selectedInstrument = "violao";
let selectedLevelFilter = "all"; // "all" ou 0, 1, 2, 3, 4, 5
let expandedModuleId = null;
let activeLessonModal = null; // { course, module, lesson }
let activeChordInspector = null; // { chordSymbol, instrumentId, shapeIndex }

export function setAcademyInstrument(instrumentId) {
  selectedInstrument = instrumentId;
  const user = typeof window !== "undefined" ? window.currentUser : null;
  if (user) {
    VirtuoAcademyService.setStudentInstrument(user.uid, instrumentId);
  }
  if (typeof window !== "undefined" && window.currentScreen === "academy" && typeof window.renderCurrentScreen === "function") {
    window.renderCurrentScreen();
  }
}
if (typeof window !== "undefined") window.setAcademyInstrument = setAcademyInstrument;

export function setAcademyLevelFilter(lvl) {
  selectedLevelFilter = lvl;
  if (typeof window !== "undefined" && window.currentScreen === "academy" && typeof window.renderCurrentScreen === "function") {
    window.renderCurrentScreen();
  }
}
if (typeof window !== "undefined") window.setAcademyLevelFilter = setAcademyLevelFilter;

export function toggleModuleAccordion(moduleId) {
  expandedModuleId = expandedModuleId === moduleId ? null : moduleId;
  if (typeof window !== "undefined" && window.currentScreen === "academy" && typeof window.renderCurrentScreen === "function") {
    window.renderCurrentScreen();
  }
}
if (typeof window !== "undefined") window.toggleModuleAccordion = toggleModuleAccordion;

export function openLessonModal(courseId, moduleId, lessonId) {
  const course = CANONICAL_COURSES.find(c => c.id === courseId);
  if (!course) return;
  const module = (course.modules || []).find(m => m.id === moduleId);
  if (!module) return;
  const lesson = (module.lessons || []).find(l => l.id === lessonId);
  if (!lesson) return;

  activeLessonModal = { course, module, lesson };
  renderLessonModalElement();
}
if (typeof window !== "undefined") window.openLessonModal = openLessonModal;

export function closeLessonModal() {
  activeLessonModal = null;
  if (typeof document !== "undefined") {
    const el = document.getElementById("academy-lesson-modal-root");
    if (el) el.remove();
  }
}
if (typeof window !== "undefined") window.closeLessonModal = closeLessonModal;

export async function finishCurrentLesson(courseId, moduleId, lessonId) {
  const user = typeof window !== "undefined" ? window.currentUser : null;
  const uid = user ? user.uid : "guest";
  await VirtuoAcademyService.completeLesson(uid, courseId, moduleId, lessonId, 100, 10);
  
  if (typeof window !== "undefined" && window.virtuoToast) {
    window.virtuoToast.success("Aula Concluída!", "Seu progresso musical foi salvo com sucesso.");
  }

  closeLessonModal();
  if (typeof window !== "undefined" && (window.currentScreen === "academy" || window.currentScreen === "home") && typeof window.renderCurrentScreen === "function") {
    window.renderCurrentScreen();
  }
}
if (typeof window !== "undefined") window.finishCurrentLesson = finishCurrentLesson;

export function renderAcademyScreen(userProgress) {
  const currentUid = typeof window !== "undefined" && window.currentUser ? window.currentUser.uid : "guest";
  const progress = userProgress || VirtuoAcademyService._getLocalProgress(currentUid);
  const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons : [];
  
  const activeCourse = CANONICAL_COURSES.find(c => c.instrumentId === selectedInstrument) || CANONICAL_COURSES[0];
  const instrumentDef = Object.values(ACADEMY_INSTRUMENTS).find(i => i.id === selectedInstrument) || ACADEMY_INSTRUMENTS.VIOLAO;

  // Filtra módulos pelo nível se especificado
  let modules = activeCourse.modules || [];
  if (selectedLevelFilter !== "all") {
    const lvlNum = Number(selectedLevelFilter);
    modules = modules.filter(m => m.level === lvlNum);
  }

  // Contagem de aulas
  let totalLessonsInCourse = 0;
  let completedInCourse = 0;
  (activeCourse.modules || []).forEach(m => {
    (m.lessons || []).forEach(l => {
      totalLessonsInCourse++;
      if (completed.includes(l.id)) completedInCourse++;
    });
  });

  const coursePercent = totalLessonsInCourse > 0 ? Math.round((completedInCourse / totalLessonsInCourse) * 100) : 0;
  const currentLvlInfo = Object.values(ACADEMY_LEVELS).find(l => l.level === (progress.currentLevel || 0)) || ACADEMY_LEVELS.LEVEL_0;

  return `
    <div class="virtuo-academy-container" style="max-width: 900px; margin: 0 auto; padding-bottom: 90px;">
      
      <!-- HERO HEADER: VIRTUO ACADEMY -->
      <section class="glass" style="border: 1px solid rgba(126, 231, 255, 0.3); background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08)); margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill" style="background:rgba(126,231,255,0.18); color:#7EE7FF; border-color:#7EE7FF; font-weight:700;">
              🎓 VIRTUO ACADEMY
            </span>
            <span style="font-size:12px; color:#94a3b8;">Metodologia Musical Gradual: Nível 0 ao Profissional</span>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:12px; color:#cbd5e1;">
              Nível Atual: <strong style="color:${currentLvlInfo.color}; font-size:13px;">${currentLvlInfo.shortTitle}</strong>
            </span>
            <span class="pill" style="background:rgba(16,185,129,0.15); color:#6ee7b7; border-color:rgba(16,185,129,0.3); font-size:11px;">
              ⏱️ ${progress.practiceTimeMinutes || 0} min de Prática
            </span>
          </div>
        </div>

        <div style="margin-top: 18px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 class="hero" style="font-size: 26px; margin-bottom: 6px; color:#ffffff;">
              Ensino Musical de Alta Precisão
            </h1>
            <p class="subtitle" style="margin: 0; font-size: 14px; max-width: 600px; color:#94a3b8; line-height: 1.5;">
              Especialização técnica focada em instrumentos de cordas e teoria harmônica. Cada aula possui alicerce biomecânico, exercícios práticos com metrônomo e avaliação progressiva.
            </p>
          </div>

          <!-- Card Resumo de Progresso do Curso Ativo -->
          <div style="padding:12px 18px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:16px; min-width:180px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:11px; color:#94a3b8;">Progresso em ${instrumentDef.name}</span>
              <strong style="font-size:13px; color:#7EE7FF;">${coursePercent}%</strong>
            </div>
            <div style="width:100%; height:8px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden;">
              <div style="width:${coursePercent}%; height:100%; background:linear-gradient(90deg, #38bdf8, #7EE7FF); transition:width 0.3s ease;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color:#64748b;">
              <span>${completedInCourse} de ${totalLessonsInCourse} concluídas</span>
              <span>Níveis 0 - 5</span>
            </div>
          </div>
        </div>

        <!-- SELETOR DE INSTRUMENTOS (Prioridade: Cordas) -->
        <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">
            Escolha seu Instrumento de Foco:
          </label>
          <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:6px;">
            ${Object.values(ACADEMY_INSTRUMENTS).sort((a, b) => a.priority - b.priority).map(inst => `
              <button 
                class="tag-btn ${selectedInstrument === inst.id ? 'active' : ''}" 
                onclick="window.setAcademyInstrument('${inst.id}')"
                style="padding:8px 14px; font-size:13px; display:flex; align-items:center; gap:6px; white-space:nowrap; border-radius:12px; cursor:pointer; ${selectedInstrument === inst.id ? 'background:rgba(126,231,255,0.22); border-color:#7EE7FF; color:#ffffff; font-weight:600;' : 'background:rgba(255,255,255,0.03); color:#94a3b8; border-color:rgba(255,255,255,0.1);'}"
              >
                <span>${inst.icon}</span>
                <span>${inst.name}</span>
                ${inst.family === 'cordas' ? '<span style="font-size:9px; opacity:0.75; padding:1px 4px; background:rgba(255,255,255,0.1); border-radius:4px;">Cordas</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- BARRA DE NÍVEIS PEDAGÓGICOS (0 ao 5) -->
      <section class="glass" style="margin-bottom: 20px; padding: 14px 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <span style="font-size:12px; color:#cbd5e1; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>📈</span> Trilhas de Formação Musical por Nível:
          </span>
          <span style="font-size:11px; color:#94a3b8;">Selecione um nível para filtrar ou veja o percurso completo</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
          <button 
            onclick="window.setAcademyLevelFilter('all')" 
            style="padding:8px 10px; border-radius:12px; text-align:center; font-size:12px; cursor:pointer; border:1px solid; ${selectedLevelFilter === 'all' ? 'background:rgba(126,231,255,0.18); border-color:#7EE7FF; color:#7EE7FF; font-weight:600;' : 'background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.08); color:#94a3b8;'}"
          >
            Todos os Níveis (0-5)
          </button>
          ${Object.values(ACADEMY_LEVELS).map(lvl => `
            <button 
              onclick="window.setAcademyLevelFilter(${lvl.level})" 
              style="padding:8px 10px; border-radius:12px; text-align:center; font-size:11px; cursor:pointer; border:1px solid; ${selectedLevelFilter === String(lvl.level) || selectedLevelFilter === lvl.level ? `background:${lvl.color}22; border-color:${lvl.color}; color:${lvl.color}; font-weight:700;` : 'background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.08); color:#94a3b8;'}"
            >
              <span>${lvl.badge}</span>
              <div style="font-weight:600; margin-top:2px;">${lvl.shortTitle}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- LISTAGEM DOS MÓDULOS E AULAS -->
      <div class="academy-modules-list" style="display:flex; flex-direction:column; gap:16px;">
        ${modules.length === 0 ? `
          <div class="glass" style="text-align:center; padding:36px 16px; color:#94a3b8;">
            <p style="font-size:14px; margin-bottom:8px;">Nenhum módulo encontrado para o filtro selecionado.</p>
            <button class="button secondary" onclick="window.setAcademyLevelFilter('all')">Ver Todos os Níveis</button>
          </div>
        ` : modules.map(module => {
          const lvlInfo = Object.values(ACADEMY_LEVELS).find(l => l.level === module.level) || ACADEMY_LEVELS.LEVEL_0;
          const isExpanded = expandedModuleId === module.id || modules.length === 1;
          const lessons = module.lessons || [];
          const completedInMod = lessons.filter(l => completed.includes(l.id)).length;
          const isModCompleted = lessons.length > 0 && completedInMod === lessons.length;

          return `
            <div class="glass module-card" style="border:1px solid ${isModCompleted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}; border-radius:20px; overflow:hidden; transition:all 0.2s ease;">
              
              <!-- Header do Módulo (Clicável para expandir) -->
              <div 
                onclick="window.toggleModuleAccordion('${module.id}')"
                style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:rgba(255,255,255,0.02);"
              >
                <div style="display:flex; align-items:center; gap:14px;">
                  <div style="width:42px; height:42px; border-radius:12px; background:${lvlInfo.color}18; border:1px solid ${lvlInfo.color}40; display:flex; align-items:center; justify-content:center; font-size:20px; color:${lvlInfo.color};">
                    ${module.icon || lvlInfo.badge}
                  </div>
                  <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="pill" style="font-size:10px; padding:2px 8px; background:${lvlInfo.color}20; color:${lvlInfo.color}; border-color:${lvlInfo.color}40;">
                        ${lvlInfo.shortTitle}
                      </span>
                      ${isModCompleted ? `
                        <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(16,185,129,0.18); color:#6ee7b7; border-color:rgba(16,185,129,0.3);">
                          ✓ Concluído
                        </span>
                      ` : ''}
                    </div>
                    <h3 style="font-size:17px; margin:4px 0 2px; color:#ffffff;">${module.title}</h3>
                    <p style="font-size:12px; color:#94a3b8; margin:0;">${module.description}</p>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:16px;">
                  <div style="text-align:right;">
                    <span style="font-size:12px; color:#cbd5e1; font-weight:600;">${completedInMod} / ${lessons.length}</span>
                    <span style="display:block; font-size:10px; color:#64748b;">aulas</span>
                  </div>
                  <span style="font-size:18px; color:#7EE7FF; transform:rotate(${isExpanded ? '90deg' : '0deg'}); transition:transform 0.2s ease;">
                    ❯
                  </span>
                </div>
              </div>

              <!-- Lista de Aulas do Módulo (Visível se Expandido) -->
              ${isExpanded ? `
                <div style="padding:12px 18px 18px; border-top:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:10px;">
                  ${lessons.map((lesson, idx) => {
                    const isLessonDone = completed.includes(lesson.id);
                    return `
                      <div 
                        onclick="window.openLessonModal('${activeCourse.id}', '${module.id}', '${lesson.id}')"
                        style="padding:12px 14px; background:rgba(0,0,0,0.25); border:1px solid ${isLessonDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}; border-radius:14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.2s;"
                        onmouseover="this.style.background='rgba(126,231,255,0.06)'"
                        onmouseout="this.style.background='rgba(0,0,0,0.25)'"
                      >
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div style="width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; ${isLessonDone ? 'background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4);' : 'background:rgba(255,255,255,0.06); color:#94a3b8;'}">
                            ${isLessonDone ? '✓' : (idx + 1)}
                          </div>
                          <div>
                            <h4 style="font-size:14px; margin:0 0 2px; color:${isLessonDone ? '#cbd5e1' : '#ffffff'}; font-weight:600;">
                              ${lesson.title}
                            </h4>
                            <p style="font-size:12px; color:#94a3b8; margin:0;">
                              ${lesson.objective}
                            </p>
                          </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:10px;">
                          ${lesson.targetBpm ? `
                            <span class="pill" style="font-size:10px; padding:2px 6px;">
                              ⏱️ ${lesson.targetBpm} BPM
                            </span>
                          ` : ''}
                          <button class="button ${isLessonDone ? 'secondary' : 'primary'}" style="padding:6px 12px; font-size:11px;">
                            ${isLessonDone ? 'Revisar' : 'Praticar'}
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- FERRAMENTAS INTEGRADAS DE APOIO -->
      <section class="glass" style="margin-top:24px; padding:18px 20px;">
        <h3 style="font-size:15px; margin:0 0 10px; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
          <span>🛠️</span> Ferramentas Integradas de Apoio aos Estudos
        </h3>
        <p style="font-size:13px; color:#94a3b8; margin:0 0 16px; line-height:1.5;">
          A Virtuo Academy conecta diretamente a teoria à prática com motores locais determinísticos:
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div class="tile" onclick="show('tuner')" style="cursor:pointer; padding:14px;">
            <div class="icon">🎯</div>
            <h4 style="font-size:14px; margin:4px 0;">Afinador Pro 2.1</h4>
            <p style="font-size:12px; color:#94a3b8; margin:0;">Filtros harmônicos para violão, guitarra, baixo e violino.</p>
          </div>
          <div class="tile" onclick="show('band')" style="cursor:pointer; padding:14px;">
            <div class="icon">🥁</div>
            <h4 style="font-size:14px; margin:4px 0;">Metrônomo & Smart Band</h4>
            <p style="font-size:12px; color:#94a3b8; margin:0;">Prática rítmica com subdivisão e backing tracks inteligentes.</p>
          </div>
          <div class="tile" onclick="show('vocal')" style="cursor:pointer; padding:14px;">
            <div class="icon">🎙️</div>
            <h4 style="font-size:14px; margin:4px 0;">Treino de Intervalos</h4>
            <p style="font-size:12px; color:#94a3b8; margin:0;">Desenvolvimento da percepção auditiva de notas e afinação.</p>
          </div>
        </div>
      </section>

    </div>
  `;
}

/**
 * Renderiza o Modal da Aula com teoria, exercício interativo e botão de conclusão.
 */
function renderLessonModalElement() {
  if (!activeLessonModal) return;

  const { course, module, lesson } = activeLessonModal;
  const progress = VirtuoAcademyService._getLocalProgress(window.currentUser?.uid || "guest");
  const isDone = Array.isArray(progress.completedLessons) && progress.completedLessons.includes(lesson.id);
  const lvlInfo = Object.values(ACADEMY_LEVELS).find(l => l.level === lesson.level) || ACADEMY_LEVELS.LEVEL_0;

  let modalRoot = document.getElementById("academy-lesson-modal-root");
  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "academy-lesson-modal-root";
    document.body.appendChild(modalRoot);
  }

  modalRoot.innerHTML = `
    <div style="position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px;">
      <div class="glass" style="max-width:720px; width:100%; max-height:90vh; overflow-y:auto; border-radius:24px; border:1px solid rgba(126,231,255,0.3); background:#0f172a; padding:24px 22px;">
        
        <!-- Top bar do Modal -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill" style="background:${lvlInfo.color}20; color:${lvlInfo.color}; border-color:${lvlInfo.color}40; font-size:11px;">
              ${lvlInfo.shortTitle}
            </span>
            <span style="font-size:12px; color:#94a3b8;">${course.instrumentName} • Módulo ${module.order}</span>
          </div>
          <button class="button secondary" style="padding:4px 10px; font-size:12px; border-radius:8px;" onclick="window.closeLessonModal()">
            ✕ Fechar
          </button>
        </div>

        <h2 style="font-size:22px; margin:0 0 6px; color:#ffffff;">${lesson.title}</h2>
        <p style="font-size:13px; color:#7EE7FF; margin:0 0 16px;">🎯 Objetivo: ${lesson.objective}</p>

        <!-- Bloco de Teoria & Fundamentação -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px; margin-bottom:18px;">
          <h4 style="font-size:13px; text-transform:uppercase; color:#94a3b8; letter-spacing:0.05em; margin:0 0 8px;">
            Fundamentação Teórica & Biomecânica
          </h4>
          <p style="font-size:14px; color:#e2e8f0; line-height:1.6; margin:0;">
            ${lesson.theoryText}
          </p>
        </div>

        <!-- Bloco de Exercício Prático -->
        <div style="background:rgba(14,165,233,0.08); border:1px solid rgba(14,165,233,0.3); border-radius:16px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:14px; color:#7EE7FF; margin:0; display:flex; align-items:center; gap:6px;">
              <span>⚡</span> ${lesson.exercise.title}
            </h4>
            <div style="display:flex; gap:6px;">
              ${lesson.targetBpm ? `
                <span class="pill" style="font-size:11px;">Metrônomo: ${lesson.targetBpm} BPM</span>
              ` : ''}
              <span class="pill" style="font-size:11px;">Compasso: ${lesson.timeSignature}</span>
            </div>
          </div>
          <p style="font-size:13px; color:#cbd5e1; line-height:1.5; margin:0 0 12px;">
            ${lesson.exercise.instructions}
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="button secondary" style="font-size:12px; padding:6px 12px;" onclick="window.closeLessonModal(); show('band');">
              🥁 Abrir Metrônomo (${lesson.targetBpm || 60} BPM)
            </button>
            <button class="button secondary" style="font-size:12px; padding:6px 12px;" onclick="window.closeLessonModal(); show('tuner');">
              🎯 Checar Afinação
            </button>
          </div>
        </div>

        <!-- Bloco do Virtuo Chord Engine: Ver Acorde -->
        <div style="background:rgba(126,231,255,0.06); border:1px solid rgba(126,231,255,0.25); border-radius:16px; padding:14px 16px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#7EE7FF; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:6px;">
              <span>🎵</span> Virtuo Chord Engine Integrado
            </div>
            <div style="font-size:13px; color:#cbd5e1; margin-top:3px;">
              Consulte diagramas estruturais, notas, intervalos, digitações e inversões.
            </div>
          </div>
          <button 
            class="button primary" 
            style="font-size:13px; padding:8px 16px; background:#7EE7FF; color:#07101F; font-weight:700; border:none;" 
            onclick="window.openChordInspector('C', '${course.instrumentId || 'violao'}')"
          >
            🔍 [VER ACORDE]
          </button>
        </div>

        <!-- Checkpoints de Avaliação Prática -->
        ${Array.isArray(lesson.checkpoints) && lesson.checkpoints.length > 0 ? `
          <div style="margin-bottom:20px;">
            <h4 style="font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">
              Pontos de Checagem Técnica (Autoavaliação):
            </h4>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${lesson.checkpoints.map(cp => `
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:#cbd5e1; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:10px; cursor:pointer;">
                  <input type="checkbox" ${isDone ? 'checked' : ''} style="cursor:pointer;" />
                  <span>${cp}</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Botão de Ação: Concluir Aula -->
        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
          <button class="button secondary" onclick="window.closeLessonModal()">
            Voltar
          </button>
          <button 
            class="button primary" 
            style="padding:10px 20px; font-size:13px;"
            onclick="window.finishCurrentLesson('${course.id}', '${module.id}', '${lesson.id}')"
          >
            ${isDone ? '✓ Aula Já Concluída (Salvar Novamente)' : '✓ Concluir Aula & Registrar Progresso'}
          </button>
        </div>

      </div>
    </div>
  `;
}

// =============================================================
// VIRTUO CHORD INSPECTOR MODAL
// =============================================================
export function openChordInspector(chordSymbol = "C", instrumentId = "acoustic-guitar", shapeIdx = 0) {
  let mappedInst = instrumentId || "acoustic-guitar";
  if (mappedInst === "violao") mappedInst = "acoustic-guitar";
  if (mappedInst === "baixo") mappedInst = "bass";
  if (mappedInst === "guitarra") mappedInst = "electric-guitar";
  if (mappedInst === "teclado") mappedInst = "keyboard";

  activeChordInspector = {
    chordSymbol: chordSymbol || "C",
    instrumentId: mappedInst,
    shapeIndex: shapeIdx || 0
  };

  renderChordInspectorModal();
}
if (typeof window !== "undefined") window.openChordInspector = openChordInspector;

export function closeChordInspector() {
  activeChordInspector = null;
  if (typeof document !== "undefined") {
    const el = document.getElementById("academy-chord-inspector-root");
    if (el) el.remove();
  }
}
if (typeof window !== "undefined") window.closeChordInspector = closeChordInspector;

export function setInspectorInstrument(instId) {
  if (!activeChordInspector) return;
  activeChordInspector.instrumentId = instId;
  activeChordInspector.shapeIndex = 0;
  renderChordInspectorModal();
}
if (typeof window !== "undefined") window.setInspectorInstrument = setInspectorInstrument;

export function setInspectorShape(idx) {
  if (!activeChordInspector) return;
  activeChordInspector.shapeIndex = idx;
  renderChordInspectorModal();
}
if (typeof window !== "undefined") window.setInspectorShape = setInspectorShape;

export function setInspectorChord(symbol) {
  if (!activeChordInspector) return;
  activeChordInspector.chordSymbol = symbol;
  activeChordInspector.shapeIndex = 0;
  renderChordInspectorModal();
}
if (typeof window !== "undefined") window.setInspectorChord = setInspectorChord;

function renderChordInspectorModal() {
  if (!activeChordInspector || typeof document === "undefined") return;

  let root = document.getElementById("academy-chord-inspector-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "academy-chord-inspector-root";
    document.body.appendChild(root);
  }

  const { chordSymbol, instrumentId, shapeIndex } = activeChordInspector;
  const chord = ChordEngine.getChord(chordSymbol) || ChordEngine.buildChord("C", "major");
  const inst = ChordEngine.getInstrument(instrumentId) || ChordEngine.getInstrument("acoustic-guitar");
  const shapes = ChordEngine.getShapes(chordSymbol, instrumentId);
  const activeShape = shapes[shapeIndex] || shapes[0] || null;

  // Renderiza o diagrama correspondente
  let diagramHtml = "";
  if (inst.layout === "keyboard") {
    diagramHtml = ChordEngine.renderDiagramSvg(chord.notes, "keyboard", { width: 280, height: 100 });
  } else if (activeShape) {
    diagramHtml = ChordEngine.renderDiagramSvg(activeShape, "fretboard", {
      width: 170,
      height: 220,
      title: chord.symbol,
      showTitle: true
    });
  } else {
    diagramHtml = `<div style="padding:20px; color:#94a3b8; font-size:13px;">Sem diagrama disponível para esta forma</div>`;
  }

  // Instrumentos suportados para os seletores
  const instList = [
    { id: "acoustic-guitar", label: "Violão" },
    { id: "electric-guitar", label: "Guitarra" },
    { id: "bass", label: "Baixo" },
    { id: "ukulele", label: "Ukulele" },
    { id: "cavaquinho", label: "Cavaquinho" },
    { id: "keyboard", label: "Teclado/Piano" }
  ];

  // Acordes rápidos para navegação
  const quickChords = ["C", "Cm", "C7", "Cmaj7", "Csus4", "Cadd9", "G", "D", "Em", "Am"];

  root.innerHTML = `
    <div style="position:fixed; inset:0; z-index:10001; background:rgba(0,0,0,0.88); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px;">
      <div class="glass" style="max-width:680px; width:100%; max-height:92vh; overflow-y:auto; border-radius:24px; border:1px solid rgba(126,231,255,0.3); background:#07101F; padding:22px;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF; font-weight:700;">
              VIRTUO CHORD ENGINE
            </span>
            <span style="font-size:12px; color:#94a3b8;">Biblioteca Harmônica Universal</span>
          </div>
          <button class="button secondary" style="padding:4px 10px; font-size:12px; border-radius:8px;" onclick="window.closeChordInspector()">
            ✕ Fechar
          </button>
        </div>

        <!-- Seletor de Instrumentos -->
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
          ${instList.map(item => `
            <button 
              class="pill" 
              style="cursor:pointer; font-size:11px; padding:6px 12px; border-radius:20px; ${instrumentId === item.id ? 'background:#7EE7FF; color:#07101F; font-weight:700; border-color:#7EE7FF;' : 'background:rgba(255,255,255,0.04); color:#cbd5e1; border-color:rgba(255,255,255,0.1);'}"
              onclick="window.setInspectorInstrument('${item.id}')"
            >
              ${item.label}
            </button>
          `).join('')}
        </div>

        <!-- Seletor Rápido de Acordes -->
        <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:18px; align-items:center;">
          <span style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-right:4px;">Acordes:</span>
          ${quickChords.map(q => `
            <button 
              class="pill" 
              style="cursor:pointer; font-size:11px; padding:4px 10px; ${chordSymbol === q ? 'background:rgba(126,231,255,0.25); color:#7EE7FF; font-weight:700; border-color:#7EE7FF;' : 'background:rgba(255,255,255,0.03); color:#94a3b8;'}"
              onclick="window.setInspectorChord('${q}')"
            >
              ${q}
            </button>
          `).join('')}
        </div>

        <!-- Grid Principal: Diagrama + Informações Harmônicas -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:18px; align-items:start; margin-bottom:18px;">
          
          <!-- Coluna 1: Diagrama SVG -->
          <div style="display:flex; flex-direction:column; align-items:center; background:#0E1B35; border:1px solid rgba(126,231,255,0.15); border-radius:18px; padding:18px;">
            ${diagramHtml}

            <!-- Seleção de Formas / Inversões se houver mais de uma -->
            ${shapes.length > 1 ? `
              <div style="margin-top:14px; width:100%;">
                <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:6px; text-align:center;">Formas Disponíveis:</div>
                <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap;">
                  ${shapes.map((s, idx) => `
                    <button 
                      class="pill" 
                      style="cursor:pointer; font-size:10px; padding:4px 8px; ${shapeIndex === idx ? 'background:#7EE7FF; color:#07101F; font-weight:700;' : 'background:rgba(255,255,255,0.05); color:#cbd5e1;'}"
                      onclick="window.setInspectorShape(${idx})"
                    >
                      ${s.cagedForm ? `CAGED (${s.cagedForm})` : s.inversionName ? s.inversionName : `Posição ${idx + 1}`}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Coluna 2: Teoria Harmônica & Estrutura -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
              <h3 style="font-size:24px; margin:0 0 4px; color:#ffffff; font-weight:700;">
                ${chord.symbol} <span style="font-size:14px; color:#7EE7FF; font-weight:400;">(${chord.qualityName})</span>
              </h3>
              <p style="font-size:12px; color:#94a3b8; margin:0;">
                Fundamental: <strong style="color:#ffffff;">${chord.root}</strong> • Categoria: <strong style="color:#cbd5e1;">${chord.quality}</strong>
              </p>
            </div>

            <!-- Notas Componentes -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
              <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; letter-spacing:0.05em; margin-bottom:8px;">
                Notas Componentes:
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${chord.notes.map((n, i) => `
                  <div style="background:rgba(126,231,255,0.12); border:1px solid #7EE7FF; border-radius:10px; padding:6px 12px; text-align:center;">
                    <div style="font-size:16px; font-weight:700; color:#7EE7FF;">${n}</div>
                    <div style="font-size:10px; color:#94a3b8;">${i === 0 ? 'Fundamental' : i === 1 ? '3ª' : i === 2 ? '5ª' : 'Ext.'}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Intervalos -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
              <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; letter-spacing:0.05em; margin-bottom:8px;">
                Intervalos Musicais:
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${chord.intervals.map(semitones => {
                  const intObj = getInterval(semitones);
                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#cbd5e1; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:8px;">
                      <span>${intObj ? intObj.name : `Intervalo ${semitones}st`}</span>
                      <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(126,231,255,0.1); color:#7EE7FF;">${intObj ? intObj.shortName : `${semitones}st`}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>

        </div>

        <!-- Rodapé do Modal -->
        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
          <button class="button secondary" onclick="window.closeChordInspector()">
            Fechar Inspetor
          </button>
        </div>

      </div>
    </div>
  `;
}
