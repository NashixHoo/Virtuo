// =============================================================
// VIRTUO EXPERIENCE SYSTEM — DYNAMIC GREETING
// src/features/home/greeting.js
// Saudação dinâmica baseada no relógio com atualização em tempo real
// =============================================================

/**
 * Retorna a saudação de acordo com o horário local:
 * 05:00–11:59 → Bom dia
 * 12:00–17:59 → Boa tarde
 * 18:00–04:59 → Boa noite
 * @param {Date} [date]
 * @returns {string}
 */
export function getGreeting(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'Bom dia';
  }
  if (hours >= 12 && hours < 18) {
    return 'Boa tarde';
  }
  return 'Boa noite';
}

/**
 * Obtém os dados completos da saudação para a tela Hoje
 * @param {Object} [currentUser]
 * @param {Date} [date]
 * @returns {{ greeting: string, userName: string, subtitle: string }}
 */
export function getHomeGreetingData(currentUser = null, date = new Date()) {
  const greeting = getGreeting(date);
  const firstName = currentUser?.displayName
    ? currentUser.displayName.trim().split(/\s+/)[0]
    : 'Músico';

  return {
    greeting,
    userName: firstName,
    subtitle: 'Pronto para sua próxima missão?'
  };
}

let activeIntervalId = null;

/**
 * Inicializa a atualização contínua e leve da saudação sem recarregar a página.
 * Verifica a cada 30 segundos se a saudação horária mudou e atualiza o DOM.
 * @param {string} elementId ID do elemento que recebe a saudação no DOM
 * @param {Function} [onUpdate] Callback opcional invocado ao atualizar
 */
export function startGreetingAutoUpdater(elementId = 'hoje-dynamic-greeting', onUpdate = null) {
  if (activeIntervalId) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }

  let lastGreeting = getGreeting();

  const checkAndUpdate = () => {
    const current = getGreeting();
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el && el.getAttribute('data-greeting') !== current) {
        el.setAttribute('data-greeting', current);
        el.textContent = current;
        if (typeof onUpdate === 'function') {
          onUpdate(current);
        }
      }
    }
    lastGreeting = current;
  };

  // Roda a cada 30s para transição pontual no minuto exato
  activeIntervalId = setInterval(checkAndUpdate, 30000);

  return () => {
    if (activeIntervalId) {
      clearInterval(activeIntervalId);
      activeIntervalId = null;
    }
  };
}

/**
 * Para o atualizador de saudação (para desmontagem limpa)
 */
export function stopGreetingAutoUpdater() {
  if (activeIntervalId) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
}
