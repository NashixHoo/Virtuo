// =============================================================
// VIRTUO AI 2.0 VIEW COMPONENT
// src/features/ai/virtuo-ai-view.js
// Interface dedicada do Virtuo AI & Music Intelligence 2.0
// Mobile-first, celestial, responsiva e integrada
// =============================================================

import { VirtuoMusicIntelligence } from "../../music/music-intelligence.js";
import { compareOriginalAndEasyPlay } from "../../music/easy-play.js";
import { suggestSmartKey } from "../../music/smart-key.js";
import { generateStudyPlan } from "../../music/study-plan.js";

let activeAiSubTab = "analysis"; // "analysis" | "smartkey" | "easyplay" | "study" | "chat"

export function setAiSubTab(tab) {
  activeAiSubTab = tab;
  if (typeof window.renderCurrentScreen === "function") {
    window.renderCurrentScreen();
  }
}
window.setAiSubTab = setAiSubTab;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderVirtuoAiScreen(activeSong, allSongs, aiChatHistory = [], isAiReplying = false) {
  const song = activeSong || (allSongs && allSongs[0]) || null;

  if (!song) {
    return `
    <div class="virtuo-ai-container" style="max-width: 860px; margin: 0 auto; padding-bottom: 80px;">
      <section class="glass" style="border: 1px solid rgba(126, 231, 255, 0.3); background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08));">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge-celestial" style="font-size:11px; padding:4px 12px;">🎼 DAVI • DIRETOR MUSICAL</span>
            <span style="font-size:11px; color:#94a3b8;">Direção Musical & Análise Harmônica</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="status-dot"></span>
            <span style="font-size:11px; color:#7EE7FF; font-weight:600;">Operante</span>
          </div>
        </div>

        <div style="margin-top: 18px; text-align:center; padding: 24px 16px;">
          <div style="font-size:40px; margin-bottom:12px;">🎼</div>
          <h2 class="hero" style="font-size: 22px; margin-bottom: 8px;">Davi • Diretor Musical</h2>
          <p class="subtitle" style="margin: 0 auto 20px; font-size: 14px; max-width:540px; color:#94a3b8; line-height:1.6;">
            A biblioteca está pronta para receber seu novo repertório. Você pode cadastrar uma música na Biblioteca para obter diagnósticos harmônicos completos, ou conversar diretamente com Davi, Diretor Musical do Virtuo.
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="button primary" onclick="show('library')">📚 Adicionar Música</button>
            <button class="button secondary" onclick="show('academy')">🎓 Virtuo Academy</button>
          </div>
        </div>
      </section>

      <!-- Chat Diretor Musical Global -->
      <section class="glass" style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
            <span>💬</span> Consultoria com Davi
          </h3>
          <span class="pill" style="font-size:10px;">DIRETOR MUSICAL</span>
        </div>

        <div id="ai-view-chat-history" style="min-height: 220px; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 12px;">
          ${aiChatHistory.length === 0 ? `
            <div style="text-align: center; color: #94a3b8; font-size: 13px; margin: auto; padding: 20px;">
              <p style="margin-bottom: 8px;">Olá! Eu sou <strong>Davi, Diretor Musical do Virtuo</strong>.</p>
              <p style="margin: 0; font-size: 12px;">Posso orientar sobre condução instrumental, dinâmica da banda, transposição harmônica e metodologia de ensaio.</p>
            </div>
          ` : aiChatHistory.map(msg => `
            <div style="align-self: ${msg.role === 'user' ? 'flex-end' : 'flex-start'}; max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; ${msg.role === 'user' ? 'background: rgba(14, 165, 233, 0.25); color: #fff; border: 1px solid rgba(14, 165, 233, 0.4);' : 'background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1);'}">
              ${escapeHtml(msg.text)}
            </div>
          `).join('')}
          ${isAiReplying ? `
            <div style="align-self: flex-start; max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.05); color: #7EE7FF;">
              Davi está elaborando orientações musicais...
            </div>
          ` : ''}
        </div>

        <div style="display: flex; gap: 8px;">
          <input 
            type="text" 
            id="ai-view-chat-input" 
            class="form-input" 
            placeholder="Pergunte sobre arranjos, dinâmica, tonalidades..." 
            style="flex: 1; margin: 0;"
            onkeydown="if(event.key==='Enter') window.sendVirtuoAiViewMessage()"
          />
          <button class="button primary" onclick="window.sendVirtuoAiViewMessage()" ${isAiReplying ? 'disabled' : ''}>
            Enviar
          </button>
        </div>
      </section>
    </div>
    `;
  }

  const key = song.originalKey || song.key || "G";
  const bpm = Number(song.bpm) || 74;

  // Análise determinística 2.0
  const analysis = VirtuoMusicIntelligence.analyzeSong(song);
  const smartKey = analysis.smartKeySuggestion || suggestSmartKey(song, key);
  const easyComparison = compareOriginalAndEasyPlay(song.chords || "", key);
  const studyPlan = analysis.studyPlan || generateStudyPlan(song, analysis);

  return `
    <div class="virtuo-ai-container" style="max-width: 860px; margin: 0 auto; padding-bottom: 80px;">
      
      <!-- Top Banner Celestial -->
      <section class="glass" style="border: 1px solid rgba(126, 231, 255, 0.3); background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08));">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge-celestial" style="font-size:11px; padding:4px 12px;">🎼 DAVI • DIRETOR MUSICAL</span>
            <span style="font-size:11px; color:#94a3b8;">Consultoria Harmônica e Condução Musical</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="status-dot"></span>
            <span style="font-size:11px; color:#7EE7FF; font-weight:600;">Diretrizes Ativas</span>
          </div>
        </div>

        <div style="margin-top: 14px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 class="hero" style="font-size: 24px; margin-bottom: 4px;">${escapeHtml(song.title || "Música Selecionada")}</h2>
            <p class="subtitle" style="margin: 0; font-size: 13px;">
              ${escapeHtml(song.artist || "Banda / Artista")} • Tom Original: <strong style="color:#7EE7FF;">${escapeHtml(key)}</strong> • Relativa: <strong style="color:#fde047;">${escapeHtml(analysis.relativeKey)}</strong> • ${bpm} BPM
            </p>
          </div>

          <!-- Seletor de Música para Análise -->
          ${Array.isArray(allSongs) && allSongs.length > 1 ? `
            <div style="display:flex; align-items:center; gap:6px;">
              <label for="ai-song-selector" style="font-size:11px; color:#94a3b8;">Mudar:</label>
              <select id="ai-song-selector" class="form-input" style="padding:6px 10px; font-size:12px; margin:0; width:auto;" onchange="window.selectAiTargetSong(this.value)">
                ${allSongs.map(s => `
                  <option value="${s.id}" ${s.id === song.id ? 'selected' : ''}>${escapeHtml(s.title)} (${s.originalKey || s.key || 'G'})</option>
                `).join("")}
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Sub-navegação interna do Virtuo AI -->
        <div class="ai-nav-pills" style="display:flex; gap:6px; margin-top:16px; overflow-x:auto; padding-bottom:4px;">
          <button class="tag-btn ${activeAiSubTab === 'analysis' ? 'active' : ''}" onclick="window.setAiSubTab('analysis')" style="${activeAiSubTab === 'analysis' ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}">
            📊 Análise 2.0
          </button>
          <button class="tag-btn ${activeAiSubTab === 'smartkey' ? 'active' : ''}" onclick="window.setAiSubTab('smartkey')" style="${activeAiSubTab === 'smartkey' ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}">
            🎯 Smart Key
          </button>
          <button class="tag-btn ${activeAiSubTab === 'easyplay' ? 'active' : ''}" onclick="window.setAiSubTab('easyplay')" style="${activeAiSubTab === 'easyplay' ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}">
            ⚡ Easy Play 2.0
          </button>
          <button class="tag-btn ${activeAiSubTab === 'study' ? 'active' : ''}" onclick="window.setAiSubTab('study')" style="${activeAiSubTab === 'study' ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}">
            📅 Plano 7 Dias
          </button>
          <button class="tag-btn ${activeAiSubTab === 'chat' ? 'active' : ''}" onclick="window.setAiSubTab('chat')" style="${activeAiSubTab === 'chat' ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}">
            💬 Chat Diretor
          </button>
        </div>
      </section>

      <!-- Painel 1: Análise Harmônica 2.0 -->
      ${activeAiSubTab === "analysis" ? `
        <section class="glass" style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
              <span>📊</span> Diagnóstico Estruturado da Harmonia
            </h3>
            <span class="pill" style="font-size:10px;">DETERMINÍSTICO</span>
          </div>

          <!-- Métricas Chave -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
            <div class="tile" style="padding:12px; margin:0; text-align:center;">
              <span style="font-size:10px; color:#94a3b8; display:block;">TONALIDADE</span>
              <strong style="font-size:18px; color:#7EE7FF;">${escapeHtml(analysis.key)}</strong>
              <span style="font-size:10px; color:#94a3b8; display:block; margin-top:2px;">Relativa: ${escapeHtml(analysis.relativeKey)}</span>
            </div>
            <div class="tile" style="padding:12px; margin:0; text-align:center;">
              <span style="font-size:10px; color:#94a3b8; display:block;">DIFICULDADE</span>
              <strong style="font-size:18px; color:${analysis.difficulty === 'Fácil' ? '#4ade80' : analysis.difficulty === 'Médio' ? '#facc15' : '#f87171'};">
                ${escapeHtml(analysis.difficulty)}
              </strong>
              <span style="font-size:10px; color:#94a3b8; display:block; margin-top:2px;">Score: ${analysis.score || '3.5'}</span>
            </div>
            <div class="tile" style="padding:12px; margin:0; text-align:center;">
              <span style="font-size:10px; color:#94a3b8; display:block;">ANDAMENTO / COMPASSO</span>
              <strong style="font-size:18px; color:#fff;">${analysis.bpm} BPM</strong>
              <span style="font-size:10px; color:#94a3b8; display:block; margin-top:2px;">${escapeHtml(analysis.timeSignature)}</span>
            </div>
            <div class="tile" style="padding:12px; margin:0; text-align:center;">
              <span style="font-size:10px; color:#94a3b8; display:block;">ACORDES ÚNICOS</span>
              <strong style="font-size:18px; color:#fff;">${analysis.uniqueChords.length}</strong>
              <span style="font-size:10px; color:#94a3b8; display:block; margin-top:2px;">Total: ${analysis.chordCount}</span>
            </div>
          </div>

          <!-- Motivos da Dificuldade -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; margin-bottom:14px;">
            <strong style="font-size:12px; color:#e2e8f0; display:block; margin-bottom:8px;">
              ⚖️ Motivos do Cálculo de Dificuldade:
            </strong>
            <ul style="margin:0; padding-left:18px; font-size:12px; color:#cbd5e1; line-height:1.6;">
              ${analysis.difficultyReasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
            </ul>
          </div>

          <!-- Acordes com Sétima, Extensões e Baixos Invertidos -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px;">
              <span style="font-size:11px; color:#7EE7FF; font-weight:600; display:block; margin-bottom:4px;">Extensões & Dissonâncias</span>
              <span style="font-size:12px; color:#e2e8f0;">
                ${analysis.extendedChords.length > 0 ? analysis.extendedChords.join(", ") : "Nenhuma extensão complexa"}
              </span>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px;">
              <span style="font-size:11px; color:#7EE7FF; font-weight:600; display:block; margin-bottom:4px;">Baixos Invertidos (Slash)</span>
              <span style="font-size:12px; color:#e2e8f0;">
                ${analysis.slashChords.length > 0 ? analysis.slashChords.join(", ") : "Nenhum baixo invertido"}
              </span>
            </div>
          </div>

          <!-- Estrutura das Seções -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px;">
            <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Estrutura da Música:</span>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${analysis.sections.map((sec, i) => `
                <span class="pill" style="background:rgba(126,231,255,0.1); border-color:rgba(126,231,255,0.3); font-size:11px;">
                  ${i + 1}. ${escapeHtml(sec)}
                </span>
              `).join("")}
            </div>
          </div>
        </section>
      ` : ''}

      <!-- Painel 2: Virtuo Smart Key -->
      ${activeAiSubTab === "smartkey" ? `
        <section class="glass" style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
              <span>🎯</span> Virtuo Smart Key & Capotraste
            </h3>
            <span class="badge-celestial" style="font-size:9px;">RECOMENDAÇÃO INTELIGENTE</span>
          </div>

          <div style="background:rgba(126,231,255,0.05); border:1px solid rgba(126,231,255,0.2); border-radius:14px; padding:16px; margin-bottom:16px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:center;">
              <div>
                <span style="font-size:11px; color:#94a3b8; display:block;">TOM ORIGINAL</span>
                <strong style="font-size:22px; color:#fff;">${escapeHtml(smartKey.originalKey)}</strong>
                <span style="font-size:11px; color:#94a3b8; display:block; margin-top:2px;">Capo: 0</span>
              </div>
              <div style="border-left:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:11px; color:#7EE7FF; display:block; font-weight:600;">SUGESTÃO VIRTUO</span>
                <strong style="font-size:22px; color:#7EE7FF;">${escapeHtml(smartKey.recommendedKey)}</strong>
                <span style="font-size:11px; color:#fde047; display:block; margin-top:2px;">
                  ${smartKey.recommendedCapo > 0 ? `Capo: Casa ${smartKey.recommendedCapo}` : 'Capo: 0 (Sem Capo)'}
                </span>
              </div>
            </div>

            <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); font-size:12px; color:#cbd5e1; line-height:1.5;">
              💡 <strong>Motivo da Recomendação:</strong> ${escapeHtml(smartKey.reason)}
            </div>
          </div>

          <!-- Acordes resultantes com a recomendação -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px; margin-bottom:14px;">
            <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Digitações tocadas no instrumento:</span>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${(smartKey.chordsInTargetKey || analysis.uniqueChords).map(c => `
                <span class="pill" style="font-size:12px; font-weight:700;">${escapeHtml(c)}</span>
              `).join("")}
            </div>
          </div>

          <button class="button primary" style="width:100%; font-size:13px;" onclick="window.applySmartKeyToActiveSong(${smartKey.semitoneOffset})">
            ✓ Aplicar Tonalidade na Cifra
          </button>
        </section>
      ` : ''}

      <!-- Painel 3: Easy Play 2.0 -->
      ${activeAiSubTab === "easyplay" ? `
        <section class="glass" style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
              <span>⚡</span> Easy Play 2.0 • Análise Comparativa
            </h3>
            <span class="pill" style="font-size:10px;">${easyComparison.percentSimplified} SIMPLIFICADO</span>
          </div>

          <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
            ${escapeHtml(easyComparison.diffSummary)} A versão simplificada preserva 100% da função tonal da harmonia original sem alterar a cifra armazenada.
          </p>

          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
            ${easyComparison.substitutions.map(sub => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-weight:700; font-size:14px; color:#fff; min-width:50px;">${escapeHtml(sub.original)}</span>
                  <span style="color:#7EE7FF;">➔</span>
                  <span style="font-weight:700; font-size:14px; color:#4ade80; min-width:50px;">${escapeHtml(sub.easy)}</span>
                  <span class="pill" style="font-size:10px; padding:2px 8px;">${escapeHtml(sub.harmonicFunction)}</span>
                </div>
                <span style="font-size:11px; color:#94a3b8; flex:1; min-width:200px; text-align:right;">
                  ${escapeHtml(sub.reason)}
                </span>
              </div>
            `).join("")}
          </div>

          <div class="row">
            <button class="button primary" style="flex:1; font-size:13px;" onclick="window.toggleEasyPlayFromAi(true)">
              Ativar Modo Easy Play 2.0
            </button>
            <button class="button secondary" style="flex:1; font-size:13px;" onclick="window.toggleEasyPlayFromAi(false)">
              Exibir Cifra Completa Original
            </button>
          </div>
        </section>
      ` : ''}

      <!-- Painel 4: Virtuo Study Plan (7 Dias) -->
      ${activeAiSubTab === "study" ? `
        <section class="glass" style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
              <span>📅</span> Virtuo Study Plan • 7 Dias
            </h3>
            <span class="badge-celestial" style="font-size:9px;">CRONOGRAMA DE PRÁTICA</span>
          </div>

          <p style="font-size:12px; color:#cbd5e1; margin-bottom:14px;">
            ${escapeHtml(studyPlan.summary)} Total estimado: <strong>${studyPlan.totalPracticeMinutes} minutos</strong> de treino distribuídos.
          </p>

          <div style="display:flex; flex-direction:column; gap:10px;">
            ${studyPlan.days.map(d => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.15); border-radius:12px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="pill" style="font-weight:700; background:rgba(126,231,255,0.15); border-color:#7EE7FF; color:#7EE7FF;">
                      ${escapeHtml(d.name)}
                    </span>
                    <strong style="font-size:13px; color:#fff;">${escapeHtml(d.title)}</strong>
                    <span style="font-size:11px; color:#94a3b8;">• ${escapeHtml(d.subtitle)}</span>
                  </div>
                  <span style="font-size:11px; color:#fde047; font-weight:600;">⏱️ ${d.practiceMinutes} min</span>
                </div>

                <div style="font-size:12px; color:#e2e8f0; margin-bottom:6px;">
                  <strong style="color:#7EE7FF;">Foco:</strong> ${escapeHtml(d.focus)}
                </div>

                <ul style="margin:0 0 6px 0; padding-left:18px; font-size:11px; color:#94a3b8; line-height:1.5;">
                  ${d.tasks.map(t => `<li>${escapeHtml(t)}</li>`).join("")}
                </ul>

                <div style="font-size:10px; color:#64748b; font-style:italic;">
                  💡 Dica: ${escapeHtml(d.tip)}
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      ` : ''}

      <!-- Painel 5: Chat do Diretor Musical com Botões Rápidos Contextuais -->
      ${activeAiSubTab === "chat" ? `
        <section class="glass" style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font-size:16px; margin:0; color:#7EE7FF; display:flex; align-items:center; gap:8px;">
              <span>💬</span> Chat com o Diretor Musical
            </h3>
            <span style="font-size:11px; color:#94a3b8;">Contexto: ${escapeHtml(song.title)} (${key})</span>
          </div>

          <!-- Sugestões Rápidas Contextuais Obrigatórias -->
          <div style="margin-bottom:12px;">
            <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Ações Contextuais Rápidas:</span>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:6px;">
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Facilitar música')">
                ⚡ Facilitar música
              </button>
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Qual tom devo usar?')">
                🎯 Qual tom devo usar?
              </button>
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Como estudar?')">
                📅 Como estudar?
              </button>
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Montar ensaio')">
                🎸 Montar ensaio
              </button>
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Explicar acordes')">
                🎼 Explicar acordes
              </button>
              <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Preparar para tocar')">
                🎯 Preparar para tocar
              </button>
            </div>
          </div>

          <!-- Caixa de Histórico de Mensagens -->
          <div id="ai-view-chat-history" style="height:320px; overflow-y:auto; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
            ${aiChatHistory.length === 0 ? `
              <div style="text-align:center; padding:30px 10px; color:#64748b;">
                <span style="font-size:28px; display:block; margin-bottom:6px;">✨</span>
                <strong style="color:#94a3b8; font-size:13px;">Olá! Eu sou o Virtuo AI.</strong>
                <p style="font-size:11px; margin-top:4px;">Selecione uma ação rápida acima ou digite qualquer dúvida sobre a música "${escapeHtml(song.title)}".</p>
              </div>
            ` : aiChatHistory.map(msg => `
              <div class="ai-chat-message ${msg.role}">
                <div style="font-size:10px; color:#94a3b8; margin-bottom:2px;">
                  ${msg.role === 'user' ? 'Você' : '✦ Virtuo AI (Diretor Musical)'}
                </div>
                <div class="ai-bubble" style="font-size:12px; line-height:1.5;">
                  ${escapeHtml(msg.text).replace(/\n/g, '<br/>')}
                </div>
              </div>
            `).join("")}

            ${isAiReplying ? `
              <div class="ai-chat-message assistant">
                <div class="ai-bubble" style="display:flex; align-items:center; gap:8px;">
                  <div class="auth-spinner" style="width:14px; height:14px; border-width:2px; margin:0;"></div>
                  <span style="color:#7EE7FF; font-size:12px;">Virtuo AI formulando orientação contextual...</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Input e Botão de Envio -->
          <div style="display:flex; gap:8px;">
            <input 
              type="text" 
              id="ai-view-chat-input" 
              class="form-input" 
              placeholder="Pergunte ao Virtuo AI sobre ${escapeHtml(song.title)}..." 
              style="margin:0; flex:1; font-size:13px;"
              onkeydown="if(event.key==='Enter') window.sendVirtuoAiViewMessage()"
            />
            <button 
              class="button primary" 
              style="padding:8px 16px; font-size:13px; white-space:nowrap;"
              onclick="window.sendVirtuoAiViewMessage()"
            >
              Enviar
            </button>
          </div>
        </section>
      ` : ''}

    </div>
  `;
}
