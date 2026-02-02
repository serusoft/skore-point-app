# Role-Based Access Control - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SKORE POINT APP                          │
│                 Role-Based Access Control                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌──────▼────────┐
            │   ADMIN USER   │  │  TEACHER USER │
            └───────┬────────┘  └──────┬────────┘
                    │                   │
       ┌────────────┴────────────┐      │
       │                         │      │
   ┌───▼──────────┐  ┌──────────▼──┐   │
   │  Full Access │  │ Restricted  │   │
   │              │  │  Access     │   │
   │ 7 Tabs       │  │  4 Tabs     │   │
   │ All Buttons  │  │ Hidden BTns │   │
   └──────────────┘  └─────────────┘   │
                                        │
        ┌───────────────────────────────┘
        │
   ┌────▼──────────────────────────────┐
   │   TEACHER INTERFACE               │
   ├───────────────────────────────────┤
   │                                   │
   │  ┌─ Classes Tab                  │
   │  │  └─ View only (read-only)    │
   │  │                               │
   │  ├─ Marks Tab                    │
   │  │  └─ Enter marks (assigned     │
   │  │     subjects only)            │
   │  │                               │
   │  ├─ My Admin Tab                 │
   │  │  └─ View admins only          │
   │  │     (not other teachers)      │
   │  │                               │
   │  ├─ Analysis Tab                 │
   │  │  └─ Subject & Student         │
   │  │     reports only              │
   │  │     (not class or school)     │
   │  │                               │
   │  ├─ (Hidden) Students            │
   │  ├─ (Hidden) Subjects            │
   │  └─ (Hidden) Settings            │
   │                                   │
   └───────────────────────────────────┘
```

---

## Permission Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 PERMISSION VERIFICATION                   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  User Action (Click Button)                              │
│         │                                                 │
│         ▼                                                 │
│  ┌─────────────────────────────────────┐               │
│  │ LAYER 1: UI/RENDERING LEVEL         │               │
│  ├─────────────────────────────────────┤               │
│  │ • Button visibility check           │               │
│  │ • Tab display check                 │               │
│  │ • Delete button render check        │               │
│  │                                     │               │
│  │ Result: Button not visible/clickable               │
│  └────────────┬────────────────────────┘               │
│               │                                         │
│               │ If Layer 1 bypassed...                 │
│               ▼                                         │
│  ┌─────────────────────────────────────┐               │
│  │ LAYER 2: FUNCTION-LEVEL CHECKS      │               │
│  ├─────────────────────────────────────┤               │
│  │ if (!isCurrentUserAdmin()) {        │               │
│  │     showToast('Only admins...', 'error')           │
│  │     return; // Abort operation                     │
│  │ }                                   │               │
│  │                                     │               │
│  │ Result: Operation prevented         │               │
│  │         Error message shown         │               │
│  └────────────┬────────────────────────┘               │
│               │                                         │
│               │ If Layer 2 bypassed...                 │
│               ▼                                         │
│  ┌─────────────────────────────────────┐               │
│  │ LAYER 3: DATA FILTERING             │               │
│  ├─────────────────────────────────────┤               │
│  │ • Subject filtering                 │               │
│  │ • Teacher visibility filtering      │               │
│  │ • Report type filtering             │               │
│  │                                     │               │
│  │ Result: Unauthorized data hidden    │               │
│  └─────────────────────────────────────┘               │
│                                                         │
│  ✅ NO UNAUTHORIZED ACTION SUCCEEDS                    │
│                                                         │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow: Teacher Access Control

```
┌──────────────────────────────────────────────────────────┐
│           TEACHER ATTEMPTING ADMIN OPERATION             │
└──────────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
      ┌───────▼────────┐   ┌──────▼────────┐
      │   UI LEVEL     │   │  FUNCTION LVL │
      │                │   │                │
      │ "Add Class"    │   │ showAddClass   │
      │ button hidden  │   │ Modal()        │
      │                │   │                │
      │ Result: ❌    │   │ Check:         │
      │ User can't     │   │ isCurrentUser  │
      │ click button   │   │ Admin()?       │
      │                │   │                │
      │                │   │ Result: ❌    │
      │                │   │ Function aborts│
      │                │   │ + Error toast  │
      └────────────────┘   └────────────────┘
              │                     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  DATA LEVEL        │
              │                    │
              │ Subject Filtering: │
              │ Only assigned      │
              │ subjects visible   │
              │                    │
              │ Result: ❌        │
              │ Unauthorized data  │
              │ hidden             │
              └────────────────────┘
```

---

## Tab Visibility Model

```
┌─────────────────────────────────────────────────────────┐
│                    TAB VISIBILITY                        │
├─────────────────────┬──────────────────┤
│     TAB NAME        │ ADMIN │ TEACHER  │
├─────────────────────┼───────┼──────────┤
│ Classes             │  ✅   │    ✅    │
│ Students            │  ✅   │    ❌    │ Hidden
│ Subjects            │  ✅   │    ❌    │ Hidden
│ Teachers            │  ✅   │    ✅    │ (My Admin)
│ Marks               │  ✅   │    ✅    │
│ Reports             │  ✅   │    ✅    │ (Analysis)
│ Settings            │  ✅   │    ❌    │ Hidden
├─────────────────────┴───────┴──────────┤
│ TOTAL VISIBLE: 7                       │
│ ADMIN SEES:    7 TABS                  │
│ TEACHER SEES:  4 TABS                  │
└─────────────────────────────────────────┘
```

---

## Button Visibility Model

```
┌──────────────────────────────────────────────────────────┐
│                   BUTTON VISIBILITY                       │
├──────────────────────────┬──────────┬─────────┤
│      BUTTON NAME         │  ADMIN   │ TEACHER │
├──────────────────────────┼──────────┼─────────┤
│ Add Class                │   ✅     │   ❌    │
│ Add Student              │   ✅     │   ❌    │
│ Add Subject              │   ✅     │   ❌    │
│ Add Teacher              │   ✅     │   ❌    │
│ Assign Subjects          │   ✅     │   ❌    │
│ Delete (Class)           │   ✅     │   ❌    │
│ Delete (Student)         │   ✅     │   ❌    │
│ Delete (Subject)         │   ✅     │   ❌    │
│ Enter Marks              │   ✅     │   ✅    │
│ View Reports             │   ✅     │   ✅    │
├──────────────────────────┴──────────┴─────────┤
│ HIDDEN FOR TEACHERS: 8 BUTTONS                │
│ VISIBLE FOR TEACHERS: 2 BUTTONS (Marks, View) │
└──────────────────────────────────────────────┘
```

---

## Subject Assignment Flow

```
┌─────────────────────────────────────────────────────────┐
│          TEACHER SUBJECT ASSIGNMENT WORKFLOW             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: REGISTRATION                                  │
│  ┌──────────────────────────────────────┐              │
│  │ Teacher selects subject during       │              │
│  │ account creation                     │              │
│  │                                      │              │
│  │ Stored in user document:             │              │
│  │ {                                    │              │
│  │   subject: "Mathematics"             │              │
│  │   assignedSubjects: []               │              │
│  │ }                                    │              │
│  └──────────────┬───────────────────────┘              │
│                 │                                       │
│  Step 2: SCHOOL JOINING                              │
│  ┌──────────────▼───────────────────────┐             │
│  │ Teacher joins school                 │             │
│  │ (via dashboard or school invite)     │             │
│  │                                      │             │
│  │ System checks:                       │             │
│  │ "Did teacher specify subject?"       │             │
│  │                                      │             │
│  │ If NO:                               │             │
│  │ → Use teacher's registered subject  │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                       │
│  Step 3: AUTO-ASSIGNMENT                             │
│  ┌──────────────▼───────────────────────┐             │
│  │ Match subject name to school's       │             │
│  │ subjects (case-insensitive)          │             │
│  │                                      │             │
│  │ Find: "Mathematics" in school        │             │
│  │ Get: Subject ID (e.g., "math_001")  │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                       │
│  Step 4: STORAGE                                     │
│  ┌──────────────▼───────────────────────┐             │
│  │ Store in user document:              │             │
│  │ {                                    │             │
│  │   subject: "Mathematics"             │             │
│  │   assignedSubjects: ["math_001"]     │             │
│  │ }                                    │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                       │
│  Step 5: FILTERING                                   │
│  ┌──────────────▼───────────────────────┐             │
│  │ In Marks & Reports:                  │             │
│  │                                      │             │
│  │ Show only subjects in:               │             │
│  │ user.assignedSubjects                │             │
│  │                                      │             │
│  │ Teacher can only enter marks for:    │             │
│  │ → Mathematics                        │             │
│  │                                      │             │
│  │ Teacher can only generate reports:   │             │
│  │ → Subject and Student (for Math)     │             │
│  └──────────────────────────────────────┘             │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Security Layers Visualization

