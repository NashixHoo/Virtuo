// =============================================================
// VIRTUO V2 — SISTEMA DE NOTIFICAÇÕES INTERNAS
// src/features/notifications/notifications-service.js
// Gestão de notificações internas, badge de leitura e infraestrutura para Web Push
// =============================================================

export const NOTIFICATION_TYPES = {
  NEW_MISSION: "new_mission",
  REPERTOIRE_CHANGED: "repertoire_changed",
  KEY_CHANGED: "key_changed",
  BPM_CHANGED: "bpm_changed",
  REHEARSAL_TOMORROW: "rehearsal_tomorrow",
  MISSION_STARTED: "mission_started",
  CHECKIN_ALERT: "checkin_alert",
  MOMENT_UNLOCKED: "moment_unlocked"
};

const NOTIFICATIONS_STORAGE_KEY = "virtuo_internal_notifications_v2";

class NotificationsService {
  constructor() {
    this._listeners = new Set();
    this._notifications = this._load();
    if (this._notifications.length === 0) {
      this._seedInitialNotifications();
    }
  }

  _load() {
    try {
      if (typeof localStorage === "undefined") return [];
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this._notifications));
      }
    } catch {}
    this._notifyListeners();
  }

  _seedInitialNotifications() {
    this._notifications = [
      {
        id: "notif-init-01",
        type: NOTIFICATION_TYPES.NEW_MISSION,
        title: "Nova Missão: Culto de Domingo",
        message: "Pastor Carlos enviou a escala para a Noite de Louvor e Adoração.",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        read: false,
        missionId: "mission-culto-domingo"
      },
      {
        id: "notif-init-02",
        type: NOTIFICATION_TYPES.REHEARSAL_TOMORROW,
        title: "Ensaio Agendado",
        message: "Lembrete: Ensaio geral da equipe musical amanhã às 19:30.",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        read: false,
        missionId: "mission-culto-domingo"
      }
    ];
    this._save();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners() {
    const unreadCount = this.getUnreadCount();
    for (const listener of this._listeners) {
      try {
        listener(this._notifications, unreadCount);
      } catch (err) {
        console.error("Erro no listener de notificação:", err);
      }
    }
  }

  getAll() {
    return [...this._notifications];
  }

  getUnreadCount() {
    return this._notifications.filter(n => !n.read).length;
  }

  add({ type, title, message, missionId = null, metadata = {} }) {
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      title,
      message,
      missionId,
      metadata,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Insere no início
    this._notifications.unshift(notification);
    // Limita histórico a 50 notificações
    if (this._notifications.length > 50) {
      this._notifications = this._notifications.slice(0, 50);
    }
    this._save();

    // Se suportado e permitido, aciona Web Notification
    this._tryDispatchBrowserNotification(notification);

    return notification;
  }

  markAsRead(id) {
    const notif = this._notifications.find(n => n.id === id);
    if (notif && !notif.read) {
      notif.read = true;
      this._save();
    }
  }

  markAllAsRead() {
    let changed = false;
    for (const n of this._notifications) {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) {
      this._save();
    }
  }

  clearAll() {
    this._notifications = [];
    this._save();
  }

  // =============================================================
  // INFRAESTRUTURA PARA PUSH NOTIFICATION FUTURA
  // =============================================================

  /**
   * Prepara o registro do navegador para Web Push Notification
   * @returns {Promise<{ supported: boolean, permission: string, subscription: Object|null }>}
   */
  async requestPushPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { supported: false, permission: "unsupported", subscription: null };
    }

    try {
      const permission = await Notification.requestPermission();
      let subscription = null;

      if (permission === "granted" && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.pushManager) {
          // Prepara futura subscrição Push com VAPID
          subscription = await registration.pushManager.getSubscription();
        }
      }

      return {
        supported: true,
        permission,
        subscription
      };
    } catch (err) {
      return { supported: false, permission: "denied", subscription: null, error: err.message };
    }
  }

  _tryDispatchBrowserNotification(notif) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`VIRTUO: ${notif.title}`, {
          body: notif.message,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png"
        });
      } catch {}
    }
  }
}

export const notificationsService = new NotificationsService();
