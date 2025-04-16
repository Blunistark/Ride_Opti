let simulationActive = false; // Track simulation state

export function startSimulation() {
  simulationActive = true;
}

export function stopSimulation() {
  simulationActive = false;
}

export function updateHotspots(hotspots, setHotspots) {
  setHotspots((prevHotspots) => {
    return prevHotspots.map((hotspot) => ({
      ...hotspot,
      density: hotspot.density + Math.random() * 5, // Increase density
    })).concat(
      Math.random() > 0.9 // 10% chance to add a new hotspot
        ? [{
            id: crypto.randomUUID(),
            name: "New Hotspot",
            latitude: 12.9716 + (Math.random() - 0.5) * 0.02,
            longitude: 77.5946 + (Math.random() - 0.5) * 0.02,
            density: Math.random() * 10,
          }]
        : []
    );
  });
}

export function updateDrivers(drivers, hotspots, setDrivers) {
  if (!simulationActive) return; // Only move drivers if simulation is ON

  setDrivers((prevDrivers) => {
    return prevDrivers.map((driver) => {
      const nearestHotspot = hotspots.reduce((nearest, hotspot) => {
        const driverDist = Math.hypot(driver.latitude - hotspot.latitude, driver.longitude - hotspot.longitude);
        return driverDist < (nearest.dist || Infinity) ? { hotspot, dist: driverDist } : nearest;
      }, {});

      if (nearestHotspot.hotspot) {
        return {
          ...driver,
          latitude: driver.latitude + (nearestHotspot.hotspot.latitude - driver.latitude) * 0.05,
          longitude: driver.longitude + (nearestHotspot.hotspot.longitude - driver.longitude) * 0.05,
          targetZone: nearestHotspot.hotspot.name, // Store target zone for UI
        };
      }
      return driver;
    });
  });
}
