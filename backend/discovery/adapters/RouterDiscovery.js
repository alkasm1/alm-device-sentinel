export class RouterDiscovery {
  constructor(options = {}) {
    this.name = options.name || "router";
    this.provider = options.provider || null;
    this.timeout = options.timeout ?? 5000;
  }

  async discover(network) {
    if (!this.provider) {
      return {
        success: false,
        source: this.name,
        method: "router",
        devices: [],
        error: "No router discovery provider configured"
      };
    }

    if (
      typeof this.provider.discover !== "function"
    ) {
      return {
        success: false,
        source: this.name,
        method: "router",
        devices: [],
        error: "Router discovery provider is invalid"
      };
    }

    try {
      const result =
        await this.provider.discover(
          network,
          {
            timeout: this.timeout
          }
        );

      return {
        success: true,
        source: this.name,
        method: "router",
        devices: result.devices || [],
        metadata: result.metadata || {}
      };
    } catch (error) {
      return {
        success: false,
        source: this.name,
        method: "router",
        devices: [],
        error: error.message
      };
    }
  }
}
