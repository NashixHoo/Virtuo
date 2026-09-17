// =============================================================
// VIRTUO V2 — MISSIONS CONTROLLER
// src/features/missions/missions-controller.js
// Orquestrador de fluxo pastoral, aprovação do líder, histórico e cálculo de progresso
// =============================================================

import { missionsRepository } from "./missions-repository.js";
import { notificationsService, NOTIFICATION_TYPES } from "../notifications/notifications-service.js";
import { momentsService } from "../moments/moments-service.js";
import { liveSyncController } from "../live-sync/live-sync-controller.js";
import { HorizonWaveManager } from "../../design/horizon-wave.js";
import { virtuoConductor } from "../../audio/virtuo-conductor.js";

class MissionsController {
  constructor() {
    this.activeMission = null;
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const l of this._listeners) {
      try { l(this.activeMission); } catch {}
    }
  }

  async getAllMissions() {
    return await missionsRepository.getAll();
  }

  async getMissionById(id) {
    const mission = await missionsRepository.getById(id);
    if (mission && (!this.activeMission || this.activeMission.id === id)) {
      this.activeMission = mission;
    }
    return mission;
  }

  /**
   * Calcula o progresso quantitativo e qualitativo das músicas da missão
   * Indicadores: 🟢 Pronto (100%), 🟡 Estudando (50%), 🔴 Não iniciou (0%)
   */
  calculateProgress(songs = []) {
    const totalSongs = songs.length;
    if (totalSongs === 0) {
      return { totalSongs: 0, readySongs: 0, studyingSongs: 0, unstartedSongs: 0, overallPercentage: 0 };
    }

    let readySongs = 0;
    let studyingSongs = 0;
    let unstartedSongs = 0;

    for (const s of songs) {
      if (s.status === "ready") readySongs++;
      else if (s.status === "studying") studyingSongs++;
      else unstartedSongs++;
    }

    // Ponderação: ready = 1.0, studying = 0.5, unstarted = 0
    const score = (readySongs * 1.0) + (studyingSongs * 0.5);
    const overallPercentage = Math.round((score / totalSongs) * 100);

    return {
      totalSongs,
      readySongs,
      studyingSongs,
      unstartedSongs,
      overallPercentage
    };
  }

  /**
   * 1. CRIAÇÃO DA MISSÃO (Pastor / Regente)
   * Status inicial: "pending" (enviada para o Líder Musical)
   */
  async createMission({
    title,
    description = "",
    churchName = "Igreja Local",
    eventType = "culto",
    eventDate,
    pastorId = "pastor-current",
    pastorName = "Pastor",
    leaderId = "leader-current",
    leaderName = "Líder Musical",
    songs = [],
    members = []
  }) {
    const now = new Date().toISOString();
    const id = `mission-${Date.now()}`;

    const formattedSongs = songs.map((s, idx) => ({
      id: s.id || `song-${idx}`,
      title: s.title || "Louvor",
      artist: s.artist || "Artista",
      key: s.key || s.originalKey || "C",
      bpm: Number(s.bpm) || 70,
      easyPlay: Boolean(s.easyPlay),
      order: idx + 1,
      status: s.status || "unstarted"
    }));

    const progress = this.calculateProgress(formattedSongs);

    const newMission = {
      id,
      title: title.trim(),
      description: description.trim(),
      churchName: churchName.trim(),
      eventType,
      eventDate: eventDate || now,
      pastorId,
      pastorName,
      leaderId,
      leaderName,
      status: "pending", // Enviada ao líder
      currentSongId: formattedSongs[0]?.id || null,
      currentKey: formattedSongs[0]?.key || "C",
      currentBpm: formattedSongs[0]?.bpm || 70,
      isEasyPlay: Boolean(formattedSongs[0]?.easyPlay),
      currentSection: "Intro",
      members: members.length > 0 ? members : [
        { uid: pastorId, name: pastorName, role: "Pastor", instrument: "Palavra", checkedIn: true, isTuned: true, returnWorking: true },
        { uid: leaderId, name: leaderName, role: "Líder Musical", instrument: "Violão", checkedIn: false, isTuned: false, returnWorking: false }
      ],
      songs: formattedSongs,
      approvals: {
        pastorApproved: true,
        leaderApproved: false,
        leaderNotes: "",
        approvedAt: null,
        returnedAt: null
      },
      progress,
      history: [
        {
          type: "created",
          title: "Missão criada",
          author: pastorName,
          timestamp: now,
          details: `Agendada para ${new Date(eventDate || now).toLocaleDateString('pt-BR')}`
        },
        {
          type: "sent_to_leader",
          title: "Enviada ao Líder Musical",
          author: pastorName,
          timestamp: now,
          details: "Aguardando aprovação de repertório e tonalidades"
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    const saved = await missionsRepository.save(newMission);
    this.activeMission = saved;

    // Dispara notificação interna para a equipe
    notificationsService.add({
      type: NOTIFICATION_TYPES.NEW_MISSION,
      title: `Nova Missão: ${saved.title}`,
      message: `${pastorName} agendou uma nova missão para ${new Date(saved.eventDate).toLocaleDateString('pt-BR')}.`,
      missionId: saved.id
    });

    this._notify();
    return saved;
  }

  /**
   * 2. APROVAÇÃO DO LÍDER MUSICAL
   * Somente após aprovação o status vira "approved" e a banda recebe oficialmente.
   */
  async approveMission(missionId, { leaderNotes = "", updatedSongs = null, leaderName = "Líder Musical" } = {}) {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");

    const now = new Date().toISOString();
    const songs = updatedSongs || mission.songs;
    const progress = this.calculateProgress(songs);

    const updated = {
      ...mission,
      status: "approved",
      songs,
      approvals: {
        ...mission.approvals,
        leaderApproved: true,
        leaderNotes: leaderNotes || "Repertório e tonalidades aprovados.",
        approvedAt: now
      },
      progress,
      history: [
        ...(mission.history || []),
        {
          type: "approved",
          title: "Aprovada pelo Líder Musical",
          author: leaderName,
          timestamp: now,
          details: leaderNotes || "Escala e repertório validados para o culto"
        }
      ],
      updatedAt: now
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;

    // Notifica banda
    notificationsService.add({
      type: NOTIFICATION_TYPES.REPERTOIRE_CHANGED,
      title: `Repertório Aprovado: ${saved.title}`,
      message: `${leaderName} aprovou os louvores e tonalidades. A banda já pode estudar!`,
      missionId: saved.id
    });

    this._notify();
    return saved;
  }

  /**
   * 3. DEVOLUÇÃO DO LÍDER MUSICAL
   * Caso haja ajustes necessários antes de liberar para a banda
   */
  async returnMission(missionId, { leaderNotes = "Ajustar louvores da escala.", leaderName = "Líder Musical" } = {}) {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");

    const now = new Date().toISOString();
    const updated = {
      ...mission,
      status: "draft",
      approvals: {
        ...mission.approvals,
        leaderApproved: false,
        leaderNotes,
        returnedAt: now
      },
      history: [
        ...(mission.history || []),
        {
          type: "returned",
          title: "Devolvida pelo Líder Musical",
          author: leaderName,
          timestamp: now,
          details: leaderNotes
        }
      ],
      updatedAt: now
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;

    notificationsService.add({
      type: NOTIFICATION_TYPES.REPERTOIRE_CHANGED,
      title: `Missão em Revisão: ${saved.title}`,
      message: `${leaderName} solicitou ajustes no repertório: ${leaderNotes}`,
      missionId: saved.id
    });

    this._notify();
    return saved;
  }

  /**
   * 4. INICIAR MINISTRAÇÃO (Status "active" & Conecta Live Sync)
   */
  async startMission(missionId, initiatorName = "Líder Musical") {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");

    const now = new Date().toISOString();
    const updated = {
      ...mission,
      status: "active",
      history: [
        ...(mission.history || []),
        {
          type: "started",
          title: "Missão Iniciada no Altar",
          author: initiatorName,
          timestamp: now,
          details: "Banda em execução sincronizada com Live Sync"
        }
      ],
      updatedAt: now
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;

    // Conecta Live Sync da missão ativa
    liveSyncController.startMissionSync(saved);

    notificationsService.add({
      type: NOTIFICATION_TYPES.MISSION_STARTED,
      title: `Culto Iniciado: ${saved.title}`,
      message: `A ministração está ao vivo! Sincronização de palco conectada.`,
      missionId: saved.id
    });

    this._notify();
    return saved;
  }

  /**
   * 5. CONCLUIR MINISTRAÇÃO (Status "completed" & Desbloqueia Virtuo Moments)
   */
  async completeMission(missionId, finisherName = "Líder Musical") {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");

    const now = new Date().toISOString();
    const updated = {
      ...mission,
      status: "completed",
      history: [
        ...(mission.history || []),
        {
          type: "completed",
          title: "Missão Concluída com Sucesso",
          author: finisherName,
          timestamp: now,
          details: `Louvor consagrado com ${mission.songs?.length || 0} canções`
        }
      ],
      updatedAt: now
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;

    // Desbloqueia automaticamente o Virtuo Moment: Primeira Ministração!
    const moment = momentsService.unlockMoment("primeira_ministracao", {
      missionId: saved.id,
      churchName: saved.churchName,
      date: saved.eventDate,
      songs: saved.songs,
      leaderName: saved.leaderName
    });

    // Recompensa visual: flash dourado discreto de celebração
    HorizonWaveManager.triggerMissionGold();
    virtuoConductor.emit("MISSION_COMPLETED", { mission: saved });

    this._notify();
    return { saved, moment };
  }

  /**
   * Atualiza status de estudo de uma música (🟢 pronto, 🟡 estudando, 🔴 não iniciou)
   */
  async setSongStudyStatus(missionId, songId, status) {
    const mission = await this.getMissionById(missionId);
    if (!mission) return;

    const songs = mission.songs.map(s => {
      if (s.id === songId) return { ...s, status };
      return s;
    });

    const progress = this.calculateProgress(songs);
    const updated = {
      ...mission,
      songs,
      progress,
      updatedAt: new Date().toISOString()
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;
    this._notify();
    return saved;
  }

  /**
   * Atualiza tom, BPM e Easy Play de uma música na missão
   */
  async updateSongMusicalParameters(missionId, songId, { key, bpm, easyPlay }, authorName = "Líder Musical") {
    const mission = await this.getMissionById(missionId);
    if (!mission) return;

    const now = new Date().toISOString();
    const historyEntry = [];

    const songs = mission.songs.map(s => {
      if (s.id === songId) {
        if (key && key !== s.key) {
          historyEntry.push({
            type: "key_changed",
            title: `Troca de Tom: ${s.title}`,
            author: authorName,
            timestamp: now,
            details: `Tom alterado de ${s.key} para ${key}`
          });
        }
        if (bpm && bpm !== s.bpm) {
          historyEntry.push({
            type: "bpm_changed",
            title: `Troca de BPM: ${s.title}`,
            author: authorName,
            timestamp: now,
            details: `BPM ajustado de ${s.bpm} para ${bpm}`
          });
        }
        return {
          ...s,
          key: key || s.key,
          bpm: Number(bpm) || s.bpm,
          easyPlay: easyPlay !== undefined ? Boolean(easyPlay) : s.easyPlay
        };
      }
      return s;
    });

    const updated = {
      ...mission,
      songs,
      currentKey: (mission.currentSongId === songId && key) ? key : mission.currentKey,
      currentBpm: (mission.currentSongId === songId && bpm) ? bpm : mission.currentBpm,
      history: [...(mission.history || []), ...historyEntry],
      updatedAt: now
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;
    this._notify();
    return saved;
  }

  /**
   * Registra Check-In (Virtuo Confirm) de um membro
   */
  async submitCheckIn(missionId, { uid, name, instrument, checkedIn, isTuned, returnWorking }) {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");

    const members = [...(mission.members || [])];
    const index = members.findIndex(m => m.uid === uid);

    const record = {
      uid,
      name,
      instrument,
      checkedIn: Boolean(checkedIn),
      isTuned: Boolean(isTuned),
      returnWorking: Boolean(returnWorking),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      members[index] = { ...members[index], ...record };
    } else {
      members.push(record);
    }

    const updated = {
      ...mission,
      members,
      updatedAt: new Date().toISOString()
    };

    const saved = await missionsRepository.save(updated);
    this.activeMission = saved;

    notificationsService.add({
      type: NOTIFICATION_TYPES.CHECKIN_ALERT,
      title: `Check-in: ${name}`,
      message: `${name} (${instrument}) confirmou presença para o culto.`,
      missionId
    });

    // Recompensa visual e notificação do Conductor
    HorizonWaveManager.triggerMissionGold();
    virtuoConductor.notifyCheckInCompleted({ uid, name, instrument });

    this._notify();
    return saved;
  }

  /**
   * Transporta a missão aprovada para o Modo Ensaio de forma integrada
   * Requisito 13: Transporta músicas, tom, BPM, Easy Play, ordem do repertório e seções
   */
  async openRehearsal(missionId, userUid = null) {
    const mission = await this.getMissionById(missionId);
    if (!mission) throw new Error("Missão não encontrada");
    const { rehearsalController } = await import("../rehearsal/rehearsal-controller.js");
    return await rehearsalController.openOrCreateRehearsalForMission(mission, userUid);
  }
}

export const missionsController = new MissionsController();
