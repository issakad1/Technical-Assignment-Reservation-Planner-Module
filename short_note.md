📄 DESIGN_NOTE.md
### Short Design Note
This document explains the key design decisions made for the RENTALL Reservation Planner technical assignment.


### 1. Data Model
The data model is centered around two core entities:
Reservation
Stores all reservation information including:
Reservation number
Customer and vehicle class
Optional assigned vehicle
Pickup and dropoff locations
Date range
Estimated duration and total
Reservation status
ReservationAuditLog
Tracks all changes to reservations:
Action type
Old and new values (JSON)
Timestamp
Actor
Supporting entities include Customer, Vehicle, VehicleClass, Location, and RateHead.
### 2. Reservation Number Generation
Reservation numbers follow the format:
RES-{YEAR}-{SEQUENCE}
Sequence resets annually
Numbers are padded for readability
Latest reservation for the year is queried and incremented
This approach is sufficient for the assignment scope.
A production system would use database sequences or transactional locking.
### 3. Availability & Overbooking Detection
Availability is determined by checking overlapping reservations using:
(existing.dateOut < new.dateDue) AND (existing.dateDue > new.dateOut)
Overbooking Strategy
Overbooking is allowed
System flags and warns when overlaps occur
Reservations are not blocked
This reflects real-world rental business practices where cancellations and no-shows are expected.
### 4. Reservation Status Transitions
The reservation lifecycle follows a controlled state machine:
QUOTE → CONFIRMED → CHECKED_OUT → COMPLETED
  ↓         ↓
CANCELLED  CANCELLED
Rules enforced:
Completed and cancelled reservations cannot be modified
Checked-out reservations cannot be cancelled
Cancelling a reservation unassigns its vehicle
All transitions are logged
### 5. Audit Logging
Every significant reservation change generates an audit log entry containing:
Action type
Before and after snapshots
Timestamp
Actor
This ensures traceability, supports debugging, and aligns with compliance needs.
### 6. Future Improvements
Potential enhancements include:
Authentication and roles
Payment processing
Notifications
Real-time updates
Advanced analytics and demand forecasting
Multi-tenant support


### Conclusion
The design prioritizes clarity, correctness, and alignment with business rules over completeness.
The architecture cleanly separates concerns, making the system easy to understand, test, and extend.