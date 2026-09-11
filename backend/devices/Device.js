export class Device {
  constructor(data = {}) {
    this.id = data.id || null;

    this.identity = {
      mac: data.identity?.mac || null,
      vendor: data.identity?.vendor || null,
      hostname: data.identity?.hostname || null
    };

    this.network = {
      ipv4: data.network?.ipv4 || null,
      ipv6: data.network?.ipv6 || null,
      interface: data.network?.interface || null
    };

    this.classification = {
      type: data.classification?.type || "unknown",
      os: data.classification?.os || "unknown",
      confidence: data.classification?.confidence || 0
    };

    this.status = {
      online: data.status?.online ?? false,
      firstSeen: data.status?.firstSeen || null,
      lastSeen: data.status?.lastSeen || null
    };

    this.services = data.services || [];

    this.activity = {
      connections: data.activity?.connections || 0,
      bytesIn: data.activity?.bytesIn || 0,
      bytesOut: data.activity?.bytesOut || 0
    };

    this.risk = {
      score: data.risk?.score || 0,
      level: data.risk?.level || "LOW",
      reasons: data.risk?.reasons || []
    };

    this.history = data.history || [];
  }
}
