export class ManualDiscovery {
  constructor(options = {}) {
    this.devices =
      options.devices || [];
  }

  async discover(network) {
    const devices =
      this.devices.filter(
        device =>
          !device.network ||
          !device.network.cidr ||
          device.network.cidr === network
      );

    return {
      success: true,

      source: "manual",

      method: "manual",

      devices: devices.map(
        device => ({
          ip: device.ip,
          mac: device.mac || null,
          hostname:
            device.hostname || null,

          reachable:
            device.reachable ?? true,

          source: "manual",

          confidence:
            device.confidence || "high",

          services:
            device.services || []
        })
      )
    };
  }
}
