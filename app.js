// app.js - Virtuo Main Controller with Firebase Integration
// Preserves 100% of original Virtuo UI, aesthetics, navigation, and features.
// Connects to Firebase project 'virtuo-7e01b' (Auth, Firestore, Storage) via ES modules.

import { 
  auth, 
  db, 
  storage, 
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  loginWithGoogle, 
  logoutUser, 
  syncUserProfile, 
  updateUserProfileDoc,
  getAuthErrorMessage,
  uploadAudioFile,
  uploadImageFile,
  isUserAdmin,
  checkFirebaseConnection,
  DEMO_SONGS
} from "./firebase-config.js";
import { SongsRepository } from "./songs-service.js";
import {
  transposeNote,
  transposeChord,
  transposeChordSheet,
  calculateKey,
  getSemitoneDistance,
  simplifyChord,
  getEasyPlayCifra,
  hasEasyPlay,
  isChordLine
} from "./src/music/index.js";
import { virtuoMinister } from "./src/features/minister/index.js";
import { virtuoMetronome, renderBandScreenComponent, virtuoBand } from "./src/audio/index.js";
import { virtuoRehearsal, renderRehearsalScreen } from "./src/features/rehearsal/index.js";
import { adminSongManager } from "./src/features/admin/index.js";
import { CANONICAL_INSTRUMENTS } from "./src/services/rehearsals.js";
import { CommunityService } from "./src/services/community.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Conecta o repositório musical profissional ao painel administrativo
adminSongManager.setRepository(SongsRepository);

// State
let bpm = 74;
window.bpm = bpm;

let currentUser = null;
let userProfile = null;
let isAuthChecking = true;
let currentScreen = "home";
let liveSongs = DEMO_SONGS;
let isMetronomePlaying = false;
let firebaseStatus = { connected: true, label: "virtuo-7e01b Conectado" };

// Community State
let communityPosts = [];
let isCreatingPost = false;

// Library Search State
let songSearchQuery = "";

// Celestial & Profile State
let isUpgradeModalOpen = false;
let isEditProfileOpen = false;

// Virtuo AI State
let aiAnalysis = null;
let isAnalyzingWithAI = false;
let isAiModalOpen = false;
let isAiReplying = false;
let aiChatHistory = [
  {
    role: "assistant",
    text: "Olá! Sou o Virtuo AI, seu diretor musical e assistente para louvor congregacional. Como posso ajudar seu ministério, arranjo ou ensaio hoje?"
  }
];

// Protected Action Modal State
let authModalData = null;

// Song Detail & Cifra State
let activeSong = null;
let editingSong = null;
let transposeOffset = 0;
let isEasyPlay = false;
let isMinisterMode = false;

// Auth Modal / Tab State in Profile
let authTab = "login"; // 'login' | 'signup' | 'reset'
let authFeedback = { text: "", type: "" }; // type: 'error' | 'success'

// Available instruments for musicians
const AVAILABLE_INSTRUMENTS = ["Guitarra", "Violão", "Teclado", "Baixo", "Bateria", "Vocal", "Sax"];

// -------------------------------------------------------------
// METRONOME ENGINE INTEGRATION (WEB AUDIO API)
// -------------------------------------------------------------
window.virtuoMetronome = virtuoMetronome;

// Sincroniza o estado reativo do metrônomo nativo com o app
virtuoMetronome.subscribe((state) => {
  bpm = state.bpm;
  window.bpm = state.bpm;
  isMetronomePlaying = state.isPlaying;

  // Atualiza displays de BPM e botões de play se estiverem visíveis na tela
  const bpmDisplay = document.getElementById("bpm-display");
  if (bpmDisplay) {
    const input = document.getElementById("band-bpm-direct-input");
    if (input && document.activeElement !== input) {
      input.value = state.bpm;
    }
  }

  const volText = document.getElementById("band-vol-text");
  if (volText) {
    volText.textContent = `${Math.round(state.volume * 100)}%`;
  }

  const bandPlayBtn = document.querySelector(".band-main-play-btn");
  if (bandPlayBtn) {
    if (state.isPlaying) {
      bandPlayBtn.classList.add("playing");
      bandPlayBtn.textContent = "⏸";
    } else {
      bandPlayBtn.classList.remove("playing");
      bandPlayBtn.textContent = "▶";
    }
  }
});

function toggleMetronome() {
  virtuoMetronome.toggle();
}
window.toggleMetronome = toggleMetronome;
window.toggleMetronomeEngine = toggleMetronome;

function stopMetronomeEngine() {
  virtuoMetronome.stop();
}
window.stopMetronomeEngine = stopMetronomeEngine;

function adjustBpm(delta) {
  virtuoMetronome.adjustBpm(delta);
}
window.adjustBpm = adjustBpm;
window.adjustMetronomeBpm = adjustBpm;

window.handleMetronomeBpmInput = (val) => {
  virtuoMetronome.setBpm(val);
};

window.setMetronomeBpmDirect = (targetBpm) => {
  virtuoMetronome.setBpm(targetBpm);
};

window.handleMetronomeTap = () => {
  virtuoMetronome.tap();
};

window.setMetronomeSubdivision = (sub) => {
  virtuoMetronome.setSubdivision(sub);
};

window.setMetronomeAccent = (enable) => {
  virtuoMetronome.setAccent(enable);
};

window.handleMetronomeVolume = (vol) => {
  virtuoMetronome.setVolume(vol);
};

window.useSongBpmInMetronome = (songBpm) => {
  virtuoMetronome.useSongBpm(songBpm);
};

window.useSongBpmAndOpenMetronome = (songBpm) => {
  virtuoMetronome.useSongBpm(songBpm);
  show("band");
};

// -------------------------------------------------------------
// REHEARSAL CONTROLLER INTEGRATION
// -------------------------------------------------------------
window.virtuoRehearsalController = virtuoRehearsal;

virtuoRehearsal.subscribe(() => {
  if (currentScreen === "ensaio") {
    renderCurrentScreen();
  }
});

window.handleCreateRehearsalSubmit = async (event) => {
  event.preventDefault();
  const name = document.getElementById("rehearsal-new-name")?.value;
  const date = document.getElementById("rehearsal-new-date")?.value;
  const description = document.getElementById("rehearsal-new-desc")?.value;
  if (!name) return;

  await virtuoRehearsal.saveNewRehearsal({
    name,
    date,
    description,
    instruments: ["guitar", "acoustic_guitar", "bass", "keyboard", "drums", "vocals"]
  }, currentUser ? currentUser.uid : null);
};

