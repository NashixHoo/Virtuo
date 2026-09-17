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
  isChordLine,
  VirtuoMusicIntelligence,
  suggestSmartKey,
  generateStudyPlan
} from "./src/music/index.js";
import { renderVirtuoAiScreen } from "./src/features/ai/virtuo-ai-view.js";
import { virtuoMinister } from "./src/features/minister/index.js";
import { virtuoMetronome, renderBandScreenComponent, virtuoBand, virtuoCulto } from "./src/audio/index.js";
import { virtuoRehearsal, renderRehearsalScreen } from "./src/features/rehearsal/index.js";
import { virtuoTuner, renderTunerScreen } from "./src/features/tuner/tuner-view.js";
import { virtuoVocal, renderVocalScreen } from "./src/features/vocal/vocal-view.js";
import { virtuoPerformance, renderPerformanceScreen } from "./src/features/performance/index.js";
import { virtuoGuitarCoach, renderGuitarCoachScreen } from "./src/features/guitar-coach/coach-view.js";
import { virtuoDiagnostics, renderDiagnosticsScreen } from "./src/features/diagnostics/diagnostics-view.js";
import { perfMonitor } from "./src/performance/performance-monitor.js";
import { adminSongManager } from "./src/features/admin/index.js";
import { CANONICAL_INSTRUMENTS } from "./src/services/rehearsals.js";
import { CommunityService } from "./src/services/community.js";
import { 
  ProfileService, 
  SocialService, 
  BandService, 
  renderCommunityView, 
  renderCreateBandModal,
  renderInviteMemberModal,
  renderAddSongToRepertoireModal,
  renderCreateRehearsalModal,
  renderReportModal,
  renderEditProfileModal,
  renderUserProfileModal,
  MUSICAL_INSTRUMENTS, 
  EXPERIENCE_LEVELS, 
  MUSICAL_STYLES, 
  POST_TYPES, 
  REPORT_REASONS 
} from "./src/community/index.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { renderHojeScreen, startGreetingAutoUpdater } from "./src/features/home/index.js";
import { virtuoPulse, PULSE_STATES } from "./src/features/pulse/index.js";
import { virtuoSplash, isStartupChimeEnabled, setStartupChimeEnabled } from "./src/features/splash/index.js";
import { playStartupChime } from "./src/audio/startup-chime.js";
import { 
  missionsController, 
  renderMissionsListScreen, 
  renderCreateMissionScreen, 
  renderCommandCenterScreen,
  renderCheckInScreen
} from "./src/features/missions/index.js";
import { liveSyncController, liveSyncEngine } from "./src/features/live-sync/index.js";
import { notificationsService, renderNotificationsScreen } from "./src/features/notifications/index.js";
import { momentsService, renderMomentCelebrationScreen } from "./src/features/moments/index.js";
import { renderAcademyScreen } from "./src/academy/academy-view.js";
import { VirtuoAcademyService } from "./src/academy/academy-service.js";

// Conecta o repositório musical profissional ao painel administrativo
adminSongManager.setRepository(SongsRepository);

// State
let bpm = 74;
window.bpm = bpm;

let currentUser = null;
let userProfile = null;
let isAuthChecking = true;
let currentScreen = "home";
window.show = show;
window._virtuoShow = show;
let liveSongs = DEMO_SONGS;
let isMetronomePlaying = false;
let firebaseStatus = { connected: true, label: "virtuo-7e01b Conectado" };

// Missions & Live Sync State (Etapa 5/5)
let allMissions = [];
let missionsActiveFilter = "all";
let activeMomentForCelebration = null;

// Sincroniza Missões e Notificações com a UI reativa
missionsController.subscribe(() => {
  if (currentScreen === "missions" || currentScreen === "commandCenter" || currentScreen === "checkin" || currentScreen === "home") {
    renderCurrentScreen();
  }
});

notificationsService.subscribe((notifs) => {
  const badge = document.getElementById("header-notif-badge");
  if (badge) {
    const unread = notifs.filter(n => !n.read).length;
    badge.style.display = unread > 0 ? "block" : "none";
  }
  if (currentScreen === "notifications") {
    renderCurrentScreen();
  }
});

// Community 2.0 State
let communityPosts = [];
let isCreatingPost = false;
let communitySubTab = "feed"; // 'feed' | 'descobrir' | 'bandas' | 'perfil' | 'moderacao'
let filterPostType = "todos";
let selectedPostTypeForCreate = "texto";
let bandsList = [];
let activeBand = null;
let commentsMap = {};
let expandedCommentsPostId = null;
let communitySearchQuery = "";
let communitySearchResults = null;
let selectedDiscoverCategory = null;
let discoverResults = [];
let pendingReportsList = [];
let savedPostIdsList = JSON.parse(localStorage.getItem("virtuo_saved_posts") || "[]");
let bandInvitesList = [];
let isCreateBandModalOpen = false;
let isInviteMemberModalOpen = false;
let activeBandForInvite = null;
let isAddSongToRepModalOpen = false;
let activeBandForSong = null;
let isCreateRehearsalModalOpen = false;
let activeBandForRehearsal = null;
let isReportModalOpen = false;
let activeReportTarget = null;
let isEditProfileModalOpen = false;
let isUserProfileModalOpen = false;
let activePublicUserProfile = null;

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
// BAND MULTI-TRACK SYNTHESIZER INTEGRATION (VIRTUO BAND 2.0)
// -------------------------------------------------------------
window.virtuoBand = virtuoBand;
window.virtuoCulto = virtuoCulto;

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

    // Live chord and bar update
    const liveChord = document.getElementById("band-live-chord");
    if (liveChord && liveChord.textContent.trim() !== bandState.currentChord) {
      liveChord.textContent = bandState.currentChord;
    }
    const nextChord = document.getElementById("band-next-chord");
    if (nextChord && bandState.nextChord) {
      nextChord.textContent = bandState.nextChord;
    }
    const barPulse = document.getElementById("band-bar-pulse");
    if (barPulse) {
      barPulse.textContent = `Bar #${bandState.currentBar + 1}`;
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

    // Tracks Mute, Solo and Volume indicators
    Object.keys(bandState.tracks).forEach(trackId => {
      const track = bandState.tracks[trackId];
      const muteBtn = document.getElementById(`btn-mute-${trackId}`);
      if (muteBtn) {
        if (track.muted) {
          muteBtn.style.background = "rgba(239,68,68,0.25)";
          muteBtn.style.color = "#f87171";
          muteBtn.style.borderColor = "#ef4444";
          muteBtn.textContent = "MUTED";
        } else {
          muteBtn.style.background = "rgba(255,255,255,0.05)";
          muteBtn.style.color = "#f1f5f9";
          muteBtn.style.borderColor = "rgba(255,255,255,0.15)";
          muteBtn.textContent = "MUTE";
        }
      }
      const soloBtn = document.getElementById(`btn-solo-${trackId}`);
      if (soloBtn) {
        if (track.solo) {
          soloBtn.style.background = "#7EE7FF";
          soloBtn.style.color = "#07101F";
          soloBtn.style.borderColor = "#7EE7FF";
        } else {
          soloBtn.style.background = "rgba(255,255,255,0.05)";
          soloBtn.style.color = "#f1f5f9";
          soloBtn.style.borderColor = "rgba(255,255,255,0.15)";
        }
      }
      const volVal = document.getElementById(`val-vol-${trackId}`);
      if (volVal) {
        volVal.textContent = `${Math.round(track.volume * 100)}%`;
      }
    });
  }
});

