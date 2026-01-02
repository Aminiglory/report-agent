# Report Agent

A React-based application for processing sector reports and generating individual Excel sheets for each school.

## Features

- 🔐 User authentication (JWT-based)
- 📊 Upload sector reports (Excel format)
- 🏫 Automatic generation of individual school Excel sheets
- 📥 Download individual school reports
- 📅 Monthly history tracking
- 📱 Fully responsive design

## Setup

1. Install all dependencies:
```bash
npm run install-all
```

2. Make sure MongoDB is installed and running on your local machine.

3. Create a `.env` file in the `server` directory:
```
JWT_SECRET=your-secret-key-here
PORT=5000
MONGODB_URI=mongodb://localhost:27017/report-agent
```

4. Run the development servers:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend will be available at `http://localhost:5000`

## Project Structure

```
report-agent/
├── client/          # React frontend
├── server/          # Express backend with MongoDB
│   ├── models/      # Mongoose models (User, Report, School)
│   ├── routes/      # API routes
│   └── database/    # MongoDB connection
└── package.json     # Root package.json
```

## Technology Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB (local database: `report-agent`)
- **Authentication:** JWT
- **File Processing:** xlsx library

