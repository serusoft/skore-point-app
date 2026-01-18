# Classes Modal - Visual Architecture & Flow Diagrams

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   School Portal Page                        │
│                                                             │
│  ┌───────────┬──────────┬─────────┬──────────┬──────────┐  │
│  │ Classes   │ Students │ Subjects│ Teachers │ Reports  │  │
│  └───────────┴──────────┴─────────┴──────────┴──────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Classes Section                           │   │
│  │                                                     │   │
│  │  [+ Add Class] ← Click here                         │   │
│  │                                                     │   │
│  │  Classes Grid:                                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │  │ Class 1 │ │ Class 2 │ │ Class 3 │              │   │
│  │  └─────────┘ └─────────┘ └─────────┘              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Click [+ Add Class]
                            ↓
         ┌──────────────────────────────────────┐
         │                                      │
         │      MODAL 1: Level Selection        │
         │      (Center, Dimmed BG, Blur)       │
         │                                      │
         │   [Close Button] ✕                   │
         │   ┌──────────────────────────────┐   │
         │   │ Select Level *               │   │
         │   │ ┌────────────────────────┐   │   │
         │   │ │ Lower Primary (P1-P3)▼ │   │   │
         │   │ │ Upper Primary (P4-P7)  │   │   │
         │   │ │ (O-Level/A-Level)      │   │   │
         │   │ └────────────────────────┘   │   │
         │   └──────────────────────────────┘   │
         │   [Cancel]  [Continue]               │
         │                                      │
         └──────────────────────────────────────┘
                      ↓
              Click [Continue]
                      ↓
         ┌──────────────────────────────────────┐
         │                                      │
         │    MODAL 2: Class Details            │
         │    (Same style as Modal 1)           │
         │                                      │
         │   [Close Button] ✕                   │
         │   ┌──────────────────────────────┐   │
         │   │ Class Name *                 │   │
         │   │ ┌────────────────────────┐   │   │
         │   │ │ e.g. P1, S1        │   │   │
         │   │ └────────────────────────┘   │   │
         │   │ Stream (Optional)            │   │
         │   │ ┌────────────────────────┐   │   │
         │   │ │ e.g. Blue, North   │   │   │
         │   │ └────────────────────────┘   │   │
         │   └──────────────────────────────┘   │
         │   [Cancel]  [Create Class]           │
         │                                      │
         └──────────────────────────────────────┘
                      ↓
           Click [Create Class]
                      ↓
              Form Validation ✓
                      ↓
        Firebase.db.addDoc('classes', {...})
                      ↓
            showToast('Success!') ✓
                      ↓
          loadClasses(selectedLevel)
                      ↓
            Modal closes automatically
                      ↓
         Classes list refreshes with
         new class in correct level
```

---

## 🎨 CSS Styling Hierarchy

```
Global Styles (base.css)
    ↓
Color Variables (variables.css)
    ├─ --primary
    ├─ --dark
    ├─ --light
    ├─ --border-color
    └─ ...
    ↓
Component Styles (components.css)
    ├─ Modal Styling
    │  ├─ .modal
    │  │  ├─ background: rgba(0,0,0,0.6)
    │  │  ├─ backdrop-filter: blur(8px)
    │  │  └─ display: flex (centering)
    │  │
    │  ├─ .modal.active
    │  │  └─ animation: fadeInBackdrop 0.3s
    │  │
    │  ├─ .modal-content
    │  │  ├─ border-radius
    │  │  ├─ box-shadow: 0 20px 60px...
    │  │  └─ animation: slideUp 0.3s
    │  │
    │  ├─ .modal-header
    │  │  ├─ border-bottom: 1px solid
    │  │  └─ flex: space-between
    │  │
    │  ├─ .modal-close
    │  │  └─ :hover { rotate: 90deg }
    │  │
    │  └─ .modal-footer
    │     └─ display: flex
    │
    └─ Form Styling
       ├─ .form-group
       │  └─ margin-bottom: 20px
       │
       ├─ .form-control
       │  ├─ border: 1px solid
       │  ├─ padding: 12px 15px
       │  └─ :focus {
       │      border-color: primary
       │      box-shadow: 0 0 0 3px rgba(...)
       │  }
       │
       ├─ .modal-body .form-control
       │  ├─ :hover { border: primary50% }
       │  └─ enhanced focus states
       │
       └─ .form-control-static
          └─ display: readonly field
```

---

## 🔄 Event Flow Diagram

```
User Interaction Layer
┌────────────────────────────────────────┐
│ User clicks [+ Add Class] button        │
└────────────────┬───────────────────────┘
                 │
                 ↓
