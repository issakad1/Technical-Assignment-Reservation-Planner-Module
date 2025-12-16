const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateColorsOnly() {
  console.log('🎨 Updating reservation colors (preserving all assignments)...\n');
  
  try {
    // Get all ASSIGNED reservations only
    const reservations = await prisma.reservation.findMany({
      where: {
        vehicleId: { not: null }, // Only assigned ones
        reservationStatus: { notIn: ['CANCELLED'] } // Skip cancelled
      },
      orderBy: { id: 'asc' },
      select: { 
        id: true, 
        reservationNumber: true,
        vehicleId: true,
        reservationStatus: true
      }
    });

    if (reservations.length === 0) {
      console.log('❌ No assigned reservations found!');
      return;
    }

    console.log(`Found ${reservations.length} assigned reservations\n`);

    // Assign different colors to different reservations
    // But NEVER change vehicleId or unassign anything!
    const colorUpdates = [];

    // Make some CHECKED_OUT (Green) - indices 0, 6
    if (reservations[0]) {
      colorUpdates.push({ 
        id: reservations[0].id, 
        number: reservations[0].reservationNumber,
        status: 'CHECKED_OUT',
        color: '🟢 Green'
      });
    }
    if (reservations[6]) {
      colorUpdates.push({ 
        id: reservations[6].id, 
        number: reservations[6].reservationNumber,
        status: 'CHECKED_OUT',
        color: '🟢 Green'
      });
    }

    // Make some QUOTE (Magenta) - indices 1, 2
    if (reservations[1]) {
      colorUpdates.push({ 
        id: reservations[1].id, 
        number: reservations[1].reservationNumber,
        status: 'QUOTE',
        color: '🟣 Magenta'
      });
    }
    if (reservations[2]) {
      colorUpdates.push({ 
        id: reservations[2].id, 
        number: reservations[2].reservationNumber,
        status: 'QUOTE',
        color: '🟣 Magenta'
      });
    }

    // Make 1 COMPLETED (Dark Green) - index 8
    if (reservations[8]) {
      colorUpdates.push({ 
        id: reservations[8].id, 
        number: reservations[8].reservationNumber,
        status: 'COMPLETED',
        color: '🌲 Dark Green'
      });
    }

    // Rest stay CONFIRMED (Blue) - no need to update

    console.log('Updating statuses (keeping all vehicle assignments):\n');

    // Update ONLY the status field, keep everything else
    for (const update of colorUpdates) {
      await prisma.reservation.update({
        where: { id: update.id },
        data: { 
          reservationStatus: update.status,
          // DO NOT touch vehicleId or any other field!
        }
      });
      console.log(`✅ ${update.number} → ${update.status} (${update.color})`);
    }

    console.log(`\n✨ Updated ${colorUpdates.length} colors while preserving all assignments!`);
    console.log('\n🎨 Color Legend:');
    console.log('  🟢 Green      = CHECKED_OUT');
    console.log('  🔵 Blue       = CONFIRMED');
    console.log('  🟣 Magenta    = QUOTE');
    console.log('  🌲 Dark Green = COMPLETED');
    console.log('\n✅ All vehicle assignments preserved!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateColorsOnly();