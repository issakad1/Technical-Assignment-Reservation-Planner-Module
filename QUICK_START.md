# RENTALL Reservation Planner - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Option 1: Docker (Recommended)

```bash
# 1. Clone and navigate to project
cd rentall-reservation-planner

# 2. Start all services with Docker
docker-compose up -d

# 3. Setup database (in a new terminal)
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run prisma:seed
```

**That's it!** 

- 🔗 Frontend: http://localhost:3000
- 🔗 API: http://localhost:3001
- 🔗 API Docs: http://localhost:3001/api/docs

---

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+

#### Backend

```bash
cd backend

# Install
npm install

# Configure
cp .env.example .env
# Edit .env: Set DATABASE_URL to your PostgreSQL connection

# Setup Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Run
npm run start:dev
```

✅ API running at http://localhost:3001

#### Frontend (New Terminal)

```bash
cd frontend

# Install
npm install

# Run
npm run dev
```

✅ Frontend running at http://localhost:3000

---

## 📚 First Steps

### 1. View API Documentation
Visit: http://localhost:3001/api/docs

### 2. Explore Sample Data
The seed script creates:
- 8 Customers
- 5 Vehicles across 4 classes
- 3 Locations (LAX, SFO, SDO)
- 10 Sample Reservations
- 3 Rate Codes

### 3. Test the API

#### Check Schedule
```bash
curl "http://localhost:3001/api/v1/reservations/schedule?locationCode=LAX&dateFrom=2025-12-01&dateTo=2025-12-31"
```

#### Create Reservation
```bash
curl -X POST http://localhost:3001/api/v1/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "vehicleClassId": 2,
    "locationCodeOut": "LAX",
    "locationCodeDue": "LAX",
    "dateOut": "2025-12-25T10:00:00Z",
    "dateDue": "2025-12-30T10:00:00Z",
    "rateCode": "STANDARD",
    "createdBy": "test@example.com"
  }'
```

#### Check Availability
```bash
curl "http://localhost:3001/api/v1/reservations/availability?vehicleClassId=1&locationCodeOut=LAX&locationCodeDue=LAX&dateOut=2025-12-20T10:00:00Z&dateDue=2025-12-25T10:00:00Z"
```

### 4. Run Tests
```bash
cd backend
npm test
```

---

## 🎯 What to Test

1. **Create Reservations** - Test validation, calculation
2. **Assign Vehicles** - Test overbooking warnings
3. **Check Availability** - Test date range filtering
4. **Update Reservations** - Test estimate recalculation
5. **Cancel Reservations** - Test status rules
6. **View Schedule** - Test timeline data structure

---

## 📖 Full Documentation

- `README.md` - Complete project documentation
- `docs/DESIGN.md` - Design decisions and architecture
- `docs/IMPLEMENTATION_SUMMARY.md` - Implementation details

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Make sure PostgreSQL is running
# Check your DATABASE_URL in .env
```

### Port Already in Use
```bash
# Backend (3001) or Frontend (3000) port in use?
# Change ports in .env (backend) or vite.config.ts (frontend)
```

### Prisma Client Not Generated
```bash
cd backend
npm run prisma:generate
```

---

## 💡 Tips

- Use Postman/Thunder Client/Insomnia for easier API testing
- Check Swagger docs for all available endpoints
- Database resets with: `npm run prisma:migrate reset`
- Fresh seed data: `npm run prisma:seed`

---

**Ready to Go!** 🎉

For questions or issues, refer to the comprehensive README.md or Design documentation.