JavaScript Layer
┌────────────────────────────────────────┐
│ Event Listener Triggers                │
│ Event delegation catches click          │
│ setupEventListeners() → case: 'addClassBtn'
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ showAddClassModal() function            │
│ ├─ Get AppState.currentSchool          │
│ ├─ Determine school.level              │
│ └─ Build appropriate level options     │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ UI.form() - First Modal                 │
│ ├─ Show level dropdown                 │
│ ├─ Wait for user selection             │
│ └─ Attach 'Continue' callback          │
└────────────────┬───────────────────────┘
                 │
                 ↓
        User selects level
        & clicks Continue
                 │
                 ↓
┌────────────────────────────────────────┐
│ First Modal Callback Executes           │
│ ├─ Extract selectedLevel                │
│ ├─ Close first modal                   │
│ └─ Trigger second modal                │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ UI.form() - Second Modal                │
│ ├─ Show class details form             │
│ ├─ Wait for user input                 │
│ └─ Attach 'Create Class' callback      │
└────────────────┬───────────────────────┘
                 │
                 ↓
        User enters details
        & clicks Create Class
                 │
                 ↓
┌────────────────────────────────────────┐
│ Form Validation                         │
│ ├─ Check required fields               │
│ └─ Validate format                     │
└────────────────┬───────────────────────┘
                 │
                 ↓
Database Layer
┌────────────────────────────────────────┐
│ Firebase Operations                    │
│ showPageLoading('Creating class...')   │
│ ├─ await Firebase.db.addDoc()          │
│ │   └─ Store to Firestore              │
│ └─ hidePageLoading()                   │
└────────────────┬───────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│ Success Handling                        │
│ ├─ showToast('Success!', 'success')   │
│ ├─ loadClasses(selectedLevel)          │
│ │   └─ Refresh classes grid            │
│ └─ Modal closes                        │
└────────────────────────────────────────┘
                 │
                 ↓
UI Updated Layer
┌────────────────────────────────────────┐
│ User sees:                              │
│ ├─ Success notification                │
│ ├─ New class in the grid               │
│ └─ Modal gone                          │
└────────────────────────────────────────┘
```

---

## 🎨 CSS Animation Timeline

### Modal Appearance
```
Time:  0ms           100ms          200ms          300ms
       │             │              │              │
Modal: ├─────────────┼──────────────┼──────────────┤
       Invisible                                    Visible
       
Backdrop:
       opacity: 0        0.3          0.5           0.6
       blur: 0px         2px          5px           8px
       
Card:
       transform:        translateY  translateY    translateY
       opacity: 0        -20px/0.5   -10px/0.75    0px/1
       
Animation Curve: ease (ease-in initially, then ease-out)
```

### Close Button Hover
```
Time:  0ms      50ms     100ms    150ms    200ms    250ms    300ms
       │        │        │        │        │        │        │
Rotate:├────────┼────────┼────────┼────────┼────────┼────────┤
       0°      15°      30°      45°      60°      75°      90°
       
Background:
       transparent    rgba(red, 0.05)    rgba(red, 0.1)
       
Color:
       muted-gray     error-red
```

### Input Focus
```
Time:  0ms      100ms    200ms    300ms
       │        │        │        │
Border:├────────┼────────┼────────┤
       light-gray      primary-color (blue)
       
Shadow:
       none            0 0 0 3px rgba(blue, 0.12)
       
Color:
       input-bg        (stays same)
```

---

## 🔐 Data Flow Diagram

```
Frontend (Client)
    ↓
┌─────────────────────────────────┐
│  Browser                        │
│  ├─ DOM Events                  │
│  ├─ JavaScript (school.js)      │
│  └─ CSS Styling                 │
└─────────────┬───────────────────┘
              │
              ↓ (Form Data)
┌─────────────────────────────────┐
│  Form Data Object               │
│  ├─ name: "Class Name"          │
│  ├─ stream: "Stream/Section"    │
│  └─ level: "lower-primary"      │
└─────────────┬───────────────────┘
              │
              ↓ (Network)
┌─────────────────────────────────┐
│  Firebase API                   │
│  db.addDoc('classes', data)     │
└─────────────┬───────────────────┘
              │
              ↓
Backend (Server)
┌─────────────────────────────────┐
│  Firebase Firestore             │
│  ├─ Authentication Check        │
│  ├─ Validation Rules            │
│  ├─ Schema Validation           │
│  └─ Write to Database           │
└─────────────┬───────────────────┘
              │
              ↓ (Document ID)
┌─────────────────────────────────┐
│  Success Response               │
│  ├─ Document ID                 │
│  ├─ Timestamp                   │
│  └─ Status: Success             │
└─────────────┬───────────────────┘
              │
              ↓ (Network)
Frontend Response Handler
    ├─ Hide loading indicator
    ├─ Show success toast
    ├─ Refresh classes list
    └─ Close modal
              │
              ↓
