# Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Installation Steps

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Install and start MongoDB:**
   Make sure MongoDB is installed and running on your local machine.
   - The application will connect to: `mongodb://localhost:27017/report-agent`
   - If your MongoDB is on a different host/port, set `MONGODB_URI` in the `.env` file

3. **Create environment file:**
   Create a `.env` file in the `server` directory with the following content:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/report-agent
   ```
   
   **Important:** Change `JWT_SECRET` to a strong random string in production!

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend (React) on `http://localhost:5173`
   - Backend (Express) on `http://localhost:5000`

## First Time Usage

1. Open `http://localhost:5173` in your browser
2. Click "Register here" to create an account
3. After registration, you'll be logged in automatically
4. Go to "Upload Report" to upload your first sector report

## How to Use

### Uploading a Report:
1. Navigate to "Upload Report"
2. Select the month and year for the report
3. (Optional) Enter a sector name
4. Choose your Excel file (.xlsx or .xls)
5. Click "Upload & Process Report"
6. Once processed, you'll see a list of all schools
7. Click "Download" next to each school to download its Excel file

### Viewing History:
1. Navigate to "History"
2. Use the filters to find reports by month/year
3. Click "View Schools" on any report to see and download school files

## Excel File Format

Your sector report Excel file should have:
- A header row with column names
- At least one column that contains school names (the system will auto-detect columns with "school", "مدرسة", or "اسم" in the header)
- Data rows with school information

The system will automatically:
- Identify schools from the Excel file
- Create separate Excel files for each school
- Preserve all original data columns

## Troubleshooting

- **MongoDB connection errors:** Make sure MongoDB is running. You can start it with `mongod` or through your MongoDB service manager
- **Database errors:** The database "report-agent" will be created automatically when you first run the application
- **Port conflicts:** Change the PORT in `server/.env` if port 5000 is already in use
- **File upload errors:** Ensure your Excel file is under 10MB and in .xlsx or .xls format

