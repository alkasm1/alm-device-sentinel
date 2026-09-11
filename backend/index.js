import { NetworkDiscovery } from "./discovery/NetworkDiscovery.js";
import { NmapDiscovery } from "./discovery/NmapDiscovery.js";
import { RouterDiscovery } from "./discovery/adapters/RouterDiscovery.js";
import { ManualDiscovery } from "./discovery/adapters/ManualDiscovery.js";
import { DiscoveryEngine } from "./discovery/DiscoveryEngine.js";
import { DeviceManager } from "./devices/DeviceManager.js";
import { ChangeDetector } from "./detection/ChangeDetector.js";
import { EventStore } from "./events/EventStore.js";
import { RiskEngine } from "./risk/RiskEngine.js";

console.log(
  "ALM Device Sentinel - Change Detection v0.8\n"
);

const networkDiscovery =
  new NetworkDiscovery();

const nmapDiscovery =
  new NmapDiscovery();

const routerDiscovery =
  new RouterDiscovery();

const manualDiscovery =
  new ManualDiscovery({
    devices: [
      {
        ip: "192.168.88.108",
        hostname: "manual-device",
        reachable: true,
        confidence: "high"
      }
    ]
  });

const discoveryEngine =
  new DiscoveryEngine({
    networkDiscovery,

    adapters: [
      nmapDiscovery,
      routerDiscovery,
      manualDiscovery
    ]
  });

const deviceManager =
  new DeviceManager();

const changeDetector =
  new ChangeDetector();

const eventStore =
  new EventStore();

const riskEngine =
  new RiskEngine();

async function processDiscovery(
  discovery,
  label
) {
  console.log(label);
  console.log(
    "=".repeat(label.length)
  );

  for (
    const found
    of discovery.devices
  ) {
    const result =
      deviceManager.upsert({
        identity: {
          mac: found.mac,
          hostname:
            found.hostname
        },

        network: {
          ipv4: found.ip
        },

        status: {
          online:
            found.reachable
        },

        services:
          found.services || []
      });

    const events =
      changeDetector.detect(
        result.previous,
        result.device,
        result.created
      );

    eventStore.addMany(
      events
    );

    const risk =
      riskEngine.calculate(
        events
      );

    result.device.risk =
      risk;

    console.log(
      `${result.created ? "NEW" : "KNOWN"}  ${result.device.id}  ${found.ip}`
    );

    if (events.length) {
      console.log(
        "Events:"
      );

      for (
        const event
        of events
      ) {
        console.log(
          `  ${event.type}`
        );
      }
    } else {
      console.log(
        "Events: none"
      );
    }
  }

  console.log();
}

