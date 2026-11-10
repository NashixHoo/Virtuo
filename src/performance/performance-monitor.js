// =============================================================
// VIRTUO PERFORMANCE MONITOR
// src/performance/performance-monitor.js
// Real-time performance tracking with high-resolution performance.now()
// Zero synthetic metrics - 100% measured in the active browser runtime
// =============================================================

class VirtuoPerformanceMonitor {
  constructor() {
    this.records = [];
    this.maxRecords = 500;
    this.isDev = typeof window !== "undefined" && (
      window.location?.hostname === "localhost" ||
      window.location?.hostname === "127.0.0.1" ||
      window.__VIRTUO_DEV__ === true
    );
    this.deviceInfo = this._getDeviceInfo();
    this.customStats = new Map();
  }

  _getDeviceInfo() {
    if (typeof navigator === "undefined") {
      return { platform: "node", userAgent: "node" };
    }
    return {
      platform: navigator.platform || "unknown",
      userAgent: navigator.userAgent || "browser",
      cores: navigator.hardwareConcurrency || 1,
      memoryGB: navigator.deviceMemory || "unknown"
    };
  }

  _now() {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  startMeasure(operation, metadata = {}) {
    const start = this._now();
    return {
      operation,
      start,
      metadata,
      id: Math.random().toString(36).substring(2, 9)
    };
  }

  endMeasure(token) {
    if (!token || typeof token.start !== "number") return 0;
    const end = this._now();
    const duration = parseFloat((end - token.start).toFixed(2));

    const record = {
      id: token.id,
      operation: token.operation,
      start: token.start,
      end,
      duration,
      metadata: token.metadata || {},
      device: this.deviceInfo,
      timestamp: Date.now()
    };

    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    if (this.isDev && duration > 50) {
      console.warn(`[Virtuo Perf Warning] Operation "${token.operation}" took ${duration}ms (>50ms target).`, record);
    }

    return duration;
  }

  measure(operation, fn, metadata = {}) {
    const token = this.startMeasure(operation, metadata);
    try {
      const result = fn();
      if (result && typeof result.then === "function") {
        return result.then(res => {
          this.endMeasure(token);
          return res;
        }).catch(err => {
          this.endMeasure(token);
          throw err;
        });
      }
      this.endMeasure(token);
      return result;
    } catch (err) {
      this.endMeasure(token);
      throw err;
    }
  }

  recordMetric(operation, duration, metadata = {}) {
    const now = this._now();
    const record = {
      id: Math.random().toString(36).substring(2, 9),
      operation,
      start: now - duration,
      end: now,
      duration: parseFloat(Number(duration).toFixed(2)),
      metadata,
      device: this.deviceInfo,
      timestamp: Date.now()
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  getMetrics() {
    return [...this.records];
  }

  getOperationStats(operation) {
    const matches = this.records.filter(r => r.operation === operation);
    if (matches.length === 0) {
      return {
        operation,
        count: 0,
        avgMs: 0,
        minMs: 0,
        maxMs: 0,
        p95Ms: 0,
        p99Ms: 0
      };
    }

    const durations = matches.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, v) => acc + v, 0);
    const avg = sum / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];

    const p95Idx = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
    const p99Idx = Math.min(durations.length - 1, Math.floor(durations.length * 0.99));

    return {
      operation,
      count: durations.length,
      avgMs: parseFloat(avg.toFixed(2)),
      minMs: parseFloat(min.toFixed(2)),
      maxMs: parseFloat(max.toFixed(2)),
      p95Ms: parseFloat(durations[p95Idx].toFixed(2)),
      p99Ms: parseFloat(durations[p99Idx].toFixed(2))
    };
  }

  getSummary() {
    const ops = Array.from(new Set(this.records.map(r => r.operation)));
    const summary = {};
    for (const op of ops) {
      summary[op] = this.getOperationStats(op);
    }
    return summary;
  }

  getApproxMemory() {
    if (typeof performance !== "undefined" && performance.memory) {
      return {
        usedJSHeapSizeMB: parseFloat((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)),
        totalJSHeapSizeMB: parseFloat((performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)),
        jsHeapSizeLimitMB: parseFloat((performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2))
      };
    }
    return null;
  }

  clear() {
    this.records = [];
  }
}

export const perfMonitor = new VirtuoPerformanceMonitor();
if (typeof window !== "undefined") {
  window.__VIRTUO_PERF__ = perfMonitor;
}
