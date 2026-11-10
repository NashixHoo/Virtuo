// =============================================================
// VIRTUO CANONICAL SONGS REPOSITORY
// src/music/demo-songs.ts
// =============================================================

export interface Song {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  originalKey: string;
  key?: string;
  bpm: number;
  difficulty: string;
  capo?: number;
  shapeKey?: string;
  structure: string;
  chords: string;
  easyChords?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  audioUrl?: string;
  visibility?: 'public' | 'private';
  contentScope?: 'global' | 'band';
  hymnNumber?: string;
  genres?: string[];
  tags?: string[];
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const DEMO_SONGS: Song[] = [
  {
    id: "bondade-de-deus",
    title: "Bondade de Deus",
    artist: "Isaías Saad",
    composer: "Jenn Johnson / Jason Ingram / Ben Fielding / Ed Cash / Brian Johnson",
    originalKey: "G",
    key: "G",
    bpm: 70,
    difficulty: "Fácil",
    capo: 0,
    structure: "Intro • Verso 1 • Refrão • Verso 2 • Refrão • Ponte • Refrão • Final",
    chords: `[Intro] G  C  G  C

[Verso 1]
G                      C
 Te amo, Deus, Tua graça nunca falha
    Em              D/F#      C
Todos os meus dias estão em Tuas mãos
                Em      C
Desde o amanhecer até o sol se pôr
D          Em      C        D      G
 Eu cantarei da bondade de Deus

[Refrão]
C                               G
 É Tua bondade que me seguirá, me seguirá
C                               G        D/F#
 É Tua bondade que me seguirá, me seguirá
       Em         D/F#      C               G
Minha vida eu Te dou, me rendo ao Teu favor
C          D        G
 Tua bondade me seguirá

[Verso 2]
G                          C
 Eu amo Tua voz, me guiou pelo fogo
       Em           D/F#          C
Na escuridão Tua presença me encontrou
          Em            C
És meu Pai e Amigo, és fiel a mim
D          Em      C        D      G
 E eu vivo na bondade de Deus

[Ponte]
G/B             C
 Tua fidelidade corre ao meu encontro
D               Em
 Tua fidelidade corre ao meu encontro
G/B           C
 Tudo o que sou entrego ao Teu louvor
D               G
 Tua bondade me seguirá`,
    easyChords: `[Intro] G  C  G  C

[Verso 1]
G                      C
 Te amo, Deus, Tua graça nunca falha
    Em              D         C
Todos os meus dias estão em Tuas mãos
                Em      C
Desde o amanhecer até o sol se pôr
D          Em      C        D      G
 Eu cantarei da bondade de Deus

[Refrão]
C                               G
 É Tua bondade que me seguirá, me seguirá
C                               G        D
 É Tua bondade que me seguirá, me seguirá
       Em         D         C               G
Minha vida eu Te dou, me rendo ao Teu favor
C          D        G
 Tua bondade me seguirá`,
    youtubeUrl: "https://www.youtube.com/watch?v=kY7wV2YlY-g",
    genres: ["Worship", "Gospel"],
    tags: ["louvor", "adoração", "comunhão", "gratidão"]
  },
  {
    id: "ousado-amor",
    title: "Ousado Amor (Reckless Love)",
    artist: "Isaías Saad",
    composer: "Cory Asbury / Caleb Culver / Ran Jackson",
    originalKey: "Em",
    key: "Em",
    bpm: 68,
    difficulty: "Fácil",
    capo: 0,
    structure: "Intro • Verso 1 • Refrão • Verso 2 • Refrão • Ponte • Refrão",
    chords: `[Intro] Em  D  C  G

[Verso 1]
Em               D            C
 Antes de eu falar, Tu cantavas sobre mim
Em            D          C
 Tu tens sido tão, tão bom pra mim
Em                D            C
 Antes de eu respirar, sopraste Tua vida em mim
Em            D          C
 Tu tens sido tão, tão bom pra mim

[Refrão]
       Em             D
Oh, impressionante, infinito
       C         G
E ousado amor de Deus
       Em             D
Oh, que deixa as noventa e nove
         C           G
Só pra me encontrar
             Em               D
Não posso comprá-lo, nem merecê-lo
       C         G
Mesmo assim se entregou
       Em             D
Oh, impressionante, infinito
       C         G
E ousado amor de Deus

[Ponte]
Em                     D
 Traz luz para as sombras, escala montanhas
C               G
 Pra me encontrar
Em                 D
 Derruba muralhas, destrói as mentiras
C               G
 Pra me encontrar`,
    easyChords: `[Intro] Em  D  C  G

[Verso 1]
Em               D            C
 Antes de eu falar, Tu cantavas sobre mim
Em            D          C
 Tu tens sido tão, tão bom pra mim

[Refrão]
       Em             D
Oh, impressionante, infinito
       C         G
E ousado amor de Deus`,
    youtubeUrl: "https://www.youtube.com/watch?v=F5kX0L9f9n4",
    genres: ["Worship", "Gospel"],
    tags: ["amor", "graça", "cruz"]
  },
  {
    id: "a-casa-e-sua",
    title: "A Casa É Sua",
    artist: "Casa Worship",
    composer: "Julliany Souza / Léo Brandão / Felipe Rodrigues / Ricardinho",
    originalKey: "C",
    key: "C",
    bpm: 72,
    difficulty: "Fácil",
    capo: 0,
    structure: "Intro • Verso • Pré-Refrão • Refrão • Ponte • Clímax • Final",
    chords: `[Intro] C  Am  F  G

[Verso]
C
 Você é bem-vindo aqui
Am
 A casa é Sua, pode entrar
F                     G
 Me esvazio de mim, me esvazio de mim

[Pré-Refrão]
Am                      F
 Sopra Teu vento outra vez
C                       G
 Enche este lugar com Tua glória

[Refrão]
C
 Essa casa é Sua casa
Am
 Nós deixamos ela pra Você, Jesus
F
 Essa casa é Sua casa
G
 Nós deixamos ela pra Você, Jesus

[Ponte]
C
 Apareça, que o Teu nome cresça
Am
 Enche este lugar, enche este lugar
F
 Vem incendiar, vem incendiar
G
 O Teu altar`,
    easyChords: `[Intro] C  Am  F  G

[Verso]
C
 Você é bem-vindo aqui
Am
 A casa é Sua, pode entrar
F                     G
 Me esvazio de mim

[Refrão]
C
 Essa casa é Sua casa
Am
 Nós deixamos ela pra Você, Jesus
F                   G
 Pode entrar, Jesus`,
    youtubeUrl: "https://www.youtube.com/watch?v=9g27UfT65nQ",
    genres: ["Worship", "Gospel"],
    tags: ["presença", "fogo", "altar"]
  },
  {
    id: "ruja-o-leao",
    title: "Ruja o Leão / Que Se Abram os Céus",
    artist: "Talita Catanzaro • Central 3",
    composer: "Central 3",
    originalKey: "G",
    key: "G",
    bpm: 76,
    difficulty: "Médio",
    capo: 0,
    structure: "Intro • Verso • Refrão • Ponte 1 • Ponte 2 • Espontâneo",
    chords: `[Intro] Em  C  G  D

[Verso]
Em                   C
 Sobre o trono de justiça
G                 D
 Rei coroado de glória
Em                 C
 Vestes reais resplandecem
G              D
 Santo, Santo, Santo

[Refrão]
Em               C
 Que ruja o Leão, que ruja o Leão
G                D
 Que ruja o Leão da tribo de Judá
Em               C
 Que ruja o Leão, que ruja o Leão
G                D
 E faça a terra tremer

[Ponte]
C                   D
 Que se abram os céus
Em                  G/B
 Que desça Tua glória
C                   D
 O Leão já rugiu, a vitória é d'Ele`,
    easyChords: `[Intro] Em  C  G  D

[Verso]
Em                   C
 Sobre o trono de justiça
G                 D
 Rei coroado de glória

[Refrão]
Em               C
 Que ruja o Leão, que ruja o Leão
G                D
 Que ruja o Leão da tribo de Judá`,
    youtubeUrl: "https://www.youtube.com/watch?v=Zf71mQ8zGkM",
    genres: ["Worship", "Jubilante"],
    tags: ["leão", "vitória", "poder"]
  }
];
