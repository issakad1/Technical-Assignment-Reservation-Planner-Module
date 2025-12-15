export interface Reservation {
  id: number;
  reservationNumber: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  vehicleClass: {
    id: number;
    name: string;
  };
  vehicle?: {
    id: number;
    unitNumber: string;
  };
  dateOut: string;
  dateDue: string;
  reservationStatus: 'QUOTE' | 'CONFIRMED' | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED';
  estimatedTotal: number;
  locationCodeOut: string;
  locationCodeDue: string;
}

export interface Vehicle {
  id: number;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vehicleClass: {
    id: number;
    name: string;
  };
  location: {
    code: string;
    name: string;
  };
  reservations: Reservation[];
}

export interface ScheduleData {
  vehicles: Vehicle[];
  unassignedReservations: Reservation[];
}

export interface Location {
  id: number;
  code: string;
  name: string;
}

export interface VehicleClass {
  id: number;
  name: string;
  dailyRate: number;
}
