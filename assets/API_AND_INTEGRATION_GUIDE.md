# SkorePoint API & Integration Guide

## 1. System Architecture Overview

SkorePoint operates on a **Serverless Architecture** using **Google Firebase**.
- **Database**: Cloud Firestore (NoSQL JSON-like documents).
- **Authentication**: Firebase Authentication.
- **API Access**: Direct database interaction via Firebase SDKs.

To connect an external system (e.g., a Monitoring Dashboard, Analytics System, or Ministry of Education Portal) to SkorePoint, you do not call HTTP endpoints. Instead, you connect directly to the data layer using the **Firebase Admin SDK**.

---

## 2. Connecting an External System

### Method: Firebase Admin SDK (Service Account)
This method grants **full, unrestricted access** to all data in the system, bypassing client-side security rules. This is ideal for a "Super Admin" or "Monitoring" system.

#### Prerequisites
1. Access to the Firebase Console for Project: `upgrade-16092`
2. A Service Account Key (JSON file).

#### Setup Steps for External App (Node.js Example)

1. **Generate Key**: Go to Firebase Console > Project Settings > Service Accounts > Generate New Private Key. Save as `serviceAccountKey.json`.
2. **Install SDK**:
   ```bash
   npm install firebase-admin
   ```
3. **Initialize Connection**:
   ```javascript
   const admin = require("firebase-admin");
   const serviceAccount = require("./serviceAccountKey.json");

   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });

   const db = admin.firestore();
   ```

---

## 3. Data Model (The "API" Endpoints)

Since this is a NoSQL database, "Endpoints" are actually **Collections**.

### A. Monitoring Schools
**Collection**: `schools`

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique School ID (Auto-generated) |
| `name` | String | Name of the school |
| `level` | String | `primary` or `secondary` |
| `code` | String | Unique school code |
| `admins` | Array | List of User UIDs who are admins |
| `teachers` | Array | List of User UIDs who are teachers |
| `location` | String | Physical location |

**Code to fetch all schools:**
```javascript
const snapshot = await db.collection('schools').get();
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

### B. Monitoring Users (Teachers & Admins)
**Collection**: `users`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | String | Matches Auth UID |
| `email` | String | User email |
| `role` | String | `admin` or `teacher` |
| `schoolId` | String | ID of the school they belong to |
| `assignedSubjects` | Array | List of Subject IDs (for teachers) |

**Code to fetch users for a specific school:**
```javascript
const users = await db.collection('users')
  .where('schoolId', '==', 'TARGET_SCHOOL_ID')
  .get();
```

### C. Monitoring Students
**Collection**: `students`

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Full name |
| `gender` | String | Male/Female |
| `classId` | String | Reference to `classes` collection |
| `schoolId` | String | Reference to `schools` collection |
| `category` | String | e.g., `lower-primary`, `olevel` |

### D. Monitoring Academic Performance (Marks)
**Collection**: `marks`

The marks are stored in a composite document format to reduce reads.
- **Document ID Format**: `${studentId}_${term}` (e.g., `student123_Term1`)

| Field | Type | Description |
|-------|------|-------------|
| `studentId` | String | Reference to student |
| `classId` | String | Reference to class |
| `term` | String | `Term1`, `Term2`, etc. |
| `[subjectId]` | Number/Obj | The score for a specific subject ID |

---

## 4. Monitoring "Actions Done" (Audit Logs)

Currently, the SkorePoint application logs actions to the browser console but does not automatically save a history of actions (like "Deleted Student" or "Changed Mark") to the database.

### Recommended Implementation for Monitoring
To monitor actions, the application code (`school.js`) should be updated to write to a new `audit_logs` collection whenever a critical action occurs.

**Proposed Schema for `audit_logs`:**
```json
{
  "action": "DELETE_CLASS",
  "performedBy": "user_uid_123",
  "schoolId": "school_id_456",
  "timestamp": "2023-10-27T10:00:00Z",
  "details": "Deleted class P1 Blue"
}
```

**How to query (once implemented):**
```javascript
// Get all actions performed today
const today = new Date();
today.setHours(0,0,0,0);

const logs = await db.collection('audit_logs')
  .where('timestamp', '>=', today)
  .get();
```

---

## 5. Monitoring Generated Reports

Reports in SkorePoint (Report Cards) are generated **dynamically on the client-side** using JavaScript (`html2pdf`). They are not stored as PDF files in the database.

### How to Monitor Report Generation
Since the PDF isn't stored, you cannot "download" generated reports from the API. However, you can monitor **who generated a report and when**.

**Implementation Requirement:**
Modify `pages/school/school.js` inside the `generateReportCard()` or `downloadReportCardAsPDF()` function to write a record to Firestore.

**Example Data to Capture:**
```javascript
// When a user clicks "Download PDF"
await db.collection('report_generation_logs').add({
  type: 'REPORT_CARD',
  studentId: 'target_student_id',
  generatedBy: 'teacher_uid',
  term: 'Term1',
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
});
```

---

## 6. Summary for External System Developers

To build a "Super Admin" dashboard that monitors SkorePoint:

1.  **Do not look for a REST API URL.**
2.  **Request a Service Account Key** from the project owner.
3.  **Use the Firebase Admin SDK** in your backend (Python, Node.js, Java, Go).
4.  **Read Data**:
    - `db.collection('schools')` -> List of all schools.
    - `db.collection('users')` -> List of all system users.
5.  **Write Data**:
    - You can remotely update data (e.g., disable a school) by updating the document:
      ```javascript
      await db.collection('schools').doc('school_id').update({ status: 'disabled' });
      ```

This provides real-time, full access to the entire SkorePoint ecosystem.