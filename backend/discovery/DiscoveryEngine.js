export class DiscoveryEngine {
  constructor(options = {}) {
    this.networkDiscovery = options.networkDiscovery;
    this.adapters = options.adapters || [];
  }

  async discover() {
    if (!this.networkDiscovery) {
      throw new Error("NetworkDiscovery is required");
    }

    const networkInfo =
      await this.networkDiscovery.discover();

    if (!networkInfo.success) {
      return {
        success: false,
        status: "UNAVAILABLE",
        confidence: "none",
        reason: networkInfo.error,

        network: networkInfo,

        capability: {
          networkDetected: false,
          deviceDiscovery: false,
          localOnly: false
        },

        observedDevices: 0,
        confirmedPeers: 0,

        devices: [],
        sources: [],

        limitations: [
          "Network information could not be determined"
        ]
      };
    }

    const results = [];

    for (const adapter of this.adapters) {
      if (
        typeof adapter.discover !== "function"
      ) {
        continue;
      }

      try {
        const result =
          await adapter.discover(
            networkInfo.cidr
          );

        results.push({
          adapter:
            adapter.constructor.name,
          ...result
        });
      } catch (error) {
        results.push({
          adapter:
            adapter.constructor.name,

          success: false,

          devices: [],

          error: error.message
        });
      }
    }

    const successful =
      results.filter(
        result =>
          result.success === true
      );

    const discoveredDevices =
      successful.flatMap(
        result =>
          result.devices || []
      );

    /*
     * Remove the local Sentinel device.
     *
     * The device running Sentinel is not considered
     * a discovered peer.
     */
    const peerDevices =
      discoveredDevices.filter(
        device =>
          device.ip !==
          networkInfo.localIp
      );

    const devices =
      this.mergeDevices(
        peerDevices
      );

    const observedDevices =
      devices.length;

    const confirmedPeers =
      devices.filter(
        device =>
          device.ip &&
          device.ip !==
            networkInfo.localIp
      ).length;

    const hasNonLocalDevice =
      confirmedPeers > 0;

    const limitations = [];

    if (results.length === 0) {
      limitations.push(
        "No discovery adapters are configured"
      );
    }

    if (
      results.length > 0 &&
      successful.length === 0
    ) {
      limitations.push(
        "All configured discovery adapters failed"
      );
    }

    if (!hasNonLocalDevice) {
      limitations.push(
        "No non-local devices were confirmed by active discovery"
      );

      limitations.push(
        "Network or platform restrictions may limit peer discovery"
      );
    }

    return {
      success: true,

      status:
        hasNonLocalDevice
          ? "AVAILABLE"
          : "LIMITED",

      confidence:
        hasNonLocalDevice
          ? "medium"
          : "low",

      network: {
        interface:
          networkInfo.localInterface,

        localIp:
          networkInfo.localIp,

        netmask:
          networkInfo.netmask,

        network:
          networkInfo.network,

        cidr:
          networkInfo.cidr
      },

      capability: {
        networkDetected: true,

        deviceDiscovery:
          hasNonLocalDevice,

        localOnly:
          !hasNonLocalDevice
      },

      observedDevices,

      confirmedPeers,

      devices,

      limitations,

      sources: results
    };
  }

  mergeDevices(devices = []) {
    const merged = new Map();

    for (const device of devices) {
      const key =
        device.mac ||
        device.ip;

      if (!key) {
        continue;
      }

      if (!merged.has(key)) {
        merged.set(
          key,
          {
            ...device
          }
        );

        continue;
      }

      const existing =
        merged.get(key);

      merged.set(
        key,
        {
          ...existing,
          ...device,

          mac:
            device.mac ||
            existing.mac,

          hostname:
            device.hostname ||
            existing.hostname
        }
      );
    }

    return [
      ...merged.values()
    ];
  }
}