```
┌──────────────────────────────────────────────────────────┐
│                 DEFENSE IN DEPTH MODEL                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: USER INTERFACE LEVEL                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  • Admin buttons: display: none                          │
│  • Restricted tabs: display: none                        │
│  • Delete buttons: Not rendered in HTML                  │
│  • Tab switching: Prevented in click handler             │
│  ─────────────────────────────────────────────           │
│  Result: First barrier to unauthorized access           │
│                                                           │
│                                                           │
│  Layer 2: FUNCTION EXECUTION LEVEL                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  • Permission checks at function entry:                 │
│    if (!isCurrentUserAdmin()) return;                    │
│                                                           │
│  • Protected operations:                                 │
│    - showAddClassModal()                                │
│    - deleteClass()                                       │
│    - assignSubjectsToTeacher()                          │
│    - toggleTeacherAdminStatus()                         │
│    - ... 10 more operations ...                         │
│  ─────────────────────────────────────────────           │
│  Result: Catches bypasses of UI layer                   │
│                                                           │
│                                                           │
│  Layer 3: DATA ACCESS LEVEL                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  • Subject filtering:                                    │
│    Filter by assignedSubjects array                     │
│                                                           │
│  • Teacher visibility:                                   │
│    Show only administrators for teacher users           │
│                                                           │
│  • Report filtering:                                     │
│    Hide class/school options for teachers              │
│  ─────────────────────────────────────────────           │
│  Result: Even if other layers bypassed,                │
│          restricted data remains inaccessible           │
│                                                           │
│  ═════════════════════════════════════════════           │
│  ✅ NO UNAUTHORIZED ACTION CAN SUCCEED                  │
│  ═════════════════════════════════════════════           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Helper Functions Reference

```
┌─────────────────────────────────────────────────────────┐
│             ROLE-BASED HELPER FUNCTIONS                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  isCurrentUserAdmin()                                  │
│  ├─ Returns: Boolean                                  │
│  ├─ Check: Is user ID in school.admins?             │
│  └─ Usage: Before showing admin features            │
│                                                         │
│  isCurrentUserTeacher()                               │
│  ├─ Returns: Boolean                                  │
│  ├─ Check: !isCurrentUserAdmin()                     │
│  └─ Usage: Before showing teacher features          │
│                                                         │
│  getCurrentUserAssignedSubjects()                     │
│  ├─ Returns: Array of subject IDs                   │
│  ├─ Gets: From user.assignedSubjects                │
│  └─ Usage: To filter subjects in dropdowns         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────┐
│                 COMPONENT INTERACTIONS                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  applyRoleBasedTabVisibility()                        │
│  ├─ Calls: isCurrentUserAdmin()                      │
│  ├─ Hides: 3 tabs + 5 buttons                        │
│  └─ Updates: Tab labels for teachers                │
│                                                         │
│  switchTab()                                          │
│  ├─ Calls: isCurrentUserAdmin()                      │
│  ├─ Checks: Is tab in hidden list?                   │
│  └─ Result: Prevents switching to hidden tabs       │
│                                                         │
│  showAddClassModal()                                  │
│  ├─ Calls: isCurrentUserAdmin()                      │
│  ├─ Shows: Error toast if not admin                 │
│  └─ Result: Modal not shown                         │
│                                                         │
│  loadSubjectsForMarks()                               │
│  ├─ Calls: getCurrentUserAssignedSubjects()         │
│  ├─ Filters: By assigned subjects                    │
│  └─ Result: Only assigned shown in dropdown         │
│                                                         │
│  loadSubjectsForReports()                             │
│  ├─ Calls: getCurrentUserAssignedSubjects()         │
│  ├─ Filters: By assigned subjects                    │
│  └─ Result: Only assigned shown in dropdown         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Event Flow Diagram

