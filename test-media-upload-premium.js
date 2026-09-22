import assert from "assert";
import fs from "fs";
import { 
  buildStoragePath, 
  getFriendlyErrorMessage, 
  sanitizeFileName,
  MEDIA_TYPES,
  STORAGE_ERROR_CODE_MAP,
  FIRESTORE_ERROR_CODE_MAP,
  renderUploadErrorUI,
  clearUploadErrorUI,
  getUploadErrorHint
} from "./src/services/media-upload.js";

console.log("=== INICIANDO SUÍTE DE TESTES: VIRTUO MEDIA UPLOAD PREMIUM ===");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Botões Inteligentes & Captura
test("1. Botões Inteligentes: Verifica inputs ocultos independentes e atributos no community-view.js", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  
  // Foto: accept="image/*" capture="environment"
  assert(html.includes('id="community-post-photo"'), "Input de foto deve existir");
  assert(html.includes('accept="image/*"'), "Input de foto deve ter accept='image/*'");
  assert(html.includes('capture="environment"'), "Input de foto deve ter capture='environment'");
  assert(html.includes("community-post-photo').click()"), "Botão foto deve chamar click()");

  // Vídeo: accept="video/*"
  assert(html.includes('id="community-post-video"'), "Input de vídeo deve existir");
  assert(html.includes('accept="video/*"'), "Input de vídeo deve ter accept='video/*'");
  assert(html.includes("community-post-video').click()"), "Botão vídeo deve chamar click()");

  // Música: accept="audio/*"
  assert(html.includes('id="community-post-audio"'), "Input de áudio deve existir");
  assert(html.includes('accept="audio/*"'), "Input de áudio deve ter accept='audio/*'");
  assert(html.includes("community-post-audio').click()"), "Botão áudio deve chamar click()");

  // Não deve existir fallback genérico 'community-post-file' que abra 'Selecionar Arquivos'
  assert(!html.includes('id="community-post-file"'), "Fallback genérico deve ter sido removido");
});

// 2. Caminhos do Firebase Storage
test("2. Firebase Storage Paths: Padrão photos/{uid}/{timestamp}_{nome}, videos/... e audio/...", () => {
  const uid = "user_test_123";
  
  const photoPath = buildStoragePath("photos", uid, "Culto Especial 2026.png");
  assert(photoPath.startsWith(`photos/${uid}/`), `Foto deve iniciar com photos/${uid}/ (recebido: ${photoPath})`);
  assert(photoPath.endsWith(".png"), "Extensão da foto deve ser preservada");

  const videoPath = buildStoragePath("videos", uid, "Solo Guitarra Ensaio.mp4");
  assert(videoPath.startsWith(`videos/${uid}/`), `Vídeo deve iniciar com videos/${uid}/ (recebido: ${videoPath})`);
  assert(videoPath.endsWith(".mp4"), "Extensão do vídeo deve ser preservada");

  const audioPath = buildStoragePath("audio", uid, "Isaías Saad - Ousado Amor.mp3");
  assert(audioPath.startsWith(`audio/${uid}/`), `Áudio deve iniciar com audio/${uid}/ (recebido: ${audioPath})`);
  assert(audioPath.endsWith(".mp3"), "Extensão do áudio deve ser preservada");
});

// 3. Sanitização de Nome de Arquivo
test("3. Sanitização: remove acentos e caracteres inválidos preservando extensão", () => {
  const clean = sanitizeFileName("Música de Louvor & Ação de Graças (Ao Vivo).mp3");
  assert(!clean.includes("ú"), "Não deve conter acentos");
  assert(!clean.includes("&"), "Não deve conter caracteres especiais");
  assert(clean.endsWith(".mp3"), "Deve manter extensão original");
});

// 4. Mapeamento de Erros Reais (error.code)
test("4. Mapeamento de Códigos de Erro Reais do Firebase Storage", () => {
  const fbConfigContent = fs.readFileSync("./firebase-config.js", "utf-8");

  const errUnauthorized = { code: "storage/unauthorized" };
  assert.strictEqual(
    getFriendlyErrorMessage(errUnauthorized),
    "Você não tem permissão para enviar este arquivo."
  );
  assert(fbConfigContent.includes("Você não tem permissão para enviar este arquivo."), "firebase-config deve conter mensagem de unauthorized");

  const errCanceled = { code: "storage/canceled" };
  assert.strictEqual(
    getFriendlyErrorMessage(errCanceled),
    "Upload cancelado."
  );
  assert(fbConfigContent.includes("Upload cancelado."), "firebase-config deve conter mensagem de canceled");

  const errQuota = { code: "storage/quota-exceeded" };
  assert.strictEqual(
    getFriendlyErrorMessage(errQuota),
    "Espaço do Storage esgotado."
  );
  assert(fbConfigContent.includes("Espaço do Storage esgotado."), "firebase-config deve conter mensagem de quota-exceeded");

  const errRetry = { code: "storage/retry-limit-exceeded" };
  assert.strictEqual(
    getFriendlyErrorMessage(errRetry),
    "Verifique sua conexão."
  );
  assert(fbConfigContent.includes("Verifique sua conexão."), "firebase-config deve conter mensagem de retry-limit-exceeded");

  const errNotFound = { code: "storage/object-not-found" };
  assert.strictEqual(
    getFriendlyErrorMessage(errNotFound),
    "Arquivo não encontrado."
  );
  assert(fbConfigContent.includes("Arquivo não encontrado."), "firebase-config deve conter mensagem de object-not-found");
});

// 5. Storage Rules
test("5. Storage Rules: Usuário autenticado grava apenas na própria pasta (photos, videos, audio)", () => {
  const rules = fs.readFileSync("./storage.rules", "utf-8");

  assert(rules.includes("match /photos/{userId}/{fileName}"), "Deve conter regra para /photos/{userId}/{fileName}");
  assert(rules.includes("match /videos/{userId}/{fileName}"), "Deve conter regra para /videos/{userId}/{fileName}");
  assert(rules.includes("match /audio/{userId}/{fileName}"), "Deve conter regra para /audio/{userId}/{fileName}");
  
  assert(rules.includes("allow write: if request.auth != null && request.auth.uid == userId;"), "Deve isolar gravação por userId");
  assert(rules.includes("allow read: if true;"), "Deve permitir leitura pública para o feed e repertório");
});

// 6. Compatibilidade Safari / iPhone e Prevenção de APIs Incompatíveis
test("6. Safari iPhone: Nenhuma dependência de showOpenFilePicker() no código", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  const mediaService = fs.readFileSync("./src/services/media-upload.js", "utf-8");
  const fbConfig = fs.readFileSync("./firebase-config.js", "utf-8");

  assert(!appJs.includes("showOpenFilePicker"), "app.js não deve usar showOpenFilePicker");
  assert(!mediaService.includes("showOpenFilePicker"), "media-upload.js não deve usar showOpenFilePicker");
  assert(!fbConfig.includes("showOpenFilePicker"), "firebase-config.js não deve usar showOpenFilePicker");

  // Uso de createObjectURL e revokeObjectURL
  assert(appJs.includes("createPreview") || appJs.includes("createObjectURL"), "Deve suportar createObjectURL");
  assert(appJs.includes("revokePreview") || appJs.includes("revokeObjectURL"), "Deve suportar revokeObjectURL");
});

// 7. Vídeo Primeiro Frame & Áudio Metadados
test("7. Vídeo & Áudio Prévia: Primeiro frame de vídeo e duração/artista de áudio no app.js", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");

  assert(appJs.includes("videoPlayer.currentTime = 0.05") || appJs.includes("currentTime ="), "Vídeo deve definir currentTime para renderizar primeiro frame");
  assert(appJs.includes("Duração:"), "Áudio deve calcular e exibir duração");
  assert(appJs.includes("Artista:"), "Áudio deve exibir artista quando detectado");
});

// 8. Barra de Progresso e Mensagem de Sucesso
test("8. Barra de Progresso: Milestones 0%, 25%, 50%, 75%, 100% e mensagem '✓ Enviado com sucesso.'", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  const appJs = fs.readFileSync("./app.js", "utf-8");

  assert(html.includes("milestone-0"), "Milestone 0% presente");
  assert(html.includes("milestone-25"), "Milestone 25% presente");
  assert(html.includes("milestone-50"), "Milestone 50% presente");
  assert(html.includes("milestone-75"), "Milestone 75% presente");
  assert(html.includes("milestone-100"), "Milestone 100% presente");

  assert(appJs.includes("✓ Enviado com sucesso."), "Mensagem '✓ Enviado com sucesso.' deve ser exibida ao concluir");
});

