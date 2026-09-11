import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class NetworkDiscovery {
  async discover() {
    const result = await this.getNetworkInfo();

    if (!result.success) {
      return result;
    }

    const interfaces = result.interfaces;

    const candidates = interfaces.filter(item =>
      item.ip &&
      item.netmask &&
      item.name !== "lo" &&
      !item.name.startsWith("tun") &&
      !item.name.startsWith("ccmni")
    );

    if (candidates.length === 0) {
      return {
        success: false,
        error: "No usable IPv4 network interface found",
        interfaces
      };
    }

    const selected = this.selectInterface(candidates);

    const network = this.calculateNetwork(
      selected.ip,
      selected.netmask
    );

    const prefix = this.netmaskToPrefix(
      selected.netmask
    );

    return {
      success: true,
      source: "ifconfig",
      localInterface: selected.name,
      localIp: selected.ip,
      netmask: selected.netmask,
      prefix,
      broadcast: selected.broadcast,
      network,
      cidr: `${network}/${prefix}`,
      interfaces,
      devices: []
    };
  }

  selectInterface(interfaces) {
    // Prefer Wi-Fi when available.
    const wifi = interfaces.find(
      item =>
        item.name === "wlan0" &&
        this.isPrivateIPv4(item.ip)
    );

    if (wifi) {
      return wifi;
    }

    // Otherwise prefer any private IPv4 interface.
    const privateInterface = interfaces.find(
      item => this.isPrivateIPv4(item.ip)
    );

    if (privateInterface) {
      return privateInterface;
    }

    // Last fallback.
    return interfaces[0];
  }

  isPrivateIPv4(ip) {
    const parts = ip.split(".").map(Number);

    if (parts.length !== 4) {
      return false;
    }

    const [a, b] = parts;

    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  async getNetworkInfo() {
    try {
      const { stdout } = await execFileAsync(
        "ifconfig"
      );

      const interfaces = [];
      let current = null;

      for (const line of stdout.split("\n")) {
        const interfaceMatch = line.match(
          /^([a-zA-Z0-9._-]+):/
        );

        if (interfaceMatch) {
          current = {
            name: interfaceMatch[1],
            ip: null,
            netmask: null,
            broadcast: null
          };

          interfaces.push(current);
          continue;
        }

        if (!current) {
          continue;
        }

        const inetMatch = line.match(
          /\binet\s+(\d+\.\d+\.\d+\.\d+)/
        );

        if (inetMatch) {
          current.ip = inetMatch[1];
        }

        const netmaskMatch = line.match(
          /\bnetmask\s+(\d+\.\d+\.\d+\.\d+)/
        );

        if (netmaskMatch) {
          current.netmask = netmaskMatch[1];
        }

        const broadcastMatch = line.match(
          /\bbroadcast\s+(\d+\.\d+\.\d+\.\d+)/
        );

        if (broadcastMatch) {
          current.broadcast = broadcastMatch[1];
        }
      }

      return {
        success: true,
        interfaces
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        interfaces: []
      };
    }
  }

  calculateNetwork(ip, netmask) {
    const ipParts = ip.split(".").map(Number);
    const maskParts = netmask.split(".").map(Number);

    const networkParts = ipParts.map(
      (part, index) => part & maskParts[index]
    );

    return networkParts.join(".");
  }

  netmaskToPrefix(netmask) {
    return netmask
      .split(".")
      .map(Number)
      .map(part => part.toString(2).padStart(8, "0"))
      .join("")
      .split("1").length - 1;
  }
}