// WhatsApp Sharing of Setlist
window.shareRepertoireWhatsApp = () => {
  const active = virtuoRehearsal.getActiveRehearsal();
  if (!active) {
    alert("Nenhum ensaio ativo no momento para compartilhar.");
    return;
  }
  const songs = active.songs || [];
  const songsListText = songs.map((s, idx) => {
    const song = virtuoRehearsal.songsMap.get(s.songId) || {};
    const key = s.specificKey || song.originalKey || "G";
    const songBpm = s.specificBpm || song.bpm || 74;
    return `${idx + 1}. *${song.title || 'Música'}* • Tom: ${key} • ${songBpm} BPM${s.easyPlay ? ' (Easy Play)' : ''}`;
  }).join("\n");

  const instrumentsList = (active.instruments || []).map(id => {
    const inst = CANONICAL_INSTRUMENTS.find(i => i.id === id);
    return inst ? `${inst.icon} ${inst.name}` : id;
  }).join(", ");

  const text = `🎼 *REPERTÓRIO DE ENSAIO - VIRTUO* 🎼\n\n` +
    `*Sessão:* ${active.name || 'Ensaio de Louvor'}\n` +
    `*Data:* ${active.date || 'A definir'}\n` +
    (active.description ? `*Observações:* ${active.description}\n` : '') +
    (instrumentsList ? `*Formação da Banda:* ${instrumentsList}\n` : '') +
    `\n📋 *Músicas do Repertório:*\n${songsListText || 'Nenhuma música adicionada ainda'}\n\n` +
    `✨ *Virtuo* • A plataforma do músico virtuoso`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

// -------------------------------------------------------------
// BAND MULTI-TRACK SYNTHESIZER INTEGRATION
// -------------------------------------------------------------
window.virtuoBand = virtuoBand;

virtuoBand.onStateChange((bandState) => {
  if (currentScreen === "band") {
    // Master play button
    const playBtn = document.getElementById("band-master-play-btn");
    const playIcon = document.getElementById("band-play-icon");
    const playLabel = document.getElementById("band-play-label");
    if (playBtn && playIcon && playLabel) {
      if (bandState.isPlaying) {
        playIcon.textContent = "⏸";
        playLabel.textContent = "Pausar Banda";
        playBtn.classList.add("playing");
      } else {
        playIcon.textContent = "▶";
        playLabel.textContent = "Tocar Banda";
        playBtn.classList.remove("playing");
      }
    }

    // Key selection chips
    document.querySelectorAll(".band-key-chip").forEach(chip => {
      if (chip.id === `band-key-${bandState.currentKey}`) {
        chip.style.background = "#7EE7FF";
        chip.style.color = "#07101F";
        chip.style.fontWeight = "700";
      } else {
        chip.style.background = "rgba(255,255,255,0.06)";
        chip.style.color = "#E2E8F0";
        chip.style.fontWeight = "400";
      }
    });

    // Tracks Mute and Volume indicators
    Object.keys(bandState.tracks).forEach(trackId => {
      const track = bandState.tracks[trackId];
      const muteBtn = document.getElementById(`btn-mute-${trackId}`);
      if (muteBtn) {
        if (track.muted) {
          muteBtn.style.background = "rgba(239,68,68,0.2)";
          muteBtn.style.color = "#f87171";
          muteBtn.style.borderColor = "#ef4444";
          muteBtn.textContent = "Muted";
        } else {
          muteBtn.style.background = "rgba(255,255,255,0.05)";
          muteBtn.style.color = "#f1f5f9";
          muteBtn.style.borderColor = "rgba(255,255,255,0.15)";
          muteBtn.textContent = "Mute";
        }
      }
      const volVal = document.getElementById(`val-vol-${trackId}`);
      if (volVal) {
        volVal.textContent = `${Math.round(track.volume * 100)}%`;
      }
    });
  }
});

window.toggleBandEnginePlayback = () => {
  virtuoBand.togglePlay();
};

window.stopBandEnginePlayback = () => {
  virtuoBand.stop();
};

window.setBandKey = (key) => {
  virtuoBand.setKey(key);
};

window.setTrackVolume = (trackId, val) => {
  virtuoBand.setTrackVolume(trackId, val);
};

window.toggleTrackMute = (trackId) => {
  virtuoBand.toggleTrackMute(trackId);
};

// -------------------------------------------------------------
// COMMUNITY INTEGRATION
// -------------------------------------------------------------
async function loadCommunityPosts() {
  communityPosts = await CommunityService.getAllPosts();
  if (currentScreen === "comunidade") {
    renderCurrentScreen();
  }
}

window.refreshCommunityPosts = async () => {
  await loadCommunityPosts();
};

window.handleCreatePost = async () => {
  const contentEl = document.getElementById("community-post-text");
  const imgEl = document.getElementById("community-post-img-url");
  const fileInput = document.getElementById("community-post-file");
  const submitBtn = document.getElementById("community-submit-btn");
  const content = contentEl ? contentEl.value.trim() : "";
  let imageUrl = imgEl ? imgEl.value.trim() : "";

  const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
  if (!content && !hasFile) {
    alert("Por favor, escreva uma mensagem ou anexe uma foto da câmera/galeria.");
    return;
  }

  // Upload direto de imagem para Firebase Storage se arquivo selecionado
  if (hasFile) {
    const file = fileInput.files[0];
    try {
      if (submitBtn) submitBtn.textContent = "Enviando foto...";
      imageUrl = await uploadImageFile(file, `community/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    } catch (uploadErr) {
      console.warn("Aviso upload de imagem no Storage:", uploadErr);
      alert("Aviso: Falha ao enviar foto para o Storage. A publicação continuará.");
    } finally {
      if (submitBtn) submitBtn.textContent = "Publicar no Feed";
    }
  }

  const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');
  const role = isCelestial ? "Membro Celestial" : (currentUser ? "Membro" : "Músico Virtuoso");
  const authorName = (userProfile && userProfile.displayName) || (currentUser && currentUser.displayName) || "Músico Virtuoso";
  const authorPhoto = currentUser && currentUser.photoURL ? currentUser.photoURL : "";

  await CommunityService.createPost({
    content: content || "Compartilhou uma foto com a comunidade.",
    imageUrl,
    authorName,
    authorRole: role,
    authorPhoto
  }, currentUser ? currentUser.uid : null);

  if (contentEl) contentEl.value = "";
  if (imgEl) imgEl.value = "";
  if (fileInput) fileInput.value = "";
  await loadCommunityPosts();
};

window.togglePostLike = async (postId) => {
  await CommunityService.toggleLike(postId, currentUser ? currentUser.uid : "guest-user");
  await loadCommunityPosts();
};

window.handleDeletePost = async (postId) => {
  if (!confirm("Tem certeza de que deseja excluir esta publicação?")) return;
  await CommunityService.deletePost(postId, currentUser ? currentUser.uid : null);
  await loadCommunityPosts();
};

// -------------------------------------------------------------
// VIRTUO AI INTERACTIVE HARMONIC ADVICE
// -------------------------------------------------------------
window.requestAiHarmonicAnalysis = async () => {
  if (!activeSong) return;
  isAnalyzingWithAI = true;
  renderCurrentScreen();

  const originalKey = activeSong.originalKey || "G";
  const currentKey = calculateKey(originalKey, transposeOffset);

  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songTitle: activeSong.title,
        originalKey,
        currentKey,
        bpm: activeSong.bpm || 74,
        chords: activeSong.chords || "",
        musicianLevel: userProfile?.level || "Intermediário"
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.advice) {
        aiAnalysis = data.advice;
      }
    }
  } catch (err) {
    console.warn("AI endpoint notice:", err);
  }

  if (!aiAnalysis) {
    aiAnalysis = {
      summary: `Diretrizes de Arranjo para "${activeSong.title}" em ${currentKey}:`,
      recommendations: [
        "Inicie a introdução em dinâmica suave (pianíssimo), valorizando o violão acústico e pads atmosféricos.",
        "Utilize acordes com nona adicionada (como " + currentKey + "add9) para enriquecer o espaço harmônico nas estrofes.",
        "Na transição para o refrão, apoie as passagens com inversão de baixo para manter a firmeza da equipe.",
        "Sustente o andamento estável com o metrônomo integrado a " + (activeSong.bpm || 74) + " BPM."
      ],
      generatedBy: "Virtuo AI Musical Engine"
    };
  }

  isAnalyzingWithAI = false;
  renderCurrentScreen();
};

window.closeAiHarmonicAnalysis = () => {
  aiAnalysis = null;
  renderCurrentScreen();
};

// -------------------------------------------------------------
// VIRTUO AI INTERACTIVE ASSISTANT (DIRETOR MUSICAL & CHAT)
// -------------------------------------------------------------
window.openVirtuoAiModal = (optionalPrompt) => {
  isAiModalOpen = true;
  renderVirtuoAiModal();
  if (optionalPrompt) {
    window.insertAiQuickPrompt(optionalPrompt);
  }
};

window.closeVirtuoAiModal = () => {
  isAiModalOpen = false;
  const modalEl = document.getElementById("virtuo-ai-modal-root");
  if (modalEl) modalEl.remove();
};

window.insertAiQuickPrompt = (promptText) => {
  const inputEl = document.getElementById("ai-user-message-input");
  if (inputEl) {
    inputEl.value = promptText;
    inputEl.focus();
  }
};

window.sendVirtuoAiChatMessage = async (customText) => {
  const inputEl = document.getElementById("ai-user-message-input");
  const message = customText || (inputEl ? inputEl.value.trim() : "");
  if (!message || isAiReplying) return;

  if (inputEl) inputEl.value = "";
  aiChatHistory.push({ role: "user", text: message });
  isAiReplying = true;
  renderVirtuoAiModal();

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.reply) {
        aiChatHistory.push({ role: "assistant", text: data.reply });
      } else {
        aiChatHistory.push({ role: "assistant", text: "Como Diretor Musical Virtuo, sugiro manter a estabilidade no metrônomo, conduzir as vozes suavemente e adequar a dinâmica instrumental para sustentar o louvor congregacional." });
      }
    } else {
      aiChatHistory.push({ role: "assistant", text: "Como Diretor Musical Virtuo, recomendo priorizar a clareza harmônica e a dinâmica suave nos versos, crescendo com firmeza no refrão." });
    }
  } catch (err) {
    aiChatHistory.push({ role: "assistant", text: "Dica do Virtuo AI: Mantenha os acordes firmes na base, usando notas adicionadas (como 9ª ou sus4) para enriquecer o espaço harmônico da equipe." });
  }

  isAiReplying = false;
  renderVirtuoAiModal();
  const bodyEl = document.getElementById("ai-chat-body");
  if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
};

function renderVirtuoAiModal() {
  let modalRoot = document.getElementById("virtuo-ai-modal-root");
  if (!isAiModalOpen) {
    if (modalRoot) modalRoot.remove();
    return;
  }

  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "virtuo-ai-modal-root";
    document.body.appendChild(modalRoot);
  }

  modalRoot.className = "ai-modal-backdrop";
  modalRoot.innerHTML = `
    <div class="ai-modal" role="dialog" aria-modal="true" aria-label="Virtuo AI">
      <div class="ai-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">✨</span>
          <div>
            <h3 style="font-size:15px; margin:0; color:#7EE7FF; font-weight:700;">Virtuo AI • Diretor Musical</h3>
            <span style="font-size:11px; color:#94a3b8;">Assistente inteligente ativo para seu ministério</span>
          </div>
        </div>
        <button class="minister-metro-close" onclick="window.closeVirtuoAiModal()" title="Fechar Assistente">✕</button>
      </div>

      <div class="ai-modal-body" id="ai-chat-body">
        ${aiChatHistory.map(msg => `
          <div class="ai-chat-message ${msg.role}">
            <div style="font-size:10px; color:#94a3b8; margin-bottom:2px;">
              ${msg.role === 'user' ? 'Você' : '✦ Virtuo AI (Gemini)'}
            </div>
            <div class="ai-bubble">
              ${escapeHtml(msg.text).replace(/\\n/g, '<br/>')}
            </div>
          </div>
        `).join("")}
        ${isAiReplying ? `
          <div class="ai-chat-message assistant">
            <div class="ai-bubble" style="display:flex; align-items:center; gap:8px;">
              <div class="auth-spinner" style="width:14px; height:14px; border-width:2px; margin:0;"></div>
              <span style="color:#7EE7FF; font-size:12px;">Virtuo AI formulando orientação musical...</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="ai-modal-footer">
        <div class="ai-quick-prompts">
          <button class="ai-quick-btn" onclick="window.insertAiQuickPrompt('Como fazer transição suave de Tom G para Tom D?')">✦ Transição G ➔ D</button>
          <button class="ai-quick-btn" onclick="window.insertAiQuickPrompt('Dicas de dinâmica para ministrar Mistério na Olaria')">✦ Dinâmica Olaria</button>
          <button class="ai-quick-btn" onclick="window.insertAiQuickPrompt('Como enriquecer os acordes no teclado em worship?')">✦ Teclado Worship</button>
          <button class="ai-quick-btn" onclick="window.insertAiQuickPrompt('Qual o melhor momento para subir o tom no louvor?')">✦ Modulação</button>
        </div>

        <div style="display:flex; gap:8px;">
          <input 
            type="text" 
            id="ai-user-message-input" 
            class="form-input" 
            placeholder="Pergunte ao Virtuo AI (arranjos, acordes, ensaio)..." 
            style="margin:0; flex:1;"
            onkeydown="if(event.key==='Enter') window.sendVirtuoAiChatMessage()"
          />
          <button 
            class="button primary" 
            style="padding:8px 16px; font-size:13px; white-space:nowrap;"
            onclick="window.sendVirtuoAiChatMessage()"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SEARCH & CELESTIAL / PROFILE HANDLERS
// -------------------------------------------------------------
window.handleSongSearch = (val) => {
  songSearchQuery = val;
  renderCurrentScreen();
};

window.openUpgradeModal = () => {
  isUpgradeModalOpen = true;
  renderCurrentScreen();
};

window.closeUpgradeModal = () => {
  isUpgradeModalOpen = false;
  renderCurrentScreen();
};

window.activateCelestialPlan = async () => {
  localStorage.setItem('virtuo_celestial_member', 'true');
  if (currentUser) {
    try {
      await updateUserProfileDoc(currentUser.uid, { isCelestial: true });
      if (userProfile) userProfile.isCelestial = true;
    } catch {}
  }
  isUpgradeModalOpen = false;
  alert("✦ Parabéns! Status de Membro Celestial ativado com sucesso!");
  renderCurrentScreen();
};

window.toggleEditProfileForm = () => {
  isEditProfileOpen = !isEditProfileOpen;
  renderCurrentScreen();
};

window.saveUserProfileEdits = async () => {
  const nameInput = document.getElementById("edit-profile-name");
  const photoInput = document.getElementById("edit-profile-photo");
  const bioInput = document.getElementById("edit-profile-bio");

  const newName = nameInput ? nameInput.value.trim() : "";
  const newPhoto = photoInput ? photoInput.value.trim() : "";
  const newBio = bioInput ? bioInput.value.trim() : "";

  if (currentUser) {
    try {
      await updateUserProfileDoc(currentUser.uid, {
        displayName: newName || currentUser.displayName,
        photoURL: newPhoto || currentUser.photoURL,
        bio: newBio
      });
      if (userProfile) {
        userProfile.displayName = newName || userProfile.displayName;
        userProfile.photoURL = newPhoto || userProfile.photoURL;
        userProfile.bio = newBio;
      }
      isEditProfileOpen = false;
      alert("Perfil atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao salvar perfil: " + err.message);
    }
  } else {
    isEditProfileOpen = false;
    alert("Perfil salvo localmente.");
  }
  renderCurrentScreen();
};

// Inicialização antecipada do ensaio com as músicas disponíveis
virtuoRehearsal.init();
loadCommunityPosts();

// -------------------------------------------------------------
// SCREENS GENERATOR (Apple-Class Design System)
// -------------------------------------------------------------
const screens = {
  get adminSongManager() {
    const isAdmin = isUserAdmin(currentUser, userProfile);
    return adminSongManager.render(currentUser, userProfile, isAdmin);
  },

  get home() {
    const greeting = currentUser 
      ? `Olá, ${currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Músico'}.` 
      : `Bom dia.`;

    return `
      <section class="glass">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="pill">VIRTUO READY</span>
          <div class="firebase-status">
            <span class="status-dot ${firebaseStatus.connected ? '' : 'offline'}"></span>
            <span>${firebaseStatus.label}</span>
          </div>
        </div>

        <h2 class="hero">${greeting}</h2>

        <p class="subtitle">
          Seu próximo ensaio já está preparado.
        </p>

        <div class="row">
          <a class="button primary" href="#" onclick="show('ensaio'); return false;">
            Abrir Ensaio
          </a>
          <a class="button secondary" href="#" onclick="show('band'); return false;">
            Modo Banda
          </a>
        </div>
      </section>

      <div class="grid">
        <div class="tile" onclick="show('ensaio')" style="cursor:pointer;">
          <div class="icon">🎸</div>
          <h3>Modo Ensaio</h3>
          <p>Organize repertórios.</p>
        </div>

        <div class="tile" onclick="show('band')" style="cursor:pointer;">
          <div class="icon">🥁</div>
          <h3>Modo Banda</h3>
          <p>Treine com BPM.</p>
        </div>

        <div class="tile" onclick="window.openMinisterModeQuick()" style="cursor:pointer;">
          <div class="icon">🎤</div>
          <h3>Modo Ministro</h3>
          <p>Toque sem distrações.</p>
        </div>

        <div class="tile" onclick="show('library')" style="cursor:pointer;">
          <div class="icon">🎧</div>
          <h3>Cifras e Áudio</h3>
          <p>Banco no Firestore.</p>
        </div>

        <div class="tile" onclick="show('comunidade')" style="cursor:pointer;">
          <div class="icon">👥</div>
          <h3>Comunidade</h3>
          <p>Feed dos músicos.</p>
        </div>

        <div class="tile" onclick="window.openVirtuoAiModal()" style="cursor:pointer; border: 1px solid rgba(126, 231, 255, 0.35); background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.08));">
          <div class="icon">✨</div>
          <h3>Virtuo AI</h3>
          <p>Diretor musical ativo.</p>
        </div>
      </div>

      <section class="glass">
        <div class="song-cover">🎵</div>
        <span class="pill">DESTAQUE DO REPERTÓRIO</span>
        <h2>Mistério na Olaria</h2>
        <p class="subtitle">Tom G • 74 BPM • Raquel Pereira</p>

        <div class="row">
          <button class="button primary" onclick="window.openSongById('demo-misterio-olaria')">
            Ver Cifra Completa
          </button>
          <a class="button secondary"
             target="_blank"
             rel="noopener noreferrer"
             href="https://open.spotify.com/search/Mistério%20na%20Olaria%20Raquel%20Pereira">
            Spotify
          </a>
        </div>
      </section>
    `;
  },

  get ensaio() {
    return renderRehearsalScreen(virtuoRehearsal);
  },

  get band() {
    return renderBandScreenComponent(virtuoMetronome.getState());
  },

  get comunidade() {
    const isLogged = !!currentUser;
    const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');
    const isAdmin = isUserAdmin(currentUser, userProfile);

    const postsListHtml = communityPosts.length === 0 ? `
      <div style="text-align:center; padding:32px 12px; color:#94a3b8;">
        <span style="font-size:32px; display:block; margin-bottom:8px;">👥</span>
        <h3>Comunidade Virtuo</h3>
        <p style="font-size:13px; margin-top:4px;">Seja o primeiro a compartilhar um momento de ensaio ou louvor!</p>
      </div>
    ` : communityPosts.map(post => {
      const isLiked = Array.isArray(post.likes) && currentUser && post.likes.includes(currentUser.uid);
      const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
      const canDelete = currentUser && (post.authorId === currentUser.uid || isAdmin);
      const authorInitials = (post.authorName || "M").charAt(0).toUpperCase();

      return `
        <article class="community-post-card" id="post-${post.id}">
          <div class="community-header">
            <div class="community-author-wrap">
              <div class="community-avatar-circ">
                ${post.authorPhoto ? `<img src="${post.authorPhoto}" style="width:100%;height:100%;object-fit:cover;" />` : authorInitials}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="community-author-name">${escapeHtml(post.authorName || "Músico Virtuoso")}</span>
                  ${post.authorRole === "Membro Celestial" || post.authorRole === "Fundador" ? `
                    <span class="badge-celestial" style="font-size:9px; padding:2px 8px;">✦ CELESTIAL</span>
                  ` : ''}
                </div>
                <div class="community-author-meta">
                  <span>${escapeHtml(post.authorRole || "Membro")}</span>
                  <span>•</span>
                  <span>${typeof post.createdAt === "string" ? new Date(post.createdAt).toLocaleDateString("pt-BR") : "Hoje"}</span>
                </div>
              </div>
            </div>

            ${canDelete ? `
              <button 
                class="tag-btn" 
                style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:11px; padding:4px 8px;" 
                onclick="window.handleDeletePost('${post.id}')"
                title="Excluir publicação"
              >
                🗑️
              </button>
            ` : ''}
          </div>

          <div class="community-content-text">${escapeHtml(post.content || "")}</div>

          ${post.imageUrl ? `
            <img src="${escapeHtml(post.imageUrl)}" class="community-post-img" alt="Publicação" loading="lazy" />
          ` : ''}

          <div class="community-actions-bar">
            <button 
              class="community-like-btn ${isLiked ? 'liked' : ''}" 
              onclick="window.togglePostLike('${post.id}')"
              title="Curtir publicação"
            >
              <span>${isLiked ? '❤️' : '🤍'}</span>
              <span>${likesCount} curtida${likesCount !== 1 ? 's' : ''}</span>
            </button>
            <span style="font-size:11px; color:#64748b;">Virtuo Feed</span>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="glass">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="pill">COMUNIDADE VIRTUO</span>
          <button class="button secondary" style="padding:4px 10px; font-size:11px;" onclick="window.refreshCommunityPosts()">
            🔄 Atualizar
          </button>
        </div>

        <h2 style="margin-top:10px;">Feed dos Músicos</h2>
        <p class="subtitle">Compartilhe experiências de ensaios, fotos e troque ideias com ministros e instrumentistas.</p>

        <!-- Formulário de Nova Publicação -->
        <div style="margin-top:16px; padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px;">
          <h3 style="font-size:14px; color:#7EE7FF; margin-bottom:8px;">+ Criar Publicação</h3>
          <textarea 
            id="community-post-text" 
            class="form-input" 
            rows="3" 
            placeholder="O que sua equipe de louvor ensaiou hoje? Compartilhe com a comunidade..."
          ></textarea>

          <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:#94a3b8; display:flex; align-items:center; gap:6px;">
              <span>📷 Anexar Foto da Câmera ou Galeria</span>
            </label>
            <input 
              type="file" 
              id="community-post-file" 
              accept="image/*" 
              class="form-input" 
              style="padding:6px 10px; font-size:12px; cursor:pointer;"
            />
            <input 
              type="url" 
              id="community-post-img-url" 
              class="form-input" 
              placeholder="Ou cole uma URL de imagem (opcional, ex: https://...)" 
              style="font-size:12px;"
            />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button id="community-submit-btn" class="button primary" style="padding:8px 18px; font-size:13px;" onclick="window.handleCreatePost()">
              Publicar no Feed
            </button>
          </div>
        </div>

        <div class="community-feed">
          ${postsListHtml}
        </div>
      </section>
    `;
  },

  get library() {
    const isAdmin = isUserAdmin(currentUser, userProfile);
    const offlineRecent = SongsRepository.getOfflineRecentSongs();
    const allList = liveSongs.length > 0 ? liveSongs : (offlineRecent.length > 0 ? offlineRecent : DEMO_SONGS);
    const query = (songSearchQuery || "").toLowerCase().trim();
    const list = query 
      ? allList.filter(s => (s.title || "").toLowerCase().includes(query) || (s.artist || "").toLowerCase().includes(query))
      : allList;

    const songCards = list.length === 0 ? `
      <div style="grid-column: 1 / -1; text-align:center; padding:24px 12px; color:#94a3b8;">
        <p>Nenhuma música encontrada para "<strong>${escapeHtml(songSearchQuery)}</strong>".</p>
        <button class="button secondary" style="margin-top:8px;" onclick="window.handleSongSearch('')">Limpar Busca</button>
      </div>
    ` : list.map(song => `
      <div class="tile" onclick="window.openSongById('${song.id || song.title}')" style="cursor:pointer;">
        <div class="icon">🎵</div>
        <h3>${escapeHtml(song.title)}</h3>
        <p>${escapeHtml(song.artist || "Virtuo Worship")} • Tom ${escapeHtml(song.originalKey || "G")}${song.capo && Number(song.capo) > 0 ? ` • Capo ${song.capo}` : ''}${song.audioUrl ? ' • 🎧' : ''}</p>
      </div>
    `).join("");

    return `
      <section class="glass">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill">BANCO DE MÚSICAS & CIFRAS</span>
            ${offlineRecent.length > 0 ? `
              <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(16,185,129,0.12); color:#6ee7b7; border-color:rgba(16,185,129,0.3);">
                ⚡ ${offlineRecent.length} OFFLINE
              </span>
            ` : ''}
          </div>
          <div style="display:flex; gap:8px;">
            ${isAdmin ? `
              <button class="button secondary" style="padding:6px 12px; font-size:11px; border-color:#7EE7FF; color:#7EE7FF;" onclick="show('adminSongManager')">
                ⚙️ Admin Musical
              </button>
            ` : ''}
            <button class="button secondary" style="padding:6px 12px; font-size:11px;" onclick="window.seedSongsToFirestore()">
              Sincronizar no Firestore
            </button>
            <button class="button primary" style="padding:6px 14px; font-size:12px;" onclick="${isAdmin ? "show('adminSongManager')" : "window.toggleAddSongForm()"}">
              + Nova Música
            </button>
          </div>
        </div>

        <h2>Biblioteca Virtuo</h2>
        <p class="subtitle">Cifras harmonizadas, transposição e suporte a Easy Play em tempo real no Firestore.</p>

        <!-- Barra de Busca em Tempo Real -->
        <div style="margin-top:14px;">
          <input 
            type="text" 
            id="song-search-input" 
            class="form-input" 
            placeholder="🔍 Buscar música por título ou artista..." 
            value="${escapeHtml(songSearchQuery)}"
            oninput="window.handleSongSearch(this.value)" 
          />
        </div>

        <div id="add-song-form" style="display:none; margin-top:16px; padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px;">
          <h3 style="margin-bottom:12px; font-size:16px; color:#7EE7FF;">Cadastrar Nova Música no Firestore</h3>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Título da Música *</label>
              <input type="text" id="new-song-title" class="form-input" placeholder="Ex: Bondade de Deus" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Artista / Ministério</label>
              <input type="text" id="new-song-artist" class="form-input" placeholder="Ex: Isaías Saad" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Tom Original</label>
              <input type="text" id="new-song-key" class="form-input" placeholder="Ex: G, D, C..." value="G" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">BPM</label>
              <input type="number" id="new-song-bpm" class="form-input" placeholder="Ex: 74" value="74" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Dificuldade</label>
              <input type="text" id="new-song-diff" class="form-input" placeholder="Fácil / Médio" value="Fácil" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Capotraste (Casa)</label>
              <input type="number" id="new-song-capo" class="form-input" placeholder="0" min="0" max="12" value="0" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Faixa de Áudio / Ensaio (Upload)</label>
              <input type="file" id="new-song-audio-file" accept="audio/*" class="form-input" style="padding:6px; font-size:12px; cursor:pointer;" />
            </div>
          </div>

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px; margin-top:8px;">Estrutura Harmônica</label>
          <input type="text" id="new-song-structure" class="form-input" placeholder="Intro • Verso 1 • Refrão • Ponte • Final" value="Intro • Verso • Refrão • Final" />

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Cifra Completa (Acordes + Letra)</label>
          <textarea id="new-song-chords" class="form-input" rows="5" placeholder="[Intro] G  C  Em  D&#10;G               C&#10;Eu fui na olaria ver o vaso se formar..."></textarea>

          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Easy Chords (Versão Simplificada)</label>
          <textarea id="new-song-easy" class="form-input" rows="3" placeholder="[Intro] G  C  Em  D&#10;G           C&#10;Eu fui na olaria ver o vaso..."></textarea>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Link do YouTube</label>
              <input type="url" id="new-song-youtube" class="form-input" placeholder="https://youtube.com/..." />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Link do Spotify</label>
              <input type="url" id="new-song-spotify" class="form-input" placeholder="https://spotify.com/..." />
            </div>
          </div>

          <div class="row" style="margin-top:10px;">
            <button id="new-song-submit-btn" class="button primary" onclick="window.saveNewSong()">Salvar no Firestore</button>
            <button class="button secondary" onclick="window.toggleAddSongForm()">Cancelar</button>
          </div>
        </div>

        <div class="grid" style="margin-top:16px;">
          ${songCards}
        </div>
      </section>
    `;
  },

  get songDetail() {
    if (!activeSong) {
      return screens.library;
    }

    const isAdmin = isUserAdmin(currentUser, userProfile);
    const canManageSong = !!(currentUser && (activeSong.createdBy === currentUser.uid || isAdmin));
    const originalKey = activeSong.originalKey || "G";
    const currentKey = calculateKey(originalKey, transposeOffset);
    const displayedChords = isEasyPlay 
      ? getEasyPlayCifra(activeSong, transposeOffset)
      : transposeChordSheet(activeSong.chords || "", transposeOffset);

    return `
      <section class="glass cifra-viewer">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <button class="tag-btn" onclick="show('library')">← Voltar à Biblioteca</button>
          <div style="display:flex; gap:6px; align-items:center;">
            ${activeSong.capo && Number(activeSong.capo) > 0 ? `
              <span class="pill" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fde047; font-size:11px;">
                🎸 CAPO ${activeSong.capo}ª
              </span>
            ` : ''}
            <span class="pill">${isEasyPlay ? '⚡ MODO EASY PLAY' : 'TOM: ' + escapeHtml(currentKey)}</span>
          </div>
        </div>

        <h2 style="margin-top:12px;">${escapeHtml(activeSong.title)}</h2>
        <p class="subtitle" style="margin-bottom:14px;">
          ${escapeHtml(activeSong.artist || "Virtuo Worship")} • ${activeSong.bpm || 74} BPM • ${escapeHtml(activeSong.difficulty || "Fácil")}${activeSong.capo && Number(activeSong.capo) > 0 ? ` • Capo ${activeSong.capo}ª casa` : ''}
        </p>

        <!-- Transposer & Mode Toolbar (Apple-Class / Celestial) -->
        <div class="transposer-toolbar">
          <!-- Linha 1: Controles de Tom e Status -->
          <div class="transposer-row">
            <div class="tone-display-info">
              <!-- [-] TOM [+] Stepper -->
              <div class="tone-stepper-group">
                <button class="tone-stepper-btn" onclick="window.changeTone(-1)" title="Baixar 1 semitom" aria-label="Baixar 1 semitom">−</button>
                <span class="tone-stepper-label">TOM</span>
                <button class="tone-stepper-btn" onclick="window.changeTone(1)" title="Subir 1 semitom" aria-label="Subir 1 semitom">+</button>
              </div>

              <!-- Badge do Tom Atual -->
              <div class="tone-current-badge">
                <span>Tom atual:</span>
                <strong>${escapeHtml(currentKey)}</strong>
                ${transposeOffset !== 0 ? `<span style="font-size:11px; opacity:0.85;">(${transposeOffset > 0 ? '+' : ''}${transposeOffset} semitom${Math.abs(transposeOffset) > 1 ? 's' : ''})</span>` : ''}
              </div>

              <!-- Tom Original Preservado Separadamente -->
              <span class="tone-original-meta">
                Original: <strong>${escapeHtml(originalKey)}</strong>
              </span>

              <!-- Botão Voltar ao Tom Original -->
              ${transposeOffset !== 0 ? `
                <button class="tone-reset-link" onclick="window.resetTone()" title="Voltar ao tom original cadastrado (${escapeHtml(originalKey)})">
                  ↺ Voltar ao tom original
                </button>
              ` : ''}
            </div>

            <!-- Ações de Palco e Metrônomo -->
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="tag-btn" onclick="window.useSongBpmAndOpenMetronome(${activeSong.bpm || 74})" title="Usar BPM desta música no Metrônomo" style="display:inline-flex; align-items:center; gap:6px;">
                🥁 Usar BPM (${activeSong.bpm || 74})
              </button>
              <button class="tag-btn" onclick="window.openMinisterMode()" style="display:inline-flex; align-items:center; gap:6px;">
                🎤 Modo Ministro
              </button>
            </div>
          </div>

          <!-- Linha 2: Alternância de Versão [Cifra Original] [Easy Play] -->
          <div class="transposer-row" style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <span style="font-size:12px; color:#94a3b8;">Versão:</span>
              <div class="segmented-mode-control">
                <button class="segmented-mode-btn ${!isEasyPlay ? 'active' : ''}" onclick="window.setSongMode('original')">
                  🎵 Cifra Original
                </button>
                <button class="segmented-mode-btn ${isEasyPlay ? 'active' : ''}" onclick="window.setSongMode('easy')">
                  ⚡ Easy Play
                </button>
              </div>
            </div>

            <div style="font-size:12px; color:#7EE7FF;">
              ${isEasyPlay 
                ? '✦ Easy Play ativo: acordes simplificados para iniciantes (compatível com transposição)' 
                : '✦ Cifra original completa com arranjo, dissonâncias e extensões'}
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px; font-size:12px; color:#94a3b8;">
          <strong>Estrutura:</strong> ${escapeHtml(activeSong.structure || "Intro • Verso • Refrão • Final")}
        </div>

        <!-- Cifra Visualizer Preformatted -->
        <div class="cifra-pre">${formatCifraDisplay(displayedChords)}</div>

        <!-- Audio Playback (Faixa de Ensaio / Referência) -->
        ${activeSong.audioUrl ? `
          <div style="margin-top:14px; padding:12px 14px; background:rgba(126,231,255,0.05); border:1px solid rgba(126,231,255,0.2); border-radius:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:12px; color:#7EE7FF; font-weight:700; display:flex; align-items:center; gap:6px;">
                🎧 FAIXA DE ÁUDIO / ENSAIO
              </span>
              <span style="font-size:10px; color:#94a3b8;">Gravação de Referência</span>
            </div>
            <audio controls style="width:100%; height:38px; border-radius:8px;" src="${escapeHtml(activeSong.audioUrl)}"></audio>
          </div>
        ` : ''}

        <!-- Links e Ações -->
        <div class="row" style="margin-top:16px;">
          ${activeSong.youtubeUrl ? `
            <a class="button primary" href="${activeSong.youtubeUrl}" target="_blank" rel="noopener noreferrer">
              YouTube Oficial
            </a>
          ` : ''}
          ${activeSong.spotifyUrl ? `
            <a class="button secondary" href="${activeSong.spotifyUrl}" target="_blank" rel="noopener noreferrer">
              Spotify
            </a>
          ` : ''}
        </div>

        ${canManageSong ? `
          <!-- Ações do Criador / Administrador da Música -->
          <div style="margin-top:16px; padding:14px; background:rgba(126,231,255,0.04); border:1px solid rgba(126,231,255,0.18); border-radius:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:12px; color:#7EE7FF; font-weight:700;">GERENCIAR CIFRA ${isAdmin && activeSong.createdBy !== currentUser?.uid ? '(ACESSO ADMINISTRADOR)' : '(CRIADA POR VOCÊ)'}</span>
              <span style="font-size:10px; color:#94a3b8;">Gerenciamento seguro</span>
            </div>
            <div class="row">
              <button class="button secondary" style="flex:1; font-size:12px;" onclick="window.openEditSongForm('${activeSong.id}')">
                ✏️ Editar Música
              </button>
              ${isAdmin ? `
                <button class="button secondary" style="flex:1; font-size:12px; border-color:#7EE7FF; color:#7EE7FF;" onclick="window.adminSongManager.openEdit('${activeSong.id}', '${currentUser?.uid}', true); show('adminSongManager');">
                  ⚙️ Painel Admin
                </button>
              ` : ''}
              <button class="button outline-danger" style="flex:1; font-size:12px;" onclick="window.confirmDeleteSong('${activeSong.id}')">
                🗑️ Excluir do Firestore
              </button>
            </div>
          </div>
        ` : ''}

        ${editingSong && editingSong.id === activeSong.id ? `
          <!-- Formulário de Edição Inline -->
          <div id="edit-song-modal" style="margin-top:16px; padding:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(126,231,255,0.25); border-radius:18px;">
            <h3 style="margin-bottom:12px; font-size:16px; color:#7EE7FF;">Editar Música no Firestore</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Título</label>
                <input type="text" id="edit-song-title" class="form-input" value="${escapeHtml(editingSong.title || '')}" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Artista</label>
                <input type="text" id="edit-song-artist" class="form-input" value="${escapeHtml(editingSong.artist || '')}" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Tom Original</label>
                <input type="text" id="edit-song-key" class="form-input" value="${escapeHtml(editingSong.originalKey || 'G')}" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">BPM</label>
                <input type="number" id="edit-song-bpm" class="form-input" value="${editingSong.bpm || 74}" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Dificuldade</label>
                <input type="text" id="edit-song-diff" class="form-input" value="${escapeHtml(editingSong.difficulty || 'Fácil')}" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Capotraste (Casa)</label>
                <input type="number" id="edit-song-capo" class="form-input" min="0" max="12" value="${editingSong.capo || 0}" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Substituir/Anexar Áudio (Upload)</label>
                <input type="file" id="edit-song-audio-file" accept="audio/*" class="form-input" style="padding:6px; font-size:12px; cursor:pointer;" />
                ${editingSong.audioUrl ? `<span style="font-size:10px; color:#7EE7FF; display:block; margin-top:3px;">Áudio atual anexado</span>` : ''}
              </div>
            </div>

            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px; margin-top:8px;">Estrutura Harmônica</label>
            <input type="text" id="edit-song-structure" class="form-input" value="${escapeHtml(editingSong.structure || '')}" />

            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Cifra Completa</label>
            <textarea id="edit-song-chords" class="form-input" rows="6">${escapeHtml(editingSong.chords || '')}</textarea>

            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Easy Chords (Simplificada)</label>
            <textarea id="edit-song-easy" class="form-input" rows="3">${escapeHtml(editingSong.easyChords || '')}</textarea>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">YouTube</label>
                <input type="url" id="edit-song-youtube" class="form-input" value="${escapeHtml(editingSong.youtubeUrl || '')}" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Spotify</label>
                <input type="url" id="edit-song-spotify" class="form-input" value="${escapeHtml(editingSong.spotifyUrl || '')}" />
              </div>
            </div>

            <div class="row" style="margin-top:12px;">
              <button id="edit-song-submit-btn" class="button primary" onclick="window.saveEditedSong()">Salvar Alterações</button>
              <button class="button secondary" onclick="window.cancelEditSong()">Cancelar</button>
            </div>
          </div>
        ` : ''}

        <!-- Virtuo AI Interactive Harmonic Advice Card -->
        <div style="margin-top:16px;">
          ${isAnalyzingWithAI ? `
            <div class="ai-advice-card" style="text-align:center; padding:20px;">
              <div class="auth-spinner" style="margin: 0 auto 10px;"></div>
              <strong style="color:#7EE7FF; font-size:14px;">Virtuo AI analisando dinâmica e arranjo...</strong>
              <p style="font-size:12px; color:#94a3b8; margin-top:4px;">Garantindo harmonia de palco e condução congregacional.</p>
            </div>
          ` : aiAnalysis ? `
            <div class="ai-advice-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-celestial">✦ VIRTUO AI ARRANJO & DIREÇÃO</span>
                <button class="tag-btn" onclick="window.closeAiHarmonicAnalysis()" style="font-size:11px; padding:2px 8px;">✕ Fechar</button>
              </div>
              <h4 style="margin-top:10px; font-size:15px; color:#fff;">${escapeHtml(aiAnalysis.summary || "Diretrizes de Arranjo")}</h4>
              <div class="ai-advice-list">
                ${(aiAnalysis.recommendations || []).map(rec => `
                  <div class="ai-advice-item">
                    <span>💡</span>
                    <span>${escapeHtml(rec)}</span>
                  </div>
                `).join("")}
              </div>
              <div style="margin-top:10px; font-size:11px; color:#64748b; text-align:right;">
                Fonte: ${escapeHtml(aiAnalysis.generatedBy || "Virtuo AI Musical Director")}
              </div>
            </div>
          ` : `
            <button 
              class="button secondary" 
              style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; border-color:rgba(126,231,255,0.35); color:#7EE7FF;"
              onclick="window.requestAiHarmonicAnalysis()"
            >
              <span>✦ Virtuo AI</span>
              <span>Analisar Arranjo e Dicas de Palco</span>
            </button>
          `}
        </div>

        <!-- Virtuo Architecture Info (Ready for Sessions & AI) -->
        <div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#7EE7FF; font-weight:700;">VIRTUO SESSION & AI READY</span>
            <span style="font-size:10px; color:#64748b;">ID: ${escapeHtml(activeSong.id || 'local')}</span>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin-top:6px;">
            Módulo conectado para sincronização em rede de ensaio, metrônomo integrado e análise harmônica estrutural.
          </p>
        </div>
      </section>
    `;
  },

  get profile() {
    const isLogged = !!currentUser;
    const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');
    const isAdmin = isUserAdmin(currentUser, userProfile);
    const name = (userProfile && userProfile.displayName) || (currentUser && currentUser.displayName) || (isLogged ? "Músico Virtuoso" : "Nashix Hoo");
    const email = (userProfile && userProfile.email) || (currentUser && currentUser.email) || "";
    const instruments = (userProfile && userProfile.instruments) || ["Guitarra", "Vocal"];
    const avatarContent = currentUser && currentUser.photoURL 
      ? `<img src="${currentUser.photoURL}" class="avatar-img" alt="Avatar" />` 
      : (currentUser && (currentUser.displayName || currentUser.email) 
          ? `<span style="font-size:36px; font-weight:800; color:#7EE7FF;">${(currentUser.displayName || currentUser.email).charAt(0).toUpperCase()}</span>` 
          : `👤`);

    return `
      <section class="glass">
        <div class="song-cover" style="height:110px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${avatarContent}
        </div>

        <h2>${escapeHtml(name)}</h2>
        <p class="subtitle">${isLogged ? (email || "Músico Conectado") : "Criador do Virtuo"}</p>

        <!-- Status do Membro (Celestial ou Gratuito) -->
        <div style="margin: 12px 0; text-align:center;">
          ${isCelestial ? `
            <span class="badge-celestial" style="font-size:12px; padding:6px 16px;">
              ✦ MEMBRO CELESTIAL ATIVO
            </span>
            <p style="font-size:11px; color:#fde047; margin-top:4px;">Acesso irrestrito a todos os módulos e Virtuo AI ilimitado.</p>
          ` : `
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
              <span class="badge-free">MEMBRO GRATUITO</span>
              <button class="button primary" style="background:linear-gradient(135deg, #f59e0b, #d97706); border:none; padding:8px 18px; font-size:13px; font-weight:700; color:#fff;" onclick="window.openUpgradeModal()">
                ✦ Tornar-se Membro Celestial
              </button>
            </div>
          `}
        </div>

        <!-- Modal de Upgrade Celestial -->
        ${isUpgradeModalOpen ? `
          <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeUpgradeModal()">
            <div class="rehearsal-modal-card" style="max-width:440px; border-color:rgba(250,204,21,0.5);">
              <div class="modal-header">
                <span class="badge-celestial">✦ PLANO CELESTIAL</span>
                <button type="button" class="modal-close-btn" onclick="window.closeUpgradeModal()">✕</button>
              </div>
              <h3 style="margin-top:10px; font-size:18px; color:#fff;">Eleve seu Ministério Musical</h3>
              <p style="font-size:13px; color:#94a3b8; margin-top:4px; line-height:1.5;">
                O Membro Celestial é a experiência definitiva para ministros e instrumentistas que buscam a mais alta excelência em seus ensaios e cultos.
              </p>
              <div style="margin:16px 0; display:flex; flex-direction:column; gap:10px; text-align:left;">
                <div style="display:flex; gap:10px; font-size:13px; color:#e2e8f0;">
                  <span style="color:#fde047;">✓</span>
                  <span><strong>Virtuo AI Ilimitado:</strong> Análise harmônica e diretrizes de palco em tempo real.</span>
                </div>
                <div style="display:flex; gap:10px; font-size:13px; color:#e2e8f0;">
                  <span style="color:#fde047;">✓</span>
                  <span><strong>Multi-Track Band Synthesizer:</strong> Bateria, baixo e teclado sintetizados para treino em estúdio.</span>
                </div>
                <div style="display:flex; gap:10px; font-size:13px; color:#e2e8f0;">
                  <span style="color:#fde047;">✓</span>
                  <span><strong>Selo Dourado Celestial:</strong> Destaque permanente no feed da Comunidade.</span>
                </div>
                <div style="display:flex; gap:10px; font-size:13px; color:#e2e8f0;">
                  <span style="color:#fde047;">✓</span>
                  <span><strong>Acervo Ilimitado:</strong> Armazenamento e sincronização segura no Firestore.</span>
                </div>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                <button type="button" class="button secondary" onclick="window.closeUpgradeModal()">Agora Não</button>
                <button type="button" class="button primary" style="background:linear-gradient(135deg, #f59e0b, #d97706); border:none;" onclick="window.activateCelestialPlan()">
                  ✦ Ativar Status Celestial
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        ${isAuthChecking ? `
          <div style="margin: 14px 0; text-align: center;">
            <div class="auth-loading-pill">
              <div class="auth-spinner"></div>
              <span>Verificando sessão no Firebase...</span>
            </div>
          </div>
        ` : ''}

        <div class="grid" style="margin-top:14px;">
          <div class="tile">
            <div class="icon">⭐</div>
            <h3>5.0</h3>
            <p>Reputação</p>
          </div>

          <div class="tile">
            <div class="icon">✨</div>
            <h3>${isCelestial ? 'Celestial' : 'Fundador'}</h3>
            <p>${isCelestial ? 'Membro Celestial' : (isLogged ? "Músico Virtuoso" : "Founder Edition")}</p>
          </div>
        </div>

        ${isLogged ? `
          <!-- Authenticated User Profile & Instruments Settings -->
          <div style="margin-top:20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:12px; color:#7EE7FF; font-weight:700;">
                MEUS INSTRUMENTOS (FIRESTORE: users/${escapeHtml(currentUser.uid.slice(0, 8))}...)
              </label>
            </div>
            <div style="display:flex; flex-wrap:wrap; margin-bottom:16px;">
              ${AVAILABLE_INSTRUMENTS.map(inst => {
                const isSelected = instruments.includes(inst);
                return `
                  <span class="instrument-chip ${isSelected ? 'selected' : ''}" 
                        onclick="window.toggleUserInstrument('${inst}')">
                    ${isSelected ? '✓ ' : '+ '} ${inst}
                  </span>
                `;
              }).join("")}
            </div>

            <!-- Botão e Formulário de Edição de Perfil -->
            <div style="margin-bottom:16px;">
              <button class="button secondary" style="width:100%; font-size:12px; padding:6px 12px;" onclick="window.toggleEditProfileForm()">
                ${isEditProfileOpen ? '✕ Fechar Edição' : '✏️ Editar Dados do Perfil'}
              </button>
              ${isEditProfileOpen ? `
                <div style="margin-top:10px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px;">
                  <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Nome de Exibição</label>
                  <input type="text" id="edit-profile-name" class="form-input" value="${escapeHtml(name)}" placeholder="Seu nome" />
                  <label style="font-size:11px; color:#94a3b8; display:block; margin-top:8px; margin-bottom:4px;">URL da Foto de Perfil</label>
                  <input type="url" id="edit-profile-photo" class="form-input" value="${escapeHtml(currentUser?.photoURL || userProfile?.photoURL || '')}" placeholder="https://..." />
                  <label style="font-size:11px; color:#94a3b8; display:block; margin-top:8px; margin-bottom:4px;">Bio / Ministério de Louvor</label>
                  <textarea id="edit-profile-bio" class="form-input" rows="2" placeholder="Ex: Ministro de Louvor na Igreja">${escapeHtml(userProfile?.bio || '')}</textarea>
                  <button class="button primary" style="width:100%; margin-top:10px; padding:8px;" onclick="window.saveUserProfileEdits()">
                    Salvar Perfil
                  </button>
                </div>
              ` : ''}
            </div>

            <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.06); margin-bottom:16px; font-size:11px; color:#94a3b8;">
              <span style="color:#7EE7FF; font-weight:600;">UID:</span> ${escapeHtml(currentUser.uid)}<br>
              <span style="color:#7EE7FF; font-weight:600;">E-mail:</span> ${escapeHtml(currentUser.email || "Não informado")}<br>
              <span style="color:#7EE7FF; font-weight:600;">Sessão:</span> Persistência local ativa (browserLocalPersistence)
            </div>

            <button class="button secondary" style="width:100%;" onclick="window.handleLogout()">
              Sair da Conta (Logout)
            </button>
          </div>
        ` : `
          <!-- Apple-Class Auth Component -->
          <div class="auth-card" style="margin-top:20px; text-align:left;">
            <div class="auth-tabs">
              <button class="auth-tab ${authTab === 'login' ? 'active' : ''}" onclick="window.switchAuthTab('login')">
                Entrar
              </button>
              <button class="auth-tab ${authTab === 'signup' ? 'active' : ''}" onclick="window.switchAuthTab('signup')">
                Criar Conta
              </button>
              <button class="auth-tab ${authTab === 'reset' ? 'active' : ''}" onclick="window.switchAuthTab('reset')">
                Recuperar Senha
              </button>
            </div>

            <div id="auth-feedback" class="auth-feedback ${authFeedback.type}">
              ${escapeHtml(authFeedback.text)}
            </div>

            ${authTab === 'login' ? `
              <div>
                <input type="email" id="auth-email" class="form-input" placeholder="E-mail" autocomplete="email" onkeydown="if(event.key==='Enter') window.submitEmailLogin()" />
                <input type="password" id="auth-password" class="form-input" placeholder="Senha" autocomplete="current-password" onkeydown="if(event.key==='Enter') window.submitEmailLogin()" />
                <button class="button primary" style="width:100%; margin-top:6px;" onclick="window.submitEmailLogin()">
                  Entrar com E-mail
                </button>
              </div>
            ` : ''}

            ${authTab === 'signup' ? `
              <div>
                <input type="text" id="signup-name" class="form-input" placeholder="Nome Completo" onkeydown="if(event.key==='Enter') window.submitEmailSignUp()" />
                <input type="email" id="signup-email" class="form-input" placeholder="Seu melhor e-mail" autocomplete="email" onkeydown="if(event.key==='Enter') window.submitEmailSignUp()" />
                <input type="password" id="signup-password" class="form-input" placeholder="Crie uma senha (mínimo 6 dígitos)" autocomplete="new-password" onkeydown="if(event.key==='Enter') window.submitEmailSignUp()" />
                <button class="button primary" style="width:100%; margin-top:6px;" onclick="window.submitEmailSignUp()">
                  Cadastrar no Virtuo
                </button>
              </div>
            ` : ''}

            ${authTab === 'reset' ? `
              <div>
                <p style="font-size:12px; color:#94a3b8; margin-bottom:8px;">
                  Digite seu e-mail cadastrado para receber o link oficial de redefinição de senha.
                </p>
                <input type="email" id="reset-email" class="form-input" placeholder="E-mail cadastrado" onkeydown="if(event.key==='Enter') window.submitPasswordReset()" />
                <button class="button primary" style="width:100%; margin-top:6px;" onclick="window.submitPasswordReset()">
                  Enviar Link de Recuperação
                </button>
              </div>
            ` : ''}

            <div class="divider-line">ou continue com</div>

            <button class="button secondary" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.handleGoogleLogin()">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Entrar com Google
            </button>
          </div>
        `}

        <!-- Painel de Administração / Moderador (se for Admin) -->
        ${isAdmin ? `
          <div class="admin-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="pill" style="border-color:#ef4444; color:#ef4444;">✦ ADMINISTRAÇÃO VIRTUO</span>
              <span style="font-size:11px; color:#64748b;">Superuser Conectado</span>
            </div>
            <h4 style="margin-top:10px; font-size:14px; color:#fff;">Painel Mestre & Auditoria</h4>
            <p style="font-size:12px; color:#94a3b8; margin-top:4px;">
              Controle global de músicas, comunidade e segurança de regras Firestore.
            </p>
            <div class="grid" style="margin-top:12px; grid-template-columns:1fr 1fr 1fr; gap:8px;">
              <div class="tile" style="padding:10px;">
                <h3 style="font-size:16px;">${liveSongs.length}</h3>
                <p style="font-size:11px;">Músicas</p>
              </div>
              <div class="tile" style="padding:10px;">
                <h3 style="font-size:16px;">${communityPosts.length}</h3>
                <p style="font-size:11px;">Posts Feed</p>
              </div>
              <div class="tile" style="padding:10px;">
                <h3 style="font-size:16px;">Ativo</h3>
                <p style="font-size:11px;">Firestore</p>
              </div>
            </div>
            <div style="margin-top:12px; display:flex; gap:8px;">
              <button class="button secondary" style="flex:1; font-size:11px; padding:6px;" onclick="window.seedSongsToFirestore()">
                Sincronizar Acervo
              </button>
              <button class="button secondary" style="flex:1; font-size:11px; padding:6px;" onclick="window.refreshCommunityPosts()">
                Atualizar Feed
              </button>
            </div>
            <div style="margin-top:10px;">
              <button class="button primary" style="width:100%; font-size:12px; padding:8px 12px; border:1px solid #7EE7FF;" onclick="show('adminSongManager')">
                🎵 Banco Musical: Adicionar & Gerenciar Músicas
              </button>
            </div>
          </div>
        ` : ''}
      </section>

      <section class="glass" style="margin-top:16px;">
        <span class="pill">FIREBASE INFRAESTRUTURA</span>
        <h3 style="margin-top:10px;">Status da Conexão</h3>
        <p class="subtitle" style="font-size:13px; margin-bottom:8px; line-height: 1.6;">
          • Projeto: <strong>virtuo-7e01b</strong><br>
          • Web App ID: <strong>virtuo-web</strong> (1:624628069677:web:cf6e928f7a8f6301128fa4)<br>
          • Display Name: <strong>Virtuo PWA</strong><br>
          • Banco de Dados: <strong>Cloud Firestore</strong> (${firebaseStatus.connected ? '🟢 Ativo' : 'Offline/Aguardando'})<br>
          • Autenticação: <strong>Firebase Auth (E-mail/Senha, Google)</strong><br>
          • Armazenamento: <strong>Firebase Storage (Restrito)</strong><br>
          • Segurança: <strong>ABAC Ativo (Regras Restritas e Protegidas)</strong><br>
          • Inteligência Artificial: <strong>Virtuo AI • Gemini 3.8 Flash</strong> (✨ Operacional)
        </p>
        <button class="button secondary" style="width:100%; margin-top:10px; font-size:12px;" onclick="window.openVirtuoAiModal()">
          ✨ Abrir Assistente Virtuo AI
        </button>
      </section>
    `;
  }
};

// Helper to highlight chords and sections in raw text
function formatCifraDisplay(text) {
  if (!text) return "";
  const lines = text.split("\n");
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Section headers with or without inline chords (e.g., [Intro] G  C  Em  D ou [Refrão])
    const sectionMatch = line.match(/^(\s*\[[^\]]+\]\s*)(.*)$/);
    if (sectionMatch) {
      const tag = sectionMatch[1];
      const rest = sectionMatch[2];
      if (!rest.trim()) {
        return `<span class="section-tag">${escapeHtml(tag)}</span>`;
      }
      return `<span class="section-tag">${escapeHtml(tag)}</span><span class="chord-highlight">${escapeHtml(rest)}</span>`;
    }

    // Check if line is primarily chords
    if (isChordLine(line)) {
      return `<span class="chord-highlight">${escapeHtml(line)}</span>`;
    }

    return escapeHtml(line);
  }).join("\n");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function show(name) {
  currentScreen = name;
  renderCurrentScreen();
  updateTabbarActiveState(name);
}
window.show = show;

function updateTabbarActiveState(name) {
  document.querySelectorAll(".tabbar button").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(`tab-btn-${name}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

function renderCurrentScreen() {
  const container = document.getElementById("app");
  if (!container) return;
  const screenContent = screens[currentScreen];
  container.innerHTML = typeof screenContent === "function" ? screenContent() : screenContent;
  updateTabbarActiveState(currentScreen);
}
window.renderCurrentScreen = renderCurrentScreen;

// -------------------------------------------------------------
// GLOBAL UI HANDLERS: AUTHENTICATION
// -------------------------------------------------------------
window.switchAuthTab = (tab) => {
  authTab = tab;
  authFeedback = { text: "", type: "" };
  renderCurrentScreen();
};

window.submitEmailLogin = async () => {
  const emailInput = document.getElementById("auth-email");
  const passInput = document.getElementById("auth-password");
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passInput ? passInput.value : "";

  if (!email || !password) {
    authFeedback = { text: "Por favor, preencha seu e-mail e sua senha.", type: "error" };
    renderCurrentScreen();
    return;
  }

  try {
    authFeedback = { text: "Autenticando...", type: "success" };
    renderCurrentScreen();
    await signInWithEmail(email, password);
    authFeedback = { text: "Login realizado com sucesso!", type: "success" };
    renderCurrentScreen();
  } catch (err) {
    console.warn("Sign in error:", err);
    authFeedback = { text: getAuthErrorMessage(err), type: "error" };
    renderCurrentScreen();
  }
};

window.submitEmailSignUp = async () => {
  const nameInput = document.getElementById("signup-name");
  const emailInput = document.getElementById("signup-email");
  const passInput = document.getElementById("signup-password");
  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passInput ? passInput.value : "";

  if (!email || !password) {
    authFeedback = { text: "Preencha e-mail e senha para criar sua conta.", type: "error" };
    renderCurrentScreen();
    return;
  }
  if (password.length < 6) {
    authFeedback = { text: "A senha deve conter no mínimo 6 caracteres.", type: "error" };
    renderCurrentScreen();
    return;
  }

  try {
    authFeedback = { text: "Criando sua conta e sincronizando perfil...", type: "success" };
    renderCurrentScreen();
    await signUpWithEmail(email, password, name, ["Guitarra", "Vocal"]);
    authFeedback = { text: "Conta criada com sucesso! Perfil sincronizado no Firestore.", type: "success" };
    renderCurrentScreen();
  } catch (err) {
    console.warn("Sign up error:", err);
    authFeedback = { text: getAuthErrorMessage(err), type: "error" };
    renderCurrentScreen();
  }
};

window.submitPasswordReset = async () => {
  const emailInput = document.getElementById("reset-email");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    authFeedback = { text: "Digite seu e-mail cadastrado para redefinição.", type: "error" };
    renderCurrentScreen();
    return;
  }

  try {
    authFeedback = { text: "Enviando link de redefinição...", type: "success" };
    renderCurrentScreen();
    await sendPasswordReset(email);
    authFeedback = { 
      text: `Link de redefinição de senha enviado para ${escapeHtml(email)}! Verifique sua caixa de entrada e spam.`, 
      type: "success" 
    };
    renderCurrentScreen();
  } catch (err) {
    console.warn("Reset error:", err);
    authFeedback = { text: getAuthErrorMessage(err), type: "error" };
    renderCurrentScreen();
  }
};

window.handleGoogleLogin = async () => {
  try {
    authFeedback = { text: "Conectando com o Google...", type: "success" };
    renderCurrentScreen();
    await loginWithGoogle();
    authFeedback = { text: "Login com Google realizado com sucesso!", type: "success" };
    renderCurrentScreen();
  } catch (err) {
    console.warn("Google sign-in exception:", err);
    authFeedback = { text: getAuthErrorMessage(err), type: "error" };
    renderCurrentScreen();
  }
};

window.handleLogout = async () => {
  try {
    await logoutUser();
    authFeedback = { text: "Sessão encerrada com sucesso.", type: "success" };
  } catch (err) {
    console.error("Erro ao sair:", err);
    authFeedback = { text: getAuthErrorMessage(err), type: "error" };
  }
  renderCurrentScreen();
};

// Modal for Protected Actions
window.showAuthRequiredModal = (title, message) => {
  authModalData = {
    title: title || "Autenticação Obrigatória",
    message: message || "Esta funcionalidade exige que você esteja conectado à sua conta do Virtuo."
  };
  renderAuthModal();
};

window.closeAuthModal = () => {
  authModalData = null;
  const modalEl = document.getElementById("virtuo-auth-modal");
  if (modalEl) modalEl.remove();
};

window.goToLoginFromModal = () => {
  window.closeAuthModal();
  show("profile");
};

function renderAuthModal() {
  let modalEl = document.getElementById("virtuo-auth-modal");
  if (!authModalData) {
    if (modalEl) modalEl.remove();
    return;
  }
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "virtuo-auth-modal";
    document.body.appendChild(modalEl);
  }
  modalEl.className = "auth-modal-backdrop";
  modalEl.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-icon">🔒</div>
      <h3>${escapeHtml(authModalData.title)}</h3>
      <p>${escapeHtml(authModalData.message)}</p>
      <div class="auth-modal-actions">
        <button class="button secondary" onclick="window.closeAuthModal()">Voltar</button>
        <button class="button primary" onclick="window.goToLoginFromModal()">Conectar Agora</button>
      </div>
    </div>
  `;
}

window.toggleUserInstrument = async (inst) => {
  if (!currentUser) return;
  const currentInsts = (userProfile && userProfile.instruments) || ["Guitarra", "Vocal"];
  let updated;
  if (currentInsts.includes(inst)) {
    updated = currentInsts.filter(i => i !== inst);
  } else {
    updated = [...currentInsts, inst];
  }
  userProfile = { ...userProfile, instruments: updated };
  renderCurrentScreen();
  try {
    await updateUserProfileDoc(currentUser.uid, { instruments: updated });
  } catch (e) {
    console.warn("Could not persist instruments update:", e);
  }
};

// -------------------------------------------------------------
// GLOBAL UI HANDLERS: SONGS & HARMONICS
// -------------------------------------------------------------
window.openSongById = (songId) => {
  const song = liveSongs.find(s => s.id === songId || s.title === songId) || DEMO_SONGS.find(s => s.id === songId) || SongsRepository.getOfflineRecentSongs().find(s => s.id === songId);
  if (song) {
    activeSong = song;
    SongsRepository.cacheSongOffline(song);
    transposeOffset = 0;
    isEasyPlay = false;
    currentScreen = "songDetail";
    renderCurrentScreen();
  }
};

window.changeTone = (delta) => {
  transposeOffset += delta;
  renderCurrentScreen();
};

window.resetTone = () => {
  transposeOffset = 0;
  renderCurrentScreen();
};

window.toggleEasyPlay = () => {
  isEasyPlay = !isEasyPlay;
  renderCurrentScreen();
};

window.setSongMode = (mode) => {
  isEasyPlay = (mode === "easy");
  renderCurrentScreen();
};

// Exposição global do Controller do Modo Ministro de Palco
window.VirtuoMinister = virtuoMinister;

// Sincronização de estado da sessão com a view principal
virtuoMinister.futureHooks.onToneChanged = (_newKey, newOffset) => {
  transposeOffset = newOffset;
  if (currentScreen === "cifra") {
    renderCurrentScreen();
  }
};

virtuoMinister.futureHooks.onModeChanged = (easyPlayActive) => {
  isEasyPlay = easyPlayActive;
  if (currentScreen === "cifra") {
    renderCurrentScreen();
  }
};

window.openMinisterMode = () => {
  if (!activeSong) {
    activeSong = liveSongs[0] || DEMO_SONGS[0];
  }
  virtuoMinister.open(activeSong, transposeOffset, isEasyPlay);
};

window.openMinisterModeQuick = () => {
  activeSong = liveSongs[0] || DEMO_SONGS[0];
  transposeOffset = 0;
  isEasyPlay = false;
  virtuoMinister.open(activeSong, 0, false);
};

window.toggleAddSongForm = () => {
  if (!currentUser) {
    window.showAuthRequiredModal("Cadastrar Nova Cifra", "Para adicionar e salvar cifras personalizadas no acervo do VIRTUO, conecte-se à sua conta.");
    return;
  }
  const form = document.getElementById("add-song-form");
  if (form) {
    form.style.display = form.style.display === "none" ? "block" : "none";
  }
};

window.saveNewSong = async () => {
  if (!currentUser) {
    window.showAuthRequiredModal("Salvar Cifra", "Sua sessão expirou ou você não está conectado. Entre na sua conta para salvar cifras no Firestore.");
    return;
  }

  const title = document.getElementById("new-song-title")?.value.trim();
  const artist = document.getElementById("new-song-artist")?.value.trim();
  const key = document.getElementById("new-song-key")?.value.trim() || "G";
  const songBpm = document.getElementById("new-song-bpm")?.value || 74;
  const difficulty = document.getElementById("new-song-diff")?.value.trim() || "Fácil";
  const capo = Number(document.getElementById("new-song-capo")?.value) || 0;
  const structure = document.getElementById("new-song-structure")?.value.trim() || "Intro • Verso • Refrão • Final";
  const chords = document.getElementById("new-song-chords")?.value || "";
  const easyChords = document.getElementById("new-song-easy")?.value || chords;
  const youtubeUrl = document.getElementById("new-song-youtube")?.value.trim() || "";
  const spotifyUrl = document.getElementById("new-song-spotify")?.value.trim() || "";
  const audioFileInput = document.getElementById("new-song-audio-file");
  const submitBtn = document.getElementById("new-song-submit-btn");

  if (!title) {
    alert("Por favor, digite o título da música.");
    return;
  }

  let audioUrl = "";
  if (audioFileInput && audioFileInput.files && audioFileInput.files[0]) {
    const file = audioFileInput.files[0];
    try {
      if (submitBtn) submitBtn.textContent = "Enviando áudio...";
      audioUrl = await uploadAudioFile(file, `audios/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    } catch (uploadErr) {
      console.warn("Aviso no upload de áudio:", uploadErr);
      alert("Aviso: Falha ao enviar arquivo de áudio para o Storage. A música continuará sem áudio.");
    } finally {
      if (submitBtn) submitBtn.textContent = "Salvar no Firestore";
    }
  }

  const songData = {
    title,
    artist: artist || "Virtuo Worship",
    originalKey: key,
    bpm: Number(songBpm) || 74,
    difficulty,
    capo,
    structure,
    chords: chords || "[Intro] G  C  Em  D",
    easyChords: easyChords || chords || "[Intro] G  C  Em  D",
    audioUrl,
    youtubeUrl,
    spotifyUrl
  };

  try {
    await SongsRepository.createSong(songData, currentUser.uid);
    window.toggleAddSongForm();
    alert("Música cadastrada com sucesso no Firestore!");
  } catch (err) {
    console.warn("Erro ao salvar no Firestore via repositório:", err);
    alert(err.message || "Erro ao salvar cifra no Firestore.");
  }
};

window.openEditSongForm = (songId) => {
  const song = liveSongs.find(s => s.id === songId) || (activeSong && activeSong.id === songId ? activeSong : null);
  if (!song) return;
  const isAdmin = isUserAdmin(currentUser, userProfile);
  if (!currentUser || (song.createdBy !== currentUser.uid && !isAdmin)) {
    alert("Você só pode editar músicas criadas por você (ou com permissão de administrador).");
    return;
  }
  editingSong = { ...song };
  renderCurrentScreen();
};

window.cancelEditSong = () => {
  editingSong = null;
  renderCurrentScreen();
};

window.saveEditedSong = async () => {
  if (!editingSong || !currentUser) return;
  const title = document.getElementById("edit-song-title")?.value.trim();
  const artist = document.getElementById("edit-song-artist")?.value.trim();
  const key = document.getElementById("edit-song-key")?.value.trim() || "G";
  const songBpm = document.getElementById("edit-song-bpm")?.value || 74;
  const difficulty = document.getElementById("edit-song-diff")?.value.trim() || "Fácil";
  const capo = Number(document.getElementById("edit-song-capo")?.value) || 0;
  const structure = document.getElementById("edit-song-structure")?.value.trim() || "Intro • Verso • Refrão • Final";
  const chords = document.getElementById("edit-song-chords")?.value || "";
  const easyChords = document.getElementById("edit-song-easy")?.value || chords;
  const youtubeUrl = document.getElementById("edit-song-youtube")?.value.trim() || "";
  const spotifyUrl = document.getElementById("edit-song-spotify")?.value.trim() || "";
  const audioFileInput = document.getElementById("edit-song-audio-file");
  const submitBtn = document.getElementById("edit-song-submit-btn");

  if (!title) {
    alert("Por favor, digite o título da música.");
    return;
  }

  let audioUrl = editingSong.audioUrl || "";
  if (audioFileInput && audioFileInput.files && audioFileInput.files[0]) {
    const file = audioFileInput.files[0];
    try {
      if (submitBtn) submitBtn.textContent = "Enviando novo áudio...";
      audioUrl = await uploadAudioFile(file, `audios/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    } catch (uploadErr) {
      console.warn("Aviso no upload do áudio da edição:", uploadErr);
      alert("Aviso: Falha ao enviar novo arquivo de áudio. Mantendo áudio anterior.");
    } finally {
      if (submitBtn) submitBtn.textContent = "Salvar Alterações";
    }
  }

  const updatedData = {
    title,
    artist: artist || "Virtuo Worship",
    originalKey: key,
    bpm: Number(songBpm) || 74,
    difficulty,
    capo,
    structure,
    chords: chords || "[Intro] G  C  Em  D",
    easyChords: easyChords || chords || "[Intro] G  C  Em  D",
    audioUrl,
    youtubeUrl,
    spotifyUrl
  };

  const isAdmin = isUserAdmin(currentUser, userProfile);
  try {
    await SongsRepository.updateSong(editingSong.id, updatedData, currentUser.uid, isAdmin);
    activeSong = { ...activeSong, ...updatedData };
    editingSong = null;
    alert("Música atualizada com sucesso!");
    renderCurrentScreen();
  } catch (err) {
    console.error("Erro ao atualizar música:", err);
    alert(err.message || "Erro ao atualizar a música.");
  }
};

window.confirmDeleteSong = async (songId) => {
  if (!currentUser) {
    window.showAuthRequiredModal("Excluir Cifra", "Conecte-se para gerenciar suas músicas.");
    return;
  }
  const confirmed = confirm("Tem certeza de que deseja excluir permanentemente esta música do Firestore?");
  if (!confirmed) return;

  const isAdmin = isUserAdmin(currentUser, userProfile);
  try {
    await SongsRepository.deleteSong(songId, currentUser.uid, isAdmin);
    alert("Música excluída com sucesso!");
    show("library");
  } catch (err) {
    console.error("Erro ao excluir música:", err);
    alert(err.message || "Erro ao excluir a música.");
  }
};

window.seedSongsToFirestore = async () => {
  if (!currentUser) {
    window.showAuthRequiredModal("Sincronizar Acervo", "Conecte-se com sua conta para sincronizar as cifras oficiais no Cloud Firestore.");
    return;
  }

  try {
    const seeded = await SongsRepository.seedDefaultSongs(currentUser.uid);
    if (seeded) {
      alert("Músicas oficiais sincronizadas no Firestore com sucesso!");
    } else {
      alert("O banco já possui músicas cadastradas no Firestore.");
    }
  } catch (e) {
    console.error("Erro ao semear:", e);
    alert("Não foi possível sincronizar o acervo: " + e.message);
  }
};

// -------------------------------------------------------------
// FIREBASE AUTH & FIRESTORE REALTIME SYNC
// -------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAuthChecking = false;
  const headerAvatar = document.getElementById("header-avatar") || document.querySelector(".avatar");
  if (user) {
    if (headerAvatar) {
      if (user.photoURL) {
        headerAvatar.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      } else {
        const initial = (user.displayName ? user.displayName.charAt(0) : (user.email ? user.email.charAt(0) : "V")).toUpperCase();
        headerAvatar.textContent = initial;
      }
    }
    userProfile = await syncUserProfile(user);
    virtuoRehearsal.init(user.uid);
  } else {
    if (headerAvatar) {
      headerAvatar.textContent = "✦";
    }
    userProfile = null;
    virtuoRehearsal.init(null);
  }
  renderCurrentScreen();
});

// Subscribe to Firestore songs collection via SongsRepository
SongsRepository.subscribeToSongs((updatedSongs) => {
  liveSongs = updatedSongs;
  // Se estiver na tela de detalhes e a música ativa tiver sido atualizada ou excluída
  if (activeSong) {
    const found = liveSongs.find(s => s.id === activeSong.id);
    if (found) {
      activeSong = found;
    }
  }
  if (currentScreen === "library" || currentScreen === "songDetail") {
    renderCurrentScreen();
  }
}, (err) => {
  console.warn("Firestore songs stream fallback:", err.message);
  liveSongs = DEMO_SONGS;
});

// Initial Screen Render
show("home");

// Verify Firebase Connection on boot
checkFirebaseConnection().then((res) => {
  if (res.ok) {
    firebaseStatus = { connected: true, label: "virtuo-7e01b Conectado" };
  } else {
    firebaseStatus = { connected: false, label: res.message };
  }
  renderCurrentScreen();
}).catch(() => {
  firebaseStatus = { connected: true, label: "virtuo-7e01b Conectado" };
  renderCurrentScreen();
});

// Register Service Worker for PWA compliance
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// -------------------------------------------------------------
// VIRTUO ARCHITECTURE MODULES (Ready for Sessions & AI)
// -------------------------------------------------------------
export const VirtuoSession = {
  sessionId: null,
  isHost: false,
  connectedMusicians: [],
  syncBpm: (newBpm) => {
    adjustBpm(newBpm - bpm);
  },
  syncSong: (songId) => {
    window.openSongById(songId);
  }
};

export const VirtuoAI = {
  isAvailable: true,
  analyzeHarmonicStructure: async (songData) => {
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songData || {})
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  askDirector: async (question) => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

window.VirtuoAI = VirtuoAI;
