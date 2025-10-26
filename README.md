# URBAN RIDE

A web application that mimics the core functionality of Uber. This project allows users to book rides, drivers to accept rides, and provides real-time location services using the **TomTom API**.

---
## LIVE LINK:https://urbanride-kmih.onrender.com/

## Demo Video 🎬

<video width="600" controls>
  <source src="assets/urbanride.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Tech Stack

### Frontend:
- **HTML**: Structure of the web pages.
- **CSS**: Styling and responsive design.
- **JavaScript**: Interactivity and dynamic user experience.

### Backend:
- **Node.js**: Server-side runtime environment.
- **Express.js**: Web framework for building RESTful APIs.
- **MongoDB**: Database to store user, driver, and ride details.

### APIs:
- **TomTom API**: Real-time location services and route mapping.

---

## Features

1. **User Features**:
   - Sign up and log in.
   - Book a ride by entering pickup and destination locations.
   - View current and past rides.

2. **Driver Features**:
   - Sign up and log in.
   - View and accept/reject ride requests.
   - Mark ride as "completed."

3. **Admin Features**:
   - View all users, drivers, and rides.
   - Manage user and driver accounts.

4. **Other Features**:
   - Real-time route mapping and distance calculation (TomTom API).
   - Responsive design for desktop.

---

## Installation

### Prerequisites:
- **Node.js** installed on your machine.
- **MongoDB** instance running locally or on a cloud service.
- TomTom API key.

### Steps:
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/uber-clone.git
   ```
2. .env:
```bash
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
```
3. To run:
```bash
   npm run dev
   ```

