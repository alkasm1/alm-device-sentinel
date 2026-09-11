import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class NmapDiscovery {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 120;
  }

  async discover(network) {
    try {
      const { stdout } = await execFileAsync(
        "nmap",
        [
          "-sn",
          "-PR",
          network
        ],
        {
          timeout: this.timeout * 1000
        }
      );

      return {
        success: true,
        source: "nmap",
        method: "arp",
        devices: this.parseHosts(stdout),
        raw: stdout
      };
    } catch (error) {
      return {
        success: false,
        source: "nmap",
        error: error.message,
        devices: []
      };
    }
  }

  parseHosts(output) {
    const devices = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(
        /Nmap scan report for (?:.*\()?(\d+\.\d+\.\d+\.\d+)\)?/
      );

      if (!match) {
        continue;
      }

      const ip = match[1];

      devices.push({
        ip,
        mac: null,
        hostname: null,
        reachable: true,
        source: "nmap",
        method: "arp",
        confidence: "medium"
      });
    }

    return devices;
  }
}
