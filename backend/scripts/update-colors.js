"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function updateReservationStatuses() {
    console.log('🎨 Updating reservation statuses to show color variety...\n');
    try {
        const res1 = await prisma.reservation.update({
            where: { id: 22 },
            data: {
                reservationStatus: client_1.ReservationStatus.CHECKED_OUT,
                modifiedBy: 'color-demo-script',
            },
        });
        console.log(`✅ ${res1.reservationNumber} → CHECKED_OUT (🟢 GREEN)`);
        const res2 = await prisma.reservation.update({
            where: { id: 25 },
            data: {
                reservationStatus: client_1.ReservationStatus.CHECKED_OUT,
                modifiedBy: 'color-demo-script',
            },
        });
        console.log(`✅ ${res2.reservationNumber} → CHECKED_OUT (🟢 GREEN)`);
        console.log(`✅ RES-2025-00023 → QUOTE (🟣 PURPLE) - already set`);
        const res3 = await prisma.reservation.update({
            where: { reservationNumber: 'RES-2025-00027' },
            data: {
                reservationStatus: client_1.ReservationStatus.CANCELLED,
                modifiedBy: 'color-demo-script',
            },
        });
        console.log(`✅ ${res3.reservationNumber} → CANCELLED (🔴 RED)`);
        const res4 = await prisma.reservation.update({
            where: { id: 28 },
            data: {
                reservationStatus: client_1.ReservationStatus.COMPLETED,
                modifiedBy: 'color-demo-script',
            },
        });
        console.log(`✅ ${res4.reservationNumber} → COMPLETED (🟢 DARK GREEN)`);
        console.log(`✅ Other reservations → CONFIRMED (🔵 BLUE)`);
        console.log('\n🎉 Status updates complete!\n');
        console.log('Color Legend:');
        console.log('🟢 GREEN (emerald-600) = CHECKED_OUT');
        console.log('🟢 DARK GREEN (emerald-700) = COMPLETED');
        console.log('🟣 PURPLE (purple-500) = QUOTE');
        console.log('🔵 BLUE (blue-500) = CONFIRMED');
        console.log('🔴 RED (red-500) = CANCELLED');
        console.log('\n📊 Refresh your browser to see the colorful timeline!');
    }
    catch (error) {
        console.error('❌ Error updating statuses:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
updateReservationStatuses();
//# sourceMappingURL=update-colors.js.map