// 9. Mapeamento Humano Completo de Erros do Firebase Storage & Dicionário Canônico
test("9. Mapeamento Completo de Erros: Todos os códigos de erro do Storage possuem mensagem humana", () => {
  const requiredCodes = [
    { code: "storage/unauthorized", expected: "Você não tem permissão para enviar este arquivo." },
    { code: "storage/canceled", expected: "Upload cancelado." },
    { code: "storage/quota-exceeded", expected: "Espaço do Storage esgotado." },
    { code: "storage/retry-limit-exceeded", expected: "Verifique sua conexão." },
    { code: "storage/object-not-found", expected: "Arquivo não encontrado." },
    { code: "storage/unauthenticated", expected: "Sessão expirada. Faça login novamente para enviar arquivos." },
    { code: "storage/bucket-not-found", expected: "Servidor de armazenamento não encontrado." },
    { code: "storage/project-not-found", expected: "Projeto do Firebase não encontrado." }
  ];

  for (const item of requiredCodes) {
    const errorObj = { code: item.code };
    const mapped = getFriendlyErrorMessage(errorObj);
    assert.strictEqual(mapped, item.expected, `Código ${item.code} deve mapear para "${item.expected}", mas recebeu "${mapped}"`);

    // Testa também quando o código vem embutido em mensagem de erro ou string
    const stringErr = `FirebaseError: Firebase Storage: ${item.code} (custom message)`;
    const mappedString = getFriendlyErrorMessage(stringErr);
    assert.strictEqual(mappedString, item.expected, `String contendo ${item.code} deve mapear corretamente`);
  }
});

// 10. Tratamento Elegante de Falhas na Etapa getDownloadURL
test("10. Etapa getDownloadURL: Erro ao obter URL gera mensagem humana e preserva contexto", () => {
  const getUrlError = {
    code: "storage/object-not-found",
    stage: "get_download_url",
    message: "FirebaseError: Firebase Storage: An error occurred while retrieving download URL."
  };
  const friendly = getFriendlyErrorMessage(getUrlError);
  assert.strictEqual(friendly, "Arquivo não encontrado.");

  const unauthUrlError = {
    code: "storage/unauthorized",
    stage: "get_download_url",
    message: "Firebase Storage: User does not have permission to access gs://..."
  };
  assert.strictEqual(getFriendlyErrorMessage(unauthUrlError), "Você não tem permissão para enviar este arquivo.");
});

// 11. Tratamento Elegante de Falhas na Etapa de Salvamento no Firestore
test("11. Etapa de Salvamento no Firestore: Códigos de erro do Firestore mapeados para linguagem humana", () => {
  const permDenied = { code: "permission-denied", stage: "firestore_save" };
  assert.strictEqual(
    getFriendlyErrorMessage(permDenied),
    "Você não tem permissão para salvar no banco de dados."
  );

  const unavailable = { code: "unavailable", stage: "firestore_save" };
  assert.strictEqual(
    getFriendlyErrorMessage(unavailable),
    "Serviço temporariamente indisponível. Verifique sua conexão."
  );

  const resourceExhausted = { code: "resource-exhausted", stage: "firestore_save" };
  assert.strictEqual(
    getFriendlyErrorMessage(resourceExhausted),
    "Limite de operações no Firestore atingido. Tente novamente mais tarde."
  );

  const unauthenticated = { code: "unauthenticated", stage: "firestore_save" };
  assert.strictEqual(
    getFriendlyErrorMessage(unauthenticated),
    "Sessão expirada. Faça login novamente para continuar."
  );
});

// 12. Renderização Elegante da UI de Erro (renderUploadErrorUI & clearUploadErrorUI)
test("12. UI Elegante: renderUploadErrorUI cria card com ícone de alerta, mensagem, dica acionável e botão de fechar", () => {
  // Mock element para teste em Node.js
  const mockContainer = {
    innerHTML: "",
    style: { display: "none" },
    querySelector: () => null,
    scrollIntoView: () => {}
  };

  const sampleError = {
    code: "storage/quota-exceeded",
    stage: "storage_upload",
    message: "Storage quota exceeded"
  };

  renderUploadErrorUI(mockContainer, sampleError, {
    title: "Falha no envio de mídia",
    scrollIntoView: false
  });

  assert.strictEqual(mockContainer.style.display, "block", "Container deve ser exibido com display block");
  assert(mockContainer.innerHTML.includes("Espaço do Storage esgotado."), "Deve conter a mensagem humana");
  assert(mockContainer.innerHTML.includes("Falha no envio de mídia"), "Deve conter o título elegante");
  assert(mockContainer.innerHTML.includes("upload-error-dismiss-btn"), "Deve conter botão de fechar");
  assert(mockContainer.innerHTML.includes("💡"), "Deve conter ícone de dica orientativa");

  // Testa dica orientativa correspondente
  const hint = getUploadErrorHint(sampleError);
  assert(hint.includes("armazenamento") || hint.includes("menor"), "Dica deve orientar sobre tamanho ou limite");

  // Limpa UI
  clearUploadErrorUI(mockContainer);
  assert.strictEqual(mockContainer.style.display, "none", "Ao limpar, container deve ter display none");
  assert.strictEqual(mockContainer.innerHTML, "", "Ao limpar, innerHTML deve estar vazio");
});

