/**
 * Vehicle Capacity Utilities
 * Handles multi-vehicle selection, capacity validation, and smart suggestions
 */

export interface VehicleOption {
  id: string;
  name: string;
  capacity: number;
  type: string;
  isAvailable: boolean;
  dailyCost?: number;
  distanceCost?: number;
}

export interface SelectedVehicle {
  vehicleId: string;
  vehicleName: string;
  capacity: number;
  quantity: number; // Usually 1, but could be 2 of the same type
}

export interface CapacityValidationResult {
  isValid: boolean;
  totalCapacity: number;
  groupSize: number;
  shortfall: number; // Negative if capacity exceeds need
  message: string;
  suggestions: CapacitySuggestion[];
}

export interface CapacitySuggestion {
  type: 'upgrade' | 'add' | 'swap';
  message: string;
  vehicles: VehicleOption[];
}

/**
 * Calculate total capacity from selected vehicles
 */
export function calculateTotalCapacity(selectedVehicles: SelectedVehicle[]): number {
  return selectedVehicles.reduce((total, v) => total + (v.capacity * v.quantity), 0);
}

/**
 * Validate that selected vehicles can accommodate the group size
 */
export function validateCapacity(
  selectedVehicles: SelectedVehicle[],
  groupSize: number,
  availableVehicles: VehicleOption[]
): CapacityValidationResult {
  const totalCapacity = calculateTotalCapacity(selectedVehicles);
  const shortfall = groupSize - totalCapacity;
  const isValid = shortfall <= 0;

  const suggestions: CapacitySuggestion[] = [];

  if (!isValid) {
    // Find vehicles that could fill the gap
    const vehiclesThatFit = availableVehicles
      .filter(v => v.isAvailable && v.capacity >= shortfall)
      .sort((a, b) => a.capacity - b.capacity); // Smallest that fits first

    // Suggestion 1: Upgrade to larger vehicle (if single vehicle selected)
    if (selectedVehicles.length === 1) {
      const largerVehicles = availableVehicles
        .filter(v => v.isAvailable && v.capacity >= groupSize && v.id !== selectedVehicles[0].vehicleId)
        .sort((a, b) => a.capacity - b.capacity);

      if (largerVehicles.length > 0) {
        suggestions.push({
          type: 'upgrade',
          message: `Seleccione un vehículo de mayor capacidad`,
          vehicles: largerVehicles.slice(0, 3), // Top 3 options
        });
      }
    }

    // Suggestion 2: Add another vehicle
    if (vehiclesThatFit.length > 0) {
      suggestions.push({
        type: 'add',
        message: `Agregue un vehículo adicional (mínimo ${shortfall} pasajeros)`,
        vehicles: vehiclesThatFit.slice(0, 3),
      });
    }

    // If no single vehicle fits, suggest combination
    if (vehiclesThatFit.length === 0) {
      const smallerVehicles = availableVehicles
        .filter(v => v.isAvailable && v.capacity > 0)
        .sort((a, b) => b.capacity - a.capacity); // Largest first

      if (smallerVehicles.length > 0) {
        suggestions.push({
          type: 'add',
          message: `Agregue uno o más vehículos para completar la capacidad`,
          vehicles: smallerVehicles.slice(0, 5),
        });
      }
    }
  }

  const message = isValid
    ? `Capacidad total: ${totalCapacity} pasajeros (grupo: ${groupSize})`
    : `Capacidad insuficiente: ${totalCapacity} de ${groupSize} pasajeros necesarios`;

  return {
    isValid,
    totalCapacity,
    groupSize,
    shortfall,
    message,
    suggestions,
  };
}

/**
 * Check if removing a vehicle would still meet capacity requirements
 */
export function canRemoveVehicle(
  selectedVehicles: SelectedVehicle[],
  vehicleToRemove: string,
  groupSize: number
): boolean {
  const remaining = selectedVehicles.filter(v => v.vehicleId !== vehicleToRemove);
  const remainingCapacity = calculateTotalCapacity(remaining);
  return remainingCapacity >= groupSize;
}

/**
 * Find optimal vehicle combinations for a given group size
 */
export function suggestVehicleCombinations(
  groupSize: number,
  availableVehicles: VehicleOption[],
  maxCombinations: number = 5
): SelectedVehicle[][] {
  const combinations: SelectedVehicle[][] = [];
  const available = availableVehicles
    .filter(v => v.isAvailable)
    .sort((a, b) => b.capacity - a.capacity);

  // Option 1: Single vehicle that fits
  const singleVehicle = available.find(v => v.capacity >= groupSize);
  if (singleVehicle) {
    combinations.push([{
      vehicleId: singleVehicle.id,
      vehicleName: singleVehicle.name,
      capacity: singleVehicle.capacity,
      quantity: 1,
    }]);
  }

  // Option 2: Two vehicle combinations
  for (let i = 0; i < available.length && combinations.length < maxCombinations; i++) {
    for (let j = i; j < available.length && combinations.length < maxCombinations; j++) {
      const v1 = available[i];
      const v2 = available[j];
      const totalCapacity = v1.capacity + v2.capacity;

      if (totalCapacity >= groupSize) {
        const combo: SelectedVehicle[] = [];

        if (i === j) {
          // Same vehicle twice
          combo.push({
            vehicleId: v1.id,
            vehicleName: v1.name,
            capacity: v1.capacity,
            quantity: 2,
          });
        } else {
          combo.push({
            vehicleId: v1.id,
            vehicleName: v1.name,
            capacity: v1.capacity,
            quantity: 1,
          });
          combo.push({
            vehicleId: v2.id,
            vehicleName: v2.name,
            capacity: v2.capacity,
            quantity: 1,
          });
        }

        // Avoid duplicates
        const comboKey = combo.map(c => `${c.vehicleId}:${c.quantity}`).sort().join('|');
        const exists = combinations.some(existing =>
          existing.map(c => `${c.vehicleId}:${c.quantity}`).sort().join('|') === comboKey
        );

        if (!exists) {
          combinations.push(combo);
        }
      }
    }
  }

  return combinations;
}

/**
 * Format vehicle display name with capacity
 */
export function formatVehicleDisplay(vehicle: VehicleOption | SelectedVehicle, quantity: number = 1): string {
  const qtyPrefix = quantity > 1 ? `${quantity}x ` : '';
  const vehicleName = 'vehicleName' in vehicle ? vehicle.vehicleName : vehicle.name;
  return `${qtyPrefix}${vehicleName} (${vehicle.capacity} pax)`;
}

/**
 * Generate service line description for a vehicle assignment
 */
export function generateServiceLineDescription(
  vehicle: SelectedVehicle,
  days: number,
  distance: number
): string {
  const qtyStr = vehicle.quantity > 1 ? `${vehicle.quantity}x ` : '';
  return `Servicio de Transporte: ${days} Días // ${distance.toLocaleString()} Kms - ${qtyStr}${vehicle.vehicleName}`;
}
