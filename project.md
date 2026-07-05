# Taxi Company Vehicle Tracking API — Project Plan

## 1. Business Overview

This API serves a taxi company that needs to track a fleet of vehicles in real time across a geographic hierarchy (provinces → districts → stations). The system supports:

- Managing the vehicle fleet and their GPS locations
- Managing drivers and their assignments
- Managing customer accounts and trip bookings
- Tracking live vehicle positions via GPS pings from onboard devices
- Querying trip history and generating operational reports

---

## 2. Data Model

### 2.1 Entity Relationship Summary

```
Province  ──< District ──< Station ──< Vehicle ──< Ping
                                          │
                                        Driver
                                          │
                                        Trip ──── Customer
```

### 2.2 Entities and Fields

---

#### Province
Represents the top-level geographic division.

| Field | Type    | Constraints       | Description            |
|-------|---------|-------------------|------------------------|
| id    | integer | PK, auto-increment| Unique identifier      |
| name  | string  | required, unique  | Province name          |

---

#### District
A sub-division within a province.

| Field       | Type    | Constraints        | Description                  |
|-------------|---------|-------------------|------------------------------|
| id          | integer | PK, auto-increment | Unique identifier            |
| name        | string  | required, unique   | District name                |
| province_id | integer | FK → Province      | Parent province              |

---

#### Station
A taxi stand or depot where vehicles and drivers are based.

| Field       | Type    | Constraints        | Description                       |
|-------------|---------|-------------------|-----------------------------------|
| id          | integer | PK, auto-increment | Unique identifier                 |
| name        | string  | required           | Station name                      |
| district_id | integer | FK → District      | District this station belongs to  |
| latitude    | float   | required           | GPS latitude of the station       |
| longitude   | float   | required           | GPS longitude of the station      |
| capacity    | integer | default: 10        | Max vehicles that can be stationed|

---

#### Vehicle
A taxi in the fleet.

| Field           | Type    | Constraints                   | Description                        |
|-----------------|---------|-------------------------------|------------------------------------|
| id              | integer | PK, auto-increment            | Unique identifier                  |
| register_number | string  | required, unique              | License plate, e.g. HB-6168        |
| device_id       | string  | required, unique              | Onboard GPS device identifier      |
| station_id      | integer | FK → Station                  | Home station                       |
| make            | string  | required                      | Manufacturer, e.g. Toyota          |
| model           | string  | required                      | Model name, e.g. Prius             |
| year            | integer | required                      | Manufacturing year                 |
| color           | string  | required                      | Vehicle color                      |
| type            | enum    | sedan\|van\|tuk-tuk\|luxury   | Vehicle category                   |
| capacity        | integer | required, min: 1              | Passenger seats                    |
| status          | enum    | available\|on_trip\|maintenance\|offline | Current operational status |

---

#### Driver
A person employed to operate a vehicle.

| Field          | Type    | Constraints               | Description                            |
|----------------|---------|--------------------------|----------------------------------------|
| id             | integer | PK, auto-increment        | Unique identifier                      |
| name           | string  | required                  | Full name                              |
| nic            | string  | required, unique          | National Identity Card number          |
| license_number | string  | required, unique          | Driving license number                 |
| phone          | string  | required, unique          | Contact number                         |
| email          | string  | optional, unique          | Email address                          |
| station_id     | integer | FK → Station              | Assigned home station                  |
| vehicle_id     | integer | FK → Vehicle, nullable    | Currently assigned vehicle (null if unassigned) |
| status         | enum    | available\|on_trip\|off_duty | Current duty status               |
| joined_date    | date    | required                  | Date of employment                     |

---

#### Customer
A person who books taxi trips.

| Field         | Type     | Constraints        | Description                   |
|---------------|----------|-------------------|-------------------------------|
| id            | integer  | PK, auto-increment | Unique identifier             |
| name          | string   | required           | Full name                     |
| phone         | string   | required, unique   | Contact number                |
| email         | string   | optional, unique   | Email address                 |
| registered_at | datetime | auto-set           | Account creation timestamp    |

---

#### Trip
The core business transaction — a single taxi ride.