```
Teacher User Opens App
         │
         ├─→ Login
         │
         ├─→ AppState populated
         │   ├─ currentUser.uid
         │   ├─ currentSchool.admins
         │   └─ currentUserData.assignedSubjects
         │
         ├─→ School Portal Loads
         │
         ├─→ applyRoleBasedTabVisibility() called
         │   ├─ isCurrentUserAdmin() → false
         │   ├─ Hide: students, subjects, settings tabs
         │   ├─ Hide: 5 admin buttons
         │   ├─ Update labels: Teachers → My Admin
         │   └─ Set active: Classes tab
         │
         ├─→ UI Rendered with Restrictions
         │
         ├─→ User Clicks Button
         │   ├─ If on hidden button → No effect
         │   ├─ If on allowed button → Event fires
         │   │   └─→ Event handler checks permission
         │   │       ├─ isCurrentUserAdmin() → false
         │   │       ├─ Show error toast
         │   │       └─ Return early
         │   │
         │   └─ If valid teacher action → Proceeds
         │       ├─ Function checks permission
         │       ├─ Data filters by assignedSubjects
         │       └─ Action completes normally
         │
         └─→ User Experience: Smooth, secure, role-appropriate
```

---

## Summary Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    COMPLETE SYSTEM                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────┐         ┌──────────────────┐        │
│  │  USER ROLES    │         │  HELPER FUNCTIONS│        │
│  ├────────────────┤         ├──────────────────┤        │
│  │ Admin (7/7)    │         │ isCurrentUser    │        │
│  │ Teacher (4/7)  │         │ Admin()          │        │
│  └────────────────┘         │                  │        │
│                              │ isCurrentUser    │        │
│  ┌────────────────┐          │ Teacher()        │        │
│  │  SECURITY      │          │                  │        │
│  │  LAYERS        │          │ getCurrent       │        │
│  ├────────────────┤          │ UserAssigned     │        │
│  │ Layer 1: UI    │          │ Subjects()       │        │
│  │ Layer 2: Func  │          └──────────────────┘        │
│  │ Layer 3: Data  │                                      │
│  └────────────────┘         ┌──────────────────┐        │
│                              │  RESTRICTED      │        │
│  ┌────────────────┐          │  DATA            │        │
│  │  MODULES       │          ├──────────────────┤        │
│  ├────────────────┤          │ Tabs (3 hidden)  │        │
│  │ School Portal  │          │ Buttons (5 hidden)       │
│  │ Marks Entry    │          │ Subjects         │        │
│  │ Reports        │          │ (by assignment)  │        │
│  │ Dashboard      │          │                  │        │
│  │ Registration   │          │ Reports          │        │
│  └────────────────┘          │ (by type/subject)│        │
│                              └──────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

This visualization shows the complete architecture of the role-based access control system implemented in the Skore Point App.

