// =============================================================
// VIRTUO COMMUNITY CONSTANTS & DATA SHAPES (ETAPA 4/5)
// src/community/community-constants.js
// Definições canônicas de instrumentos, níveis, estilos e categorias
// =============================================================

export const MUSICAL_INSTRUMENTS = [
  { id: "guitarra", name: "Guitarra", icon: "🎸", category: "cordas" },
  { id: "violao", name: "Violão", icon: "🎸", category: "cordas" },
  { id: "baixo", name: "Baixo", icon: "🎸", category: "cordas" },
  { id: "bateria", name: "Bateria", icon: "🥁", category: "percussao" },
  { id: "teclado", name: "Teclado", icon: "🎹", category: "teclas" },
  { id: "vocal", name: "Vocal", icon: "🎤", category: "voz" }
];

export const EXPERIENCE_LEVELS = [
  { id: "iniciante", label: "Iniciante", icon: "🌱", description: "Iniciando nos acordes fundamentais e ritmo" },
  { id: "intermediario", label: "Intermediário", icon: "🌿", description: "Domina transições, pestanas e dinâmica" },
  { id: "avancado", label: "Avançado", icon: "🌳", description: "Improvisação, harmonia funcional e arranjos" },
  { id: "profissional", label: "Profissional", icon: "⭐", description: "Atuação de palco, direção musical e estúdio" }
];

export const MUSICAL_STYLES = [
  { id: "worship", name: "Worship", icon: "🕊️" },
  { id: "gospel", name: "Gospel Tradicional", icon: "⛪" },
  { id: "rock", name: "Rock Cristão", icon: "⚡" },
  { id: "pop", name: "Pop Louvor", icon: "✨" },
  { id: "sertanejo", name: "Sertanejo Gospel", icon: "🌾" },
  { id: "mpb", name: "MPB", icon: "🎶" },
  { id: "outros", name: "Outros Estilos", icon: "🎼" }
];

export const POST_TYPES = [
  { id: "texto", label: "Texto", icon: "💬" },
  { id: "foto", label: "Foto", icon: "📷" },
  { id: "video_externo", label: "Vídeo", icon: "🎬" },
  { id: "cifra", label: "Cifra", icon: "🎵" },
  { id: "musica", label: "Música", icon: "🎧" },
  { id: "performance", label: "Performance", icon: "🎯" },
  { id: "ensaio", label: "Ensaio", icon: "📋" },
  { id: "conquista", label: "Conquista", icon: "🏆" },
  { id: "dica_musical", label: "Dica Musical", icon: "💡" }
];

export const REPORT_REASONS = [
  { id: "spam", label: "Spam ou Propaganda Não Solicitada" },
  { id: "conteudo_inadequado", label: "Conteúdo Inadequado ou Desrespeitoso" },
  { id: "fraude", label: "Fraude ou Tentativa de Golpe" },
  { id: "conteudo_ofensivo", label: "Linguagem Ofensiva ou Discriminação" },
  { id: "direitos_autorais", label: "Violação de Direitos Autorais" },
  { id: "outro", label: "Outro Motivo" }
];

export const BAND_MEMBER_ROLES = [
  { id: "administrador", label: "Administrador / Líder", icon: "👑" },
  { id: "musico", label: "Músico Integrante", icon: "🎸" },
  { id: "convidado", label: "Músico Convidado", icon: "🤝" }
];

export const COLLABORATIVE_REHEARSAL_STATUS = [
  { id: "planejado", label: "Planejado", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  { id: "confirmado", label: "Confirmado", color: "#7EE7FF", bg: "rgba(126,231,255,0.15)" },
  { id: "em_andamento", label: "Em andamento", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  { id: "concluido", label: "Concluído", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  { id: "cancelado", label: "Cancelado", color: "#f87171", bg: "rgba(248,113,113,0.15)" }
];

export const DISCOVER_CATEGORIES = [
  { id: "guitarristas", name: "Guitarristas", icon: "🎸", instrument: "guitarra" },
  { id: "vocais", name: "Vocais", icon: "🎤", instrument: "vocal" },
  { id: "tecladistas", name: "Tecladistas", icon: "🎹", instrument: "teclado" },
  { id: "bateristas", name: "Bateristas", icon: "🥁", instrument: "bateria" },
  { id: "baixistas", name: "Baixistas", icon: "🎸", instrument: "baixo" },
  { id: "compositores", name: "Compositores", icon: "🎼", role: "compositor" },
  { id: "produtores", name: "Produtores", icon: "🎧", role: "produtor" },
  { id: "bandas", name: "Bandas", icon: "🎵", isBand: true }
];