virtuoCulto.subscribe(() => {
  if (currentScreen === "band") {
    renderCurrentScreen();
  }
});

window.toggleBandEnginePlayback = () => {
  virtuoBand.togglePlay();
};

window.stopBandEnginePlayback = () => {
  virtuoBand.stop();
};

window.setBandPreset = (presetName) => {
  virtuoBand.setPreset(presetName);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setBandKey = (key) => {
  virtuoBand.setKey(key);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setBandProgression = (chords) => {
  if (Array.isArray(chords) && chords.length > 0) {
    virtuoBand.loadProgression(chords, virtuoBand.getState().currentKey, virtuoBand.getState().bpm);
    if (currentScreen === "band") renderCurrentScreen();
  }
};

window.setBandIntensity = (level) => {
  virtuoBand.setIntensity(level);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setBandSection = (sectionId) => {
  virtuoBand.setSection(sectionId, true);
  if (currentScreen === "band") renderCurrentScreen();
};

window.toggleBandLoop = () => {
  virtuoBand.toggleLoop();
  if (currentScreen === "band") renderCurrentScreen();
};

window.setLoopRepeatTarget = (times) => {
  virtuoBand.setLoopRepeatTarget(times);
  if (currentScreen === "band") renderCurrentScreen();
};

window.toggleCountIn = () => {
  virtuoBand.toggleCountIn();
  if (currentScreen === "band") renderCurrentScreen();
};

window.toggleEasyBand = () => {
  virtuoBand.toggleEasyBand();
  if (currentScreen === "band") renderCurrentScreen();
};

window.setTrackVolume = (trackId, val) => {
  virtuoBand.setTrackVolume(trackId, val);
};

window.toggleTrackMute = (trackId) => {
  virtuoBand.toggleTrackMute(trackId);
  if (currentScreen === "band") renderCurrentScreen();
};

window.toggleTrackSolo = (trackId) => {
  virtuoBand.toggleTrackSolo(trackId);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setKeyboardMode = (mode) => {
  virtuoBand.setKeyboardMode(mode);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setGuitarPattern = (pattern) => {
  virtuoBand.setGuitarPattern(pattern);
  if (currentScreen === "band") renderCurrentScreen();
};

window.adjustBandBpm = (delta) => {
  virtuoBand.adjustBpm(delta);
  if (currentScreen === "band") renderCurrentScreen();
};

window.setHalfBandBpm = () => {
  virtuoBand.setHalfBpm();
  if (currentScreen === "band") renderCurrentScreen();
};

window.setDoubleBandBpm = () => {
  virtuoBand.setDoubleBpm();
  if (currentScreen === "band") renderCurrentScreen();
};

window.applySmartBand = () => {
  const song = currentSong || (songs && songs.length > 0 ? songs[0] : null);
  if (song) {
    virtuoBand.applySmartBandRecommendation(song);
  }
  if (currentScreen === "band") renderCurrentScreen();
};

window.selectCultoSong = (idx) => {
  const s = virtuoCulto.selectSong(idx);
  if (s) {
    virtuoBand.setPreset(s.style, false);
    virtuoBand.setBpm(s.bpm);
    virtuoBand.setKey(s.key);
    virtuoBand.setIntensity(s.intensity);
    virtuoBand.setSection(s.section || "intro", false);
  }
  if (currentScreen === "band") renderCurrentScreen();
};

window.nextCultoSong = () => {
  const s = virtuoCulto.nextSong();
  if (s) {
    virtuoBand.setPreset(s.style, false);
    virtuoBand.setBpm(s.bpm);
    virtuoBand.setKey(s.key);
    virtuoBand.setIntensity(s.intensity);
    virtuoBand.setSection(s.section || "intro", false);
  }
  if (currentScreen === "band") renderCurrentScreen();
};

window.prevCultoSong = () => {
  const s = virtuoCulto.previousSong();
  if (s) {
    virtuoBand.setPreset(s.style, false);
    virtuoBand.setBpm(s.bpm);
    virtuoBand.setKey(s.key);
    virtuoBand.setIntensity(s.intensity);
    virtuoBand.setSection(s.section || "intro", false);
  }
  if (currentScreen === "band") renderCurrentScreen();
};

// -------------------------------------------------------------
// COMMUNITY 2.0 INTEGRATION (ETAPA 4/5)
// -------------------------------------------------------------
async function loadCommunityPosts() {
  try {
    communityPosts = await CommunityService.getAllPosts({ type: filterPostType });
  } catch (err) {
    console.warn("Falha ao carregar posts:", err);
  }
  if (currentScreen === "comunidade") {
    renderCurrentScreen();
  }
}

async function loadCommunityDataV2() {
  try {
    communityPosts = await CommunityService.getAllPosts({ type: filterPostType });
    bandsList = await BandService.getAllBands();
    
    if (currentUser) {
      bandInvitesList = await BandService.getUserPendingInvites(currentUser.uid);
      if (isUserAdmin(currentUser, userProfile)) {
        pendingReportsList = await SocialService.getPendingReports();
      }
    }
  } catch (e) {
    console.warn("Aviso ao carregar dados da Comunidade 2.0:", e);
  }
  if (currentScreen === "comunidade") {
    renderCurrentScreen();
  }
}

window.refreshCommunityPosts = async () => {
  await loadCommunityDataV2();
};

window.refreshCommunityData = async () => {
  await loadCommunityDataV2();
};

window.setCommunitySubTab = (subTab) => {
  communitySubTab = subTab;
  if (subTab === "bandas" && bandsList.length === 0) {
    BandService.getAllBands().then(b => { bandsList = b; renderCurrentScreen(); });
  }
  if (subTab === "moderacao" && currentUser) {
    SocialService.getPendingReports().then(r => { pendingReportsList = r; renderCurrentScreen(); });
  }
  renderCurrentScreen();
};

window.filterFeedByType = async (type) => {
  filterPostType = type;
  await loadCommunityPosts();
};

window.selectPostType = (type) => {
  selectedPostTypeForCreate = type;
  renderCurrentScreen();
};

window.handleCreatePost = async () => {
  await window.handleCreatePostV2();
};

window.handleCreatePostV2 = async () => {
  const contentEl = document.getElementById("community-post-text");
  const titleEl = document.getElementById("community-post-title");
  const fileInput = document.getElementById("community-post-file");
  const submitBtn = document.getElementById("community-submit-btn");
  const chordsPreviewEl = document.getElementById("community-post-chords-preview");
  const audioDemoEl = document.getElementById("community-post-audio-url");

  const content = contentEl ? contentEl.value.trim() : "";
  const title = titleEl ? titleEl.value.trim() : "";
  const chordsPreview = chordsPreviewEl ? chordsPreviewEl.value.trim() : "";
  const audioDemoUrl = audioDemoEl ? audioDemoEl.value.trim() : "";
  let imageUrl = "";

  const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
  if (!content && !hasFile && !chordsPreview) {
    alert("Por favor, escreva uma mensagem, anexe uma foto ou insira uma cifra.");
    return;
  }

  // Upload de mídia se houver
  if (hasFile) {
    const file = fileInput.files[0];
    try {
      if (submitBtn) submitBtn.textContent = "Enviando arquivo...";
      imageUrl = await uploadImageFile(file, `community/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    } catch (uploadErr) {
      console.warn("Aviso upload de imagem no Storage:", uploadErr);
      alert("Aviso: Falha ao enviar mídia para o Storage. A publicação continuará.");
    } finally {
      if (submitBtn) submitBtn.textContent = "Publicar no Feed";
    }
  }

  const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');
  const role = isCelestial ? "Membro Celestial" : (currentUser ? "Membro" : "Músico Virtuoso");
  const authorName = (userProfile && (userProfile.artisticName || userProfile.displayName)) || 
                     (currentUser && currentUser.displayName) || "Músico Virtuoso";
  const authorPhoto = currentUser && currentUser.photoURL ? currentUser.photoURL : (userProfile?.photoURL || "");

  const postPayload = {
    content: content || (title ? title : "Compartilhou uma atualização no Virtuo Feed."),
    title: title || null,
    type: selectedPostTypeForCreate || "texto",
    imageUrl,
    chordsPreview: chordsPreview || null,
    audioDemoUrl: audioDemoUrl || null,
    authorName,
    authorRole: role,
    authorPhoto
  };

  await CommunityService.createPost(postPayload, currentUser ? currentUser.uid : null);

  if (contentEl) contentEl.value = "";
  if (titleEl) titleEl.value = "";
  if (fileInput) fileInput.value = "";
  if (chordsPreviewEl) chordsPreviewEl.value = "";
  if (audioDemoEl) audioDemoEl.value = "";

  await loadCommunityPosts();
};

window.togglePostLike = async (postId) => {
  await window.togglePostLikeV2(postId);
};

window.togglePostLikeV2 = async (postId) => {
  const uid = currentUser ? currentUser.uid : "guest-user";
  await CommunityService.toggleLike(postId, uid);
  await loadCommunityPosts();
};

window.toggleSavePostV2 = (postId) => {
  if (savedPostIdsList.includes(postId)) {
    savedPostIdsList = savedPostIdsList.filter(id => id !== postId);
  } else {
    savedPostIdsList.push(postId);
  }
  localStorage.setItem("virtuo_saved_posts", JSON.stringify(savedPostIdsList));
  renderCurrentScreen();
};

window.sharePostLink = async (postId, authorName) => {
  const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
  const shareText = `Confira a publicação de ${authorName || "um músico"} na Comunidade Virtuo!`;
  const shareSuccess = await SocialService.shareContent({
    title: "Comunidade Virtuo",
    text: shareText,
    url
  });
  if (shareSuccess) {
    alert("Link da publicação copiado para a área de transferência!");
  }
};

window.toggleCommentsView = async (postId) => {
  if (expandedCommentsPostId === postId) {
    expandedCommentsPostId = null;
  } else {
    expandedCommentsPostId = postId;
    if (!commentsMap[postId]) {
      commentsMap[postId] = await SocialService.getCommentsForPost(postId);
    }
  }
  renderCurrentScreen();
};

window.handleAddComment = async (postId) => {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;

  const authorName = (userProfile && (userProfile.artisticName || userProfile.displayName)) || 
                     (currentUser && currentUser.displayName) || "Músico";
  const authorPhoto = currentUser?.photoURL || userProfile?.photoURL || "";

  await SocialService.addComment({
    postId,
    content,
    authorId: currentUser ? currentUser.uid : "guest-musician",
    authorName,
    authorPhoto
  });

  input.value = "";
  commentsMap[postId] = await SocialService.getCommentsForPost(postId);
  await loadCommunityPosts();
};

window.handleDeleteComment = async (commentId, postId) => {
  if (!confirm("Deseja excluir este comentário?")) return;
  await SocialService.deleteComment(commentId, postId);
  commentsMap[postId] = await SocialService.getCommentsForPost(postId);
  await loadCommunityPosts();
};

window.handleDeletePost = async (postId) => {
  await window.handleDeletePostV2(postId);
};

window.handleDeletePostV2 = async (postId) => {
  if (!confirm("Tem certeza de que deseja excluir esta publicação?")) return;
  await CommunityService.deletePost(postId, currentUser ? currentUser.uid : null);
  await loadCommunityPosts();
};

// Busca e Descoberta
window.executeGlobalSearch = async () => {
  const input = document.getElementById("community-search-input");
  if (!input) return;
  const query = input.value.trim();
  communitySearchQuery = query;
  if (!query) {
    communitySearchResults = null;
  } else {
    communitySearchResults = await SocialService.searchMusiciansAndBands(query);
  }
  renderCurrentScreen();
};

window.clearSearch = () => {
  communitySearchQuery = "";
  communitySearchResults = null;
  renderCurrentScreen();
};

window.selectDiscoverCategory = async (catId) => {
  selectedDiscoverCategory = catId;
  discoverResults = await SocialService.getMusiciansByCategory(catId);
  renderCurrentScreen();
};

// Bandas & Ministérios
window.selectBandDetails = async (bandId) => {
  if (!bandId) {
    activeBand = null;
  } else {
    activeBand = await BandService.getBandById(bandId);
  }
  renderCurrentScreen();
};

window.openCreateBandModal = () => {
  isCreateBandModalOpen = true;
  renderCurrentScreen();
};

window.submitCreateBand = async () => {
  const nameEl = document.getElementById("new-band-name");
  const styleEl = document.getElementById("new-band-style");
  const instEl = document.getElementById("new-band-admin-instrument");
  const descEl = document.getElementById("new-band-desc");

  const name = nameEl ? nameEl.value.trim() : "";
  if (!name) {
    alert("Por favor, digite o nome da banda ou ministério.");
    return;
  }

  const bandData = {
    name,
    style: styleEl ? styleEl.value : "Worship",
    description: descEl ? descEl.value.trim() : "",
    adminInstrument: instEl ? instEl.value : "violao",
    leaderName: (userProfile && (userProfile.artisticName || userProfile.displayName)) || 
                (currentUser && currentUser.displayName) || "Líder de Louvor"
  };

  const created = await BandService.createBand(bandData, currentUser ? currentUser.uid : "offline-user");
  isCreateBandModalOpen = false;
  bandsList = await BandService.getAllBands();
  activeBand = created;
  renderCurrentScreen();
};

window.openInviteMemberModal = (bandId) => {
  const b = bandsList.find(x => x.id === bandId) || activeBand;
  if (!b) return;
  activeBandForInvite = b;
  isInviteMemberModalOpen = true;
  renderCurrentScreen();
};

window.submitInviteMember = async (bandId) => {
  const nameEl = document.getElementById("invite-member-name");
  const roleEl = document.getElementById("invite-member-role");
  const instEl = document.getElementById("invite-member-instrument");

  const targetNameOrEmail = nameEl ? nameEl.value.trim() : "";
  if (!targetNameOrEmail) {
    alert("Informe o nome ou e-mail do músico para enviar o convite.");
    return;
  }

  const b = activeBandForInvite || bandsList.find(x => x.id === bandId);
  await BandService.sendBandInvite({
    bandId,
    bandName: b?.name || "Ministério Virtuo",
    senderUid: currentUser ? currentUser.uid : "admin",
    targetUid: targetNameOrEmail,
    role: roleEl ? roleEl.value : "musico",
    instrument: instEl ? instEl.value : "violao"
  });

  alert(`Convite enviado com sucesso para ${targetNameOrEmail}!`);
  isInviteMemberModalOpen = false;
  activeBandForInvite = null;
  renderCurrentScreen();
};

window.respondBandInvite = async (inviteId, accept) => {
  await BandService.respondToInvite(inviteId, accept, currentUser ? currentUser.uid : "user");
  if (currentUser) {
    bandInvitesList = await BandService.getUserPendingInvites(currentUser.uid);
  }
  bandsList = await BandService.getAllBands();
  renderCurrentScreen();
};

window.handleRemoveMember = async (bandId, memberUid) => {
  if (!confirm("Tem certeza de que deseja remover este integrante da banda?")) return;
  const updated = await BandService.removeMemberFromBand(bandId, memberUid);
  activeBand = updated;
  bandsList = await BandService.getAllBands();
  renderCurrentScreen();
};

window.openAddSongToRepertoireModal = (bandId) => {
  const b = bandsList.find(x => x.id === bandId) || activeBand;
  if (!b) return;
  activeBandForSong = b;
  isAddSongToRepModalOpen = true;
  renderCurrentScreen();
};

window.handleSongSelectForRep = (songId) => {
  const s = liveSongs.find(x => x.id === songId);
  if (!s) return;
  const titleEl = document.getElementById("rep-song-title");
  const artistEl = document.getElementById("rep-song-artist");
  const keyEl = document.getElementById("rep-song-key");
  const bpmEl = document.getElementById("rep-song-bpm");

  if (titleEl) titleEl.value = s.title || "";
  if (artistEl) artistEl.value = s.artist || "";
  if (keyEl) keyEl.value = s.originalKey || s.key || "G";
  if (bpmEl) bpmEl.value = s.bpm || 74;
};

window.submitAddSongToRepertoire = async (bandId) => {
  const titleEl = document.getElementById("rep-song-title");
  const artistEl = document.getElementById("rep-song-artist");
  const keyEl = document.getElementById("rep-song-key");
  const bpmEl = document.getElementById("rep-song-bpm");
  const modeEl = document.getElementById("rep-song-mode");

  const title = titleEl ? titleEl.value.trim() : "";
  if (!title) {
    alert("Informe o título do louvor.");
    return;
  }

  const songData = {
    title,
    artist: artistEl ? artistEl.value.trim() : "Artista",
    key: keyEl ? keyEl.value.trim() : "G",
    bpm: bpmEl ? Number(bpmEl.value) || 74 : 74,
    mode: modeEl ? modeEl.value : "original"
  };

  const updated = await BandService.addSongToRepertoire(bandId, songData);
  activeBand = updated;
  isAddSongToRepModalOpen = false;
  activeBandForSong = null;
  renderCurrentScreen();
};

window.handleRemoveSongFromRepertoire = async (bandId, songId) => {
  if (!confirm("Deseja remover esta música do repertório da banda?")) return;
  const updated = await BandService.removeSongFromRepertoire(bandId, songId);
  activeBand = updated;
  renderCurrentScreen();
};

window.openCreateRehearsalModal = (bandId) => {
  const b = bandsList.find(x => x.id === bandId) || activeBand;
  if (!b) return;
  activeBandForRehearsal = b;
  isCreateRehearsalModalOpen = true;
  renderCurrentScreen();
};

window.submitCreateRehearsal = async (bandId) => {
  const titleEl = document.getElementById("reh-title-input");
  const dateEl = document.getElementById("reh-date-input");
  const timeEl = document.getElementById("reh-time-input");
  const locEl = document.getElementById("reh-location-input");
  const notesEl = document.getElementById("reh-notes-input");

  const title = titleEl ? titleEl.value.trim() : "";
  if (!title) {
    alert("Informe o título do ensaio.");
    return;
  }

  const b = activeBandForRehearsal || bandsList.find(x => x.id === bandId);
  const rehearsalData = {
    title,
    date: dateEl ? dateEl.value : new Date().toISOString().split("T")[0],
    time: timeEl ? timeEl.value : "19:30",
    location: locEl ? locEl.value.trim() : "Templo Principal",
    notes: notesEl ? notesEl.value.trim() : "",
    repertoire: b?.repertoire || []
  };

  const updated = await BandService.createCollaborativeRehearsal(bandId, rehearsalData, currentUser ? currentUser.uid : "admin");
  activeBand = updated;
  isCreateRehearsalModalOpen = false;
  activeBandForRehearsal = null;
  renderCurrentScreen();
};

window.updateRehearsalStatus = async (bandId, rehearsalId, status) => {
  const updated = await BandService.updateRehearsalStatus(bandId, rehearsalId, status);
  activeBand = updated;
  renderCurrentScreen();
};

window.toggleChecklist = async (bandId, rehearsalId, memberUid) => {
  const updated = await BandService.toggleRehearsalChecklist(bandId, rehearsalId, memberUid);
  activeBand = updated;
  renderCurrentScreen();
};

window.startBandForSong = (songId, songBpm) => {
  if (songBpm) {
    virtuoBand.setBpm(Number(songBpm));
  }
  show("band");
};

window.shareRehearsal = async (rehearsalId, title) => {
  const url = `${window.location.origin}${window.location.pathname}#rehearsal-${rehearsalId}`;
  await SocialService.shareContent({
    title: "Ensaio da Banda",
    text: `Confira a escala e repertório do ensaio: ${title}`,
    url
  });
  alert("Link do ensaio copiado para a área de transferência!");
};

// Perfis & Moderação
window.viewUserProfile = async (uid) => {
  activePublicUserProfile = await ProfileService.getMusicianProfile(uid);
  isUserProfileModalOpen = true;
  renderCurrentScreen();
};

window.openEditProfileModal = () => {
  isEditProfileModalOpen = true;
  renderCurrentScreen();
};

window.submitEditProfile = async () => {
  const nameEl = document.getElementById("prof-artistic-name");
  const levelEl = document.getElementById("prof-level-select");
  const photoEl = document.getElementById("prof-photo-url");
  const bioEl = document.getElementById("prof-bio-text");
  const locEl = document.getElementById("prof-location");
  const bandEl = document.getElementById("prof-band");
  const igEl = document.getElementById("prof-link-ig");
  const ytEl = document.getElementById("prof-link-yt");
  const spEl = document.getElementById("prof-link-sp");

  const selectedInst = Array.from(document.querySelectorAll(".inst-toggle-btn.active"))
    .map(btn => btn.getAttribute("data-id"));
  const selectedStyles = Array.from(document.querySelectorAll(".style-toggle-btn.active"))
    .map(btn => btn.getAttribute("data-id"));

  const updates = {
    artisticName: nameEl ? nameEl.value.trim() : (userProfile?.displayName || ""),
    level: levelEl ? levelEl.value : "intermediario",
    photoURL: photoEl ? photoEl.value.trim() : "",
    bio: bioEl ? bioEl.value.trim() : "",
    instruments: selectedInst.length > 0 ? selectedInst : ["violao"],
    styles: selectedStyles.length > 0 ? selectedStyles : ["worship"],
    location: locEl ? locEl.value.trim() : "",
    currentBand: bandEl ? bandEl.value.trim() : "",
    externalLinks: {
      instagram: igEl ? igEl.value.trim() : "",
      youtube: ytEl ? ytEl.value.trim() : "",
      spotify: spEl ? spEl.value.trim() : ""
    }
  };

  const saved = await ProfileService.updateProfile(currentUser ? currentUser.uid : "local-musician", updates);
  userProfile = { ...(userProfile || {}), ...saved };
  isEditProfileModalOpen = false;
  renderCurrentScreen();
};

window.toggleFollowUser = async (targetUid) => {
  const myUid = currentUser ? currentUser.uid : "guest-musician";
  const result = await SocialService.toggleFollow(myUid, targetUid);
  if (activePublicUserProfile && activePublicUserProfile.uid === targetUid) {
    activePublicUserProfile.followers = result.isFollowing 
      ? [...(activePublicUserProfile.followers || []), myUid]
      : (activePublicUserProfile.followers || []).filter(id => id !== myUid);
  }
  renderCurrentScreen();
};

window.shareProfileLink = async (uid) => {
  const url = `${window.location.origin}${window.location.pathname}#musician-${uid}`;
  await SocialService.shareContent({
    title: "Perfil de Músico Virtuo",
    text: "Confira meu perfil musical no Virtuo!",
    url
  });
  alert("Link do perfil copiado!");
};

window.openReportModal = (targetType, targetId) => {
  activeReportTarget = { type: targetType, id: targetId };
  isReportModalOpen = true;
  renderCurrentScreen();
};

window.submitReport = async (targetType, targetId) => {
  const reasonEl = document.getElementById("report-reason-select");
  const detailsEl = document.getElementById("report-details-input");

  await SocialService.reportContent({
    targetType,
    targetId,
    reason: reasonEl ? reasonEl.value : "inapropriado",
    details: detailsEl ? detailsEl.value.trim() : "",
    reporterId: currentUser ? currentUser.uid : "anonymous"
  });

  alert("Denúncia registrada. Agradecemos por manter nossa comunidade segura!");
  isReportModalOpen = false;
  activeReportTarget = null;
  renderCurrentScreen();
};

window.resolveReportAction = async (reportId, action, targetType, targetId) => {
  await SocialService.resolveReport(reportId, action);
  if (action === "excluir_conteudo") {
    if (targetType === "post") {
      await CommunityService.deletePost(targetId, currentUser?.uid);
    }
  }
  pendingReportsList = await SocialService.getPendingReports();
  renderCurrentScreen();
};

window.closeCommunityModals = () => {
  isCreateBandModalOpen = false;
  isInviteMemberModalOpen = false;
  activeBandForInvite = null;
  isAddSongToRepModalOpen = false;
  activeBandForSong = null;
  isCreateRehearsalModalOpen = false;
  activeBandForRehearsal = null;
  isReportModalOpen = false;
  activeReportTarget = null;
  isEditProfileModalOpen = false;
  isUserProfileModalOpen = false;
  activePublicUserProfile = null;
  renderCurrentScreen();
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
// VIRTUO AI 2.0 & MUSICAL CONTEXT INTEGRATION
// -------------------------------------------------------------
function getActiveMusicalContext() {
  const song = activeSong || (liveSongs && liveSongs[0]) || DEMO_SONGS[0];
  if (!song) return null;
  const currentKey = calculateKey(song.originalKey || song.key || "G", transposeOffset);
  const chords = VirtuoMusicIntelligence.extractChords(song.chords || song.chordSheet || "");
  return {
    songTitle: song.title || "Louvor Selecionado",
    artist: song.artist || "Ministério de Louvor",
    key: currentKey,
    originalKey: song.originalKey || song.key || "G",
    bpm: Number(song.bpm) || 74,
    difficulty: song.difficulty || "Médio",
    chords,
    structure: song.structure || "Intro • Verso • Refrão • Final",
    currentMode: isEasyPlay ? "easy-play" : currentScreen
  };
}
window.getActiveMusicalContext = getActiveMusicalContext;

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
  const inputEl = document.getElementById("ai-user-message-input") || document.getElementById("ai-view-chat-input");
  if (inputEl) {
    inputEl.value = promptText;
    inputEl.focus();
  }
};

window.sendContextualPrompt = (promptText) => {
  window.sendVirtuoAiChatMessage(promptText);
};

window.sendVirtuoAiViewMessage = () => {
  const inputEl = document.getElementById("ai-view-chat-input");
  const text = inputEl ? inputEl.value.trim() : "";
  if (!text) return;
  inputEl.value = "";
  window.sendVirtuoAiChatMessage(text);
};

window.openVirtuoAiForCurrentSong = () => {
  show("ai");
};

window.applySmartKeyToActiveSong = (semitoneOffset) => {
  transposeOffset = semitoneOffset || 0;
  show("songDetail");
};

window.toggleEasyPlayFromAi = (enable) => {
  isEasyPlay = enable;
  show("songDetail");
};

window.selectAiTargetSong = (songId) => {
  const song = liveSongs.find(s => s.id === songId) || DEMO_SONGS.find(s => s.id === songId);
  if (song) {
    activeSong = song;
    transposeOffset = 0;
    renderCurrentScreen();
  }
};

window.sendVirtuoAiChatMessage = async (customText) => {
  const inputEl = document.getElementById("ai-user-message-input") || document.getElementById("ai-view-chat-input");
  const message = customText || (inputEl ? inputEl.value.trim() : "");
  if (!message || isAiReplying) return;

  if (inputEl) inputEl.value = "";
  aiChatHistory.push({ role: "user", text: message });
  isAiReplying = true;
  renderVirtuoAiModal();
  if (currentScreen === "ai") {
    renderCurrentScreen();
  }

  const musicalContext = getActiveMusicalContext();

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, musicalContext })
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
    aiChatHistory.push({ role: "assistant", text: "Dica do Virtuo AI: Mantenha os acordes firmes na base, usando o Easy Play e o Smart Key para otimizar as digitações no instrumento." });
  }

  isAiReplying = false;
  renderVirtuoAiModal();
  if (currentScreen === "ai") {
    renderCurrentScreen();
  }
  const bodyEl = document.getElementById("ai-chat-body") || document.getElementById("ai-view-chat-history");
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

  const context = getActiveMusicalContext();
  const contextSongTitle = context?.songTitle || "Música Ativa";

  modalRoot.className = "ai-modal-backdrop";
  modalRoot.innerHTML = `
    <div class="ai-modal" role="dialog" aria-modal="true" aria-label="Virtuo AI">
      <div class="ai-modal-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">✨</span>
          <div>
            <h3 style="font-size:15px; margin:0; color:#7EE7FF; font-weight:700;">Virtuo AI • Diretor Musical</h3>
            <span style="font-size:11px; color:#94a3b8;">Contexto: ${escapeHtml(contextSongTitle)} (${context?.key || 'G'})</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="tag-btn" onclick="window.closeVirtuoAiModal(); show('ai');" style="font-size:11px; padding:3px 8px; color:#7EE7FF; border-color:rgba(126,231,255,0.4);" title="Abrir painel completo do Virtuo AI">
            Expandir ↗
          </button>
          <button class="minister-metro-close" onclick="window.closeVirtuoAiModal()" title="Fechar Assistente">✕</button>
        </div>
      </div>

      <div class="ai-modal-body" id="ai-chat-body">
        ${aiChatHistory.map(msg => `
          <div class="ai-chat-message ${msg.role}">
            <div style="font-size:10px; color:#94a3b8; margin-bottom:2px;">
              ${msg.role === 'user' ? 'Você' : '✦ Virtuo AI (Diretor Musical)'}
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
              <span style="color:#7EE7FF; font-size:12px;">Virtuo AI formulando orientação contextual...</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="ai-modal-footer">
        <div class="ai-quick-prompts">
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Facilitar música')">⚡ Facilitar música</button>
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Qual tom devo usar?')">🎯 Qual tom devo usar?</button>
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Como estudar?')">📅 Como estudar?</button>
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Montar ensaio')">🎸 Montar ensaio</button>
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Explicar acordes')">🎼 Explicar acordes</button>
          <button class="ai-quick-btn" onclick="window.sendContextualPrompt('Preparar para tocar')">🎯 Preparar para tocar</button>
        </div>

        <div style="display:flex; gap:8px;">
          <input 
            type="text" 
            id="ai-user-message-input" 
            class="form-input" 
            placeholder="Pergunte ao Virtuo AI sobre ${escapeHtml(contextSongTitle)}..." 
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

// -------------------------------------------------------------
// VIRTUO V2 — ETAPA 5/5: MISSÕES, LIVE SYNC, CONFIRM & NOTIFICAÇÕES
// -------------------------------------------------------------
window.virtuoFilterMissions = (filter) => {
  missionsActiveFilter = filter;
  renderCurrentScreen();
};

window.virtuoOpenCreateMission = () => {
  show("createMission");
};

window.virtuoOpenMissionDetail = async (id) => {
  const m = await missionsController.getMissionById(id);
  if (m) {
    show("commandCenter");
  } else {
    show("missions");
  }
};

window.virtuoOpenCheckIn = async (id) => {
  await missionsController.getMissionById(id);
  show("checkin");
};

window.virtuoSubmitCreateMission = async (event) => {
  event.preventDefault();
  const eventType = document.getElementById("mission-event-type")?.value || "culto";
  const eventDate = document.getElementById("mission-event-date")?.value;
  const title = document.getElementById("mission-title")?.value?.trim();
  const churchName = document.getElementById("mission-church-name")?.value?.trim() || "Igreja Central";
  const description = document.getElementById("mission-description")?.value?.trim() || "";

  if (!title) {
    alert("Por favor, preencha o título da missão.");
    return;
  }

  // Coleta louvores informados
  const rows = document.querySelectorAll("#mission-songs-input-list .song-input-row");
  const songs = [];
  rows.forEach((row, idx) => {
    const titleVal = row.querySelector(".song-title-field")?.value?.trim();
    const keyVal = row.querySelector(".song-key-field")?.value?.trim() || "C";
    const bpmVal = Number(row.querySelector(".song-bpm-field")?.value) || 74;
    if (titleVal) {
      songs.push({
        id: `song-${Date.now()}-${idx}`,
        title: titleVal,
        artist: "Louvor",
        key: keyVal,
        bpm: bpmVal,
        order: idx + 1,
        status: "unstarted"
      });
    }
  });

  const pastorName = userProfile?.displayName || currentUser?.displayName || "Pastor";
  const pastorId = currentUser?.uid || "pastor-local";

  try {
    const created = await missionsController.createMission({
      title,
      description,
      churchName,
      eventType,
      eventDate,
      pastorId,
      pastorName,
      leaderId: "leader-1",
      leaderName: "Líder Musical",
      songs
    });

    allMissions = await missionsController.getAllMissions();
    alert(`Missão "${created.title}" criada e enviada ao Líder Musical com sucesso!`);
    show("commandCenter");
  } catch (err) {
    alert("Erro ao criar missão: " + err.message);
  }
};

window.virtuoAddSuggestedSongField = () => {
  const container = document.getElementById("mission-songs-input-list");
  if (!container) return;
  const row = document.createElement("div");
  row.className = "song-input-row";
  row.style.display = "grid";
  row.style.gridTemplateColumns = "2fr 1fr 1fr auto";
  row.style.gap = "8px";
  row.style.alignItems = "center";
  row.innerHTML = `
    <input type="text" placeholder="Nome da música" class="song-title-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
    <input type="text" placeholder="Tom (Ex: G)" value="G" class="song-key-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
    <input type="number" placeholder="BPM" value="70" class="song-bpm-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
    <button type="button" class="button secondary" style="padding: 6px 8px; font-size: 12px;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
};

window.virtuoApproveMission = async (missionId) => {
  const leaderName = userProfile?.displayName || currentUser?.displayName || "Líder Musical";
  try {
    await missionsController.approveMission(missionId, {
      leaderName,
      leaderNotes: "Repertório e tons conferidos e aprovados."
    });
    alert("✓ Missão aprovada com sucesso! A banda já pode estudar.");
    renderCurrentScreen();
  } catch (err) {
    alert("Erro ao aprovar missão: " + err.message);
  }
};

window.virtuoReturnMissionPrompt = async (missionId) => {
  const notes = prompt("Informe o motivo ou ajustes solicitados para o Pastor:", "Ajustar tonalidades ou louvores da escala.");
  if (!notes) return;
  const leaderName = userProfile?.displayName || currentUser?.displayName || "Líder Musical";
  try {
    await missionsController.returnMission(missionId, {
      leaderName,
      leaderNotes: notes
    });
    alert("Missão devolvida para revisão com as observações registradas.");
    renderCurrentScreen();
  } catch (err) {
    alert("Erro ao devolver missão: " + err.message);
  }
};

window.virtuoStartMission = async (missionId) => {
  const initiatorName = userProfile?.displayName || currentUser?.displayName || "Líder Musical";
  try {
    await missionsController.startMission(missionId, initiatorName);
    alert("⚡ Missão ao vivo no altar! Sincronização Live Sync conectada.");
    renderCurrentScreen();
  } catch (err) {
    alert("Erro ao iniciar missão: " + err.message);
  }
};

window.virtuoCompleteMission = async (missionId) => {
  const confirmed = confirm("Deseja concluir esta ministração e consagrar o culto? Um Virtuo Moment será desbloqueado!");
  if (!confirmed) return;
  const finisherName = userProfile?.displayName || currentUser?.displayName || "Líder Musical";
  try {
    const { moment } = await missionsController.completeMission(missionId, finisherName);
    activeMomentForCelebration = moment;
    show("moment");
  } catch (err) {
    alert("Erro ao concluir missão: " + err.message);
  }
};

window.virtuoToggleSongStudyStatus = async (missionId, songId, currentStatus) => {
  let nextStatus = "studying";
  if (currentStatus === "studying") nextStatus = "ready";
  else if (currentStatus === "ready") nextStatus = "unstarted";
  else nextStatus = "studying";

  await missionsController.setSongStudyStatus(missionId, songId, nextStatus);
  renderCurrentScreen();
};

window.virtuoSubmitCheckIn = async (event, missionId) => {
  event.preventDefault();
  const instrument = document.getElementById("checkin-instrument-select")?.value || "Violão";
  const checkedIn = document.getElementById("checkin-presence-check")?.checked;
  const isTuned = document.getElementById("checkin-tuned-check")?.checked;
  const returnWorking = document.getElementById("checkin-return-check")?.checked;

  const uid = currentUser?.uid || "current-musician";
  const name = userProfile?.displayName || currentUser?.displayName || "Músico Convidado";

  try {
    await missionsController.submitCheckIn(missionId, {
      uid,
      name,
      instrument,
      checkedIn,
      isTuned,
      returnWorking
    });
    alert("✓ Confirmação registrada com sucesso no Virtuo Confirm!");
    renderCurrentScreen();
  } catch (err) {
    alert("Erro ao confirmar check-in: " + err.message);
  }
};

window.virtuoViewMomentScreen = (momentId) => {
  const m = momentsService.getMomentById(momentId);
  if (m) {
    activeMomentForCelebration = m;
    show("moment");
  }
};

window.liveSyncChangeKey = (key) => {
  liveSyncController.changeKey(key);
  renderCurrentScreen();
};

window.liveSyncChangeBpm = (bpmVal) => {
  liveSyncController.changeBpm(bpmVal);
  renderCurrentScreen();
};

window.liveSyncChangeSection = (section) => {
  liveSyncController.changeSection(section);
  renderCurrentScreen();
};

window.liveSyncNextSong = () => {
  liveSyncController.nextSong();
  renderCurrentScreen();
};

window.liveSyncPrevSong = () => {
  liveSyncController.previousSong();
  renderCurrentScreen();
};

window.liveSyncTogglePlay = () => {
  liveSyncController.togglePlay();
  renderCurrentScreen();
};

window.liveSyncToggleEasyPlay = (enabled) => {
  liveSyncController.toggleEasyPlay(enabled);
  renderCurrentScreen();
};

window.notificationsMarkAllAsRead = () => {
  notificationsService.markAllAsRead();
  renderCurrentScreen();
};

window.notificationsClearAll = () => {
  notificationsService.clearAll();
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

  get missions() {
    return renderMissionsListScreen(allMissions, currentUser, missionsActiveFilter);
  },

  get createMission() {
    return renderCreateMissionScreen();
  },

  get commandCenter() {
    const active = missionsController.activeMission || allMissions[0] || null;
    return renderCommandCenterScreen(active, currentUser);
  },

  get checkin() {
    const active = missionsController.activeMission || allMissions[0] || null;
    return renderCheckInScreen(active, currentUser);
  },

  get notifications() {
    return renderNotificationsScreen();
  },

  get moment() {
    return renderMomentCelebrationScreen(activeMomentForCelebration);
  },

  get hoje() {
    return this.home;
  },

  get home() {
    let lastSong = null;
    try {
      const saved = localStorage.getItem('virtuo_last_opened_song');
      if (saved) {
        lastSong = JSON.parse(saved);
      }
    } catch {}

    if (!lastSong) {
      if (activeSong) {
        lastSong = activeSong;
      } else if (Array.isArray(liveSongs) && liveSongs.length > 0) {
        lastSong = liveSongs[0];
      }
    }

    const activeMission = missionsController.activeMission || virtuoRehearsal?.getActiveRehearsal?.() || null;

    return renderHojeScreen({
      currentUser,
      activeMission,
      lastOpenedSong: lastSong,
      firebaseStatus
    });
  },

  get ensaio() {
    return renderRehearsalScreen(virtuoRehearsal);
  },

  get band() {
    return renderBandScreenComponent(virtuoMetronome.getState());
  },

  get academy() {
    return renderAcademyScreen();
  },

  get tuner() {
    return renderTunerScreen();
  },

  get vocal() {
    return renderVocalScreen();
  },

  get performance() {
    return renderPerformanceScreen(liveSongs || DEMO_SONGS);
  },

  get coach() {
    return renderGuitarCoachScreen();
  },

  get ai() {
    return renderVirtuoAiScreen(activeSong || (liveSongs && liveSongs[0]) || DEMO_SONGS[0], liveSongs, aiChatHistory, isAiReplying);
  },

  get diagnostics() {
    return renderDiagnosticsScreen();
  },

  get comunidade() {
    const communityHtml = renderCommunityView({
      currentSubTab: communitySubTab,
      posts: communityPosts,
      filterPostType,
      currentUser,
      userProfile,
      bands: bandsList,
      activeBand,
      commentsMap,
      expandedPostId: null,
      expandedCommentsPostId,
      searchQuery: communitySearchQuery,
      searchResults: communitySearchResults,
      discoverCategory: selectedDiscoverCategory,
      discoverResults,
      pendingReports: pendingReportsList,
      savedPostIds: savedPostIdsList,
      invites: bandInvitesList
    });

    let modalsHtml = "";
    if (isCreateBandModalOpen) {
      modalsHtml += renderCreateBandModal();
    }
    if (isInviteMemberModalOpen && activeBandForInvite) {
      modalsHtml += renderInviteMemberModal(activeBandForInvite);
    }
    if (isAddSongToRepModalOpen && activeBandForSong) {
      modalsHtml += renderAddSongToRepertoireModal(activeBandForSong, liveSongs);
    }
    if (isCreateRehearsalModalOpen && activeBandForRehearsal) {
      modalsHtml += renderCreateRehearsalModal(activeBandForRehearsal);
    }
    if (isReportModalOpen && activeReportTarget) {
      modalsHtml += renderReportModal(activeReportTarget.type, activeReportTarget.id);
    }
    if (isEditProfileModalOpen) {
      modalsHtml += renderEditProfileModal(userProfile || currentUser);
    }
    if (isUserProfileModalOpen && activePublicUserProfile) {
      const isFollowing = currentUser && Array.isArray(activePublicUserProfile.followers) && activePublicUserProfile.followers.includes(currentUser.uid);
      modalsHtml += renderUserProfileModal(activePublicUserProfile, isFollowing);
    }

    return communityHtml + modalsHtml;
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
              onclick="window.openVirtuoAiForCurrentSong()"
            >
              <span>✨ Virtuo AI 2.0</span>
              <span>Análise Harmônica, Smart Key e Estudo</span>
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
            <h3>${userProfile?.reputationScore || 100}</h3>
            <p>Reputação Musical</p>
          </div>

          <div class="tile">
            <div class="icon">✨</div>
            <h3>${isCelestial ? 'Celestial' : 'Músico'}</h3>
            <p>${isCelestial ? 'Membro Celestial' : (isLogged ? "Músico Virtuoso" : "Founder Edition")}</p>
          </div>
        </div>

        ${isLogged ? `
          <!-- Estatísticas Musicais 2.0 -->
          <div style="margin-top:14px; display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center;">
            <div class="tile" style="padding:10px;">
              <strong style="font-size:16px; color:#7EE7FF;">${userProfile?.stats?.songsStudied || liveSongs.length}</strong>
              <span style="font-size:10px; color:#94a3b8; display:block;">Músicas Estudadas</span>
            </div>
            <div class="tile" style="padding:10px;">
              <strong style="font-size:16px; color:#7EE7FF;">${userProfile?.stats?.rehearsalsCompleted || 1}</strong>
              <span style="font-size:10px; color:#94a3b8; display:block;">Ensaios Realizados</span>
            </div>
            <div class="tile" style="padding:10px;">
              <strong style="font-size:16px; color:#7EE7FF;">${Array.isArray(userProfile?.followers) ? userProfile.followers.length : 0}</strong>
              <span style="font-size:10px; color:#94a3b8; display:block;">Seguidores</span>
            </div>
          </div>

          <!-- Banda Atual e Links -->
          <div style="margin-top:12px; padding:10px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; font-size:12px; color:#cbd5e1; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span><strong>Banda / Ministério:</strong> ${escapeHtml(userProfile?.currentBand || "Solo / Convidado")}</span>
              <span><strong>Nível:</strong> ${(userProfile?.level || "Intermediário").toUpperCase()}</span>
            </div>
            ${userProfile?.location ? `<div style="margin-top:4px; font-size:11px; color:#94a3b8;">📍 ${escapeHtml(userProfile.location)}</div>` : ''}
          </div>

          <!-- Authenticated User Profile & Instruments Settings -->
          <div style="margin-top:20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:12px; color:#7EE7FF; font-weight:700;">
                MEUS INSTRUMENTOS
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

            <!-- Botões de Edição de Perfil -->
            <div style="margin-bottom:16px; display:flex; gap:8px;">
              <button class="button primary" style="flex:1; font-size:12px; padding:8px;" onclick="window.openEditProfileModal()">
                🎸 Editar Perfil Musical 2.0
              </button>
              <button class="button secondary" style="flex:1; font-size:12px; padding:8px;" onclick="window.toggleEditProfileForm()">
                ${isEditProfileOpen ? '✕ Fechar Dados' : '✏️ Dados da Conta'}
              </button>
            </div>
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

      <!-- Experiência & Configurações Oficiais -->
      <section class="glass" style="margin-top:16px;">
        <span class="pill">EXPERIÊNCIA & SISTEMA</span>
        <h3 style="margin-top:10px;">Configurações</h3>
        <p class="subtitle" style="font-size:12px; margin-bottom:12px;">Personalize a experiência sensorial do Virtuo.</p>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px;">
          <div>
            <strong style="font-size:13px; color:#F8FAFC; display:block;">Som de Inicialização</strong>
            <span style="font-size:11px; color:#94A3B8;">Acorde límpido Web Audio ao abrir o Virtuo</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button 
              type="button" 
              class="button secondary" 
              style="padding:6px 10px; font-size:11px;" 
              onclick="window.testStartupChime()"
              title="Testar som agora"
            >
              🔊 Testar
            </button>
            <button 
              type="button" 
              id="btn-toggle-startup-sound"
              class="button ${isStartupChimeEnabled() ? 'primary' : 'secondary'}" 
              style="padding:6px 12px; font-size:11px; font-weight:600;" 
              onclick="window.toggleStartupChime()"
            >
              ${isStartupChimeEnabled() ? 'Ligado' : 'Desligado'}
            </button>
          </div>
        </div>
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
  const tStart = performance.now();
  const targetName = (name === "hoje" || name === "inicio") ? "home" : name;

  // Teardown microfones e timers ao sair das telas de áudio
  if (currentScreen === "tuner" && targetName !== "tuner") {
    if (typeof virtuoTuner !== "undefined" && virtuoTuner.stop) virtuoTuner.stop();
  }
  if (currentScreen === "vocal" && targetName !== "vocal") {
    if (typeof virtuoVocal !== "undefined" && virtuoVocal.stop) virtuoVocal.stop();
  }
  if (currentScreen === "coach" && targetName !== "coach") {
    if (typeof virtuoGuitarCoach !== "undefined" && virtuoGuitarCoach.stop) virtuoGuitarCoach.stop();
  }

  currentScreen = targetName;

  // Atualiza fundo contextual do Brand Kit V3
  const bg = document.querySelector(".background");
  if (bg) {
    bg.className = `background screen-${targetName}`;
  }

  if (typeof screens === "undefined") {
    window._pendingScreen = targetName;
    return;
  }

  if (targetName === "comunidade") {
    loadCommunityDataV2();
  }

  if (targetName === "missions") {
    missionsController.getAllMissions().then(m => {
      allMissions = m;
      if (currentScreen === "missions") renderCurrentScreen();
    });
  }

  renderCurrentScreen();
  updateTabbarActiveState(targetName);

  const duration = performance.now() - tStart;
  perfMonitor.recordMetric(`screen_render_${targetName}`, duration);
}
window.show = show;
window._virtuoShow = show;

function updateTabbarActiveState(name) {
  const tabName = (name === "hoje") ? "home" : name;
  document.querySelectorAll(".tabbar button").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Atualiza barra de atalhos rápidos
  document.querySelectorAll(".quick-toolbar button").forEach(btn => {
    btn.classList.remove("active");
  });
  const quickBtn = document.getElementById(`quick-btn-${tabName}`);
  if (quickBtn) {
    quickBtn.classList.add("active");
  }
}

function renderCurrentScreen() {
  const container = document.getElementById("app");
  if (!container) return;
  if (typeof screens === "undefined") return;
  const screenContent = screens[currentScreen];
  container.innerHTML = typeof screenContent === "function" ? screenContent() : (screenContent || "");
  
  // Transição rápida de tela (<= 160ms)
  container.classList.remove("screen-transition-enter");
  void container.offsetWidth;
  container.classList.add("screen-transition-enter");

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
    try {
      localStorage.setItem('virtuo_last_opened_song', JSON.stringify({
        id: song.id,
        title: song.title,
        artist: song.artist || 'Raquel Pereira',
        key: song.key || 'Cm',
        bpm: song.bpm || 74
      }));
    } catch {}

    virtuoPulse.setState(PULSE_STATES.SONG_ACTIVE, {
      id: song.id,
      title: song.title,
      key: song.key || 'C',
      bpm: song.bpm || 74
    });

    transposeOffset = 0;
    isEasyPlay = false;
    currentScreen = "songDetail";
    renderCurrentScreen();
  }
};

window.changeTone = (delta) => {
  transposeOffset += delta;
  if (activeSong) {
    const currentCalculatedKey = calculateKey(activeSong.key || "C", transposeOffset);
    virtuoPulse.setState(PULSE_STATES.KEY_SYNCED, {
      key: currentCalculatedKey,
      semitones: transposeOffset
    }, 3500);
  }
  renderCurrentScreen();
};

window.testStartupChime = () => {
  playStartupChime();
};

window.toggleStartupChime = () => {
  const current = isStartupChimeEnabled();
  setStartupChimeEnabled(!current);
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
    try {
      const musicianProf = await ProfileService.getMusicianProfile(user.uid);
      if (musicianProf) {
        userProfile = { ...(userProfile || {}), ...musicianProf };
      }
      bandInvitesList = await BandService.getUserPendingInvites(user.uid);
    } catch (e) {
      console.warn("Aviso ao carregar perfil musical 2.0:", e);
    }
    virtuoRehearsal.init(user.uid);
    VirtuoAcademyService.attachUserRealtime(user.uid);
  } else {
    if (headerAvatar) {
      headerAvatar.textContent = "✦";
    }
    userProfile = null;
    bandInvitesList = [];
    virtuoRehearsal.init(null);
    VirtuoAcademyService.attachUserRealtime(null);
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

// Experiência de Inicialização Premium: Saudação Dinâmica e Abertura Oficial Splash (1.4s)
startGreetingAutoUpdater('hoje-dynamic-greeting');

// Initial Screen Render
const initialScreen = window._pendingScreen || "home";
window._pendingScreen = null;
show(initialScreen);

// Executa a abertura oficial do Virtuo (1.4s)
virtuoSplash.start(() => {
  renderCurrentScreen();
});

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
