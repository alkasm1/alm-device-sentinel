export class RiskEngine {
  constructor() {
    this.rules = {
      NEW_DEVICE: {
        score: 20,
        reason: "New device detected"
      },

      IP_CHANGED: {
        score: 15,
        reason: "IP address changed"
      },

      HOSTNAME_CHANGED: {
        score: 10,
        reason: "Hostname changed"
      },

      DEVICE_OFFLINE: {
        score: 5,
        reason: "Device went offline"
      },

      DEVICE_ONLINE: {
        score: 0,
        reason: "Device came online"
      },

      NEW_SERVICE: {
        score: 15,
        reason: "New network service detected"
      },

      SERVICE_REMOVED: {
        score: 15,
        reason: "Network service removed"
      },

      UNUSUAL_ACTIVITY: {
        score: 20,
        reason: "Unusual device activity detected"
      },

      UNEXPECTED_CHANGE: {
        score: 15,
        reason: "Unexpected device change detected"
      },

      KNOWN_TRUSTED_DEVICE: {
        score: -10,
        reason: "Known trusted device"
      }
    };
  }

  calculate(events = []) {
    let score = 0;
    const reasons = [];

    for (const event of events) {
      const rule = this.rules[event.type];

      if (!rule) {
        continue;
      }

      score += rule.score;

      reasons.push({
        event: event.type,
        score: rule.score,
        reason: rule.reason
      });
    }

    score = Math.max(0, Math.min(score, 100));

    return {
      score,
      level: this.getLevel(score),
      reasons
    };
  }

  getLevel(score) {
    if (score >= 80) {
      return "CRITICAL";
    }

    if (score >= 60) {
      return "HIGH";
    }

    if (score >= 30) {
      return "MEDIUM";
    }

    return "LOW";
  }
}
