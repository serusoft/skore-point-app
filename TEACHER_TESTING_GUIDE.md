# Teacher Role Testing Guide

## Quick Test Steps

### Step 1: Create and Register a Teacher Account
1. Go to Registration page
2. Create new account with:
   - Email: `teacher@test.com`
   - Name: `Test Teacher`
   - Account Type: **Teacher**
   - Subject: **Mathematics** (or any subject your school has)
3. Complete registration

### Step 2: Admin Action - Add Teacher to School
1. Log in as school admin
2. Go to School Portal
3. Click "Add Teacher" button
4. Invite the teacher by email: `teacher@test.com`
5. Teacher should join the school

### Step 3: Teacher Login - Verify Interface
1. Log out and log back in as the teacher
2. Go to Dashboard and join the school (or navigate to school portal)

#### Expected Visible Elements:
- ✅ **4 Tabs**: Classes, Marks, **My Admin**, **Analysis**
- ✅ **NO** Students tab
- ✅ **NO** Subjects tab
- ✅ **NO** Settings tab

#### Expected Hidden Buttons:
- ✅ NO "Add Class" button
- ✅ NO "Add Student" button
- ✅ NO "Add Subject" button
- ✅ NO "Add Teacher" button
- ✅ NO "Assign Subjects" button

#### Expected Card Styles:
- ✅ NO delete buttons on class cards
- ✅ NO delete buttons on student cards
- ✅ NO delete buttons on subject cards

### Step 4: Tab Verification
1. Click on "**My Admin**" tab
   - ✅ Should show **only administrators**, not all teachers
   - ✅ Should show info card: "You are not an admin. Contact administrators to request additional permissions."

2. Click on "**Analysis**" tab (Reports)
   - ✅ Should NOT show "Class" option
   - ✅ Should NOT show "School" option
   - ✅ Should only show "Subject" and "Student" options
   - ✅ Subject dropdown should show ONLY assigned subjects (Mathematics)

### Step 5: Marks Entry Test
1. Click on "Marks" tab
2. Select subject dropdown
   - ✅ Should ONLY show "Mathematics" (assigned subject)
   - ✅ Should NOT show other subjects the school has

### Step 6: Security Bypass Test (Browser Console)
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Try to execute these commands one by one:

```javascript
// Try to delete a class
deleteClass('any-class-id');
// Expected: Error toast "Only admins can delete classes"

// Try to add a class
showAddClassModal();
// Expected: Error toast "Only admins can add classes"

// Try to assign subjects
assignSubjectsToTeacher('any-teacher-id');
// Expected: Error toast "Only admins can assign subjects"
```

Each should show an **error toast** preventing the action.

---

## Expected Behavior Summary

### For Teachers:
| Action | Can Do? | Result |
|--------|---------|--------|
| View Classes | ✅ Yes | Read-only view |
| Add Class | ❌ No | Button hidden, toast if attempted |
| Delete Class | ❌ No | No button, toast if attempted |
| Enter Marks | ✅ Yes | For assigned subjects only |
| View Marks | ✅ Yes | For assigned subjects only |
| View Reports | ✅ Yes | Subject/Student reports only |
| View Class Reports | ❌ No | Tab hidden |
| View School Reports | ❌ No | Tab hidden |
| View Administrators | ✅ Yes | In "My Admin" tab |
| View All Teachers | ❌ No | Only admins visible |
| View Students | ❌ No | Tab hidden |
| View Subjects | ❌ No | Tab hidden |
| Access Settings | ❌ No | Tab hidden |

### For Admins:
| Action | Can Do? | Result |
|--------|---------|--------|
| Everything Teachers can do | ✅ Yes | Full access |
| View All Teachers | ✅ Yes | "Teachers" tab |
| Add Teachers | ✅ Yes | Button visible |
| View Students | ✅ Yes | Full "Students" tab |
| Add/Delete Students | ✅ Yes | Buttons visible |
| View Subjects | ✅ Yes | Full "Subjects" tab |
| Add/Delete Subjects | ✅ Yes | Buttons visible |
| View Class Reports | ✅ Yes | "Reports" tab |
| View School Reports | ✅ Yes | "Reports" tab |
| Access Settings | ✅ Yes | "Settings" tab |

---

## Troubleshooting

### Issue: Teacher sees "Students" or "Subjects" tabs
**Solution**: Clear browser cache and reload. Run `applyRoleBasedTabVisibility()` in console to debug.

### Issue: Delete buttons still showing for teacher
**Solution**: Check that `isCurrentUserAdmin()` function is defined. Verify school.admins array in Firestore.

### Issue: Teacher can execute admin operations
**Solution**: Check browser console for errors. Verify permission check functions are in place. Check that localStorage has correct user data.

### Issue: Subject not auto-assigned on school join
**Solution**: Verify teacher's `subject` field was set during registration. Check that subject name matches school's subject exactly (case-sensitive in Firestore matching).

---

## Sign-Off Checklist

After testing, verify:
- [ ] Teacher sees exactly 4 tabs (Classes, Marks, My Admin, Analysis)
- [ ] Student/Subjects/Settings tabs are completely hidden
- [ ] No admin buttons visible (Add Class, Add Student, etc.)
- [ ] No delete buttons on any cards
- [ ] "My Admin" tab shows only administrators
- [ ] "Analysis" tab shows only Subject and Student options
- [ ] Subject dropdown in Marks shows only assigned subjects
- [ ] Browser console tests return error toasts
- [ ] Tab switching prevents navigation to hidden tabs
- [ ] Teacher can view classes but cannot modify
- [ ] Teacher can enter marks for assigned subjects
- [ ] Teacher can generate subject/student reports

**All checks passed? System is production-ready!** ✅

