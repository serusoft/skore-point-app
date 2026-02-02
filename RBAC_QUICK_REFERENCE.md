# Quick Reference: Role-Based Access Control

## For Developers

### Check User Role
```javascript
// Is current user an admin?
if (isCurrentUserAdmin()) {
    // User is admin - show full functionality
}

// Is current user a teacher?
if (isCurrentUserTeacher()) {
    // User is teacher - show limited functionality
}
```

### Get Teacher's Assigned Subjects
```javascript
const assignedSubjectIds = getCurrentUserAssignedSubjects();
// Returns array like: ['subj_001', 'subj_002']

// Filter subjects to only show assigned ones
const filteredSubjects = allSubjects.filter(s => 
    assignedSubjectIds.includes(s.id)
);
```

### Add Permission Check to New Admin Function
```javascript
async function newAdminOperation() {
    // Add this check at the start
    if (!isCurrentUserAdmin()) {
        showToast('Only admins can [operation]', 'error');
        return;
    }
    
    // ... rest of operation
}
```

### Hide UI Element for Teachers
```javascript
// In applyRoleBasedTabVisibility() or similar function:
if (!isCurrentUserAdmin()) {
    const element = document.getElementById('myAdminElement');
    if (element) {
        element.style.display = 'none';
    }
}
```

---

## Permission Check Locations

| Operation | File | Line | Function |
|-----------|------|------|----------|
| Add Class | school.js | 1493 | showAddClassModal() |
| Add Student | school.js | 1555 | showAddStudentModal() |
| Add Subject | school.js | 1642 | showAddSubjectModal() |
| Add Teacher | school.js | 1699 | showAddTeacherModal() |
| Delete Class | school.js | 940 | deleteClass() |
| Delete Student | school.js | 1077 | deleteStudent() |
| Delete Subject | school.js | 1176 | deleteSubject() |
| Assign Subjects | school.js | 1495 | assignSubjectsToTeacher() |
| Change Role | school.js | 1935 | toggleTeacherAdminStatus() |
| Tab Switching | school.js | 759 | switchTab() |
| Event Handler | school.js | 512-548 | Event delegation handler |

---

## Tab & Button Hiding

### Hidden for Teachers
**Tabs** (in applyRoleBasedTabVisibility()):
- `students`
- `subjects`
- `settings`

**Buttons** (in applyRoleBasedTabVisibility()):
- `addClassBtn`
- `addStudentBtn`
- `addSubjectBtn`
- `addTeacherBtn`
- `assignSubjectsBtn`

### Changed Labels for Teachers
- `teachers` tab → "My Admin"
- `reports` tab → "Analysis"

---

## Subject Filtering

### Where Subjects Are Filtered
1. **Marks Entry** [marks.js](pages/marks/marks.js)
   - Function: `loadSubjectsForMarks()`
   - Filter: `assignedSubjects` array

2. **Reports** [reports.js](pages/reports/reports.js)
   - Function: `loadSubjects()`
   - Filter: `assignedSubjects` array

### Subject Assignment Flow
```
Registration → subject field set
       ↓
School Join → if no subject specified
       ↓
Auto-assign → use registered subject
       ↓
Storage → save in assignedSubjects array
```

---

## Error Messages

### Permission Denied Messages
- "Only admins can add classes"
- "Only admins can add students"
- "Only admins can add subjects"
- "Only admins can add teachers"
- "Only admins can assign subjects"
- "Only admins can delete classes"
- "Only admins can delete students"
- "Only admins can delete subjects"
- "Only admins can change teacher roles"

---

## AppState Properties Used

```javascript
AppState.currentUser.uid              // Current user's ID
AppState.currentSchool.admins         // Array of admin user IDs
AppState.currentUserData.assignedSubjects  // Array of subject IDs
AppState.currentAcademicLevel         // Current level filter
```

---

## Testing Admin Functionality

### From Browser Console
```javascript
// Check if current user is admin
isCurrentUserAdmin()  // Returns true/false

// Check assigned subjects
getCurrentUserAssignedSubjects()  // Returns array of IDs

// Test permission check (should show error toast)
deleteClass('test-id')

// View hidden sections (for debugging)
document.querySelectorAll('[style*="display: none"]')
```

---

## Common Modifications

### Add New Admin-Only Feature
1. Create function with permission check:
   ```javascript
   async function newFeature() {
       if (!isCurrentUserAdmin()) {
           showToast('Only admins can use this feature', 'error');
           return;
       }
       // ... feature code
   }
   ```

2. Add button ID to `adminOnlyButtons` array in `applyRoleBasedTabVisibility()`

3. Add permission check in event handler if using button click

### Add Subject-Specific Access
1. Get assigned subjects:
   ```javascript
   const assignedIds = getCurrentUserAssignedSubjects();
   ```

2. Filter data:
   ```javascript
   const filtered = data.filter(item => 
       assignedIds.includes(item.subjectId)
   );
   ```

### Add New Teacher-Only Tab
1. Create tab element with `data-section="tabname"`
2. Teachers will see it (not hidden by default)
3. Admins will see it
4. No changes needed to access control

---

## Debugging

### Enable Debug Logging
Check browser console for logs from:
- `applyRoleBasedTabVisibility()` - Tab hiding logs
- `switchTab()` - Tab switching logs
- Permission checks - Error messages

### Common Issues
1. **Buttons still showing for teacher**
   - Clear cache
   - Reload page
   - Check `applyRoleBasedTabVisibility()` called
   - Verify button ID in `adminOnlyButtons` array

2. **Permission check not working**
   - Check `isCurrentUserAdmin()` returns correct value
   - Verify `AppState.currentSchool.admins` is populated
   - Check localStorage has user UID

3. **Subjects not filtering**
   - Verify `assignedSubjects` array populated during registration
   - Check subject ID matching is correct
   - Look for subject name case-sensitivity issues

---

## Security Best Practices

✅ **Always check permission at function entry**
```javascript
if (!isCurrentUserAdmin()) {
    showToast('Only admins can...', 'error');
    return;
}
```

✅ **Use conditional rendering for sensitive UI**
```javascript
${isAdmin ? '<button>Delete</button>' : ''}
```

✅ **Hide tabs via JavaScript, not CSS**
- Use `display: none` - CSS `visibility: hidden` is bypassable

✅ **Filter data on client side AND in queries**
- Always pass role/user check to backend

✅ **Log permission denials**
- Helps detect unauthorized access attempts

---

## Related Files
- [SECURITY_AUDIT_COMPLETE.md](SECURITY_AUDIT_COMPLETE.md) - Full security audit
- [TEACHER_TESTING_GUIDE.md](TEACHER_TESTING_GUIDE.md) - Testing instructions
- [ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md](ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md) - Detailed documentation

