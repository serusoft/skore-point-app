# School Page Features - Quick Reference Guide

## 🎯 New Features Overview

### Feature 1: Delete Classes
**Location**: Classes Tab → Class Cards

```
┌─────────────────────────────────────────┐
│  [Delete]                               │
│                                         │
│  Class Name: P1 Blue                   │
│  35 Students                            │
│  View Details →                         │
└─────────────────────────────────────────┘
```

- **How to Use**: 
  1. Navigate to the "Classes" tab
  2. Find the class you want to delete
  3. Click the red "Delete" button in the top-right corner
  4. Confirm the deletion
  5. The class is removed instantly

---

### Feature 2: Delete Subjects
**Location**: Subjects Tab → Subject Cards

```
┌─────────────────────────────────────────┐
│  [Delete]                               │
│                                         │
│  📚 Mathematics                         │
│  MAT101                                 │
└─────────────────────────────────────────┘
```

- **How to Use**:
  1. Navigate to the "Subjects" tab
  2. Find the subject you want to delete
  3. Click the red "Delete" button in the top-right corner
  4. Confirm the deletion
  5. The subject is removed instantly

---

### Feature 3: Delete Students
**Location**: Students Tab → Students Table

```
┌──────────────────────────────────────────────────────────────┐
│ Name           | Class    | Level           | Actions        │
├──────────────────────────────────────────────────────────────┤
│ John Doe       | P1 Blue  | lower-primary   | [Delete]       │
│ Jane Smith     | P1 Blue  | lower-primary   | [Delete]       │
│ Bob Johnson    | P2 Red   | lower-primary   | [Delete]       │
└──────────────────────────────────────────────────────────────┘
```

- **How to Use**:
  1. Navigate to the "Students" tab
  2. Find the student you want to delete
  3. Click the red "Delete" button in the Actions column
  4. Confirm the deletion
  5. The student is removed instantly

---

### Feature 4: Fixed Empty State Messages
**Before (Broken)**:
- Even when classes/subjects existed, "No Classes Found" message was shown

**After (Fixed)**:
- Messages only appear when data is truly empty
- When data exists, the grid displays properly
- When data is added, messages disappear automatically

---

### Feature 5: Upload Students from Excel
**Location**: Students Tab → File Upload Area

```
┌─────────────────────────────────────────┐
│                                         │
│          📄 Upload Student List (Excel) │
│                                         │
│    Drag & drop or click to upload       │
│                                         │
└─────────────────────────────────────────┘
```

#### Step-by-Step Instructions:

**Step 1**: Prepare Your Excel File
```
File: students.xlsx or students.xls

Column Headers (any of these work):
- "Name" ← Required
- "Student Name" ← Also works
- "Full Name" ← Also works
- Gender ← Optional
- Other columns ← Ignored

Example:
┌─────────────────┬─────────┐
│ Name            │ Gender  │
├─────────────────┼─────────┤
│ John Doe        │ Male    │
│ Jane Smith      │ Female  │
│ Bob Johnson     │ Male    │
└─────────────────┴─────────┘
```

**Step 2**: Select Target Class
```
1. Go to Students tab
2. Choose a class from the dropdown:
   ┌─────────────────────────┐
   │ Class Filter ▼          │
   │ - All Classes          │
   │ - P1 Blue     (select) │
   │ - P2 Red              │
   │ - P3 Green            │
   └─────────────────────────┘
```

**Step 3**: Upload File
```
Method A: Drag & Drop
- Drag Excel file onto the upload area
- File automatically starts uploading

Method B: Click to Browse
- Click the upload area
- Select file from your computer
```

**Step 4**: Confirmation
```
✅ Success Message:
"Successfully imported 3 students to P1 Blue"

Students are now visible in the students table:
- John Doe | P1 Blue | lower-primary | [Delete]
- Jane Smith | P1 Blue | lower-primary | [Delete]
- Bob Johnson | P1 Blue | lower-primary | [Delete]
```

---

## 🔧 Technical Features

### Delete Operations
- ✅ User confirmation required (prevents accidental deletion)
- ✅ Loading indicator shows during deletion
- ✅ Success/error messages via toast notifications
- ✅ Automatic list refresh after successful deletion
- ✅ Proper error handling

### Empty State Management
- ✅ Classes section shows/hides empty state correctly
- ✅ Subjects section shows/hides empty state correctly
- ✅ Students section shows/hides empty state correctly

### Excel Upload
- ✅ Supports .xlsx and .xls files
- ✅ Flexible column name detection (case-insensitive)
- ✅ Drag-and-drop support
- ✅ Multiple file format recognition
- ✅ Automatic class assignment via dropdown
- ✅ Bulk import with success count

### Student Display
- ✅ Class names displayed (not class IDs)
- ✅ Academic level shown
- ✅ Student name clearly visible
- ✅ Delete button in Actions column

---

## ⚠️ Important Notes

1. **Deletion is Permanent**: Once deleted, items cannot be recovered. Always confirm deletion intent.

2. **File Requirements**: 
   - Excel file must have at least one column with "Name" header
   - Other columns are optional
   - File must be .xlsx or .xls format

3. **Class Requirement**: 
   - You must select a class before uploading students
   - Each student imported will be assigned to the selected class

4. **Level-Based Data**: 
   - Classes, Subjects, and Students are filtered by academic level
   - Switch levels using level navigation buttons to see different data
   - Deletion works for the current level's data

---

## 🎨 User Interface

### Delete Buttons
- **Color**: Red (#ff4757)
- **Icon**: Trash bin 🗑️
- **Hover Effect**: Darker red
- **Location**:
  - Classes: Top-right of card
  - Subjects: Top-right of card
  - Students: Actions column

### Upload Area
- **Icon**: File/Document
- **Behavior**: Accepts drag-drop and click-to-browse
- **Feedback**: File type validation, success/error messages

### Empty States
- **Icon**: Relevant to the section (books, users, etc.)
- **Message**: Clear indication of what to do
- **Action**: Easy button to create new items

---

## 📋 Troubleshooting

| Issue | Solution |
|-------|----------|
| Delete button not working | Ensure you have proper permissions; check browser console for errors |
| Excel file not uploading | Verify file is .xlsx or .xls; ensure it has a "Name" column header |
| Students not showing class names | Check that students are assigned to classes with matching IDs |
| Empty state showing when data exists | Refresh the page; check browser console for JavaScript errors |
| Uploaded students not visible | Try switching tabs away and back; check academic level filter |

---

## ✅ Verification Checklist

Use this checklist to verify all features are working:

- [ ] Can delete a class (with confirmation)
- [ ] Can delete a subject (with confirmation)
- [ ] Can delete a student (with confirmation)
- [ ] Empty state messages only show when data is empty
- [ ] Data displays correctly when items exist
- [ ] Can upload Excel file with student names
- [ ] Student names from Excel appear in the students list
- [ ] Class names display in students table (not class IDs)
- [ ] Toast messages appear on success/error
- [ ] Deleted items are removed from list immediately
- [ ] Loading indicators show during operations

---

**Last Updated**: January 19, 2026
**Features Status**: ✅ All Complete and Tested
