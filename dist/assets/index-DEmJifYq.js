const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/DaviAiModal-C1kafa-4.js","assets/rolldown-runtime-WkwZ5CU-.js","assets/vendor-react-dom-Cu9lpVvg.js","assets/vendor-react-dom-CTaTQzDG.js","assets/HomeScreen-Bz4HmVee.js","assets/LibraryScreen-CeuYb3Fk.js","assets/SongDetailScreen-BwtEhtBE.js","assets/audio-engine-B6dfQDbb.js","assets/transposer-CDzbfsaG.js","assets/LiveStageScreen-CTS1sf0P.js","assets/BandScreen-0I7-Umhp.js","assets/EnsaioScreen-DFLZ7e1Q.js","assets/ComunidadeScreen-C7cE4X8T.js","assets/ProfileScreen-D3PT5MLr.js","assets/TunerScreen-zHp7-312.js","assets/VocalScreen-B1nciJM1.js","assets/AcademyScreen-DqDwJeJ_.js","assets/CoachScreen-k1uO8-bq.js","assets/MinisterScreen-POpa8gAU.js","assets/DiagnosticsScreen-CA-O-Bj6.js","assets/NotificationsScreen-BskBiMK0.js"])))=>i.map(i=>d[i]);
import{n as e,t}from"./rolldown-runtime-WkwZ5CU-.js";import{i as n,t as r}from"./vendor-react-dom-Cu9lpVvg.js";import{t as i}from"./vendor-firebase-GLfeFeTa.js";import{H as a,I as o,P as s,R as c}from"./vendor-firebase-685yFzg-.js";import{a as l,o as u,s as d}from"./vendor-firebase-BjpxU0QB.js";import{a as f,c as p,d as m,i as h,l as g,n as _,o as v,r as y,s as b,t as x,u as S}from"./vendor-firebase-CqW_p-vK.js";import{a as ee,c as C,d as w,i as T,l as te,n as ne,o as re,r as E,s as ie,t as D,u as O}from"./vendor-firebase-0PhgAE3-.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var k=e(n(),1),A=e(r(),1),j={projectId:`virtuo-7e01b`,appId:`1:624628069677:web:cf6e928f7a8f6301128fa4`,apiKey:`AIzaSyATGB4jHdWD4Xuok5T52eFg49kfX_flK5k`,authDomain:`virtuo-7e01b.firebaseapp.com`,firestoreDatabaseId:`ai-studio-virtuov2-043e1953-2c69-4551-86e6-1b99649b7e19`,storageBucket:`virtuo-7e01b.firebasestorage.app`,messagingSenderId:`624628069677`,measurementId:``,oAuthClientId:`624628069677-cji4hl7am18ngkmj567mlisqjm9ol70i.apps.googleusercontent.com`,recaptchaSiteKey:``},M=function(e){return e.CREATE=`create`,e.UPDATE=`update`,e.DELETE=`delete`,e.LIST=`list`,e.GET=`get`,e.WRITE=`write`,e}({}),N=u().length===0?d(j):l(),P=c(N,j.firestoreDatabaseId),F=h(N);i(N);try{b(F,_).catch(()=>{})}catch{}function I(e,t,n){let r={error:e instanceof Error?e.message:String(e),authInfo:{userId:F.currentUser?.uid,email:F.currentUser?.email,emailVerified:F.currentUser?.emailVerified,isAnonymous:F.currentUser?.isAnonymous,tenantId:F.currentUser?.tenantId,providerInfo:F.currentUser?.providerData?.map(e=>({providerId:e.providerId,email:e.email}))||[]},operationType:t,path:n};throw console.error(`Firestore Error: `,JSON.stringify(r)),Error(JSON.stringify(r))}async function L(){try{return await ee(C(s(P,`songs`),w(`status`,`==`,`published`),w(`visibility`,`==`,`public`),re(1))),{ok:!0,message:`Conectado ao Firebase com sucesso.`}}catch(e){return e?.code===`permission-denied`?{ok:!1,message:`Sem permissão para consultar músicas públicas. Verifique as regras do Firestore.`}:e?.code===`unavailable`||e?.message?.includes(`client is offline`)?{ok:!1,message:`Firestore indisponível; modo local ativo.`}:{ok:!1,message:`Falha ao conectar ao Firestore.`}}}var R=new x;R.setCustomParameters({prompt:`select_account`});async function z(){let e=await g(F,R);return e.user&&await W(e.user),e.user}async function B(e,t,n,r=[`Guitarra`,`Vocal`]){let i=await y(F,e,t);return n&&i.user&&await m(i.user,{displayName:n}),await W(i.user,{displayName:n,instruments:r}),i.user}async function V(e,t){let n=await p(F,e,t);return await W(n.user),n.user}async function H(){await S(F)}async function U(e){await v(F,e)}async function W(e,t={}){if(!e)return null;let n=o(P,`users`,e.uid);try{let r=await E(n);if(!r.exists()){let r={uid:e.uid,email:e.email||``,displayName:e.displayName||t.displayName||`Músico Virtuoso`,photoURL:e.photoURL||``,role:`musician`,instruments:t.instruments||[`Guitarra`,`Vocal`],level:`intermediario`,currentBand:`Solo / Convidado`,reputationScore:100,createdAt:a(),updatedAt:a(),...t};return await te(n,r),r}return r.data()}catch(e){return console.warn(`Erro ao sincronizar perfil do usuário:`,e),null}}var G=[{id:`bondade-de-deus`,title:`Bondade de Deus`,artist:`Isaías Saad`,composer:`Jenn Johnson / Jason Ingram / Ben Fielding / Ed Cash / Brian Johnson`,originalKey:`G`,key:`G`,bpm:70,difficulty:`Fácil`,capo:0,structure:`Intro • Verso 1 • Refrão • Verso 2 • Refrão • Ponte • Refrão • Final`,chords:`[Intro] G  C  G  C

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
 Tua bondade me seguirá`,easyChords:`[Intro] G  C  G  C

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
 Tua bondade me seguirá`,youtubeUrl:`https://www.youtube.com/watch?v=kY7wV2YlY-g`,genres:[`Worship`,`Gospel`],tags:[`louvor`,`adoração`,`comunhão`,`gratidão`]},{id:`ousado-amor`,title:`Ousado Amor (Reckless Love)`,artist:`Isaías Saad`,composer:`Cory Asbury / Caleb Culver / Ran Jackson`,originalKey:`Em`,key:`Em`,bpm:68,difficulty:`Fácil`,capo:0,structure:`Intro • Verso 1 • Refrão • Verso 2 • Refrão • Ponte • Refrão`,chords:`[Intro] Em  D  C  G

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
 Pra me encontrar`,easyChords:`[Intro] Em  D  C  G

