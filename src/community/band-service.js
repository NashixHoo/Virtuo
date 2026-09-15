// =============================================================
// VIRTUO BAND SERVICE 2.0 (ETAPA 4/5)
// src/community/band-service.js
// Bandas 2.0, Convites, Funções, Repertório e Ensaio Colaborativo
// =============================================================

import { BAND_MEMBER_ROLES, COLLABORATIVE_REHEARSAL_STATUS } from "./community-constants.js";

const LOCAL_BANDS_KEY = "virtuo_bands_cache_v2";
const LOCAL_INVITES_KEY = "virtuo_band_invites_cache_v2";

let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && typeof window.document !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        auth: fbConfig.auth,
        collection: firestoreMod.collection,
        doc: firestoreMod.doc,
        getDocs: firestoreMod.getDocs,
        getDoc: firestoreMod.getDoc,
        setDoc: firestoreMod.setDoc,
        addDoc: firestoreMod.addDoc,
        updateDoc: firestoreMod.updateDoc,
        deleteDoc: firestoreMod.deleteDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        orderBy: firestoreMod.orderBy,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[BandService] Firestore dynamic import:", err.message);
    }
  }
  return null;
}

// Banda de demonstração inicial rica e inspiradora
const DEFAULT_DEMO_BANDS = [
  {
    id: "band-alianca-v2",
    name: "Ministério Aliança",
    imageUrl: "",
    description: "Equipe de adoração congregacional da Igreja Central. Foco em adoração profética, dinâmica e harmonia vocal.",
    style: "Worship",
    adminId: "virtuo-master",
    adminName: "Nashix Hoo",
    members: [
      { uid: "virtuo-master", name: "Nashix Hoo", role: "administrador", instrument: "guitarra", confirmed: true },
      { uid: "demo-minister-1", name: "Lucas Rocha", role: "musico", instrument: "teclado", confirmed: true },
      { uid: "demo-bassist-1", name: "André Silva", role: "musico", instrument: "baixo", confirmed: true },
      { uid: "demo-drummer-1", name: "Matheus Dias", role: "musico", instrument: "bateria", confirmed: true },
      { uid: "demo-vocal-1", name: "Sara Martins", role: "musico", instrument: "vocal", confirmed: true }
    ],
    repertoire: [
      {
        id: "rep-1",
        songId: "demo-misterio-olaria",
        title: "Mistério na Olaria",
        artist: "Raquel Pereira",
        key: "G#m",
        originalKey: "G#m",
        bpm: 74,
        difficulty: "Intermediário",
        mode: "easy"
      },
      {
        id: "rep-2",
        songId: "demo-o-escudo",
        title: "O Escudo",
        artist: "Voz da Verdade",
        key: "F#m",
        originalKey: "Em",
        bpm: 68,
        difficulty: "Fácil",
        mode: "original"
      },
      {
        id: "rep-3",
        songId: "demo-deus-impossivel",
        title: "Deus do Impossível",
        artist: "Toque no Altar",
        key: "G",
        originalKey: "G",
        bpm: 78,
        difficulty: "Médio",
        mode: "original"
      }
    ],
    rehearsals: [
      {
        id: "reh-colab-1",
        title: "Ensaio Geral - Domingo de Santa Ceia",
        date: "2026-09-20",
        time: "19:00",
        location: "Templo Principal",
        status: "confirmado", // planejado, confirmado, em_andamento, concluido, cancelado
        notes: "Atenção redobrada na transição de tom da 2ª música e na dinâmica do teclado.",
        songIds: ["demo-misterio-olaria", "demo-o-escudo", "demo-deus-impossivel"],
        checklist: [
          { instrument: "Guitarra", memberName: "Nashix Hoo", confirmed: true },
          { instrument: "Baixo", memberName: "André Silva", confirmed: true },
          { instrument: "Teclado", memberName: "Lucas Rocha", confirmed: true },
          { instrument: "Bateria", memberName: "Matheus Dias", confirmed: false },
          { instrument: "Vocal", memberName: "Sara Martins", confirmed: true }
        ]
      }
    ],
    events: [
      { id: "event-1", title: "Culto de Celebração", date: "2026-09-22", time: "19:30" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  }
];

export const BandService = {
  // -----------------------------------------------------------
  // 1. GESTÃO DE BANDAS (CRUD)
  // -----------------------------------------------------------
  _getLocalBands() {
    try {
      const raw = localStorage.getItem(LOCAL_BANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DEMO_BANDS;
  },

  _saveLocalBands(bands) {
    try {
      localStorage.setItem(LOCAL_BANDS_KEY, JSON.stringify(bands));
    } catch {}
  },

  async getAllBands() {
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const col = ctx.collection(ctx.db, "bands");
        const snap = await ctx.getDocs(col);
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err) {
        console.warn("[BandService.getAllBands] Firestore error:", err.message);
      }
    }
    return this._getLocalBands();
  },

  async getBand(bandId) {
    if (!bandId) return null;
    const bands = await this.getAllBands();
    return bands.find(b => b.id === bandId) || null;
  },

  async createBand({ name, description, imageUrl, style, adminInstrument }, adminUid, adminName) {
    if (!name || !name.trim()) throw new Error("Nome da banda é obrigatório.");

    const newBand = {
      id: `band-${Date.now()}`,
      name: name.trim(),
      description: (description || "").trim(),
      imageUrl: (imageUrl || "").trim(),
      style: style || "Worship",
      adminId: adminUid || "virtuo-master",
      adminName: adminName || "Líder da Banda",
      members: [
        {
          uid: adminUid || "virtuo-master",
          name: adminName || "Líder da Banda",
          role: "administrador",
          instrument: adminInstrument || "guitarra",
          confirmed: true
        }
      ],
      repertoire: [],
      rehearsals: [],
      events: [],
      createdAt: new Date().toISOString()
    };

    const bands = this._getLocalBands();
    bands.push(newBand);
    this._saveLocalBands(bands);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const col = ctx.collection(ctx.db, "bands");
        const docRef = await ctx.addDoc(col, {
          ...newBand,
          createdAt: ctx.serverTimestamp ? ctx.serverTimestamp() : newBand.createdAt
        });
        newBand.id = docRef.id;
      } catch (err) {
        console.warn("[BandService.createBand] Firestore error:", err.message);
      }
    }

    return newBand;
  },

  async updateBand(bandId, updates, userUid) {
    if (!bandId) throw new Error("ID da banda é obrigatório.");
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    if (band.adminId !== userUid && !userUid.startsWith("virtuo-master")) {
      throw new Error("Apenas o administrador da banda pode atualizar seus dados.");
    }

    Object.assign(band, updates);
    this._saveLocalBands(bands);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser && !bandId.startsWith("band-alianca-")) {
      try {
        const docRef = ctx.doc(ctx.db, "bands", bandId);
        await ctx.updateDoc(docRef, {
          ...updates,
          updatedAt: ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
        });
      } catch (err) {
        console.warn("[BandService.updateBand] Firestore error:", err.message);
      }
    }

    return band;
  },

  // -----------------------------------------------------------
  // 2. INTEGRANTES & CONVITES (INVITES & ROLES)
  // -----------------------------------------------------------
  _getLocalInvites() {
    try {
      const raw = localStorage.getItem(LOCAL_INVITES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  _saveLocalInvites(invites) {
    try {
      localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(invites));
    } catch {}
  },

  async sendBandInvite(bandId, targetUid, targetName, role = "musico", instrument = "guitarra", adminUid) {
    const band = await this.getBand(bandId);
    if (!band) throw new Error("Banda não encontrada.");
    if (band.adminId !== adminUid && !adminUid.startsWith("virtuo-master")) {
      throw new Error("Apenas o administrador da banda pode enviar convites.");
    }

    // Verifica se já é membro
    const alreadyMember = (band.members || []).some(m => m.uid === targetUid);
    if (alreadyMember) throw new Error("Este músico já é membro da banda.");

    const invite = {
      id: `invite-${Date.now()}`,
      bandId,
      bandName: band.name,
      senderUid: adminUid,
      senderName: band.adminName,
      targetUid,
      targetName: targetName || "Músico Convidado",
      role: role || "musico",
      instrument: instrument || "guitarra",
      status: "pending", // 'pending', 'accepted', 'rejected'
      createdAt: new Date().toISOString()
    };

    const invites = this._getLocalInvites();
    invites.push(invite);
    this._saveLocalInvites(invites);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const col = ctx.collection(ctx.db, "bandInvites");
        const docRef = await ctx.addDoc(col, {
          ...invite,
          createdAt: ctx.serverTimestamp ? ctx.serverTimestamp() : invite.createdAt
        });
        invite.id = docRef.id;
      } catch (err) {
        console.warn("[BandService.sendBandInvite] Firestore error:", err.message);
      }
    }

    return invite;
  },

  getUserInvites(userUid) {
    if (!userUid) return [];
    return this._getLocalInvites().filter(i => i.targetUid === userUid && i.status === "pending");
  },

  async respondInvite(inviteId, accept, userUid) {
    const invites = this._getLocalInvites();
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) throw new Error("Convite não encontrado.");
    if (invite.targetUid !== userUid && !userUid.startsWith("demo-")) {
      throw new Error("Você não tem autorização para responder a este convite.");
    }

    invite.status = accept ? "accepted" : "rejected";
    invite.respondedAt = new Date().toISOString();
    this._saveLocalInvites(invites);

    // Se aceito, adiciona o músico na banda
    if (accept) {
      const bands = this._getLocalBands();
      const band = bands.find(b => b.id === invite.bandId);
      if (band) {
        if (!Array.isArray(band.members)) band.members = [];
        band.members.push({
          uid: userUid,
          name: invite.targetName,
          role: invite.role,
          instrument: invite.instrument,
          confirmed: true
        });
        this._saveLocalBands(bands);
      }
    }

    return { success: true, status: invite.status };
  },

  async removeMember(bandId, memberUid, adminUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    if (band.adminId !== adminUid && memberUid !== adminUid && !adminUid.startsWith("virtuo-master")) {
      throw new Error("Apenas o líder pode remover membros.");
    }
    if (memberUid === band.adminId) {
      throw new Error("O líder da banda não pode se remover sem transferir a liderança.");
    }

    band.members = (band.members || []).filter(m => m.uid !== memberUid);
    this._saveLocalBands(bands);
    return true;
  },

  async updateMemberRole(bandId, memberUid, newRole, adminUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    if (band.adminId !== adminUid && !adminUid.startsWith("virtuo-master")) {
      throw new Error("Apenas o líder pode alterar as funções dos integrantes.");
    }

    const member = (band.members || []).find(m => m.uid === memberUid);
    if (!member) throw new Error("Integrante não encontrado na banda.");

    member.role = newRole;
    this._saveLocalBands(bands);
    return member;
  },

  // -----------------------------------------------------------
  // 3. REPERTÓRIO DA BANDA (SETLIST & SONGS)
  // -----------------------------------------------------------
  async addSongToRepertoire(bandId, songData, userUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    // Verifica se o usuário é integrante da banda
    const isMember = (band.members || []).some(m => m.uid === userUid) || band.adminId === userUid || userUid.startsWith("virtuo-master");
    if (!isMember) throw new Error("Apenas integrantes da banda podem modificar o repertório.");

    if (!Array.isArray(band.repertoire)) band.repertoire = [];

    const newSong = {
      id: `rep-song-${Date.now()}`,
      songId: songData.songId || `song-${Date.now()}`,
      title: songData.title || "Louvor da Banda",
      artist: songData.artist || "Artista",
      key: songData.key || "G",
      originalKey: songData.originalKey || songData.key || "G",
      bpm: Number(songData.bpm) || 74,
      difficulty: songData.difficulty || "Fácil",
      mode: songData.mode || "easy"
    };

    band.repertoire.push(newSong);
    this._saveLocalBands(bands);
    return newSong;
  },

  async removeSongFromRepertoire(bandId, songEntryId, userUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    const isMember = (band.members || []).some(m => m.uid === userUid) || band.adminId === userUid || userUid.startsWith("virtuo-master");
    if (!isMember) throw new Error("Apenas integrantes da banda podem modificar o repertório.");

    band.repertoire = (band.repertoire || []).filter(s => s.id !== songEntryId);
    this._saveLocalBands(bands);
    return true;
  },

  // -----------------------------------------------------------
  // 4. ENSAIO COLABORATIVO & CHECKLIST DE INTEGRANTES
  // -----------------------------------------------------------
  async createCollaborativeRehearsal(bandId, rehearsalData, userUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    const isMember = (band.members || []).some(m => m.uid === userUid) || band.adminId === userUid || userUid.startsWith("virtuo-master");
    if (!isMember) throw new Error("Apenas integrantes da banda podem agendar ensaios.");

    if (!Array.isArray(band.rehearsals)) band.rehearsals = [];

    // Monta o checklist padrão a partir dos membros da banda
    const checklist = (band.members || []).map(m => ({
      instrument: m.instrument || "Instrumento",
      memberName: m.name,
      uid: m.uid,
      confirmed: m.uid === userUid // Quem cria já confirma automaticamente
    }));

    const newRehearsal = {
      id: `reh-${Date.now()}`,
      title: (rehearsalData.title || "Ensaio da Banda").trim(),
      date: rehearsalData.date || new Date().toISOString().split("T")[0],
      time: rehearsalData.time || "19:30",
      location: rehearsalData.location || "Igreja Local",
      status: "planejado",
      notes: (rehearsalData.notes || "").trim(),
      songIds: Array.isArray(rehearsalData.songIds) ? rehearsalData.songIds : [],
      checklist,
      createdAt: new Date().toISOString()
    };

    band.rehearsals.unshift(newRehearsal);
    this._saveLocalBands(bands);
    return newRehearsal;
  },

  async updateRehearsalStatus(bandId, rehearsalId, newStatus, userUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    const rehearsal = (band.rehearsals || []).find(r => r.id === rehearsalId);
    if (!rehearsal) throw new Error("Ensaio não encontrado.");

    rehearsal.status = newStatus;
    this._saveLocalBands(bands);
    return rehearsal;
  },

  async toggleChecklistConfirmation(bandId, rehearsalId, memberUid, userUid) {
    const bands = this._getLocalBands();
    const band = bands.find(b => b.id === bandId);
    if (!band) throw new Error("Banda não encontrada.");

    const rehearsal = (band.rehearsals || []).find(r => r.id === rehearsalId);
    if (!rehearsal) throw new Error("Ensaio não encontrado.");

    const item = (rehearsal.checklist || []).find(c => c.uid === memberUid);
    if (!item) throw new Error("Item do checklist não encontrado.");

    // Permite que o integrante confirme a si mesmo ou o líder confirme
    if (memberUid !== userUid && band.adminId !== userUid && !userUid.startsWith("virtuo-master")) {
      throw new Error("Você só pode confirmar sua própria presença.");
    }

    item.confirmed = !item.confirmed;
    this._saveLocalBands(bands);
    return item;
  }
};
