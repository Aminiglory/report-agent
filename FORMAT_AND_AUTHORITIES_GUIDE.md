# 📋 Report Formats & Authorities Guide

## Overview

The Report Agent now supports:
1. **Custom Report Formats** - Define different report structures/templates
2. **Authority Management** - Store and manage names for signatures (Inspector, Secretary, Head Teachers)
3. **Automatic Signature Sections** - Reports automatically include signature sections with stored names

---

## 🎯 How It Works

### Step 1: Create a Report Format

1. Go to **"Formats"** in the navigation menu
2. Click **"+ Create New Format"**
3. Fill in:
   - **Format Name**: e.g., "Monthly Academic Report"
   - **Description**: Optional description
   - **School Column Name**: Exact name of the column containing school names (e.g., "School Name", "اسم المدرسة")
   - **Template File** (Optional): Upload a sample Excel file to analyze structure
4. Click **"Create Format"**

**Why create formats?**
- Ensures consistent report structure
- Automatically adds signature sections
- Tracks which format was used for each report

### Step 2: Set Authority Names

1. Go to **"Authorities"** in the navigation menu
2. **Sector Education Inspector:**
   - Enter the inspector's name
   - Set title (default: "Sector Education Inspector")
   - Click "Update Inspector"
3. **Executive Secretary:**
   - Enter the secretary's name
   - Set title (default: "Executive Secretary of the Sector")
   - Click "Update Secretary"
4. **Head Teachers:**
   - Click "+ Add/Update Head Teacher"
   - Enter **exact school name** (must match report exactly)
   - Enter head teacher name
   - Set title (default: "Head Teacher")
   - Click "Save Head Teacher"

**Important for Head Teachers:**
- When a head teacher changes, just update the name for that school
- The system automatically tracks the change date
- New reports will use the new head teacher name
- Old reports keep the head teacher name from when they were created

### Step 3: Upload Reports with Format

1. Go to **"Upload Report"**
2. Fill in month, year, and sector name
3. **Select Report Format** (optional but recommended):
   - Choose from your created formats
   - Or leave as "No Format" for auto-detection
4. Upload your Excel file
5. Click "Upload & Process Report"

**What happens:**
- If format selected: Uses the format's school column mapping
- Signature sections are automatically added to each school report
- Sector report includes Inspector and Secretary signatures
- Each school report includes its Head Teacher signature

---

## 📊 Signature Sections

### Sector Report (Combined/Original)
Includes:
- ✅ Sector Education Inspector (name + signature line)
- ✅ Executive Secretary (name + signature line)

### Individual School Reports
Includes:
- ✅ Sector Education Inspector (name + signature line)
- ✅ Executive Secretary (name + signature line)
- ✅ Head Teacher (name + signature line) - **School-specific**

---

## 🔄 Updating Head Teachers

When a head teacher changes:

1. Go to **"Authorities"**
2. Click **"+ Add/Update Head Teacher"**
3. Enter the **same school name** (must match exactly)
4. Enter the **new head teacher name**
5. Click "Save Head Teacher"

**What happens:**
- Old head teacher is marked as inactive (history preserved)
- New head teacher becomes active
- **Future reports** will use the new name
- **Past reports** keep the old name (historical accuracy)

---

## 📝 Format Management

### Creating Formats

**Required:**
- Format Name
- School Column Name (exact column header)

**Optional:**
- Description
- Template File (sample Excel to analyze)

### Activating/Deactivating Formats

- Only **Active** formats appear in the upload dropdown
- Deactivate formats you're not currently using
- Reactivate anytime

### Editing Formats

- Click **"Edit"** on any format
- Update name, description, or school column
- Changes apply to future reports only

### Deleting Formats

- Click **"Delete"** on any format
- ⚠️ **Warning**: This cannot be undone
- Reports already created with this format are not affected

---

## 🎨 Best Practices

1. **Format Naming:**
   - Use descriptive names: "Monthly Academic Report", "Quarterly Financial Report"
   - One format per report type

2. **School Column Names:**
   - Must match **exactly** (case-sensitive)
   - Check your Excel file's header row
   - Common names: "School Name", "اسم المدرسة", "School"

3. **Head Teacher Names:**
   - School names must match **exactly** as they appear in reports
   - Update immediately when head teachers change
   - System tracks history automatically

4. **Authority Names:**
   - Update when personnel changes
   - All future reports will use new names
   - Past reports remain unchanged (historical record)

---

## 🔍 Troubleshooting

### Format Not Appearing in Upload Dropdown
- Check if format is **Active**
- Refresh the page
- Ensure you're logged in

### Signatures Not Appearing
- Make sure you selected a **Format** when uploading
- Verify authority names are set in "Authorities" page
- Check format's signature section settings

### Wrong Head Teacher Name
- Verify school name matches exactly (case-sensitive)
- Check "Authorities" page for current head teacher
- Update if needed - future reports will use new name

### School Column Not Found
- Verify the exact column header name in your Excel
- Update format's "School Column Name" to match exactly
- Or use auto-detection (leave format empty)

---

## 📋 Quick Reference

| Task | Location | Steps |
|------|----------|-------|
| Create Format | Formats page | Click "+ Create New Format" → Fill form → Create |
| Set Inspector | Authorities page | Enter name → Update Inspector |
| Set Secretary | Authorities page | Enter name → Update Secretary |
| Add Head Teacher | Authorities page | Click "+ Add/Update" → Enter school & name → Save |
| Use Format | Upload page | Select format from dropdown → Upload file |
| View Formats | Formats page | See all formats, edit, activate/deactivate |
| View Authorities | Authorities page | See all set names |

---

## 💡 Tips

- **Create formats first** before uploading reports
- **Set all authority names** before generating reports
- **Update head teachers immediately** when they change
- **Use descriptive format names** for easy identification
- **Keep formats active** only if currently in use

---

**Your reports will now automatically include proper signatures and maintain historical accuracy! 📊✨**


