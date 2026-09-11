export class ChangeDetector {
  detect(previous, current, created = false) {
    const events = [];

    if (created) {
      events.push({
        type: "NEW_DEVICE",
        deviceId: current.id,
        timestamp: new Date().toISOString(),
        details: {
          mac: current.identity.mac,
          ipv4: current.network.ipv4
        }
      });

      return events;
    }

    // Online / Offline state changes
    if (
      previous.status.online === false &&
      current.status.online === true
    ) {
      events.push({
        type: "DEVICE_ONLINE",
        deviceId: current.id,
        timestamp: new Date().toISOString(),
        details: {
          previous: false,
          current: true
        }
      });
    }

    if (
      previous.status.online === true &&
      current.status.online === false
    ) {
      events.push({
        type: "DEVICE_OFFLINE",
        deviceId: current.id,
        timestamp: new Date().toISOString(),
        details: {
          previous: true,
          current: false
        }
      });
    }

    // IP change
    if (
      previous.network.ipv4 &&
      current.network.ipv4 &&
      previous.network.ipv4 !== current.network.ipv4
    ) {
      events.push({
        type: "IP_CHANGED",
        deviceId: current.id,
        timestamp: new Date().toISOString(),
        details: {
          previous: previous.network.ipv4,
          current: current.network.ipv4
        }
      });
    }

    // Hostname change
    if (
      previous.identity.hostname &&
      current.identity.hostname &&
      previous.identity.hostname !== current.identity.hostname
    ) {
      events.push({
        type: "HOSTNAME_CHANGED",
        deviceId: current.id,
        timestamp: new Date().toISOString(),
        details: {
          previous: previous.identity.hostname,
          current: current.identity.hostname
        }
      });
    }

    return events;
  }
}
