// =============================================================
// VIRTUO CANONICAL SONGS REPOSITORY
// src/music/demo-songs.js
// Biblioteca musical canônica com a canção de teste oficial
// =============================================================

import { SongNormalizer } from "../database/normalizer.js";
import { SONG_STATUS, SONG_VISIBILITY, LYRICS_STATUS, SOURCE_TYPES } from "../database/schema.js";

const FIDELIDADE_CHORD_SHEET = `[Intro]

Am  F  C  G
Am  F  C  G
Am

[Primeira Parte]

Am
Oh! Deus de Israel eu sei
F                            G
Que não vim a este mundo pra adorar outro Rei
Am                     F
Os leões estão rugindo sem parar
G
Meu louvor incomodou
  Dm7                  Em           Am
A todos que são contra Ti oh! Jeová

[Segunda Parte]

Am
Nada pode intercalar
  F
O louvor do meu coração
  G
Dos manjares eu abro mão
  Dm7         Em   G  Am
Os palácios não quero, não
C
Eis-me aqui como Daniel
    F
Com os olhos focados no céu
F
Com o risco de morrer
       Dm7            E
Pois o que importa é Lhe obedecer

(Dm7  C  G/B  Am)

[Refrão]

  Am       F             C
Senhor não vou dividir minha adoração
  G                Am
Exclusivo é o meu coração
      F             C
Vivo só pra Ti não abro mão do céu
    G               E7            Am
Até diante da morte prefiro ser fiel

(Am  F  C  G)

[Segunda Parte — repetição]

Am
Nada pode intercalar
  F
O louvor do meu coração
  G
Dos manjares eu abro mão
  Dm7         Em   G  Am
Os palácios não quero, não
C
Eis-me aqui como Daniel
    F
Com os olhos focados no céu
F
Com o risco de morrer
       Dm7            E
Pois o que importa é Lhe obedecer

(Dm7  C  G/B)

[Refrão — repetição]

  Am       F             C
Senhor não vou dividir minha adoração
  G                Am
Exclusivo é o meu coração
      F             C
Vivo só pra Ti não abro mão do céu
    G               E7            Am
Até diante da morte prefiro ser fiel

(G/B  C  Dm7  Em)

(F  G  Dm7  E)

[Ponte]

Am
Aquele que habita no esconderijo do Altíssimo
  G/B
À sombra do Onipotente descansará
Dm7
Direi do Senhor Ele é o meu Deus
E
O meu refúgio a minha fortaleza
Am
Ele me livra do laço do passarinheiro
  G/B
E da peste perniciosa
Dm7
Ele me cobre com Suas penas
  E7
E debaixo de Suas asas estarei seguro
F
Eu não temo o espanto noturno
Dm7
Nem seta que voe de dia
Am
Nem peste que ande na escuridão
G
Nem mortandade que assole ao meio dia
Dm7
Não importa quantos caiam do meu lado
C
Direita, esquerda eu sou protegido
      F              G
Se eu for fiel eu moverei o céu
     G                 Am
Ele envia anjos para me guardar

[Refrão]

  Am       F             C
Senhor não vou dividir minha adoração
  G                Am
Exclusivo é o meu coração
      F             C
Vivo só pra Ti não abro mão do céu
    G               E7            Am
Até diante da morte prefiro ser fiel

[Refrão — final]

  Am       F             C
Senhor não vou dividir minha adoração
  G                Am
Exclusivo é o meu coração
      F             C
Vivo só pra Ti não abro mão do céu
    G               E7            Am
Até diante da morte prefiro ser fiel

[Final]

F  C  G  Em  Am`;

const FIDELIDADE_LYRICS = `Oh! Deus de Israel eu sei
Que não vim a este mundo pra adorar outro Rei
Os leões estão rugindo sem parar
Meu louvor incomodou
A todos que são contra Ti oh! Jeová

Nada pode intercalar
O louvor do meu coração
Dos manjares eu abro mão
Os palácios não quero, não
Eis-me aqui como Daniel
Com os olhos focados no céu
Com o risco de morrer
Pois o que importa é Lhe obedecer

Senhor não vou dividir minha adoração
Exclusivo é o meu coração
Vivo só pra Ti não abro mão do céu
Até diante da morte prefiro ser fiel

Nada pode intercalar
O louvor do meu coração
Dos manjares eu abro mão
Os palácios não quero, não
Eis-me aqui como Daniel
Com os olhos focados no céu
Com o risco de morrer
Pois o que importa é Lhe obedecer

Senhor não vou dividir minha adoração
Exclusivo é o meu coração
Vivo só pra Ti não abro mão do céu
Até diante da morte prefiro ser fiel

Aquele que habita no esconderijo do Altíssimo
À sombra do Onipotente descansará
Direi do Senhor Ele é o meu Deus
O meu refúgio a minha fortaleza
Ele me livra do laço do passarinheiro
E da peste perniciosa
Ele me cobre com Suas penas
E debaixo de Suas asas estarei seguro
Eu não temo o espanto noturno
Nem seta que voe de dia
Nem peste que ande na escuridão
Nem mortandade que assole ao meio dia
Não importa quantos caiam do meu lado
Direita, esquerda eu sou protegido
Se eu for fiel eu moverei o céu
Ele envia anjos para me guardar

Senhor não vou dividir minha adoração
Exclusivo é o meu coração
Vivo só pra Ti não abro mão do céu
Até diante da morte prefiro ser fiel

Senhor não vou dividir minha adoração
Exclusivo é o meu coração
Vivo só pra Ti não abro mão do céu
Até diante da morte prefiro ser fiel`;

export const RAW_FIDELIDADE_SONG = {
  id: "test-fidelidade-danielle-cristina",
  title: "Fidelidade",
  artist: "Danielle Cristina",
  artistName: "Danielle Cristina",
  composer: "Anderson Freire",
  originalKey: "Dm",
  key: "Dm",
  shapeKey: "Am",
  capo: 5,
  bpm: 76,
  timeSignature: "4/4",
  difficulty: "Médio",
  category: "worship",
  genres: ["Worship", "Gospel"],
  tags: ["Worship", "Gospel", "Fidelidade", "Danielle Cristina", "Anderson Freire"],
  instruments: ["Violão", "Teclado", "Baixo", "Bateria", "Voz"],
  status: SONG_STATUS.PUBLISHED,
  visibility: SONG_VISIBILITY.PUBLIC,
  verified: true,
  verificationStatus: "verified",
  sourceType: SOURCE_TYPES.OFFICIAL,
  sourceName: "Virtuo Oficial",
  testOnly: true,
  structure: "Intro • Primeira Parte • Segunda Parte • Refrão • Segunda Parte • Refrão • Ponte • Refrão • Final",
  chordSheet: FIDELIDADE_CHORD_SHEET,
  chords: FIDELIDADE_CHORD_SHEET,
  lyrics: FIDELIDADE_LYRICS,
  lyricsStatus: LYRICS_STATUS.AUTHORIZED,
  lyricsLicense: "Uso Autorizado para Teste e Ensaio",
  authorship: "Compositor: Anderson Freire | Intérprete: Danielle Cristina",
  createdAt: "2026-09-18T00:00:00.000Z",
  updatedAt: "2026-09-18T00:00:00.000Z"
};

export const FIDELIDADE_SONG = SongNormalizer.normalizeSong(RAW_FIDELIDADE_SONG);

export const DEMO_SONGS = [FIDELIDADE_SONG];