User sees updated UI
    ├─ New class in list
    ├─ Success notification
    └─ Modal closed
```

---

## 📊 State Machine Diagram

```
                    Initial State
                         │
                         ↓
                  [Add Class] Button
                         │
                         ↓ (click)
              ┌──────────────────────┐
              │   MODAL 1 OPEN       │
              │  (Level Selection)   │
              └────────┬─────┬───────┘
                       │     │
            (Cancel)   │     │   (Continue)
              ↓        │     │        ↓
          CLOSED    (Select) MODAL 2 OPEN
                     Level   (Class Details)
                       │        │
                       │        ├─ (Cancel)
                       │        │     ↓
                       │        │   CLOSED
                       │        │
                       │        └─ (Submit)
                       │             ↓
                       │        VALIDATION
                       │          ├─ FAIL → Error → MODAL 2 OPEN
                       │          │
                       │          └─ PASS
                       │             ↓
                       │        DATABASE WRITE
                       │          ├─ FAIL → Error → MODAL 2 OPEN
                       │          │
                       │          └─ SUCCESS
                       │             ↓
                       └─────────CLOSED ✓
                                  ↓
                            REFRESH UI
                                  ↓
                           [Final State]
```

---

## 🎯 Interaction Map

```
┌─────────────────────────────────────────────────────────┐
│                   Modal Areas                           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ HEADER AREA                                      │   │
│  │ ├─ Title (Static)                               │   │
│  │ └─ Close Button (✕) ← Click to close            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ BODY AREA                                        │   │
│  │ ├─ Label                                         │   │
│  │ ├─ Input/Select ← Type/click to interact        │   │
│  │ └─ Help text (if any)                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ FOOTER AREA                                      │   │
│  │ ├─ Cancel Button ← Click to cancel              │   │
│  │ └─ Primary Button ← Click to proceed            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Clickable Elements (Keyboard/Mouse):
├─ Close button (✕) - Keyboard: Escape also works
├─ Form inputs - Keyboard: Tab to navigate
├─ Dropdown - Keyboard: Arrow keys to select
├─ Cancel button - Keyboard: Shift+Tab then Enter
└─ Primary button - Keyboard: Tab then Enter

Non-interactive Areas:
├─ Modal backdrop - Click closes modal
├─ Modal title - Visual only
└─ Labels - Visual reference
```

---

## 🔌 Integration Points

```
AppState (Global State)
    ├─ currentSchool
    │  └─ Used to determine levels
    │
    └─ currentUser
       └─ For Firebase auth
              │
              ↓
        showAddClassModal()
              │
         ├─ Create modals
         │
         ├─ Show form
         │
         └─ Handle callbacks
              │
              ↓
        Firebase.db.addDoc()
              │
         ├─ Write to database
         │
         └─ Return success/error
              │
              ↓
        loadClasses()
              │
         ├─ Fetch updated list
         │
         └─ Refresh grid
              │
              ↓
        UI Components
              │
         ├─ Toast notification
         ├─ Loading state
         └─ Classes grid
```

---

## 📱 Responsive Breakpoints

```
┌─────────────────────────────────────────┐
│ DESKTOP (1200px+)                       │
│                                         │
│     ┌─────────────────────────┐        │
│     │  Modal (500px)          │        │
│     └─────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘

┌──────────────────────────────┐
│ TABLET (768px - 1199px)      │
│                              │
│  ┌────────────────────────┐  │
│  │  Modal (90% width)     │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘

┌────────────────────────┐
│ MOBILE (< 768px)       │
│                        │
│ ┌──────────────────┐   │
│ │ Modal (90vw)     │   │
│ │ Full screen      │   │
│ │ scroll if needed │   │
│ └──────────────────┘   │
│                        │
└────────────────────────┘
```

---

## 🎭 Visual State Examples

### Modal States
```
[Default]           [Hover]              [Focus]
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ✕              │  │ ↻ (rotate)     │  │ ┃ (outline)   │
│                │  │                │  │                │
│ Select Level   │  │ Select Level   │  │ Select Level   │
│ [           ▼] │  │ [           ▼] │  │ [           ▼] │
│                │  │                │  │                │
│ [Cancel] [OK] │  │ [Cancel] [OK] │  │ [Cancel] [OK] │
└────────────────┘  └────────────────┘  └────────────────┘

[Active]             [Disabled]           [Error]
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ✕              │  │ ✕              │  │ ✕              │
│                │  │                │  │                │
│ Select Level   │  │ Select Level   │  │ Select Level   │
│ [Primary    ▼] │  │ [           ▼] │  │ [           ▼] │
│                │  │ (greyed out)   │  │ (red border)   │
│ [Cancel] [OK] │  │ [Cancel] [OK] │  │ [Cancel] [OK] │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

*Architecture diagrams created for complete understanding of the Classes Modal system*

