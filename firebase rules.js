rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    /* =========================
       HELPER FUNCTIONS
    ========================= */

    function isAuthenticated() {
      return request.auth != null;
    }

    function getSchool(schoolId) {
      return get(/databases/$(database)/documents/schools/$(schoolId));
    }

    function getUser(userId) {
      return get(/databases/$(database)/documents/users/$(userId));
    }

    function isValidSchool(schoolId) {
      return exists(/databases/$(database)/documents/schools/$(schoolId));
    }

    function userBelongsToSchool(schoolId) {
      let userData = getUser(request.auth.uid).data;
      return userData != null && userData.schoolId == schoolId;
    }

    function isSchoolAdmin(schoolId) {
      let schoolData = getSchool(schoolId).data;
      let userData = getUser(request.auth.uid).data;
      return (schoolData != null
        && schoolData.admins is list
        && schoolData.admins.hasAny([request.auth.uid])) || (userData != null && userData.role == 'admin');
    }

    function isSchoolTeacher(schoolId) {
      let schoolData = getSchool(schoolId).data;
      return schoolData != null
        && schoolData.teachers is list
        && schoolData.teachers.hasAny([request.auth.uid]);
    }

    function isOwnProfile(userId) {
      return request.auth.uid == userId;
    }

    /* =========================
       JOINING SCHOOL (SAFE)
    ========================= */

    function isJoiningFieldsOnly() {
      let oldTeachers = resource.data.teachers is list
        ? resource.data.teachers
        : [];

      let newTeachers = request.resource.data.teachers is list
        ? request.resource.data.teachers
        : [];

      let userAdded =
        !oldTeachers.hasAny([request.auth.uid]) &&
         newTeachers.hasAny([request.auth.uid]);

      let changedKeys =
        request.resource.data.diff(resource.data).affectedKeys();

      return userAdded && changedKeys.hasOnly(['teachers']);
    }

    /* =========================
       USERS COLLECTION
    ========================= */

    match /users/{userId} {

      allow read: if isAuthenticated() && (
        isOwnProfile(userId) ||
        (
          resource.data.schoolId != null &&
          isValidSchool(resource.data.schoolId) &&
          userBelongsToSchool(resource.data.schoolId)
        )
      );

      allow create: if isAuthenticated() && isOwnProfile(userId);

      allow update: if isAuthenticated() && (
        isOwnProfile(userId) ||
        (
          resource.data.schoolId != null &&
          isValidSchool(resource.data.schoolId) &&
          userBelongsToSchool(resource.data.schoolId) &&
          isSchoolAdmin(resource.data.schoolId)
        )
      );
    }

    /* =========================
       SCHOOLS COLLECTION
    ========================= */

    match /schools/{schoolId} {

      allow read: if true;

      allow create: if isAuthenticated();

      allow update: if isAuthenticated() && (
        isSchoolAdmin(schoolId) ||
        isJoiningFieldsOnly()
      );

      allow delete: if isAuthenticated() && isSchoolAdmin(schoolId);
    }

    /* =========================
       CLASSES COLLECTION
    ========================= */

    match /classes/{classId} {

      allow read: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && userBelongsToSchool(resource.data.schoolId);

      allow create: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && isSchoolAdmin(request.resource.data.schoolId);
      
      allow update: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && isSchoolAdmin(request.resource.data.schoolId);

      allow delete: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && isSchoolAdmin(resource.data.schoolId);
    }

    /* =========================
       STUDENTS COLLECTION
    ========================= */

    match /students/{studentId} {

      allow read: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && userBelongsToSchool(resource.data.schoolId);

      allow create: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && (isSchoolAdmin(request.resource.data.schoolId) || isSchoolTeacher(request.resource.data.schoolId));

      allow update: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && isSchoolAdmin(resource.data.schoolId);
        
      allow delete: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && isSchoolAdmin(resource.data.schoolId);
    }

    /* =========================
       SUBJECTS COLLECTION
    ========================= */

    match /subjects/{subjectId} {

      allow read: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && userBelongsToSchool(resource.data.schoolId);

      allow create: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && isSchoolAdmin(request.resource.data.schoolId);
      
      allow update: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && isSchoolAdmin(request.resource.data.schoolId);

      allow delete: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && isSchoolAdmin(resource.data.schoolId);
    }

    /* =========================
       MARKS COLLECTION
    ========================= */

    match /marks/{markId} {

      allow read: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && userBelongsToSchool(resource.data.schoolId);

      allow create, update: if isAuthenticated()
        && request.resource.data.schoolId != null
        && isValidSchool(request.resource.data.schoolId)
        && userBelongsToSchool(request.resource.data.schoolId)
        && (
          isSchoolAdmin(request.resource.data.schoolId) ||
          isSchoolTeacher(request.resource.data.schoolId)
        );

      allow delete: if isAuthenticated()
        && resource.data.schoolId != null
        && isValidSchool(resource.data.schoolId)
        && userBelongsToSchool(resource.data.schoolId)
        && isSchoolAdmin(resource.data.schoolId);
    }
  }
}