async function main() {
  const networkInfo =
    await networkDiscovery.discover();

  console.log(
    "Network Discovery"
  );

  console.log(
    "-----------------"
  );

  if (!networkInfo.success) {
    console.error(
      "Failed:",
      networkInfo.error
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    `Interface : ${networkInfo.localInterface}`
  );

  console.log(
    `Local IP  : ${networkInfo.localIp}`
  );

  console.log(
    `Netmask   : ${networkInfo.netmask}`
  );

  console.log(
    `Network   : ${networkInfo.network}\n`
  );

  // --------------------------------------------------
  // Discovery Engine
  // --------------------------------------------------

  const discoveryResult =
    await discoveryEngine.discover();

  console.log(
    `CIDR              : ${discoveryResult.network.cidr}`
  );

  console.log(
    `Status            : ${discoveryResult.status}`
  );

  console.log(
    `Confidence        : ${discoveryResult.confidence}`
  );

  console.log(
    `Observed devices  : ${discoveryResult.observedDevices}`
  );

  console.log(
    `Confirmed peers   : ${discoveryResult.confirmedPeers}`
  );

  console.log(
    `Discovery         : ${
      discoveryResult.capability.deviceDiscovery
        ? "available"
        : "limited"
    }`
  );

  // --------------------------------------------------
  // Discovery Sources
  // --------------------------------------------------

  if (
    discoveryResult.sources?.length
  ) {
    console.log(
      "\nDiscovery sources:"
    );

    for (
      const source
      of discoveryResult.sources
    ) {
      const status =
        source.success
          ? "success"
          : "failed";

      console.log(
        `  ${source.adapter}: ${status}`
      );

      if (
        !source.success &&
        source.error
      ) {
        console.log(
          `    reason: ${source.error}`
        );
      }

      if (
        source.success &&
        source.devices
      ) {
        console.log(
          `    devices: ${source.devices.length}`
        );
      }
    }
  }

  // --------------------------------------------------
  // Limitations
  // --------------------------------------------------

  if (
    discoveryResult.limitations?.length
  ) {
    console.log(
      "\nLimitations:"
    );

    for (
      const limitation
      of discoveryResult.limitations
    ) {
      console.log(
        `  - ${limitation}`
      );
    }
  }

  console.log("");

  if (!discoveryResult.success) {
    console.error(
      "Discovery failed:",
      discoveryResult.reason
    );

    process.exitCode = 1;
    return;
  }

  const discovery = {
    success: true,

    devices:
      discoveryResult.devices
  };

  await processDiscovery(
    discovery,
    "REAL SCAN"
  );

  // --------------------------------------------------
  // Second scan
  // --------------------------------------------------

  await processDiscovery(
    discovery,
    "SECOND SCAN"
  );

  // --------------------------------------------------
  // Controlled change simulation
  // --------------------------------------------------

  const devices =
    deviceManager.getAll();

  if (devices.length > 0) {
    const device =
      devices[0];

    console.log(
      "CHANGE SIMULATION"
    );

    console.log(
      "================="
    );

    console.log(
      `Original IP: ${device.network.ipv4}`
    );

    const simulatedState = {
      identity: {
        mac:
          device.identity.mac,

        hostname:
          device.identity.hostname
      },

      network: {
        ipv4: "192.168.88.120"
      },

      status: {
        online: true
      }
    };

    const result =
      deviceManager.updateKnownDevice(
        device.id,
        simulatedState
      );

    const events =
      changeDetector.detect(
        result.previous,
        result.device,
        result.created
      );

    eventStore.addMany(
      events
    );

    const risk =
      riskEngine.calculate(
        events
      );

    result.device.risk =
      risk;

    console.log(
      `Simulated IP: ${result.device.network.ipv4}`
    );

    console.log(
      `Risk: ${risk.score} (${risk.level})`
    );

    if (risk.reasons.length) {
      console.log(
        "Risk reasons:"
      );

      for (
        const reason
        of risk.reasons
      ) {
        console.log(
          `  ${reason.event}: +${reason.score} - ${reason.reason}`
        );
      }
    }

    if (events.length) {
      console.log(
        "Detected events:"
      );

      for (
        const event
        of events
      ) {
        console.log(
          JSON.stringify(
            event,
            null,
            2
          )
        );
      }
    } else {
      console.log(
        "No change detected."
      );
    }
  }

  // --------------------------------------------------
  // Device state simulation
  // --------------------------------------------------

  const knownDevices =
    deviceManager.getAll();

  if (
    knownDevices.length > 0
  ) {
    const device =
      knownDevices[0];

    console.log(
      "\nSTATE SIMULATION"
    );

    console.log(
      "================"
    );

    const offlineResult =
      deviceManager.updateKnownDevice(
        device.id,
        {
          status: {
            online: false
          }
        }
      );

    const offlineEvents =
      changeDetector.detect(
        offlineResult.previous,
        offlineResult.device,
        false
      );

    eventStore.addMany(
      offlineEvents
    );

    console.log(
      `Offline state: ${offlineResult.device.status.online}`
    );

    for (
      const event
      of offlineEvents
    ) {
      console.log(
        `  ${event.type}`
      );
    }

    const onlineResult =
      deviceManager.updateKnownDevice(
        device.id,
        {
          status: {
            online: true
          }
        }
      );

    const onlineEvents =
      changeDetector.detect(
        onlineResult.previous,
        onlineResult.device,
        false
      );

    eventStore.addMany(
      onlineEvents
    );

    console.log(
      `Online state: ${onlineResult.device.status.online}`
    );

    for (
      const event
      of onlineEvents
    ) {
      console.log(
        `  ${event.type}`
      );
    }

    const stateEvents = [
      ...offlineEvents,
      ...onlineEvents
    ];

    const stateRisk =
      riskEngine.calculate(
        stateEvents
      );

    onlineResult.device.risk =
      stateRisk;

    console.log(
      `State risk: ${stateRisk.score} (${stateRisk.level})`
    );
  }

  // --------------------------------------------------
  // Final inventory
  // --------------------------------------------------

  console.log(
    "\nFINAL INVENTORY"
  );

  console.log(
    "================"
  );

  for (
    const device
    of deviceManager.getAll()
  ) {
    console.log(
      JSON.stringify(
        {
          id: device.id,

          mac:
            device.identity.mac,

          hostname:
            device.identity.hostname,

          ipv4:
            device.network.ipv4,

          online:
            device.status.online,

          risk:
            device.risk,

          firstSeen:
            device.status.firstSeen,

          lastSeen:
            device.status.lastSeen
        },

        null,

        2
      )
    );
  }

  // --------------------------------------------------
  // Event summary
  // --------------------------------------------------

  console.log(
    "\nEVENT SUMMARY"
  );

  console.log(
    "============="
  );

  console.log(
    `Total events: ${eventStore.count()}`
  );

  for (
    const event
    of eventStore.getAll()
  ) {
    console.log(
      `${event.type} → ${event.deviceId}`
    );
  }
}

main().catch(error => {
  console.error(
    "Fatal error:",
    error
  );

  process.exitCode = 1;
});
