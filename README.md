# Ironforge Tracker

A simple web application to track your gym workouts.

## Setup Instructions

### Database Setup (PostgreSQL)
1. Ensure PostgreSQL is installed and running on your machine.
2. Create a database named `ironforge` (or use your default).
3. Connect to the database and run the following SQL to create the table:
   ```sql
   CREATE TABLE workouts (
       id SERIAL PRIMARY KEY,
       exercise VARCHAR(255) NOT NULL,
       weight INT NOT NULL,
       reps INT NOT NULL
   );
   ```

### Backend Setup
1. Open a terminal in the `ironforge-backend` folder.
2. Create a `.env` file based on the credentials you used for PostgreSQL:
   ```env
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ironforge
   ```
3. Run `npm install` to install dependencies.
4. Run `node server.js` to start the backend server on `http://localhost:3000`.

### Frontend Setup
1. Open the `ironforge-frontend` folder.
2. Open `index.html` in your web browser (or use an extension like Live Server).
