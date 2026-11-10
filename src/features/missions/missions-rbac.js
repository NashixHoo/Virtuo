// =============================================================
// VIRTUO V2 — RBAC DAS MISSÕES
// src/features/missions/missions-rbac.js
// Controle de Acesso Baseado em Papéis: Owner, Admin, Pastor, Regente, Líder Musical, Músico
// =============================================================

export const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PASTOR: "Pastor",
  REGENTE: "Regente",
  LIDER: "Líder Musical",
  MUSICO: "Músico"
};

/**
 * Normaliza string de papel para o padrão canônico
 * @param {string} role 
 * @returns {string}
 */
export function normalizeRole(role) {
  if (!role || typeof role !== "string") return ROLES.MUSICO;
  const clean = role.trim().toLowerCase();
  if (clean === "owner") return ROLES.OWNER;
  if (clean === "admin") return ROLES.ADMIN;
  if (clean === "pastor") return ROLES.PASTOR;
  if (clean === "regente") return ROLES.REGENTE;
  if (clean === "líder musical" || clean === "lider musical" || clean === "lider" || clean === "líder") return ROLES.LIDER;
  return ROLES.MUSICO;
}

/**
 * Determina o papel do usuário no contexto da missão
 * @param {Object} user - Usuário atual { uid, role, ... }
 * @param {Object} mission - Missão atual { pastorId, leaderId, members: [] }
 * @returns {string} Papel canônico
 */
export function getUserRoleInMission(user, mission) {
  if (!user || !user.uid) return ROLES.MUSICO;
  
  // Owner / Admin global
  if (user.role === "admin" || user.isAdmin || user.role === "Owner") {
    return ROLES.ADMIN;
  }

  if (!mission) {
    return normalizeRole(user.role || ROLES.MUSICO);
  }

  if (mission.pastorId === user.uid) return ROLES.PASTOR;
  if (mission.leaderId === user.uid) return ROLES.LIDER;

  if (Array.isArray(mission.members)) {
    const member = mission.members.find(m => (m.uid === user.uid || m.id === user.uid));
    if (member && member.role) {
      return normalizeRole(member.role);
    }
  }

  return normalizeRole(user.role || ROLES.MUSICO);
}

/**
 * Verifica se usuário pode criar uma nova missão (Pastor, Regente, Líder, Admin)
 */
export function canCreateMission(userRole) {
  const role = normalizeRole(userRole);
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.PASTOR, ROLES.REGENTE, ROLES.LIDER].includes(role);
}

/**
 * Verifica se usuário pode editar a missão estruturalmente (Regente, Pastor, Admin, Líder)
 */
export function canEditMission(userRole) {
  const role = normalizeRole(userRole);
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.PASTOR, ROLES.REGENTE, ROLES.LIDER].includes(role);
}

/**
 * Verifica se usuário pode aprovar ou devolver a missão (Líder Musical, Admin, Pastor)
 */
export function canApproveMission(userRole) {
  const role = normalizeRole(userRole);
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.LIDER].includes(role);
}

/**
 * Verifica se usuário pode alterar tom, BPM ou Easy Play em tempo real (Líder Musical, Admin)
 */
export function canChangeMusicalParams(userRole) {
  const role = normalizeRole(userRole);
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.LIDER].includes(role);
}

/**
 * Verifica se usuário pode iniciar ou encerrar o Live Sync / Modo Palco da missão
 */
export function canStartLiveSync(userRole) {
  const role = normalizeRole(userRole);
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.LIDER, ROLES.PASTOR, ROLES.REGENTE].includes(role);
}

/**
 * Verifica se usuário pode realizar Check-in (Virtuo Confirm)
 */
export function canCheckIn(userRole) {
  return true; // Todos os membros podem confirmar presença
}

/**
 * Verifica se usuário pode acompanhar a ministração
 */
export function canFollowLive(userRole) {
  return true; // Todos os músicos podem acompanhar a tela sincronizada
}
