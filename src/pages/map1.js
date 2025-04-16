import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icons
const hotspotIcons = {
  Static: new L.Icon({
    iconUrl: 'https://ucarecdn.com/948e111f-e1e6-4846-9a39-b38059ab3340/hotspoticon2.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  }),
  Dynamic: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  })
};

const driverIcon = new L.Icon({
  iconUrl: 'https://ucarecdn.com/12c704bf-2821-43ad-9817-1e274ef220fc/drivericon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const customerIcon = new L.Icon({
  iconUrl: 'https://ucarecdn.com/457662cd-d8a8-4a7c-a427-ff3172f635ad/customer.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export default function Map() {
  const [hotspots, setHotspots] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [routes, setRoutes] = useState([]);

  // Fetch data from backend
  const fetchData = async () => {
    const hotspotsResponse = await fetch('http://127.0.0.1:8000/hotspots');
    const customersResponse = await fetch('http://127.0.0.1:8000/customers');
    const driversResponse = await fetch('http://127.0.0.1:8000/drivers');

    const hotspotsData = await hotspotsResponse.json();
    const customersData = await customersResponse.json();
    const driversData = await driversResponse.json();

    setHotspots(hotspotsData);
    setCustomers(customersData);
    setDrivers(driversData);
  };

  // Optimize driver allocation
  const optimizeAllocation = async () => {
    const response = await fetch('http://127.0.0.1:8000/optimize-allocation', {
      method: 'POST',
    });
    const assignments = await response.json();
    setRoutes(assignments);
  };

  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Simulate driver movement
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setDrivers(prev => prev.map(driver => {
        const route = routes.find(r => r.driver_id === driver.id);
        if (!route) return driver;

        const target = [...hotspots, ...customers].find(t => t.id === route.target_id);
        if (!target) return driver;

        const step = 0.0005;
        const newLat = driver.latitude + (target.latitude - driver.latitude) * step;
        const newLng = driver.longitude + (target.longitude - driver.longitude) * step;

        const distance = Math.sqrt(
          (target.latitude - newLat) ** 2 + (target.longitude - newLng) ** 2
        );

        if (distance < 0.001) {
          setRoutes(prev => prev.filter(r => r.driver_id !== driver.id));
          return { ...driver, latitude: target.latitude, longitude: target.longitude };
        }

        return { ...driver, latitude: newLat, longitude: newLng };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, routes, hotspots, customers]);

  return (
    <div className="map-container">
      <div className="controls">
        <button onClick={() => setIsSimulating(!isSimulating)}>
          {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        <button onClick={optimizeAllocation}>Optimize Allocation</button>
      </div>

      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {hotspots.map(hotspot => (
          <Marker
            key={`hotspot-${hotspot.id}`}
            position={[hotspot.latitude, hotspot.longitude]}
            icon={hotspotIcons[hotspot.hotspot_type]}
          >
            <Popup>
              <div className="hotspot-popup">
                <h3>{hotspot.name}</h3>
                <p>Type: {hotspot.hotspot_type}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {customers.map(customer => (
          <Marker
            key={`customer-${customer.id}`}
            position={[customer.latitude, customer.longitude]}
            icon={customerIcon}
          >
            <Popup>
              <div className="customer-popup">
                <h3>{customer.name}</h3>
                <p>Status: {customer.driver_id ? 'Assigned' : 'Waiting'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {drivers.map(driver => (
          <Marker
            key={`driver-${driver.id}`}
            position={[driver.latitude, driver.longitude]}
            icon={driverIcon}
          >
            <Popup>
              <div className="driver-popup">
                <h3>Auto Driver {driver.id}</h3>
                <p>Status: {routes.some(r => r.driver_id === driver.id) ? 'En Route' : 'Idle'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {routes.map(route => {
          const driver = drivers.find(d => d.id === route.driver_id);
          const target = [...hotspots, ...customers].find(t => t.id === route.target_id);

          if (!driver || !target) return null;

          return (
            <Polyline
              key={`route-${route.driver_id}-${route.target_id}`}
              positions={[
                [driver.latitude, driver.longitude],
                [target.latitude, target.longitude]
              ]}
              color="blue"
            />
          );
        })}
      </MapContainer>
    </div>
  );
}