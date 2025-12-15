# RENTALL Reservation Planner - Design Document

## Table of Contents
1. [Data Model Design](#data-model-design)
2. [Business Logic Implementation](#business-logic-implementation)
3. [System Architecture](#system-architecture)
4. [Future Improvements](#future-improvements)

---

## 1. Data Model Design

### Overview
The database schema is designed around rental operations with emphasis on:
- **Audit Trail**: Complete history of all changes
- **Flexibility**: Support for one-way rentals, overbooking, multiple statuses
- **Performance**: Strategic indexing for common queries
- **Scalability**: Normalized structure supporting growth

### Entity Relationship Diagram

```
┌──────────────┐       ┌────────────────┐       ┌──────────────┐
│   Customer   │       │  Reservation   │       │   Vehicle    │
├──────────────┤       ├────────────────┤       ├──────────────┤
│ id (PK)      │──────<│ customerId (FK)│       │ id (PK)      │
│ firstName    │       │ vehicleId (FK) │>──────│ unitNumber   │
│ lastName     │       │ vehicleClassId │       │ make, model  │
│ email        │       │ reservationNum │       │ vehicleClass │
│ phone        │       │ status         │       │ locationId   │
└──────────────┘       │ dateOut/Due    │       └──────────────┘
                       │ locationOut/Due│               │
                       │ estimatedTotal │               │
                       └────────────────┘               │
                              │                         │
                              │                         │
                       ┌──────▼──────────┐       ┌──────▼──────┐
                       │  AuditLog       │       │VehicleClass │
                       ├─────────────────┤       ├─────────────┤
                       │ auditId (PK)    │       │ id (PK)     │
                       │ reservationId   │       │ name        │
                       │ action          │       │ dailyRate   │
                       │ oldValues (JSON)│       │ mileageRate │
                       │ newValues (JSON)│       └─────────────┘
                       │ changedBy       │
                       └─────────────────┘
```

### Key Design Decisions

#### 1. Reservation Number Generation

**Requirement**: Format RES-{YEAR}-{SEQUENCE}

**Implementation**:
```typescript
private async generateReservationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RES-${year}-`;
  
  // Get last reservation for this year
  const lastReservation = await this.prisma.reservation.findFirst({
    where: { reservationNumber: { startsWith: prefix } },
    orderBy: { reservationNumber: 'desc' },
  });
  
  let sequence = 1;
  if (lastReservation) {
    const lastNumber = lastReservation.reservationNumber.split('-')[2];
    sequence = parseInt(lastNumber, 10) + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(5, '0')}`;
}
```

**Design Rationale**:
- **Yearly Reset**: Keeps numbers manageable, easier for staff to reference recent bookings
- **5-Digit Padding**: Supports up to 99,999 reservations per year
- **Sortable**: String comparison yields chronological order
- **Human-Readable**: Easy to communicate over phone, email
- **Database Query**: Uses indexed field for fast lookup

**Alternatives Considered**:
- UUID: Rejected (not human-friendly)
- Sequential without year: Rejected (numbers grow too large)
- Daily reset: Rejected (not unique enough for busy locations)

**Edge Cases Handled**:
- First reservation of the year
- Concurrent requests (database-level uniqueness constraint)
- Year transition

---

#### 2. Availability & Overbooking Detection

**Challenge**: Determine if a vehicle is available during a date range while allowing controlled overbooking

**Overlap Detection Algorithm**:
```typescript
// Two date ranges overlap if:
(existing.dateOut < new.dateDue) AND (existing.dateDue > new.dateOut)

// Visual representation:
Existing:    |---------|
New:              |---------|  ← OVERLAP
New:                          |---| ← NO OVERLAP
```

**Implementation**:
```typescript
async checkAvailability(query: CheckAvailabilityDto) {
  const vehicles = await this.prisma.vehicle.findMany({
    where: {
      vehicleClassId: query.vehicleClassId,
      location: { code: query.locationCodeOut },
      status: 'AVAILABLE',
    },
    include: {
      reservations: {
        where: {
          reservationStatus: {
            in: ['QUOTE', 'CONFIRMED', 'CHECKED_OUT'],
          },
          OR: [{
            AND: [
              { dateOut: { lt: dateDue } },
              { dateDue: { gt: dateOut } },
            ],
          }],
        },
      },
    },
  });
  
  // Vehicles with no overlapping reservations are available
  const available = vehicles.filter(v => v.reservations.length === 0);
  
  return {
    totalVehicles: vehicles.length,
    availableCount: available.length,
    availableVehicles: available.map(...),
    occupiedCount: vehicles.length - available.length,
  };
}
```

**Overbooking Strategy**:
- **Warning, not Prevention**: System warns but allows overbooking
- **Business Justification**: 
  - No-show rate typically 10-15% in rental industry
  - Cancellations create availability
  - Unused vehicles = lost revenue
  - Staff can make informed decisions with warnings

**Overbooking Response**:
```json
{
  "reservation": { ... },
  "overbookingWarning": true,
  "overlappingReservations": 2
}
```

**Design Rationale**:
- Database-level date range comparison (efficient)
- Excludes CANCELLED and COMPLETED reservations from overlap check
- Only considers active vehicles at pickup location
- Returns detailed information for staff decision-making

---

#### 3. Status Transitions

**State Machine**:
```
┌───────┐                    ┌───────────┐
│ QUOTE │───────────────────>│ CONFIRMED │
└───┬───┘                    └─────┬─────┘
    │                              │
    │                              │
    │     ┌─────────────┐          │
    └────>│  CANCELLED  │<─────────┘
          └─────────────┘          │
                                   │
                                   ▼
                            ┌──────────────┐
                            │ CHECKED_OUT  │
                            └──────┬───────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │  COMPLETED   │
                            └──────────────┘
```

**Business Rules**:

| Current Status | Allowed Transitions | Restrictions |
|---------------|-------------------|--------------|
| QUOTE | CONFIRMED, CANCELLED | None |
| CONFIRMED | CHECKED_OUT, CANCELLED | None |
| CHECKED_OUT | COMPLETED | Cannot cancel |
| COMPLETED | None | Terminal state |
| CANCELLED | None | Terminal state |

**Implementation Guards**:
```typescript
private async canModifyReservation(reservationId: number): Promise<void> {
  const reservation = await this.findOne(reservationId);
  
  if (
    reservation.reservationStatus === ReservationStatus.COMPLETED ||
    reservation.reservationStatus === ReservationStatus.CANCELLED
  ) {
    throw new BadRequestException(
      `Cannot modify ${reservation.reservationStatus.toLowerCase()} reservation`
    );
  }
}
```

**Why These Rules**:
- **QUOTE → CONFIRMED**: Standard booking flow
- **CONFIRMED → CHECKED_OUT**: Customer picks up vehicle
- **CHECKED_OUT → COMPLETED**: Customer returns vehicle
- **Cannot modify COMPLETED**: Historical record integrity
- **Cannot modify CANCELLED**: Prevents accidental "un-cancellation"
- **Vehicle unassigned on CANCEL**: Frees up fleet

---

#### 4. Audit Logging

**Approach**: Full snapshot logging with JSON storage

**Structure**:
```typescript
interface AuditLog {
  auditId: number;
  reservationId: number;
  action: 'CREATED' | 'MODIFIED' | 'VEHICLE_ASSIGNED' | 
          'VEHICLE_UNASSIGNED' | 'STATUS_CHANGED' | 'CANCELLED';
  oldValues: JSON;  // Snapshot before change
  newValues: JSON;  // Snapshot after change
  changedBy: string;
  changedAt: DateTime;
}
```

**Actions Logged**:
1. **CREATED**: New reservation
2. **MODIFIED**: Any field update
3. **VEHICLE_ASSIGNED**: Vehicle assignment
4. **VEHICLE_UNASSIGNED**: Vehicle removal
5. **STATUS_CHANGED**: Status transition
6. **CANCELLED**: Reservation cancellation

**Implementation**:
```typescript
private async createAuditLog(
  reservationId: number,
  action: AuditAction,
  newValues: any,
  oldValues?: any,
  changedBy: string = 'system',
) {
  await this.prisma.reservationAuditLog.create({
    data: {
      reservationId,
      action,
      newValues,
      oldValues,
      changedBy,
    },
  });
}
```

**Benefits**:
- **Compliance**: Full audit trail for regulations
- **Debugging**: Track down data issues
- **Customer Service**: Resolve disputes with historical data
- **Analytics**: Understand user behavior
- **Security**: Detect unauthorized changes

**Trade-offs**:
- **Storage**: More database space (acceptable for value)
- **Performance**: Extra write on every change (minimal impact)
- **Complexity**: JSON querying more complex (rarely needed)

**Optimizations**:
- Index on `reservationId` for fast retrieval
- Index on `changedAt` for time-based queries
- Partition by month/year for very large datasets (future)

---

## 2. Business Logic Implementation

### Estimate Calculation

**Requirements**:
- Calculate rental duration in days (decimal allowed)
- Calculate total cost based on daily rate + mileage
- Apply rate discounts
- Round to 2 decimal places

**Implementation**:

```typescript
// 1. Calculate Days
private calculateEstimatedDays(dateOut: Date, dateDue: Date): number {
  const milliseconds = dateDue.getTime() - dateOut.getTime();
  const days = milliseconds / (1000 * 60 * 60 * 24);
  return Math.round(days * 100) / 100; // 2 decimal places
}

// 2. Calculate Total
private async calculateEstimatedTotal(
  vehicleClassId: number,
  rateCode: string,
  estimatedDays: number,
  estimatedMiles?: number,
): Promise<number> {
  const vehicleClass = await this.getVehicleClass(vehicleClassId);
  
  // Base calculation
  let total = vehicleClass.dailyRate * estimatedDays;
  
  // Add mileage charges
  if (estimatedMiles) {
    total += vehicleClass.mileageRate * estimatedMiles;
  }
  
  // Apply rate discounts
  total = this.applyRateDiscount(total, rateCode);
  
  return Math.round(total * 100) / 100;
}

private applyRateDiscount(amount: number, rateCode: string): number {
  switch (rateCode) {
    case 'WEEKEND':
      return amount * 0.90; // 10% off
    case 'CORPORATE':
      return amount * 0.85; // 15% off
    default:
      return amount;
  }
}
```

**Examples**:
```
Vehicle Class: Standard
Daily Rate: $45.00
Mileage Rate: $0.18/mile

Scenario 1: 3-day rental, 100 miles
Days: 3.00
Base: $45.00 × 3.00 = $135.00
Mileage: $0.18 × 100 = $18.00
Total: $153.00

Scenario 2: 2.5-day rental, WEEKEND rate
Days: 2.50
Base: $45.00 × 2.50 = $112.50
Discount: $112.50 × 0.90 = $101.25
Total: $101.25
```

---

### One-Way Rental Support

**Design**: Separate pickup and dropoff locations

**Database Fields**:
```typescript
locationCodeOut: string;  // Pickup location
locationCodeDue: string;  // Dropoff location
```

**Validation**:
- Both locations must exist
- Can be the same (round-trip)
- Can be different (one-way)

**Business Implications**:
- Additional fees for one-way (not implemented in MVP, but supported)
- Vehicle redistribution logistics
- Location-specific availability

---

## 3. System Architecture

### Backend Architecture

```
┌─────────────────────────────────────────────┐
│           NestJS Application                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌──────────────┐    │
│  │ Controllers  │──────│   Services   │    │
│  │              │      │              │    │
│  │ - HTTP       │      │ - Business   │    │
│  │ - Validation │      │   Logic      │    │
│  │ - DTOs       │      │ - Calculations│    │
│  └──────────────┘      └──────┬───────┘    │
│                               │             │
│                        ┌──────▼───────┐    │
│                        │ Prisma ORM   │    │
│                        └──────┬───────┘    │
└───────────────────────────────┼────────────┘
                                │
                        ┌───────▼────────┐
                        │   PostgreSQL   │
                        │                │
                        │ - Reservations │
                        │ - Audit Logs   │
                        │ - Analytics    │
                        └────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────┐
│         React Application                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌──────────────┐    │
│  │   Pages      │      │  Components  │    │
│  │              │      │              │    │
│  │ - Planner    │      │ - Timeline   │    │
│  │ - List       │      │ - ResvCard   │    │
│  │ - Detail     │      │ - Filters    │    │
│  └──────────────┘      └──────────────┘    │
│                                             │
│  ┌──────────────┐      ┌──────────────┐    │
│  │ React Query  │      │   Zustand    │    │
│  │              │      │              │    │
│  │ - API calls  │      │ - UI State   │    │
│  │ - Caching    │      │ - Filters    │    │
│  └──────────────┘      └──────────────┘    │
└─────────────────────────────────────────────┘
```

### API Layer Design

**Principles**:
1. **RESTful**: Standard HTTP methods and status codes
2. **Consistent**: Uniform response format
3. **Validated**: DTO validation on all inputs
4. **Documented**: Swagger/OpenAPI
5. **Error Handling**: Descriptive error messages

**Response Format**:
```json
// Success
{
  "id": 1,
  "data": { ... }
}

// List with Pagination
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// Error
{
  "statusCode": 400,
  "message": "Return date must be after pickup date",
  "error": "Bad Request"
}
```

---

## 4. Future Improvements

### Short Term (1-3 months)

1. **Payment Integration**
   - Stripe/PayPal for deposits
   - Full payment processing
   - Refund handling

2. **Notifications**
   - Email confirmations
   - SMS reminders
   - Push notifications

3. **Advanced Reporting**
   - Revenue reports
   - Utilization dashboards
   - Customer analytics

4. **Excel/PDF Export**
   - Reservation reports
   - Customer history
   - Invoice generation

### Medium Term (3-6 months)

1. **AI Price Optimization**
   - Demand-based pricing
   - Surge pricing for peak times
   - Discount recommendations

2. **Customer Portal**
   - Self-service booking
   - Modification requests
   - Payment history

3. **Mobile Apps**
   - iOS/Android native apps
   - Mobile check-in/out
   - Digital contracts

4. **Real-time Updates**
   - WebSocket integration
   - Live availability updates
   - Collaborative editing

### Long Term (6-12 months)

1. **Multi-Tenant Architecture**
   - White-label solution
   - Tenant isolation
   - Custom branding

2. **Fleet Management**
   - Maintenance scheduling
   - Fuel tracking
   - GPS integration

3. **Insurance Integration**
   - Coverage verification
   - Claim filing
   - Damage reports with photos

4. **Advanced Analytics**
   - Predictive maintenance
   - Demand forecasting
   - Route optimization for repositioning

---

## Conclusion

This design provides a solid foundation for a production rental management system with:

✅ **Scalable Data Model**: Normalized, indexed, and flexible
✅ **Robust Business Logic**: Handles edge cases and complex scenarios
✅ **Audit Compliance**: Complete change tracking
✅ **Performance Optimized**: Strategic indexing and caching
✅ **Future-Ready**: Designed for growth and enhancement

The system balances business requirements with technical best practices while maintaining simplicity and maintainability.
