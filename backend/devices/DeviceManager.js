import { Device } from "./Device.js";

export class DeviceManager {
  constructor() {
    this.devices = new Map();
  }

  getAll() {
    return [...this.devices.values()];
  }

  getById(id) {
    return this.devices.get(id) || null;
  }

  getByMac(mac) {
    if (!mac) return null;

    const normalizedMac = this.normalizeMac(mac);

    for (const device of this.devices.values()) {
      if (
        device.identity.mac &&
        this.normalizeMac(device.identity.mac) === normalizedMac
      ) {
        return device;
      }
    }

    return null;
  }

  getByIp(ip) {
    if (!ip) return null;

    for (const device of this.devices.values()) {
      if (device.network.ipv4 === ip) {
        return device;
      }
    }

    return null;
  }

  upsert(data) {
    const mac = data.identity?.mac || null;
    const ip = data.network?.ipv4 || null;

    // Strong identity: MAC
    let device = this.getByMac(mac);

    // Fallback identity: current IP.
    if (!device && !mac) {
      device = this.getByIp(ip);
    }

    // Explicit stable ID.
    if (!device && data.id) {
      device = this.getById(data.id);
    }

    // New device.
    if (!device) {
      device = new Device(data);

      if (!device.id) {
        device.id = this.createId(device);
      }

      device.identity.confidence = mac
        ? "high"
        : "low";

      device.identity.temporary = !mac;

      const now = new Date().toISOString();

      device.status.firstSeen = now;
      device.status.lastSeen = now;

      this.devices.set(device.id, device);

      return {
        device,
        created: true,
        previous: null
      };
    }

    // Snapshot before mutation.
    const previous = structuredClone(device);

    Object.assign(device.identity, data.identity || {});
    Object.assign(device.network, data.network || {});
    Object.assign(device.classification, data.classification || {});
    Object.assign(device.activity, data.activity || {});

    if (data.services) {
      device.services = data.services;
    }

    if (data.status) {
      Object.assign(device.status, data.status);
    }

    device.status.lastSeen =
      data.status?.lastSeen || new Date().toISOString();

    return {
      device,
      created: false,
      previous
    };
  }

  /*
   * Explicitly update an already-known device.
   * This is used when another identity signal has
   * established that the observation belongs to the
   * existing device.
   */
  updateKnownDevice(id, data) {
    const device = this.getById(id);

    if (!device) {
      throw new Error(`Unknown device: ${id}`);
    }

    const previous = structuredClone(device);

    Object.assign(device.identity, data.identity || {});
    Object.assign(device.network, data.network || {});
    Object.assign(device.classification, data.classification || {});
    Object.assign(device.activity, data.activity || {});

    if (data.services) {
      device.services = data.services;
    }

    if (data.status) {
      Object.assign(device.status, data.status);
    }

    device.status.lastSeen =
      data.status?.lastSeen || new Date().toISOString();

    return {
      device,
      created: false,
      previous
    };
  }

  createId(device) {
    const mac = device.identity.mac;

    if (mac) {
      return `mac-${this.normalizeMac(mac)}`;
    }

    return `device-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  normalizeMac(mac) {
    return mac
      .toLowerCase()
      .replace(/[^a-f0-9]/g, "");
  }

  clear() {
    this.devices.clear();
  }
}
