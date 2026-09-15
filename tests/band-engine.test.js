// =============================================================
// SUÍTE DE TESTES: VIRTUO BAND ENGINE & BANDA VIRTUAL INTELIGENTE
// tests/band-engine.test.js
// Validação 100% determinística de todas as regras da ETAPA 3/5
// =============================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  VirtuoBandEngine,
  BAND_PRESETS,
  BAND_STYLE_PATTERNS,
  BAND_SECTIONS,
  BandHarmony,
  CultoModeController
} from "../src/audio/index.js";

describe("Virtuo Band Engine - Etapa 3/5", () => {

  describe("1. Preservação de Compatibilidade & Presets V1/V2", () => {
    it("deve conter todos os presets históricos e estruturas de bateria", () => {
      expect(BAND_PRESETS.Worship).toBeDefined();
      expect(BAND_PRESETS.Congregacional).toBeDefined();
      expect(BAND_PRESETS.Pop).toBeDefined();
      expect(BAND_PRESETS.Balada).toBeDefined();
      expect(BAND_PRESETS.Rock).toBeDefined();
      expect(BAND_PRESETS.Corinho).toBeDefined();
      expect(BAND_PRESETS.Lento).toBeDefined();
      expect(BAND_PRESETS["Médio"]).toBeDefined();
      expect(BAND_PRESETS["Rápido"]).toBeDefined();

      // Compatibilidade com aliases minúsculos
      expect(BAND_PRESETS.worship).toBeDefined();
      expect(BAND_PRESETS.pop).toBeDefined();
      expect(BAND_PRESETS.balada).toBeDefined();
      expect(BAND_PRESETS.rock).toBeDefined();

      // Verifica canais da bateria
      expect(Array.isArray(BAND_PRESETS.Worship.kick)).toBe(true);
      expect(Array.isArray(BAND_PRESETS.Worship.snare)).toBe(true);
      expect(Array.isArray(BAND_PRESETS.Worship.hihat)).toBe(true);
    });

    it("deve carregar os padrões estruturais de seções e categorias", () => {
      expect(BAND_STYLE_PATTERNS.Worship).toBeDefined();
      expect(BAND_STYLE_PATTERNS.Pop).toBeDefined();
      expect(BAND_STYLE_PATTERNS.Rock).toBeDefined();
      expect(BAND_STYLE_PATTERNS.Congregacional).toBeDefined();
      expect(BAND_STYLE_PATTERNS.Balada).toBeDefined();
      expect(BAND_STYLE_PATTERNS["4/4 simples"]).toBeDefined();
      expect(BAND_STYLE_PATTERNS["6/8"]).toBeDefined();

      // Todas as 7 seções estruturais
      expect(BAND_SECTIONS.length).toBeGreaterThanOrEqual(7);
      const sectionIds = BAND_SECTIONS.map(s => s.id);
      expect(sectionIds).toContain("intro");
      expect(sectionIds).toContain("verse");
      expect(sectionIds).toContain("pre_chorus");
      expect(sectionIds).toContain("chorus");
      expect(sectionIds).toContain("bridge");
      expect(sectionIds).toContain("spontaneous");
      expect(sectionIds).toContain("outro");
    });
  });

  describe("2. Inteligência Harmônica (BandHarmony)", () => {
    it("deve decompor cifras simples e invertidas corretamente", () => {
      const parsedG = BandHarmony.parseChord("G");
      expect(parsedG.root).toBe("G");
      expect(parsedG.bassNote).toBe("G");
      expect(parsedG.isMinor).toBe(false);

      const parsedAm = BandHarmony.parseChord("Am7");
      expect(parsedAm.root).toBe("A");
      expect(parsedAm.isMinor).toBe(true);
      expect(parsedAm.has7).toBe(true);

      const parsedSlash = BandHarmony.parseChord("D/F#");
      expect(parsedSlash.root).toBe("D");
      expect(parsedSlash.bassNote).toBe("F#"); // Respeita inversão do baixo!
    });

    it("deve calcular frequências de baixo respeitando inversões e harmonia", () => {
      const bassC_step0 = BandHarmony.getBassNoteForStep("C", 0, 8, "Worship", 3);
      const bassC_step4 = BandHarmony.getBassNoteForStep("C", 4, 8, "Worship", 3);
      expect(bassC_step0).toBeGreaterThan(0);
      expect(bassC_step4).toBeGreaterThan(0);
      // O step 4 na intensidade 3 toca a quinta (G)
      expect(bassC_step4).toBeGreaterThan(bassC_step0);

      // Inversão D/F# deve tocar o F# no baixo, não o D!
      const bassD = BandHarmony.getBassNoteForStep("D", 0, 8);
      const bassD_Fsharp = BandHarmony.getBassNoteForStep("D/F#", 0, 8);
      expect(bassD_Fsharp).not.toBe(bassD);
    });

    it("deve gerar voicings para teclado e dedilhados para guitarra", () => {
      const kbFreqs = BandHarmony.getKeyboardFrequencies("C", 4);
      expect(kbFreqs.length).toBeGreaterThanOrEqual(3);
      expect(kbFreqs[1]).toBeGreaterThan(kbFreqs[0]); // Terça maior acima da fundamental
      expect(kbFreqs[2]).toBeGreaterThan(kbFreqs[1]); // Quinta acima da terça

      const gtFreqs = BandHarmony.getGuitarFrequencies("G", 3);
      expect(gtFreqs.length).toBe(4);
    });
  });

  describe("3. Motor da Banda Virtual (VirtuoBandEngine)", () => {
    let engine;

    beforeEach(() => {
      engine = new VirtuoBandEngine();
    });

    it("deve inicializar com o estado correto e 4 canais de áudio", () => {
      const state = engine.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.bpm).toBeGreaterThan(0);
      expect(state.currentPreset).toBe("Worship");
      expect(state.currentSection).toBe("verse");
      expect(state.intensity).toBe(2);

      // 4 Canais: drums, bass, keyboard, guitar
      expect(state.tracks.drums).toBeDefined();
      expect(state.tracks.bass).toBeDefined();
      expect(state.tracks.keyboard).toBeDefined();
      expect(state.tracks.guitar).toBeDefined();
    });

    it("deve controlar reprodução: play, pause e stop", () => {
      engine.start();
      expect(engine.getState().isPlaying).toBe(true);

      engine.pause();
      expect(engine.getState().isPlaying).toBe(false);
      expect(engine.getState().isPaused).toBe(true);

      engine.stop();
      expect(engine.getState().isPlaying).toBe(false);
      expect(engine.getState().isPaused).toBe(false);
      expect(engine.getState().currentStep).toBe(0);
      expect(engine.getState().currentBar).toBe(0);
    });

    it("deve controlar volume, mute e solo por trilha", () => {
      engine.setTrackVolume("drums", 0.5);
      expect(engine.getState().tracks.drums.volume).toBe(0.5);

      engine.toggleTrackMute("drums");
      expect(engine.getState().tracks.drums.muted).toBe(true);

      engine.toggleTrackSolo("bass");
      expect(engine.getState().tracks.bass.solo).toBe(true);
    });

    it("deve permitir ajustar intensidade entre 0 e 5", () => {
      engine.setIntensity(4);
      expect(engine.getState().intensity).toBe(4);

      // Clamping correto
      engine.setIntensity(10);
      expect(engine.getState().intensity).toBe(5);

      engine.setIntensity(-5);
      expect(engine.getState().intensity).toBe(0);
    });

    it("deve suportar agendamento de transição quantizada entre seções", () => {
      engine.start();
      engine.setSection("chorus", true);
      // Quando em reprodução com quantize=true, agenda para o fim do compasso
      expect(engine.getState().nextQueuedSection).toBe("chorus");
      expect(engine.getState().isTransitioning).toBe(true);

      engine.stop();
    });

    it("deve suportar alternância do modo Easy Band", () => {
      expect(engine.getState().isEasyBand).toBe(false);
      engine.toggleEasyBand();
      expect(engine.getState().isEasyBand).toBe(true);
      expect(engine.getState().tracks.keyboard.mode).toBe("pad");
    });

    it("deve suportar geração e aplicação do Virtuo Smart Band", () => {
      const mockSong = {
        title: "Aclame ao Senhor",
        bpm: 78,
        originalKey: "A",
        cifra: "A E F#m D\nAclame ao Senhor toda a terra..."
      };

      const rec = engine.getSmartBandRecommendation(mockSong);
      expect(rec).toBeDefined();
      expect(rec.recommendedStyle).toBe("Worship");
      expect(rec.bpm).toBe(78);
      expect(rec.key).toBe("A");

      engine.applySmartBandRecommendation(mockSong);
      expect(engine.getState().currentKey).toBe("A");
      expect(engine.getState().bpm).toBe(78);
    });

    it("deve suportar controle de Loop e repetições", () => {
      engine.setLoop(true);
      expect(engine.getState().isLooping).toBe(true);

      engine.setLoopRepeatTarget(4);
      expect(engine.getState().loopRepeatTarget).toBe(4);

      engine.toggleLoop();
      expect(engine.getState().isLooping).toBe(false);
    });
  });

  describe("4. Modo Culto (CultoModeController)", () => {
    let controller;

    beforeEach(() => {
      controller = new CultoModeController();
    });

    it("deve gerenciar sequência de louvores com Tom, BPM e Estilo", () => {
      const state = controller.getState();
      expect(state.songs.length).toBeGreaterThan(0);
      expect(state.currentSong).toBeDefined();
      expect(state.currentSong.bpm).toBeDefined();
      expect(state.currentSong.key).toBeDefined();
      expect(state.currentSong.style).toBeDefined();
    });

    it("deve permitir avançar e retroceder louvores na celebração", () => {
      controller.selectSong(0);
      expect(controller.getState().currentIndex).toBe(0);

      const next = controller.nextSong();
      expect(controller.getState().currentIndex).toBe(1);
      expect(next.title).toBe(controller.getState().currentSong.title);

      const prev = controller.previousSong();
      expect(controller.getState().currentIndex).toBe(0);
    });

    it("deve permitir adicionar e remover músicas do setlist", () => {
      const countBefore = controller.getState().songs.length;
      controller.addSong({
        title: "Novo Cântico",
        artist: "Virtuo",
        key: "E",
        bpm: 110,
        style: "Pop",
        intensity: 4
      });
      expect(controller.getState().songs.length).toBe(countBefore + 1);

      controller.removeSong(countBefore);
      expect(controller.getState().songs.length).toBe(countBefore);
    });
  });

});
