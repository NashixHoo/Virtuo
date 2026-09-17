// =============================================================
// VIRTUO EXPERIENCE SYSTEM — SPLASH PREMIUM V3
// src/features/splash/splash.js
// Abertura oficial cinematográfica do Virtuo
// Sequência estrita:
//   0.0s - Tela escura
//   0.3s - Brilho azul
//   0.7s - Logo surge (V metálico oficial + horizon glow) com onda azul descendo
//   1.0s - Startup Chime
//   1.4s - Entrada na Home
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
      <!-- Fundo de Palco Cinematográfico da Splash -->
      <div 
        id="splash-bg-stage"
        style="
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('assets/backgrounds/virtuo-background-splash.svg');
          background-size: cover;
          background-position: center bottom;
          opacity: 0;
          transition: opacity 450ms ease-out;
          pointer-events: none;
        "
      ></div>

      <!-- 0.3s: Brilho Azul Celestial -->
      <div 
        id="splash-celestial-glow"
        style="
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(126, 231, 255, 0.38) 0%, rgba(14, 27, 53, 0) 70%);
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 350ms ease-out, transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        "
      ></div>

      <!-- Efeito da Onda Azul Descendo da Logo -->
      <div 
        id="splash-blue-wave"
        style="
          position: absolute;
          top: 48%;
          left: 50%;
          width: 140px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(126, 231, 255, 0.75) 0%, rgba(126, 231, 255, 0) 75%);
          filter: blur(10px);
          opacity: 0;
          transform: translate(-50%, 0) scaleX(0.5);
          transition: opacity 300ms ease-out, transform 650ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          z-index: 2;
        "
      ></div>

      <!-- 0.7s: Container do Logo Oficial com Horizon Glow -->
      <div 
        id="splash-logo-container"
        class="virtuo-horizon"
        style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          transform: translateY(14px) scale(0.90);
          transition: opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 3;
        "
      >
        <!-- Símbolo V Metálico com Horizon Glow Integrado -->
        <div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; filter: drop-shadow(0 0 24px rgba(126, 231, 255, 0.55));">
          <svg viewBox="0 0 512 512" width="100%" height="100%">
            <defs>
              <linearGradient id="splVLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.98"/>
                <stop offset="25%" stop-color="#D2EBF7"/>
                <stop offset="50%" stop-color="#89C4E1"/>
                <stop offset="75%" stop-color="#4B86AA"/>
                <stop offset="100%" stop-color="#1A4363"/>
              </linearGradient>
              <linearGradient id="splVRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E8F8FF"/>
                <stop offset="30%" stop-color="#B2E7FA"/>
                <stop offset="60%" stop-color="#55ACD4"/>
                <stop offset="85%" stop-color="#245F85"/>
                <stop offset="100%" stop-color="#0E2D44"/>
              </linearGradient>
              <linearGradient id="splVFacet" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="#7EE7FF" stop-opacity="1"/>
                <stop offset="100%" stop-color="#1E5275" stop-opacity="0.8"/>
              </linearGradient>
              <radialGradient id="splVHorizon" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#7EE7FF" stop-opacity="0.85"/>
                <stop offset="40%" stop-color="#7EE7FF" stop-opacity="0.30"/>
                <stop offset="100%" stop-color="#07101F" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <!-- Luz do Horizonte sob o V -->
            <ellipse cx="256" cy="385" rx="170" ry="40" fill="url(#splVHorizon)"/>
            <!-- Haste Esquerda Reta -->
            <path d="M 126 120 L 186 120 L 256 370 L 212 370 Z" fill="url(#splVLeft)"/>
            <!-- Haste Direita com Leve Curva Interna -->
            <path d="M 386 120 L 326 120 C 300 186, 278 252, 256 370 L 300 370 C 328 265, 356 186, 386 120 Z" fill="url(#splVRight)"/>
            <!-- Vértice Chanfrado -->
            <polygon points="212,370 256,370 300,370 256,404" fill="url(#splVFacet)"/>
            <!-- Linhas de Realce -->
            <path d="M 126 120 L 256 404 L 386 120" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
            <path d="M 186 120 L 256 370 C 278 252, 300 186, 326 120" fill="none" stroke="#7EE7FF" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
            <circle cx="256" cy="404" r="4" fill="#FFFFFF"/>
            <circle cx="256" cy="404" r="10" fill="#7EE7FF" opacity="0.6"/>
          </svg>
        </div>

        <div 
          style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 10px;
            color: #F8FAFC;
            text-transform: uppercase;
            margin-bottom: 4px;
            text-shadow: 0 0 16px rgba(126, 231, 255, 0.45);
          "
        >
          VIRTUO
        </div>

        <div 
          style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 4px;
            color: #7EE7FF;
            text-transform: uppercase;
            opacity: 0.85;
          "
        >
          A PLATAFORMA DO MÚSICO VIRTUOSO
        </div>
      </div>
    `;

    // Toque para pular opcional
    overlay.addEventListener('click', () => {
      this.finish(overlay, onComplete);
    });

    document.body.appendChild(overlay);
    this.container = overlay;

    // Cronograma oficial estrito do Virtuo Brand Kit V3 (1.4s):
    // 0.0s: Tela escura (já montada)

    // 0.3s: Brilho azul celestial
    setTimeout(() => {
      if (this.isDone) return;
      const glow = document.getElementById('splash-celestial-glow');
      const bg = document.getElementById('splash-bg-stage');
      if (glow) {
        glow.style.opacity = '1';
        glow.style.transform = 'scale(1.2)';
      }
      if (bg) {
        bg.style.opacity = '0.55';
      }
    }, 300);

    // 0.7s: Logo surge + efeito da onda azul descendo
    setTimeout(() => {
      if (this.isDone) return;
      const logo = document.getElementById('splash-logo-container');
      const wave = document.getElementById('splash-blue-wave');
      if (logo) {
        logo.style.opacity = '1';
        logo.style.transform = 'translateY(0) scale(1)';
      }
      if (wave) {
        wave.style.opacity = '0.85';
        wave.style.transform = 'translate(-50%, 140px) scaleX(2.8)';
      }
    }, 700);

    // 1.0s: Startup Chime (assinatura sonora)
    setTimeout(() => {
      if (this.isDone) return;
      playStartupChime().catch(() => {});
    }, 1000);

    // 1.4s: Entrada na Home e finalização da Splash
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
      }, 220);
    } else {
      if (onComplete) onComplete();
    }
  }
}

export const virtuoSplash = new VirtuoSplashScreen();
export { isStartupChimeEnabled, setStartupChimeEnabled };