// 13. Resets de UI e Não Falhar Silenciosamente nos Handlers
test("13. Integração com a UI: Verificação de remoção de mensagens de erro ao tentar novo upload", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");

  // Verifica que clearUploadErrorUI é chamado no início de novas seleções/envios
  assert(appJs.includes("clearUploadErrorUI(errorBox)"), "Deve limpar caixa de erro da comunidade ao iniciar novo upload");
  assert(appJs.includes("clearUploadErrorUI(errorEl)"), "Deve limpar caixa de erro de áudio ao iniciar nova seleção de áudio");

  // Verifica que renderUploadErrorUI é utilizado nos blocos de catch
  assert(appJs.includes("renderUploadErrorUI(errorBox, uploadErr"), "Deve renderizar UI elegante no catch de upload de post");
  assert(appJs.includes("renderUploadErrorUI(errorBox, postErr"), "Deve renderizar UI elegante no catch de salvamento no Firestore");
  assert(appJs.includes("renderUploadErrorUI(errorEl, uploadErr"), "Deve renderizar UI elegante no upload de áudio de cifra");
  assert(appJs.includes("renderUploadErrorUI(errorEl, err"), "Deve renderizar UI elegante no salvamento de cifra no Firestore");
});

// 14. Módulo Exportável src/utils/storageErrorHelper.js
test("14. src/utils/storageErrorHelper.js: Módulo exportável com mapeamento de códigos e função getStorageErrorMessage", async () => {
  const helper = await import("./src/utils/storageErrorHelper.js");
  const { STORAGE_ERROR_MESSAGES, getStorageErrorMessage } = helper;

  assert(STORAGE_ERROR_MESSAGES, "STORAGE_ERROR_MESSAGES deve ser exportado");
  assert(typeof getStorageErrorMessage === "function", "getStorageErrorMessage deve ser uma função");

  // Testa os códigos especificados
  assert.strictEqual(
    getStorageErrorMessage({ code: "storage/unauthorized" }),
    "Você não tem permissão para enviar este arquivo."
  );
  assert.strictEqual(
    getStorageErrorMessage({ code: "storage/canceled" }),
    "Upload cancelado."
  );
  assert.strictEqual(
    getStorageErrorMessage({ code: "storage/quota-exceeded" }),
    "Espaço do Storage esgotado."
  );
  assert.strictEqual(
    getStorageErrorMessage({ code: "storage/retry-limit-exceeded" }),
    "Verifique sua conexão."
  );
  assert.strictEqual(
    getStorageErrorMessage({ code: "storage/object-not-found" }),
    "Arquivo não encontrado."
  );

  // Erro em formato string ou aninhado
  assert.strictEqual(
    getStorageErrorMessage("storage/unauthorized"),
    "Você não tem permissão para enviar este arquivo."
  );
  assert.strictEqual(
    getStorageErrorMessage({ originalError: { code: "storage/quota-exceeded" } }),
    "Espaço do Storage esgotado."
  );
  assert.strictEqual(
    getStorageErrorMessage({ message: "Firebase Storage: storage/retry-limit-exceeded" }),
    "Verifique sua conexão."
  );

  // Testa também o re-export na raiz
  const rootHelper = await import("./storageErrorHelper.js");
  assert.strictEqual(
    rootHelper.getStorageErrorMessage({ code: "storage/quota-exceeded" }),
    "Espaço do Storage esgotado."
  );
});

// 15. src/services/storage-service.js: Verificação do módulo único e funções
test("15. src/services/storage-service.js: Funções uploadImage, uploadVideo, uploadAudio com uploadBytesResumable", async () => {
  const fileContent = fs.readFileSync("./src/services/storage-service.js", "utf-8");
  assert(fileContent.includes("export async function uploadImage"), "Deve exportar uploadImage");
  assert(fileContent.includes("export async function uploadVideo"), "Deve exportar uploadVideo");
  assert(fileContent.includes("export async function uploadAudio"), "Deve exportar uploadAudio");
  assert(fileContent.includes("uploadBytesResumable"), "Deve utilizar uploadBytesResumable");
  assert(fileContent.includes("downloadURL"), "Deve retornar objeto com downloadURL");
  assert(fileContent.includes("fullPath"), "Deve retornar objeto com fullPath");
  assert(fileContent.includes("metadata"), "Deve retornar objeto com metadata");
  assert(fileContent.includes("Reconectando..."), "Deve implementar feedback de reconexão resiliente");
});