| Field              | Type     | Constraints                                          | Description                         |
|--------------------|----------|------------------------------------------------------|-------------------------------------|
| id                 | integer  | PK, auto-increment                                   | Unique identifier                   |
| booking_ref        | string   | unique, auto-generated                               | Human-readable reference e.g. TRX-001234 |
| customer_id        | integer  | FK → Customer, required                              | Who booked the trip                 |
| driver_id          | integer  | FK → Driver, nullable                                | Assigned driver (null until assigned) |
| vehicle_id         | integer  | FK → Vehicle, nullable                               | Assigned vehicle (null until assigned) |
| pickup_latitude    | float    | required                                             | Pickup GPS latitude                 |
| pickup_longitude   | float    | required                                             | Pickup GPS longitude                |
| pickup_address     | string   | required                                             | Human-readable pickup address       |
| dropoff_latitude   | float    | required                                             | Drop-off GPS latitude               |
| dropoff_longitude  | float    | required                                             | Drop-off GPS longitude              |
| dropoff_address    | string   | required                                             | Human-readable drop-off address     |
| status             | enum     | requested\|assigned\|in_progress\|completed\|cancelled | Current trip status            |
| requested_at       | datetime | auto-set                                             | When the booking was made           |
| assigned_at        | datetime | nullable                                             | When a driver was assigned          |
| started_at         | datetime | nullable                                             | When the trip began                 |
| completed_at       | datetime | nullable                                             | When the trip ended                 |
| fare_amount        | decimal  | nullable, min: 0                                     | Charged fare in local currency      |
| distance_km        | float    | nullable                                             | Total distance travelled            |
| payment_method     | enum     | cash\|card\|wallet                                   | How the customer paid               |
| rating             | integer  | nullable, 1–5                                        | Customer rating of the trip         |

---

#### Ping
A single GPS location broadcast from a vehicle's onboard device.

| Field      | Type     | Constraints        | Description                          |
|------------|----------|--------------------|--------------------------------------|
| id         | integer  | PK, auto-increment | Unique identifier                    |
| vehicle_id | integer  | FK → Vehicle       | Which vehicle sent this ping         |
| latitude   | float    | required           | GPS latitude                         |
| longitude  | float    | required           | GPS longitude                        |
| speed_kmh  | float    | default: 0         | Speed at time of ping                |
| heading    | integer  | 0–360              | Direction of travel in degrees       |
| timestamp  | datetime | required           | When the ping was recorded           |

---

## 3. REST API Routes

### 3.1 Route Design Principles

- Resource names are **plural nouns** (e.g. `/vehicles`, `/drivers`)
- IDs are path parameters (e.g. `/vehicles/:id`)
- Filtering and pagination use query parameters (e.g. `?status=available&page=1&limit=20`)
- Nested resources express ownership (e.g. `/vehicles/:id/pings`)
- Status transitions use `PATCH` on a dedicated sub-resource (e.g. `PATCH /trips/:id/status`)

---

### 3.2 Geographic Routes (read-only)

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| GET    | /provinces                         | List all provinces                        |
| GET    | /provinces/:id                     | Get a specific province                   |
| GET    | /provinces/:id/districts           | List all districts in a province          |
| GET    | /districts                         | List all districts                        |
| GET    | /districts/:id                     | Get a specific district                   |
| GET    | /districts/:id/stations            | List all stations in a district           |
| GET    | /stations                          | List all stations                         |
| GET    | /stations/:id                      | Get a specific station                    |
| GET    | /stations/:id/vehicles             | List all vehicles based at a station      |
| GET    | /stations/:id/drivers              | List all drivers assigned to a station    |

---

### 3.3 Vehicle Routes

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| GET    | /vehicles                          | List all vehicles (filter: status, type)  |
| POST   | /vehicles                          | Register a new vehicle                    |
| GET    | /vehicles/:id                      | Get a specific vehicle                    |
| PUT    | /vehicles/:id                      | Update vehicle details                    |
| DELETE | /vehicles/:id                      | Remove a vehicle from the fleet           |
| PATCH  | /vehicles/:id/status               | Update vehicle operational status         |
| GET    | /vehicles/:id/pings                | Get GPS ping history for a vehicle        |
| GET    | /vehicles/:id/pings/latest         | Get the most recent location of a vehicle |
| GET    | /vehicles/:id/trips                | Get trip history for a vehicle            |

---

