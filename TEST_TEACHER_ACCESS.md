# Debug Teacher Access Issue

## Step 1: Check Console Logs

1. Open browser console (F12)
2. Clear previous logs
3. Refresh page
4. Look for these logs in order:

```
=== applyRoleBasedTabVisibility() STARTING ===
User is Admin: [TRUE/FALSE]
isCurrentUserAdmin() DEBUG: { ... }
initializePage() Settings Button Check: { ... }
Found desktop tabs: 6
Found mobile tabs: 6
Hidden tabs: [...]
Visible tabs: [...]
=== applyRoleBasedTabVisibility() COMPLETE ===
```

## Step 2: Check What's Being Returned

In the console, run these commands:

```javascript
// Check current user
console.log('Current User UID:', AppState.currentUser.uid);

// Check current school
console.log('Current School:', AppState.currentSchool);

// Check admins array
console.log('School Admins Array:', AppState.currentSchool.admins);

// Check if user is in admins
console.log('User in Admins?', AppState.currentSchool.admins.includes(AppState.currentUser.uid));

// Call the function directly
console.log('isCurrentUserAdmin() result:', isCurrentUserAdmin());

// Check all tabs
console.log('Desktop Tabs:', Array.from(document.querySelectorAll('.content-tab')).map(t => ({
    section: t.dataset.section,
    display: t.style.display,
    visible: t.offsetParent !== null
})));
```

## Step 3: Determine Root Cause

### If User IS in Admins Array
- **Problem**: Teacher was mistakenly added as admin when joining school
- **Solution**: Remove from school.admins array in Firestore

### If User is NOT in Admins Array But isCurrentUserAdmin() Returns TRUE
- **Problem**: Logic error in permission check
- **Solution**: Review `isCurrentUserAdmin()` function

### If isCurrentUserAdmin() Returns FALSE But Tabs Still Show
- **Problem**: CSS or display issue
- **Solution**: Check tab display properties

### If Everything Looks Correct
- **Problem**: Caching issue
- **Solution**: Hard refresh (Ctrl+Shift+R)
