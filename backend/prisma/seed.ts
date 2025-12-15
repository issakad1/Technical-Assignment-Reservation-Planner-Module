import { PrismaClient, ReservationStatus, VehicleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.reservationAuditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicleClass.deleteMany();
  await prisma.location.deleteMany();
  await prisma.rateHead.deleteMany();

  // Create Locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        code: 'LAX',
        name: 'Los Angeles Airport',
        address: '1 World Way',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90045',
        phone: '(310) 555-0100',
        email: 'lax@rentall.com',
        operatingHours: '24/7',
      },
    }),
    prisma.location.create({
      data: {
        code: 'SFO',
        name: 'San Francisco Airport',
        address: 'San Francisco International Airport',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94128',
        phone: '(650) 555-0100',
        email: 'sfo@rentall.com',
        operatingHours: '24/7',
      },
    }),
    prisma.location.create({
      data: {
        code: 'SDO',
        name: 'San Diego Downtown',
        address: '123 Harbor Dr',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101',
        phone: '(619) 555-0100',
        email: 'sdo@rentall.com',
        operatingHours: 'Mon-Sun: 8AM-8PM',
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create Vehicle Classes
  const vehicleClasses = await Promise.all([
    prisma.vehicleClass.create({
      data: {
        name: 'Economy',
        description: 'Fuel-efficient compact cars perfect for city driving',
        dailyRate: 35.00,
        weeklyRate: 210.00,
        monthlyRate: 750.00,
        mileageRate: 0.15,
        capacity: 5,
        features: ['Air Conditioning', 'Automatic', 'Bluetooth'],
      },
    }),
    prisma.vehicleClass.create({
      data: {
        name: 'Standard',
        description: 'Comfortable mid-size sedans for everyday use',
        dailyRate: 45.00,
        weeklyRate: 270.00,
        monthlyRate: 950.00,
        mileageRate: 0.18,
        capacity: 5,
        features: ['Air Conditioning', 'Automatic', 'Bluetooth', 'Cruise Control'],
      },
    }),
    prisma.vehicleClass.create({
      data: {
        name: 'SUV',
        description: 'Spacious SUVs perfect for families and group travel',
        dailyRate: 75.00,
        weeklyRate: 450.00,
        monthlyRate: 1600.00,
        mileageRate: 0.25,
        capacity: 7,
        features: ['Air Conditioning', 'Automatic', 'Bluetooth', 'Cruise Control', '4WD', 'Navigation'],
      },
    }),
    prisma.vehicleClass.create({
      data: {
        name: 'Luxury',
        description: 'Premium vehicles with top-tier comfort and features',
        dailyRate: 120.00,
        weeklyRate: 720.00,
        monthlyRate: 2800.00,
        mileageRate: 0.35,
        capacity: 5,
        features: ['Air Conditioning', 'Automatic', 'Bluetooth', 'Cruise Control', 'Leather Seats', 'Navigation', 'Premium Sound'],
      },
    }),
  ]);

  console.log(`✅ Created ${vehicleClasses.length} vehicle classes`);

  // Create Rate Heads
  const rates = await Promise.all([
    prisma.rateHead.create({
      data: {
        code: 'STANDARD',
        name: 'Standard Rate',
        description: 'Standard daily/weekly/monthly rates',
        isActive: true,
      },
    }),
    prisma.rateHead.create({
      data: {
        code: 'WEEKEND',
        name: 'Weekend Special',
        description: 'Special weekend rates with 10% discount',
        isActive: true,
      },
    }),
    prisma.rateHead.create({
      data: {
        code: 'CORPORATE',
        name: 'Corporate Rate',
        description: 'Corporate customer discounted rates',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${rates.length} rate heads`);

  // Create Vehicles
  const vehicles = await Promise.all([
    // Economy vehicles at LAX
    prisma.vehicle.create({
      data: {
        unitNumber: 'A-101',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        color: 'Silver',
        vin: 'JT2BF18K0X0123456',
        licensePlate: '7ABC123',
        mileage: 15000,
        status: VehicleStatus.AVAILABLE,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        locationId: locations.find(l => l.code === 'LAX')!.id,
      },
    }),
    prisma.vehicle.create({
      data: {
        unitNumber: 'A-102',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        color: 'White',
        vin: 'JT2BF18K0X0123457',
        licensePlate: '7ABC124',
        mileage: 12000,
        status: VehicleStatus.AVAILABLE,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        locationId: locations.find(l => l.code === 'LAX')!.id,
      },
    }),
    prisma.vehicle.create({
      data: {
        unitNumber: 'A-103',
        make: 'Toyota',
        model: 'Corolla',
        year: 2024,
        color: 'Blue',
        vin: 'JT2BF18K0X0123458',
        licensePlate: '7ABC125',
        mileage: 8000,
        status: VehicleStatus.AVAILABLE,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Economy')!.id,
        locationId: locations.find(l => l.code === 'LAX')!.id,
      },
    }),
    // SUVs
    prisma.vehicle.create({
      data: {
        unitNumber: 'D-201',
        make: 'Chevrolet',
        model: 'Suburban',
        year: 2023,
        color: 'Black',
        vin: 'JT2BF18K0X0123459',
        licensePlate: '7ABC126',
        mileage: 20000,
        status: VehicleStatus.AVAILABLE,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        locationId: locations.find(l => l.code === 'LAX')!.id,
      },
    }),
    prisma.vehicle.create({
      data: {
        unitNumber: 'D-202',
        make: 'Ford',
        model: 'Explorer',
        year: 2024,
        color: 'Red',
        vin: 'JT2BF18K0X0123460',
        licensePlate: '7ABC127',
        mileage: 5000,
        status: VehicleStatus.AVAILABLE,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        locationId: locations.find(l => l.code === 'SFO')!.id,
      },
    }),
  ]);

  console.log(`✅ Created ${vehicles.length} vehicles`);

  // Create Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        licenseNumber: 'D1234567',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@example.com',
        phone: '(555) 234-5678',
        licenseNumber: 'D2345678',
        address: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Emily',
        lastName: 'Brown',
        email: 'emily.brown@example.com',
        phone: '(555) 345-6789',
        licenseNumber: 'D3456789',
        address: '789 Pine St',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Thomas',
        lastName: 'Garcia',
        email: 'thomas.garcia@example.com',
        phone: '(555) 456-7890',
        licenseNumber: 'D4567890',
        address: '321 Elm St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90002',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Patricia',
        lastName: 'Rodriguez',
        email: 'patricia.rodriguez@example.com',
        phone: '(555) 567-8901',
        licenseNumber: 'D5678901',
        address: '654 Maple Dr',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92103',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'David',
        lastName: 'Williams',
        email: 'david.williams@example.com',
        phone: '(555) 678-9012',
        licenseNumber: 'D6789012',
        address: '987 Cedar Ln',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Jennifer',
        lastName: 'Martinez',
        email: 'jennifer.martinez@example.com',
        phone: '(555) 789-0123',
        licenseNumber: 'D7890123',
        address: '147 Birch Way',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90003',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Robert',
        lastName: 'Taylor',
        email: 'robert.taylor@example.com',
        phone: '(555) 890-1234',
        licenseNumber: 'D8901234',
        address: '258 Spruce Ct',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92104',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create some sample reservations with CURRENT dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Helper to add days
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const reservations = await Promise.all([
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00001`,
        customerId: customers[0].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        vehicleId: vehicles[0].id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: today,
        dateDue: addDays(today, 3),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'STANDARD',
        estimatedTotal: 135.00,
        estimatedDays: 3,
        estimatedMiles: 300,
        createdBy: 'system',
        modifiedBy: 'system',
        customerNotes: 'Need car seat for child',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00012`,
        customerId: customers[1].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 4),
        dateDue: addDays(today, 7),
        locationCodeOut: 'LAX',
        locationCodeDue: 'SFO',
        rateCode: 'STANDARD',
        estimatedTotal: 165.00,
        estimatedDays: 3,
        createdBy: 'system',
        modifiedBy: 'system',
        notes: 'One-way rental to SFO',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00023`,
        customerId: customers[2].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        vehicleId: vehicles[1].id,
        reservationStatus: ReservationStatus.QUOTE,
        dateOut: addDays(today, 1),
        dateDue: addDays(today, 4),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'WEEKEND',
        estimatedTotal: 121.50,
        estimatedDays: 3,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00034`,
        customerId: customers[3].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Economy')!.id,
        vehicleId: vehicles[2].id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 2),
        dateDue: addDays(today, 6),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'STANDARD',
        estimatedTotal: 140.00,
        estimatedDays: 4,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00008`,
        customerId: customers[4].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        vehicleId: vehicles[3].id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 2),
        dateDue: addDays(today, 5),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'STANDARD',
        estimatedTotal: 225.00,
        estimatedDays: 3,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00019`,
        customerId: customers[5].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 3),
        dateDue: addDays(today, 6),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'CORPORATE',
        estimatedTotal: 202.50,
        estimatedDays: 3,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00027`,
        customerId: customers[6].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        reservationStatus: ReservationStatus.QUOTE,
        dateOut: addDays(today, 4),
        dateDue: addDays(today, 6),
        locationCodeOut: 'SFO',
        locationCodeDue: 'SFO',
        rateCode: 'STANDARD',
        estimatedTotal: 90.00,
        estimatedDays: 2,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00031`,
        customerId: customers[7].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        vehicleId: vehicles[4].id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 3),
        dateDue: addDays(today, 7),
        locationCodeOut: 'SFO',
        locationCodeDue: 'SFO',
        rateCode: 'STANDARD',
        estimatedTotal: 300.00,
        estimatedDays: 4,
        createdBy: 'system',
        modifiedBy: 'system',
      },
    }),
    // Unassigned reservations
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00045`,
        customerId: customers[0].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'Standard')!.id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 3),
        dateDue: addDays(today, 5),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'STANDARD',
        estimatedTotal: 90.00,
        estimatedDays: 2,
        createdBy: 'system',
        modifiedBy: 'system',
        notes: 'Unassigned - waiting for vehicle',
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: `RES-${now.getFullYear()}-00046`,
        customerId: customers[1].id,
        vehicleClassId: vehicleClasses.find(vc => vc.name === 'SUV')!.id,
        reservationStatus: ReservationStatus.CONFIRMED,
        dateOut: addDays(today, 4),
        dateDue: addDays(today, 7),
        locationCodeOut: 'LAX',
        locationCodeDue: 'LAX',
        rateCode: 'WEEKEND',
        estimatedTotal: 202.50,
        estimatedDays: 3,
        createdBy: 'system',
        modifiedBy: 'system',
        notes: 'Unassigned - customer preference for newer model',
      },
    }),
  ]);

  console.log(`✅ Created ${reservations.length} reservations`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });