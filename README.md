# RoomRadar

RoomRadar is a full-stack student housing platform for finding rental or sale properties near colleges and universities. It includes a responsive frontend, JWT authentication, owner and student roles, MongoDB-backed property storage, Google Maps integration, direct owner contact, and a basic listing verification flow.

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Auth: JWT + bcrypt password hashing
- Maps: Google Maps JavaScript API + Places Autocomplete

## Folder Structure

```text
RoomRadar/
|-- public/
|   |-- assets/
|   |   |-- css/styles.css
|   |   `-- js/
|   |       |-- api.js
|   |       |-- app.js
|   |       `-- auth-pages.js
|   |-- index.html
|   |-- login.html
|   `-- signup.html
|-- scripts/
|   `-- seed.js
|-- src/
|   |-- config/db.js
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   `-- utils/
|-- .env.example
|-- package.json
|-- README.md
`-- server.js
```

## Features

- Student and property owner signup/login
- JWT-protected authentication routes
- Map-based property discovery around campuses
- Search and filters for price, distance, listing mode, and property type
- Add, update, delete, and view property listings
- Direct contact flow from student to owner
- Owner inbox for incoming student inquiries
- Listing verification statuses: `pending`, `verified`, `rejected`
- Secure password hashing and request validation
- Seed script with demo users and listings

## Database Schema

### User

```js
{
  name: String,
  email: String,
  password: String,
  role: "student" | "owner" | "admin",
  phone: String
}
```

### Property

```js
{
  title: String,
  description: String,
  listingMode: "rent" | "sale",
  propertyType: "pg" | "hostel" | "apartment" | "flat" | "house" | "studio",
  price: Number,
  address: String,
  city: String,
  state: String,
  landmark: String,
  nearbyCollege: String,
  distanceFromCollege: Number,
  bedrooms: Number,
  bathrooms: Number,
  furnishing: "unfurnished" | "semi-furnished" | "fully-furnished",
  amenities: [String],
  images: [String],
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  contactPhone: String,
  contactEmail: String,
  verificationStatus: "pending" | "verified" | "rejected",
  owner: ObjectId("User")
}
```

### ContactMessage

```js
{
  property: ObjectId("Property"),
  owner: ObjectId("User"),
  student: ObjectId("User"),
  name: String,
  email: String,
  phone: String,
  message: String,
  status: "new" | "read"
}
```

## API Routes

### Auth

- `POST /api/auth/signup` - register a new student or owner
- `POST /api/auth/login` - login and receive JWT
- `GET /api/auth/me` - get the authenticated user

### Config

- `GET /api/config/public` - fetch Google Maps key and default map settings for the frontend

### Properties

- `GET /api/properties` - list/search properties
- `GET /api/properties/:id` - get single property details
- `POST /api/properties` - create a property listing (`owner`, `admin`)
- `PUT /api/properties/:id` - update a property listing (`owner`, `admin`)
- `DELETE /api/properties/:id` - delete a property listing (`owner`, `admin`)
- `GET /api/properties/mine` - get owner/admin listings
- `PATCH /api/properties/:id/verify` - approve/reject a listing (`admin`)

### Messages

- `POST /api/messages` - send a student inquiry to a property owner
- `GET /api/messages` - fetch owner/admin inbox
- `PATCH /api/messages/:id/read` - mark inquiry as read

## Query Parameters for Property Search

`GET /api/properties`

- `college` - text match for college or locality
- `listingMode` - `rent` or `sale`
- `propertyType` - property type filter
- `minPrice` - minimum price
- `maxPrice` - maximum price
- `distance` - search radius in kilometers
- `lat` - latitude of the search center
- `lng` - longitude of the search center
- `sort` - `distance`, `newest`, `priceAsc`, `priceDesc`

## Local Setup

1. Install Node.js 18+ and ensure `node` and `npm` are available in your terminal.
2. Install MongoDB locally or create a MongoDB Atlas database.
3. Copy `.env.example` to `.env`.
4. Fill in:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GOOGLE_MAPS_API_KEY`
5. Install dependencies:

```bash
npm install
```

6. Optional: seed demo data:

```bash
npm run seed
```

7. Start the app:

```bash
npm run dev
```

8. Open:

```text
http://localhost:5000
```

## Demo Accounts After Seeding

- Admin: `admin@roomradar.local` / `admin123`
- Owner: `owner@roomradar.local` / `owner123`
- Student: `student@roomradar.local` / `student123`

## Google Maps Setup

Enable these APIs in Google Cloud for the browser key you use:

- Maps JavaScript API
- Places API
- Geocoding API

The frontend works without a key, but the live map, autocomplete, and geocoding tools will show a fallback panel until `GOOGLE_MAPS_API_KEY` is configured.
