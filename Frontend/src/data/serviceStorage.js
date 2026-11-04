
import services from './services';

const STORAGE_KEY = 'studenthub_created_services';

// Get newly created services
export function getCreatedServices() {
  try {
    const savedServices = localStorage.getItem(STORAGE_KEY);
    return savedServices ? JSON.parse(savedServices) : [];
  } catch {
    return [];
  }
}

// Get all services
export function getAllServices() {
  return [...getCreatedServices(), ...services];
}

// Add a new service
export function addService(service) {
  const createdServices = getCreatedServices();

  createdServices.unshift(service);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(createdServices)
  );

  return service;
}