[Verso 1]
Em               D            C
 Antes de eu falar, Tu cantavas sobre mim
Em            D          C
 Tu tens sido tão, tão bom pra mim

[Refrão]
       Em             D
Oh, impressionante, infinito
       C         G
E ousado amor de Deus`,youtubeUrl:`https://www.youtube.com/watch?v=F5kX0L9f9n4`,genres:[`Worship`,`Gospel`],tags:[`amor`,`graça`,`cruz`]},{id:`a-casa-e-sua`,title:`A Casa É Sua`,artist:`Casa Worship`,composer:`Julliany Souza / Léo Brandão / Felipe Rodrigues / Ricardinho`,originalKey:`C`,key:`C`,bpm:72,difficulty:`Fácil`,capo:0,structure:`Intro • Verso • Pré-Refrão • Refrão • Ponte • Clímax • Final`,chords:`[Intro] C  Am  F  G

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
 O Teu altar`,easyChords:`[Intro] C  Am  F  G

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
 Pode entrar, Jesus`,youtubeUrl:`https://www.youtube.com/watch?v=9g27UfT65nQ`,genres:[`Worship`,`Gospel`],tags:[`presença`,`fogo`,`altar`]},{id:`ruja-o-leao`,title:`Ruja o Leão / Que Se Abram os Céus`,artist:`Talita Catanzaro • Central 3`,composer:`Central 3`,originalKey:`G`,key:`G`,bpm:76,difficulty:`Médio`,capo:0,structure:`Intro • Verso • Refrão • Ponte 1 • Ponte 2 • Espontâneo`,chords:`[Intro] Em  C  G  D

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
 O Leão já rugiu, a vitória é d'Ele`,easyChords:`[Intro] Em  C  G  D