### 3.4 Driver Routes

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| GET    | /drivers                           | List all drivers (filter: status, station)|
| POST   | /drivers                           | Register a new driver                     |
| GET    | /drivers/:id                       | Get a specific driver                     |
| PUT    | /drivers/:id                       | Update driver details                     |
| DELETE | /drivers/:id                       | Remove a driver                           |
| PATCH  | /drivers/:id/status                | Update driver duty status                 |
| GET    | /drivers/:id/vehicle               | Get the driver's currently assigned vehicle |
| GET    | /drivers/:id/trips                 | Get trip history for a driver             |

---

### 3.5 Customer Routes

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| GET    | /customers                         | List all customers                        |
| POST   | /customers                         | Register a new customer                   |
| GET    | /customers/:id                     | Get a specific customer                   |
| PUT    | /customers/:id                     | Update customer details                   |
| DELETE | /customers/:id                     | Delete a customer account                 |
| GET    | /customers/:id/trips               | Get all trips for a customer              |

---

### 3.6 Trip Routes

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| GET    | /trips                             | List all trips (filter: status, date range)|
| POST   | /trips                             | Book a new trip                           |
| GET    | /trips/:id                         | Get a specific trip                       |
| PUT    | /trips/:id                         | Update trip details                       |
| DELETE | /trips/:id                         | Cancel and remove a trip                  |
| PATCH  | /trips/:id/status                  | Advance trip status (assign/start/complete/cancel) |
| GET    | /trips/:id/pings                   | Live tracking pings during a trip         |

---

### 3.7 Ping Routes

| Method | Route                              | Description                               |
|--------|------------------------------------|-------------------------------------------|
| POST   | /pings                             | Submit a GPS ping from an onboard device  |
| GET    | /pings                             | Query pings (filter: vehicle_id, time range) |

---

## 4. JSON Representations

### 4.1 Province

```json
{
  "id": 1,
  "name": "Western Province"
}
```

---

### 4.2 District

```json
{
  "id": 3,
  "name": "Colombo",
  "province_id": 1
}
```

---

### 4.3 Station

```json
{
  "id": 7,
  "name": "Colombo Fort Station",
  "district_id": 3,
  "latitude": 6.9344,
  "longitude": 79.8428,
  "capacity": 20
}
```

---

### 4.4 Vehicle

```json
{
  "id": 15,
  "register_number": "HB-6168",
  "device_id": "GPS-DEV-0042",
  "station_id": 7,
  "make": "Toyota",
  "model": "Prius",
  "year": 2020,
  "color": "White",
  "type": "sedan",
  "capacity": 4,
  "status": "available"
}
```

**POST /vehicles — Request Body:**
```json
{
  "register_number": "CAB-9910",
  "device_id": "GPS-DEV-0099",
  "station_id": 7,
  "make": "Toyota",
  "model": "Axio",
  "year": 2021,
  "color": "Silver",
  "type": "sedan",
  "capacity": 4
}
```

**PATCH /vehicles/:id/status — Request Body:**
```json
{
  "status": "maintenance"
}
```

---

### 4.5 Driver

```json
{
  "id": 8,
  "name": "Kamal Perera",
  "nic": "890123456V",
  "license_number": "LIC-2019-00321",
  "phone": "+94711234567",
  "email": "kamal@example.com",
  "station_id": 7,
  "vehicle_id": 15,
  "status": "available",
  "joined_date": "2021-03-15"
}
```

**POST /drivers — Request Body:**
```json
{
  "name": "Nimal Silva",
  "nic": "920456789V",
  "license_number": "LIC-2022-00458",
  "phone": "+94729876543",
  "email": "nimal@example.com",
  "station_id": 7,
  "joined_date": "2024-01-10"
}
```

**PATCH /drivers/:id/status — Request Body:**
```json
{
  "status": "off_duty"
}
```

---

### 4.6 Customer

```json
{
  "id": 42,
  "name": "Priya Fernando",
  "phone": "+94771112233",
  "email": "priya@example.com",
  "registered_at": "2025-06-01T09:30:00Z"
}
```

**POST /customers — Request Body:**
```json
{
  "name": "Priya Fernando",
  "phone": "+94771112233",
  "email": "priya@example.com"
}
```

---

### 4.7 Trip

