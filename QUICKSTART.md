# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Start MongoDB
Make sure MongoDB is running on your local machine.

### 3. Setup Environment
Create `server/.env` file:
```
JWT_SECRET=change-this-to-a-random-secret-key
PORT=5000
MONGODB_URI=mongodb://localhost:27017/report-agent
```

### 4. Run the Application
```bash
npm run dev
```

Then open **http://localhost:5173** in your browser!

## 📝 What You Can Do

✅ **Register/Login** - Create an account to get started  
✅ **Upload Reports** - Upload sector Excel reports  
✅ **Generate Files** - Automatically create individual Excel files for each school  
✅ **Download** - Download each school's file individually  
✅ **View History** - Browse all your reports by month/year  

## 📊 Excel File Requirements

Your sector report should be an Excel file (.xlsx or .xls) with:
- A header row
- A column containing school names (auto-detected)
- Data rows for each school

The system will automatically split the data by school and create separate files!

