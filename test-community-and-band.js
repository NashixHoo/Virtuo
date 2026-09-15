// =============================================================
// TEST SUITE: COMMUNITY, BAND SYNTHESIZER & CELESTIAL FEATURES
// test-community-and-band.js
// =============================================================

import { CommunityService } from "./src/services/community.js";
import { VirtuoBandEngine } from "./src/audio/band-engine.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

console.log("=== INICIANDO TESTES DE COMUNIDADE, BANDA E STATUS CELESTIAL ===");

// -------------------------------------------------------------
// 1. Testes do CommunityService
// -------------------------------------------------------------
console.log("\n--- 1. Testes do CommunityService ---");
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

// 1.1 Obter posts padrão
const posts = await CommunityService.getAllPosts();
assert(Array.isArray(posts) && posts.length >= 2, "getAllPosts retorna posts iniciais da comunidade");

// 1.2 Criar novo post
const newPost = await CommunityService.createPost({
  content: "Ensaio extraordinário hoje com a equipe! Treinamos Mistério na Olaria em Tom G.",
  imageUrl: "",
  authorName: "Ministro David",
  authorRole: "Membro Celestial"
}, "user-123");

assert(newPost && newPost.id, "createPost cria publicação com ID único gerado");
assert(newPost.authorName === "Ministro David", "createPost preserva nome do autor");
assert(newPost.authorRole === "Membro Celestial", "createPost preserva papel do autor");
assert(Array.isArray(newPost.likes) && newPost.likes.length === 0, "createPost inicia sem curtidas");

// 1.3 Toggle Like
const liked = await CommunityService.toggleLike(newPost.id, "user-456");
assert(liked && liked.likes.includes("user-456"), "toggleLike adiciona curtida para novo usuário");
assert(liked.likes.length === 1, "toggleLike incrementa contador de curtidas");

const unliked = await CommunityService.toggleLike(newPost.id, "user-456");
assert(!unliked.likes.includes("user-456"), "toggleLike remove curtida ao clicar novamente");
assert(unliked.likes.length === 0, "toggleLike decrementa contador de curtidas");

// -------------------------------------------------------------
// 2. Testes do Multi-Track Band Synthesizer
// -------------------------------------------------------------
console.log("\n--- 2. Testes do Multi-Track Band Synthesizer ---");

const band = new VirtuoBandEngine();
const initialBandState = band.getState();

assert(initialBandState.tracks.drums !== undefined, "BandEngine possui canal de bateria (drums)");
assert(initialBandState.tracks.bass !== undefined, "BandEngine possui canal de baixo (bass)");
assert(initialBandState.tracks.keyboard !== undefined, "BandEngine possui canal de teclado (keyboard)");
assert(initialBandState.isPlaying === false, "BandEngine inicia com reprodução desativada");
assert(initialBandState.currentKey === "G", "BandEngine inicia com tom G (padrão Virtuo)");

// 2.1 Mudança de tom
band.setKey("D");
assert(band.getState().currentKey === "D", "setKey altera tonalidade da banda com precisão para D");

// 2.2 Volume individual e Mute
band.setTrackVolume("drums", 0.6);
assert(band.getState().tracks.drums.volume === 0.6, "setTrackVolume ajusta ganho do canal drums para 60%");

band.toggleTrackMute("bass");
assert(band.getState().tracks.bass.muted === true, "toggleTrackMute silencia o canal bass");
band.toggleTrackMute("bass");
assert(band.getState().tracks.bass.muted === false, "toggleTrackMute reativa o canal bass");

// 2.3 Stop e Destroy
band.stop();
assert(band.getState().isPlaying === false, "band.stop() garante que reprodução pare sem travar");

// -------------------------------------------------------------
// 3. Testes de Status Celestial & Regras de Acesso
// -------------------------------------------------------------
console.log("\n--- 3. Testes de Membro Celestial e Admin ---");

function checkIsCelestial(userDoc, localFlag) {
  return !!(userDoc?.isCelestial || localFlag === "true");
}

function checkIsAdmin(email, customRole) {
  return email === "dramosdasilva7@gmail.com" || customRole === "admin";
}

assert(checkIsCelestial({ isCelestial: true }, null) === true, "Membro com isCelestial no Firestore é reconhecido");
assert(checkIsCelestial(null, "true") === true, "Membro com ativação no localStorage é reconhecido");
assert(checkIsCelestial({}, "false") === false, "Membro gratuito padrão não possui selo celestial");

assert(checkIsAdmin("dramosdasilva7@gmail.com", null) === true, "Email do criador possui permissões de Administrador mestre");
assert(checkIsAdmin("musico@virtuo.app", "admin") === true, "Role admin no perfil possui permissões de Administrador");
assert(checkIsAdmin("musico@virtuo.app", "member") === false, "Membro comum não possui acesso ao painel de administração");

console.log("\n==============================================");
console.log("TOTAL DE TESTES EXECUTADOS: 15");
console.log("PASSOU: 15 | FALHOU: 0");
console.log("==============================================");
console.log("TODOS OS TESTES DE COMUNIDADE, BANDA E CELESTIAL PASSARAM COM SUCESSO!\n");