```json
{
  "id": 101,
  "booking_ref": "TRX-001101",
  "customer_id": 42,
  "driver_id": 8,
  "vehicle_id": 15,
  "pickup_latitude": 6.9271,
  "pickup_longitude": 79.8612,
  "pickup_address": "Galle Face Hotel, Colombo 03",
  "dropoff_latitude": 6.9022,
  "dropoff_longitude": 79.8616,
  "dropoff_address": "Bambalapitiya, Colombo 04",
  "status": "completed",
  "requested_at": "2026-07-05T08:00:00Z",
  "assigned_at": "2026-07-05T08:03:00Z",
  "started_at": "2026-07-05T08:10:00Z",
  "completed_at": "2026-07-05T08:28:00Z",
  "fare_amount": 450.00,
  "distance_km": 3.2,
  "payment_method": "cash",
  "rating": 5
}
```

**POST /trips — Request Body:**
```json
{
  "customer_id": 42,
  "pickup_latitude": 6.9271,
  "pickup_longitude": 79.8612,
  "pickup_address": "Galle Face Hotel, Colombo 03",
  "dropoff_latitude": 6.9022,
  "dropoff_longitude": 79.8616,
  "dropoff_address": "Bambalapitiya, Colombo 04",
  "payment_method": "cash"
}
```

**PATCH /trips/:id/status — Request Body:**
```json
{
  "status": "assigned",
  "driver_id": 8,
  "vehicle_id": 15
}
```

Valid status transitions:
```
requested → assigned → in_progress → completed
requested → cancelled
assigned  → cancelled
```

---

### 4.8 Ping

```json
{
  "id": 9900,
  "vehicle_id": 15,
  "latitude": 6.9310,
  "longitude": 79.8500,
  "speed_kmh": 42.5,
  "heading": 180,
  "timestamp": "2026-07-05T08:15:30Z"
}
```

**POST /pings — Request Body (sent by GPS device):**
```json
{
  "device_id": "GPS-DEV-0042",
  "latitude": 6.9310,
  "longitude": 79.8500,
  "speed_kmh": 42.5,
  "heading": 180,
  "timestamp": "2026-07-05T08:15:30Z"
}
```

---

### 4.9 List Response Pattern

All list endpoints return an array wrapped in a standard envelope with pagination metadata:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 220,
    "pages": 11
  }
}
```

**Query parameters for all list endpoints:**
- `page` — page number (default: 1)
- `limit` — items per page (default: 20, max: 100)

---

### 4.10 Error Response

All errors return a consistent structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with id 999 not found"
  }
}
```

---

## 5. HTTP Status Codes

| Situation                              | Status Code           |
|----------------------------------------|-----------------------|
| Successful read                        | 200 OK                |
| Successful creation                    | 201 Created           |
| Successful update (no body)            | 204 No Content        |
| Invalid request body / validation fail | 400 Bad Request       |
| Resource not found                     | 404 Not Found         |
| Conflict (duplicate unique field)      | 409 Conflict          |
| Internal server error                  | 500 Internal Server Error |

---

## 6. Existing Implementation

The following routes are already implemented in [index.js](index.js) and serve data from [seed.json](seed.json):

| Route                          | Status      |
|-------------------------------|-------------|
| GET /provinces                 | Done        |
| GET /provinces/:id             | Done        |
| GET /districts                 | Done        |
| GET /districts/:id             | Done        |
| GET /stations                  | Done        |
| GET /stations/:id              | Done        |
| GET /vehicles                  | Done        |
| GET /vehicles/:id              | Done        |
| GET /vehicles/:id/pings        | Done        |
| GET /                          | Bug (typo `dseedData`) |

**Known bug:** Line 10 of [index.js:10](index.js#L10) references `dseedData` (should be `seedData`).

---

## 7. Implementation Roadmap

| Phase | Scope                                                          |
|-------|----------------------------------------------------------------|
| 1     | Fix existing bug; add `/provinces/:id/districts`, `/districts/:id/stations`, `/stations/:id/vehicles` |
| 2     | Add full CRUD for Drivers and Customers                        |
| 3     | Add Trip booking and status management                         |
| 4     | Add Ping ingestion endpoint (`POST /pings`) and latest-location query |
| 5     | Add pagination, filtering, and input validation middleware      |