// 16. src/services/offline-upload-queue.js: Verificação do fallback IndexedDB
test("16. src/services/offline-upload-queue.js: Fila offline com IndexedDB e status Pendente de envio.", async () => {
  const fileContent = fs.readFileSync("./src/services/offline-upload-queue.js", "utf-8");
  assert(fileContent.includes("indexedDB"), "Deve utilizar IndexedDB");
  assert(fileContent.includes("Pendente de envio."), "Deve definir status 'Pendente de envio.'");
  assert(fileContent.includes("savePendingUpload"), "Deve exportar savePendingUpload");
  assert(fileContent.includes("getPendingUploads"), "Deve exportar getPendingUploads");
  assert(fileContent.includes("processPendingUploads"), "Deve exportar processPendingUploads");
});

// 17. Barra Premium Glass + Glow Azul
test("17. Barra Premium: Glassmorphism, Glow azul, Milestones 0%, 25%, 50%, 75%, 100% e '✓ Upload concluído.'", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  const appJs = fs.readFileSync("./app.js", "utf-8");

  assert(html.includes("backdrop-filter:blur"), "Barra deve ter backdrop-filter blur");
  assert(html.includes("box-shadow"), "Barra deve ter glow/shadow");
  assert(html.includes("milestone-0"), "Deve conter milestone 0%");
  assert(html.includes("milestone-25"), "Deve conter milestone 25%");
  assert(html.includes("milestone-50"), "Deve conter milestone 50%");
  assert(html.includes("milestone-75"), "Deve conter milestone 75%");
  assert(html.includes("milestone-100"), "Deve conter milestone 100%");
  assert(appJs.includes("✓ Upload concluído."), "Ao concluir deve exibir '✓ Upload concluído.'");
});

// 18. Fase 6: Log Real Estruturado (code, message, path, uid, bucket, fileType, fileSize)
test("18. Fase 6: Log Real Estruturado com code, message, path, uid, bucket, fileType e fileSize", () => {
  const serviceContent = fs.readFileSync("./src/services/storage-service.js", "utf-8");
  assert(serviceContent.includes("code: error.code"), "Deve registrar code");
  assert(serviceContent.includes("message: error.message"), "Deve registrar message");
  assert(serviceContent.includes("path: path"), "Deve registrar path");
  assert(serviceContent.includes("uid: currentUid"), "Deve registrar uid");
  assert(serviceContent.includes("bucket:"), "Deve registrar bucket");
  assert(serviceContent.includes("fileType: file?.type"), "Deve registrar fileType");
  assert(serviceContent.includes("fileSize: file?.size"), "Deve registrar fileSize");
});

// 19. Fase 8: Testes de Formatos (Foto JPG, Foto PNG, Vídeo MP4, Áudio MP3, Áudio M4A)
test("19. Fase 8: Validação de formatos JPG, PNG, MP4, MP3 e M4A", async () => {
  const { validateMediaFile } = await import("./src/services/media-upload.js");
  
  // JPG
  const jpgFile = { name: "adoracao.jpg", type: "image/jpeg", size: 1024 * 500 };
  const vJpg = validateMediaFile(jpgFile, "photo");
  assert.strictEqual(vJpg.isValid, true, "JPG deve ser válido");

  // PNG
  const pngFile = { name: "banner.png", type: "image/png", size: 1024 * 800 };
  const vPng = validateMediaFile(pngFile, "photo");
  assert.strictEqual(vPng.isValid, true, "PNG deve ser válido");

  // MP4
  const mp4File = { name: "culto_ao_vivo.mp4", type: "video/mp4", size: 1024 * 1024 * 15 };
  const vMp4 = validateMediaFile(mp4File, "video");
  assert.strictEqual(vMp4.isValid, true, "MP4 deve ser válido");

  // MP3
  const mp3File = { name: "hino_antigo.mp3", type: "audio/mpeg", size: 1024 * 1024 * 5 };
  const vMp3 = validateMediaFile(mp3File, "audio");
  assert.strictEqual(vMp3.isValid, true, "MP3 deve ser válido");

  // M4A
  const m4aFile = { name: "ensaio_vocal.m4a", type: "audio/mp4", size: 1024 * 1024 * 4 };
  const vM4a = validateMediaFile(m4aFile, "audio");
  assert.strictEqual(vM4a.isValid, true, "M4A deve ser válido");
});

console.log("\n====================================================");
console.log(`RESULTADO DOS TESTES: ${passed} PASSOU / ${failed} FALHOU`);
console.log("====================================================");

if (failed > 0) {
  process.exit(1);
}