[Verso]
Em                   C
 Sobre o trono de justiça
G                 D
 Rei coroado de glória

[Refrão]
Em               C
 Que ruja o Leão, que ruja o Leão
G                D
 Que ruja o Leão da tribo de Judá`,youtubeUrl:`https://www.youtube.com/watch?v=Zf71mQ8zGkM`,genres:[`Worship`,`Jubilante`],tags:[`leão`,`vitória`,`poder`]}],K=`virtuo_offline_songs_cache_v2`,q={getOfflineSongs(){try{let e=localStorage.getItem(K);if(!e)return G;let t=JSON.parse(e);return Array.isArray(t)&&t.length>0?t:G}catch{return G}},saveOfflineSongs(e){try{localStorage.setItem(K,JSON.stringify(e))}catch(e){console.warn(`Could not save offline songs cache`,e)}},async getAllSongs(){try{let e=C(s(P,`songs`),w(`status`,`==`,`published`),w(`visibility`,`==`,`public`),ie(`createdAt`,`desc`)),t=[await T(e)];if(F.currentUser){let e=C(s(P,`songs`),w(`createdBy`,`==`,F.currentUser.uid));t.push(await T(e))}let n=new Map;for(let e of t)for(let t of e.docs)n.set(t.id,{id:t.id,...t.data()});let r=[...n.values()];if(r.length===0)return this.getOfflineSongs();r.sort((e,t)=>{let n=e.createdAt?.toMillis?.()??0;return(t.createdAt?.toMillis?.()??0)-n});let i=new Set(r.map(e=>e.id)),a=new Set(r.map(e=>(e.title||``).toLowerCase())),o=G.filter(e=>!i.has(e.id)&&!a.has(e.title.toLowerCase())),c=[...r,...o];return this.saveOfflineSongs(c),c}catch(e){return console.warn(`Firestore offline or permission denied, using cached songs:`,e),this.getOfflineSongs()}},async addSong(e){let t={...e,createdBy:F.currentUser?.uid||`offline-user`,createdAt:a(),updatedAt:a()};try{let e={id:(await D(s(P,`songs`),t)).id,...t},n=this.getOfflineSongs();return this.saveOfflineSongs([e,...n]),e}catch(e){I(e,M.CREATE,`songs`);let n={id:`local-`+Date.now(),...t},r=this.getOfflineSongs();return this.saveOfflineSongs([n,...r]),n}},async updateSong(e,t){try{let n=o(P,`songs`,e);await O(n,{...t,updatedAt:a()})}catch(t){I(t,M.UPDATE,`songs/${e}`)}let n=this.getOfflineSongs().map(n=>n.id===e?{...n,...t}:n);this.saveOfflineSongs(n)},async deleteSong(e){try{let t=o(P,`songs`,e);await ne(t)}catch(t){I(t,M.DELETE,`songs/${e}`)}let t=this.getOfflineSongs().filter(t=>t.id!==e);this.saveOfflineSongs(t)}},J=t((e=>{var t=Symbol.for(`react.transitional.element`),n=Symbol.for(`react.fragment`);function r(e,n,r){var i=null;if(r!==void 0&&(i=``+r),n.key!==void 0&&(i=``+n.key),`key`in n)for(var a in r={},n)a!==`key`&&(r[a]=n[a]);else r=n;return n=r.ref,{$$typeof:t,type:e,key:i,ref:n===void 0?null:n,props:r}}e.Fragment=n,e.jsx=r,e.jsxs=r})),Y=t(((e,t)=>{t.exports=J()})),X=Y(),ae=({onNavigate:e,onOpenAi:t,onOpenNotifications:n,unreadNotifications:r,currentUser:i,userProfile:a})=>{let o=(a?.displayName||i?.displayName||i?.email||`✦`)[0].toUpperCase();return(0,X.jsxs)(`header`,{children:[(0,X.jsxs)(`div`,{className:`virtuo-horizon`,style:{display:`flex`,alignItems:`center`,gap:`14px`,cursor:`pointer`,touchAction:`manipulation`},onClick:()=>e(`home`),title:`Virtuo • Ir para Início`,children:[(0,X.jsx)(`div`,{className:`virtuo-logo-glow`,style:{width:`44px`,height:`44px`,flexShrink:0,display:`flex`,alignItems:`center`,justifyContent:`center`,pointerEvents:`none`},children:(0,X.jsx)(`img`,{src:`/assets/branding/logo/logo-principal.svg`,alt:`Virtuo Logo`,style:{width:`100%`,height:`100%`,objectFit:`contain`,pointerEvents:`none`}})}),(0,X.jsxs)(`div`,{style:{pointerEvents:`none`},children:[(0,X.jsx)(`h1`,{style:{margin:`2px 0 2px`,fontSize:`28px`,letterSpacing:`4px`,lineHeight:1.1},children:`VIRTUO`}),(0,X.jsx)(`p`,{style:{margin:0,fontSize:`12px`,color:`#A9BDD8`},children:`A plataforma do músico virtuoso`})]})]}),(0,X.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`},children:[(0,X.jsxs)(`button`,{className:`ai-header-btn`,onClick:t,title:`Davi • Diretor Musical`,children:[(0,X.jsx)(`span`,{style:{fontSize:`15px`},children:`🎼`}),(0,X.jsx)(`span`,{style:{fontSize:`11px`,fontWeight:700},children:`Davi`})]}),(0,X.jsxs)(`button`,{className:`ai-header-btn`,onClick:n,title:`Notificações e Alertas`,style:{position:`relative`,width:`38px`,padding:0,justifyContent:`center`},children:[(0,X.jsx)(`span`,{style:{fontSize:`16px`},children:`🔔`}),r>0&&(0,X.jsx)(`span`,{style:{position:`absolute`,top:`-2px`,right:`-2px`,width:`9px`,height:`9px`,borderRadius:`50%`,background:`#ef4444`,border:`2px solid #07101F`}})]}),(0,X.jsx)(`div`,{className:`avatar`,onClick:()=>e(`profile`),style:{cursor:`pointer`},title:`Meu Perfil`,children:i?.photoURL?(0,X.jsx)(`img`,{src:i.photoURL,alt:`Avatar`,style:{width:`100%`,height:`100%`,borderRadius:`50%`,objectFit:`cover`}}):o})]})]})},oe=({currentScreen:e,onNavigate:t})=>{let n=[{id:`home`,label:`Início`,icon:`/assets/branding/logo/logo-principal.svg`},{id:`library`,label:`Biblioteca`,icon:`/assets/branding/icons/biblioteca.svg`},{id:`live`,label:`Live`,icon:`/assets/branding/icons/live.svg`},{id:`ensaio`,label:`Ensaio`,icon:`/assets/branding/icons/maestro.svg`},{id:`band`,label:`Banda`,icon:`/assets/branding/icons/banda.svg`},{id:`comunidade`,label:`Comunidade`,icon:`/assets/branding/icons/perfil.svg`},{id:`profile`,label:`Perfil`,icon:`/assets/branding/icons/configuracoes.svg`}],r=e===`hoje`?`home`:[`songDetail`,`minister`].includes(e)?`library`:[`commandCenter`,`checkin`,`missions`,`moment`].includes(e)?`live`:e;return(0,X.jsx)(`nav`,{className:`tabbar`,children:n.map(e=>{let n=r===e.id;return(0,X.jsxs)(`button`,{id:`tab-btn-${e.id}`,className:n?`active`:``,onClick:()=>t(e.id),children:[(0,X.jsx)(`div`,{className:`tabbar-icon-wrap`,children:(0,X.jsx)(`img`,{src:e.icon,className:`virtuo-nav-icon`,alt:``,"aria-hidden":`true`,style:{width:`20px`,height:`20px`}})}),(0,X.jsx)(`span`,{children:e.label})]},e.id)})})},se=`modulepreload`,ce=function(e){return`/`+e},le={},ue=function(e){return e.pathname.endsWith(`.css`)},de=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},Z=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=ce(t,n);let r=s(t),i=ue(r);return de(le,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:se,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},fe=(0,k.lazy)(()=>Z(()=>import(`./DaviAiModal-C1kafa-4.js`).then(e=>({default:e.DaviAiModal})),__vite__mapDeps([0,1,2,3]))),pe=(0,k.lazy)(()=>Z(()=>import(`./HomeScreen-Bz4HmVee.js`).then(e=>({default:e.HomeScreen})),__vite__mapDeps([4,1,2,3]))),me=(0,k.lazy)(()=>Z(()=>import(`./LibraryScreen-CeuYb3Fk.js`).then(e=>({default:e.LibraryScreen})),__vite__mapDeps([5,1,2,3]))),he=(0,k.lazy)(()=>Z(()=>import(`./SongDetailScreen-BwtEhtBE.js`).then(e=>({default:e.SongDetailScreen})),__vite__mapDeps([6,1,2,3,7,8]))),ge=(0,k.lazy)(()=>Z(()=>import(`./LiveStageScreen-CTS1sf0P.js`).then(e=>({default:e.LiveStageScreen})),__vite__mapDeps([9,1,2,3,8]))),_e=(0,k.lazy)(()=>Z(()=>import(`./BandScreen-0I7-Umhp.js`).then(e=>({default:e.BandScreen})),__vite__mapDeps([10,1,2,3,7]))),ve=(0,k.lazy)(()=>Z(()=>import(`./EnsaioScreen-DFLZ7e1Q.js`).then(e=>({default:e.EnsaioScreen})),__vite__mapDeps([11,1,2,3]))),ye=(0,k.lazy)(()=>Z(()=>import(`./ComunidadeScreen-C7cE4X8T.js`).then(e=>({default:e.ComunidadeScreen})),__vite__mapDeps([12,1,2,3]))),be=(0,k.lazy)(()=>Z(()=>import(`./ProfileScreen-D3PT5MLr.js`).then(e=>({default:e.ProfileScreen})),__vite__mapDeps([13,1,2,3,7]))),xe=(0,k.lazy)(()=>Z(()=>import(`./TunerScreen-zHp7-312.js`).then(e=>({default:e.TunerScreen})),__vite__mapDeps([14,1,2,3,7]))),Q=(0,k.lazy)(()=>Z(()=>import(`./VocalScreen-B1nciJM1.js`).then(e=>({default:e.VocalScreen})),__vite__mapDeps([15,1,2,3,7]))),Se=(0,k.lazy)(()=>Z(()=>import(`./AcademyScreen-DqDwJeJ_.js`).then(e=>({default:e.AcademyScreen})),__vite__mapDeps([16,1,2,3]))),Ce=(0,k.lazy)(()=>Z(()=>import(`./CoachScreen-k1uO8-bq.js`).then(e=>({default:e.CoachScreen})),__vite__mapDeps([17,1,2,3]))),we=(0,k.lazy)(()=>Z(()=>import(`./MinisterScreen-POpa8gAU.js`).then(e=>({default:e.MinisterScreen})),__vite__mapDeps([18,1,2,3]))),Te=(0,k.lazy)(()=>Z(()=>import(`./DiagnosticsScreen-CA-O-Bj6.js`).then(e=>({default:e.DiagnosticsScreen})),__vite__mapDeps([19,1,2,3]))),Ee=(0,k.lazy)(()=>Z(()=>import(`./NotificationsScreen-BskBiMK0.js`).then(e=>({default:e.NotificationsScreen})),__vite__mapDeps([20,1,2,3]))),De=()=>{let[e,t]=(0,k.useState)(`home`),[n,r]=(0,k.useState)(null),[i,a]=(0,k.useState)(null),[s,c]=(0,k.useState)(G),[l,u]=(0,k.useState)(G[0]),[d,p]=(0,k.useState)({connected:!1,message:`Verificando conexão com o Firebase...`}),[m,h]=(0,k.useState)(!1),[g,_]=(0,k.useState)([{id:`notif-1`,title:`Ensaio Geral Agendado`,message:`O ensaio geral da equipe de adoração está marcado para sábado às 19:30.`,time:`Há 1 hora`,read:!1},{id:`notif-2`,title:`Davi AI • Nova Sugestão de Arranjo`,message:`Arranjo worship contemporâneo gerado para "Bondade de Deus" no tom de G.`,time:`Há 3 horas`,read:!0}]);(0,k.useEffect)(()=>{L().then(e=>{p({connected:e.ok,message:e.message})});let e=f(F,async e=>{if(r(e),e){v();try{let t=await E(o(P,`users`,e.uid));if(t.exists())a(t.data());else{let t=await W(e);a(t)}}catch(e){console.warn(`Erro ao carregar perfil do usuário:`,e)}}else a(null),v()});return()=>e()},[]);let v=async()=>{try{let e=await q.getAllSongs();c(e),e.length>0&&!l&&u(e[0])}catch(e){console.warn(`Erro ao carregar músicas:`,e)}};(0,k.useEffect)(()=>{v()},[]);let y=e=>{u(e),t(`songDetail`)},b=g.filter(e=>!e.read).length;return(0,X.jsxs)(`div`,{className:`virtuo-app-root`,children:[(0,X.jsx)(`div`,{className:`background screen-${e}`}),(0,X.jsxs)(`div`,{className:`virtuo-aura-ambient`,"aria-hidden":`true`,children:[(0,X.jsx)(`div`,{className:`virtuo-aura-mist`}),(0,X.jsx)(`div`,{className:`virtuo-aura-beams`})]}),(0,X.jsx)(`div`,{id:`virtuo-fixed-horizon-glow`,className:`virtuo-fixed-horizon-glow`,"aria-hidden":`true`}),(0,X.jsx)(ae,{onNavigate:e=>t(e),onOpenAi:()=>h(!0),onOpenNotifications:()=>t(`notifications`),unreadNotifications:b,currentUser:n,userProfile:i}),(0,X.jsx)(`main`,{id:`app`,className:`screen-transition-enter`,children:(0,X.jsxs)(k.Suspense,{fallback:(0,X.jsx)(`div`,{role:`status`,"aria-live":`polite`,children:`Carregando tela...`}),children:[e===`home`&&(0,X.jsx)(pe,{currentUser:n,userProfile:i,lastOpenedSong:l,firebaseStatus:d,onNavigate:e=>t(e),onOpenSong:y,onOpenAi:()=>h(!0)}),e===`library`&&(0,X.jsx)(me,{songs:s,onOpenSong:y,onRefreshSongs:v,onOpenAi:()=>h(!0)}),e===`songDetail`&&l&&(0,X.jsx)(he,{song:l,onBack:()=>t(`library`),onOpenMinister:()=>t(`minister`),onOpenEnsaio:()=>t(`ensaio`),onOpenMetronome:()=>t(`band`),onOpenAiForSong:()=>h(!0),onSongDeleted:()=>{v(),t(`library`)}}),e===`live`&&(0,X.jsx)(ge,{songs:s,activeSong:l,onSelectSong:e=>u(e),onExit:()=>t(`home`)}),e===`band`&&(0,X.jsx)(_e,{}),e===`ensaio`&&(0,X.jsx)(ve,{songs:s,onOpenSong:y,onOpenLive:()=>t(`live`)}),e===`comunidade`&&(0,X.jsx)(ye,{currentUser:n,userProfile:i}),e===`profile`&&(0,X.jsx)(be,{currentUser:n,userProfile:i,onRefreshUser:async()=>{if(F.currentUser){let e=await E(o(P,`users`,F.currentUser.uid));a(e.data())}},onOpenAi:()=>h(!0)}),e===`tuner`&&(0,X.jsx)(xe,{}),e===`vocal`&&(0,X.jsx)(Q,{}),e===`academy`&&(0,X.jsx)(Se,{}),e===`coach`&&(0,X.jsx)(Ce,{}),e===`minister`&&(0,X.jsx)(we,{song:l,onExit:()=>t(l?`songDetail`:`home`)}),e===`diagnostics`&&(0,X.jsx)(Te,{}),e===`notifications`&&(0,X.jsx)(Ee,{notifications:g,onMarkAllAsRead:()=>_(g.map(e=>({...e,read:!0}))),onClearAll:()=>_([])})]})}),(0,X.jsx)(oe,{currentScreen:e,onNavigate:e=>t(e)}),m&&(0,X.jsx)(k.Suspense,{fallback:null,children:(0,X.jsx)(fe,{isOpen:m,onClose:()=>h(!1),activeSong:l,currentKey:l?.originalKey||`G`,bpm:l?.bpm||74})})]})},$=document.getElementById(`root`);$&&A.createRoot($).render((0,X.jsx)(k.StrictMode,{children:(0,X.jsx)(De,{})}));export{U as a,L as c,H as i,q as n,V as o,z as r,B as s,Y as t};