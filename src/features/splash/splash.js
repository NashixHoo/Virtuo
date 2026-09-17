// =============================================================
// VIRTUO EXPERIENCE SYSTEM — SPLASH PREMIUM
// src/features/splash/splash.js
// Abertura oficial do Virtuo
// Duração: 1.4s | 0.0s tela escura | 0.3s brilho celestial | 0.7s logo V | 1.0s chime | 1.4s Home
// =============================================================

import { playStartupChime, isStartupChimeEnabled, setStartupChimeEnabled } from "../../audio/startup-chime.js";
import { DESIGN_TOKENS } from "../../design/design-system.js";

export class VirtuoSplashScreen {
  constructor() {
    this.container = null;
    this.isDone = false;
  }

  /**
   * Inicializa e executa a sequência cinematográfica do Splash (1.4s)
   * @param {Function} [onComplete] Callback acionado quando a Home estiver visível
   */
  start(onComplete = null) {
    if (typeof document === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    // Cria overlay no body
    const overlay = document.createElement('div');
    overlay.id = 'virtuo-splash-screen';
    overlay.setAttribute('aria-label', 'Inicializando Virtuo');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #020611;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms ease-out;
      user-select: none;
      -webkit-user-select: none;
    `;

    overlay.innerHTML = `
      <!-- Brilho Azul Celestial (0.3s) -->
      <div 
        id="splash-celestial-glow"
        style="
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(126, 231, 255, 0.28) 0%, rgba(14, 27, 53, 0) 70%);
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 400ms ease-out, transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        "
      ></div>

      <!-- Container do Logo V (0.7s) -->
      <div 
        id="splash-logo-container"
        style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          transform: translateY(12px) scale(0.92);
          transition: opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
        "
      >
        <!-- Logo V estilizado celestial -->
        <div 
          style="
            width: 76px;
            height: 76px;
            border-radius: 20px;
            background: linear-gradient(135deg, #0E1B35 0%, #07101F 100%);
            border: 1.5px solid rgba(126, 231, 255, 0.45);
            box-shadow: 0 0 30px rgba(126, 231, 255, 0.25), inset 0 0 15px rgba(126, 231, 255, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          "
        >
          <span 
            style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 38px;
              font-weight: 900;
              letter-spacing: -1px;
              background: linear-gradient(180deg, #F8FAFC 0%, #7EE7FF 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            "
          >
            V
          </span>
        </div>

        <div 
          style="
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 3.5px;
            color: #F8FAFC;
            text-transform: uppercase;
          "
        >
          VIRTUO
        </div>
      </div>
    `;

    // Toque para pular opcional
    overlay.addEventListener('click', () => {
      this.finish(overlay, onComplete);
    });

    document.body.appendChild(overlay);
    this.container = overlay;

    // Cronograma oficial estrito (alvo 1.4s):
    // 0.0s: tela escura (já inicializada)

    // 0.3s: brilho azul celestial
    setTimeout(() => {
      if (this.isDone) return;
      const glow = document.getElementById('splash-celestial-glow');
      if (glow) {
        glow.style.opacity = '1';
        glow.style.transform = 'scale(1.15)';
      }
    }, 300);

    // 0.7s: logo "V" aparece
    setTimeout(() => {
      if (this.isDone) return;
      const logo = document.getElementById('splash-logo-container');
      if (logo) {
        logo.style.opacity = '1';
        logo.style.transform = 'translateY(0) scale(1)';
      }
    }, 700);

    // 1.0s: assinatura sonora
    setTimeout(() => {
      if (this.isDone) return;
      playStartupChime().catch(() => {});
    }, 1000);

    // 1.4s: Home carregada e splash finalizado suavemente
    setTimeout(() => {
      this.finish(overlay, onComplete);
    }, 1400);
  }

  finish(overlay, onComplete) {
    if (this.isDone) return;
    this.isDone = true;

    if (overlay && overlay.parentNode) {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.02)';
      overlay.style.pointerEvents = 'none';

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (onComplete) onComplete();
      }, 240);
    } else {
      if (onComplete) onComplete();
    }
  }
}

export const virtuoSplash = new VirtuoSplashScreen();
export { isStartupChimeEnabled, setStartupChimeEnabled };
