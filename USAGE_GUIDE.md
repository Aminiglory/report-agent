# 📖 Complete Usage Guide - Report Agent

## 🚀 Getting Started

### Step 1: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm run install-all
```

This will install all dependencies for both the frontend and backend.

### Step 2: Start MongoDB

Make sure MongoDB is running on your computer:

**Windows:**
- If MongoDB is installed as a service, it should start automatically
- Or open Command Prompt as Administrator and run: `net start MongoDB`
- Or start it manually: `mongod`

**Mac/Linux:**
- Run: `brew services start mongodb-community` (if installed via Homebrew)
- Or: `sudo systemctl start mongod`
- Or: `mongod`

**Check if MongoDB is running:**
- Open a new terminal and run: `mongosh` or `mongo`
- If it connects, MongoDB is running ✅

### Step 3: Configure Environment

Create a file named `.env` in the `server` folder with this content:

```
JWT_SECRET=your-super-secret-key-change-this
PORT=5000
MONGODB_URI=mongodb://localhost:27017/report-agent
```

**Important:** Replace `your-super-secret-key-change-this` with a random string (for security).

### Step 4: Start the Application

Run this command in the project root:

```bash
npm run dev
```

This starts both:
- **Frontend** at: http://localhost:5173
- **Backend** at: http://localhost:5000

You should see messages like:
```
Connected to MongoDB database: report-agent
Server running on port 5000
```

---

## 📝 Using the Application

### First Time: Create an Account

1. Open your browser and go to: **http://localhost:5173**

2. Click **"Register here"** (or go to Register page)

3. Fill in:
   - **Username**: Choose a username (min 3 characters)
   - **Email**: Your email address
   - **Password**: Create a password (min 6 characters)

4. Click **"Register"**

5. You'll be automatically logged in and redirected to the Dashboard

---

### Uploading a Sector Report

1. **Navigate to "Upload Report"** (from the navigation menu)

2. **Fill in the form:**
   - **Month**: Select the month (e.g., January, February, etc.)
   - **Year**: Enter the year (e.g., 2024)
   - **Sector Name** (Optional): Enter a name for the sector
   - **Excel File**: Click "Choose File" and select your sector report Excel file

3. **Click "Upload & Process Report"**

4. **Wait for processing** - The system will:
   - Read your Excel file
   - Find all schools (auto-detects columns with "school", "مدرسة", or "اسم")
   - Create individual Excel files for each school
   - Create a combined Excel file with all schools as sheets

5. **After processing**, you'll see:
   - ✅ Success message
   - **Download Options:**
     - 📊 **Download Combined Excel (All Schools)** - One file with all schools as separate sheets
     - 📄 **Download Original Sector Report** - The file you uploaded
   - **Individual School Files** - List of all schools with download buttons

---

### Downloading Files

#### Option 1: Combined Excel File
- Contains ALL schools as separate sheets in one Excel file
- First sheet: Complete sector report
- Additional sheets: One per school
- **Best for:** Getting everything in one file

#### Option 2: Original Sector Report
- The exact file you uploaded
- **Best for:** Keeping a copy of the original

#### Option 3: Individual School Files
- Separate Excel file for each school
- Contains only that school's data
- **Best for:** Sending specific school reports

---

### Viewing History

1. **Navigate to "History"** (from the navigation menu)

2. **Filter reports** (optional):
   - Select a **Month** to filter by month
   - Select a **Year** to filter by year
   - Or leave both as "All" to see everything

3. **For each report**, you can:
   - Click **"📊 Combined"** - Download combined Excel file
   - Click **"📄 Original"** - Download original report
   - Click **"View Schools"** - See individual school files

4. **When viewing schools:**
   - See list of all schools in that report
   - Click **"📥 Download"** next to any school to get its individual file

---

## 📊 Excel File Format Requirements

Your sector report Excel file should:

✅ **Have a header row** - First row contains column names  
✅ **Include a school column** - Column with school names (auto-detected if header contains "school", "مدرسة", or "اسم")  
✅ **Be in .xlsx or .xls format**  
✅ **Be under 10MB in size**

**Example Excel Structure:**
```
| School Name | Student Name | Grade | Subject | Score |
|-------------|--------------|-------|---------|-------|
| School A    | John Doe     | 10    | Math    | 95    |
| School A    | Jane Smith   | 10    | Math    | 88    |
| School B    | Bob Johnson  | 10    | Math    | 92    |
```

The system will automatically:
- Group rows by school name
- Create separate files/sheets for each school
- Preserve all original columns

---

## 🔍 Troubleshooting

### MongoDB Connection Error
**Problem:** "MongoDB connection error"  
**Solution:**
- Make sure MongoDB is running
- Check if MongoDB is on port 27017
- Verify the `MONGODB_URI` in `server/.env`

### Port Already in Use
**Problem:** "Port 5000 already in use"  
**Solution:**
- Change `PORT=5000` to another port (e.g., `PORT=5001`) in `server/.env`
- Or stop the application using port 5000

### File Upload Error
**Problem:** "Could not find school column"  
**Solution:**
- Make sure your Excel file has a header row
- Ensure one column header contains "school", "مدرسة", or "اسم"
- Or rename your school column header to include one of these words

### File Too Large
**Problem:** "File size exceeds limit"  
**Solution:**
- Excel file must be under 10MB
- Try compressing the file or removing unnecessary data

### No Schools Found
**Problem:** "No schools found in the Excel file"  
**Solution:**
- Check that school names are in the detected column
- Ensure school names are not empty
- Verify the Excel file has data rows (not just headers)

---

## 💡 Tips & Best Practices

1. **Naming Convention:**
   - Use descriptive sector names for easier identification
   - Reports are organized by month and year

2. **File Organization:**
   - The system automatically organizes files by year-month
   - All files are stored in `server/outputs/` folder

3. **History Management:**
   - Use the month/year filters to quickly find old reports
   - All reports are saved permanently in the database

4. **Download Strategy:**
   - Use **Combined Excel** for reviewing all schools at once
   - Use **Individual Files** for distributing to specific schools
   - Keep **Original Report** as a backup

---

## 🎯 Quick Reference

| Action | Location | Steps |
|--------|----------|-------|
| **Register** | Login page | Click "Register here" → Fill form → Submit |
| **Login** | Login page | Enter email & password → Click "Login" |
| **Upload Report** | Upload Report page | Select month/year → Choose file → Upload |
| **Download Combined** | Upload/History | Click "📊 Download Combined Excel" |
| **Download Original** | Upload/History | Click "📄 Download Original Sector Report" |
| **View History** | History page | Click "History" in navigation |
| **Filter Reports** | History page | Select month/year from dropdowns |

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the browser console (F12) for errors
2. Check the server terminal for error messages
3. Verify MongoDB is running
4. Ensure all environment variables are set correctly
5. Make sure all dependencies are installed

---

**Happy Reporting! 📊**


