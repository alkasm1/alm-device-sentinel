import net from "node:net";

export class DeviceScanner {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 300;
    this.concurrency = options.concurrency ?? 32;

    this.ports = options.ports ?? [
      22,
      80,
      443,
      445,
      8080,
      8000,
      8443
    ];
  }

  async scan(network) {
    const parts = network.split(".").map(Number);

    if (
      parts.length !== 4 ||
      parts.some(
        value => !Number.isInteger(value) || value < 0 || value > 255
      )
    ) {
      throw new Error(`Invalid network: ${network}`);
    }

    const targets = [];

    for (let host = 1; host <= 254; host++) {
      targets.push(`${parts[0]}.${parts[1]}.${parts[2]}.${host}`);
    }

    const devices = [];

    for (let i = 0; i < targets.length; i += this.concurrency) {
      const batch = targets.slice(i, i + this.concurrency);

      const results = await Promise.all(
        batch.map(ip => this.probeHost(ip))
      );

      for (const result of results) {
        if (result) {
          devices.push(result);
        }
      }
    }

    return devices;
  }

  async probeHost(ip) {
    const services = [];

    for (const port of this.ports) {
      const open = await this.checkPort(ip, port);

      if (open) {
        services.push({
          port,
          protocol: "tcp"
        });
      }
    }

    if (services.length === 0) {
      return null;
    }

    return {
      ip,
      reachable: true,
      services
    };
  }

  checkPort(ip, port) {
    return new Promise(resolve => {
      const socket = new net.Socket();

      let finished = false;

      const done = result => {
        if (finished) {
          return;
        }

        finished = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(this.timeout);

      socket.once("connect", () => {
        done(true);
      });

      socket.once("timeout", () => {
        done(false);
      });

      socket.once("error", () => {
        done(false);
      });

      socket.connect(port, ip);
    });
  }
}
