// pages/school/school.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('School Page: DOMContentLoaded - Starting initialization process (v1.2.1).');

    // Track initialization state
    let pageInitialized = false;
    let schoolDataLoaded = false;
    let listenersSetup = false;
    
    // Border style with repeating open book icons
    const BOOK_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA1NzYgNTEyJyB3aWR0aD0nMjQnIGhlaWdodD0nMjQnPjxwYXRoIGZpbGw9JyMxYTczZTgnIGZpbGwtb3BhY2l0eT0nMC44JyBkPSdNNTQyLjIyIDMyLjA1Yy01NC44IDMuMTEtMTYzLjcyIDE0LjQzLTIzMC45NiA1NS41OS00LjY0IDIuODQtNy4yNyA3Ljg5LTcuMjcgMTMuMTd2MzYzLjg3YzAgMTEuNTUgMTIuNjMgMTguODUgMjMuMjggMTMuNDkgNjkuMTgtMzQuODIgMTY5LjIzLTQ0LjMyIDIxOC43LTQ2LjkyIDE2Ljg5LS44OSAzMC4wMi0xNC40MyAzMC4wMi0zMS4xMlY2Mi42OGMwLTE3LjA0LTE0LjMyLTMwLjczLTMzLjc3LTMwLjYzek0yNjQuNzMgODcuNjRDMTk3LjUgNDYuNDggODguNTggMzUuMTcgMzMuNzggMzIuMDUgMTQuMzMgMzEuOTUgMCA0NS42NCAwIDYyLjY4djI4NS4xM2MwIDE2LjY5IDEzLjEzIDMwLjIzIDMwLjAyIDMxLjEyIDQ5LjQ3IDIuNiAxNDkuNTIgMTIuMSAyMTguNyA0Ni45MiAxMC42NSA1LjM2IDIzLjI4LTEuOTQgMjMuMjgtMTMuNDlWMTAwLjgxYzAtNS4yOS0yLjYzLTEwLjM0LTcuMjctMTMuMTd6Jy8+PC9zdmc+";
    const BOOK_ICON_FLIPPED = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20576%20512%27%20width%3D%2724%27%20height%3D%2724%27%3E%3Cg%20transform%3D%27scale(-1%2C%201)%20translate(-576%2C%200)%27%3E%3Cpath%20fill%3D%27%231a73e8%27%20fill-opacity%3D%270.8%27%20d%3D%27M542.22%2032.05c-54.8%203.11-163.72%2014.43-230.96%2055.59-4.64%202.84-7.27%207.89-7.27%2013.17v363.87c0%2011.55%2012.63%2018.85%2023.28%2013.49%2069.18-34.82%20169.23-44.32%20218.7-46.92%2016.89-.89%2030.02-14.43%2030.02-31.12V62.68c0-17.04-14.32-30.73-33.77-30.62zM264.73%2087.64C197.5%2046.48%2088.58%2035.17%2033.78%2032.05%2014.33%2031.95%200%2045.64%200%2062.68v285.13c0%2016.69%2013.13%2030.23%2030.02%2031.12%2049.47%202.6%20149.52%2012.1%20218.7%2046.92%2010.65%205.36%2023.28-1.94%2023.28-13.49V100.81c0-5.29-2.63-10.34-7.27-13.17z%27%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
    const BOOK_ICON_ROTATED = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20576%20512%27%20width%3D%2724%27%20height%3D%2724%27%3E%3Cg%20transform%3D%27rotate(-90%20288%20256)%20scale(-1%2C%201)%20translate(-576%2C%200)%27%3E%3Cpath%20fill%3D%27%231a73e8%27%20fill-opacity%3D%270.8%27%20d%3D%27M542.22%2032.05c-54.8%203.11-163.72%2014.43-230.96%2055.59-4.64%202.84-7.27%207.89-7.27%2013.17v363.87c0%2011.55%2012.63%2018.85%2023.28%2013.49%2069.18-34.82%20169.23-44.32%20218.7-46.92%2016.89-.89%2030.02-14.43%2030.02-31.12V62.68c0-17.04-14.32-30.73-33.77-30.62zM264.73%2087.64C197.5%2046.48%2088.58%2035.17%2033.78%2032.05%2014.33%2031.95%200%2045.64%200%2062.68v285.13c0%2016.69%2013.13%2030.23%2030.02%2031.12%2049.47%202.6%20149.52%2012.1%20218.7%2046.92%2010.65%205.36%2023.28-1.94%2023.28-13.49V100.81c0-5.29-2.63-10.34-7.27-13.17z%27%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
    const BOOK_BORDER_STYLE = `border: 24px solid transparent; background-clip: padding-box, border-box, border-box, border-box, border-box; background-origin: padding-box, border-box, border-box, border-box, border-box; background-image: linear-gradient(white, white), url('${BOOK_ICON_ROTATED}'), url('${BOOK_ICON_ROTATED}'), url('${BOOK_ICON_FLIPPED}'), url('${BOOK_ICON_FLIPPED}'); background-position: 0 0, top left, bottom left, top left, top right; background-repeat: no-repeat, repeat-x, repeat-x, repeat-y, repeat-y; background-size: cover, 24px 24px, 24px 24px, 24px 24px, 24px 24px; box-shadow: 0 0 0 1px #e0e0e0;`;

    // Performance optimization: Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Get the current Ugandan school term based on the month.
     * @returns {string} 'I', 'II', or 'III'
     */
    function getUgandanTerm() {
        const month = new Date().getMonth() + 1; // getMonth() is 0-indexed
        if (month >= 2 && month <= 4) return 'I';      // Term I: Feb - Apr
        if (month >= 5 && month <= 8) return 'II';     // Term II: May - Aug
        return 'III';                                  // Term III: Sep - Dec (and Jan holidays)
    }
    
    // Single source of truth for page loading state
    const pageLoadingState = {
        isShowing: false,
        currentMessage: ''
    };
    
    // Show loading with specific ID for school page
    function showPageLoading(message = 'Loading school portal...') {
        if (typeof showLoading === 'function') {
            showLoading(message);
            pageLoadingState.isShowing = true;
            pageLoadingState.currentMessage = message;
        }
    }
    
    // Hide loading for school page
    function hidePageLoading() {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        pageLoadingState.isShowing = false;
        pageLoadingState.currentMessage = '';
    }
    
    // Show toast notification wrapper
    function showToast(message, type = 'info', duration = 3000) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Helper function to get initials from name
    function getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }
    
    // ========== RBAC SECURITY FUNCTIONS ==========
    
    /**
     * Check if current user is an admin
     */
    function isCurrentUserAdmin() {
        if (!AppState.currentSchool || !AppState.currentUser) {
            console.warn('isCurrentUserAdmin: Missing school or user data');
            return false;
        }
        
        const school = AppState.currentSchool;
        const currentUserId = AppState.currentUser.uid;
        
        // Check if user is in admin array
        // Normalize possible admin entry formats and compare by UID or email
        const admins = Array.isArray(school.admins) ? school.admins : [];
        const currentEmail = AppState.currentUser.email;

        const isAdmin = admins.some(a => {
            if (!a) return false;
            if (typeof a === 'string') {
                return a === currentUserId || a === currentEmail;
            }
            if (typeof a === 'object') {
                return a.id === currentUserId || a.uid === currentUserId || a.email === currentEmail;
            }
            return false;
        });

        console.log('isCurrentUserAdmin() Check:', {
            hasSchool: !!school,
            schoolName: school.name,
            schoolAdmins: school.admins,
            currentUserId: currentUserId,
            currentEmail: currentEmail,
            isAdmin: isAdmin
        });

        return isAdmin;
    }

    /**
     * Check if current user is a teacher (not admin)
     */
    function isCurrentUserTeacher() {
        return !isCurrentUserAdmin();
    }
    
    /**
     * Get teacher's assigned subjects
     */
    async function getTeacherAssignedSubjects(academicLevel = null) {
        try {
            const currentUserId = AppState.currentUser?.uid;
            if (!currentUserId || !AppState.currentSchool) {
                console.warn('getTeacherAssignedSubjects: Missing user or school data');
                return [];
            }

            // Get user document
            const userDoc = await Firebase.db.getDoc('users', currentUserId);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Start with existing assigned subjects
                let finalAssignedSubjects = userData.assignedSubjects || [];

                // Check for default 'subject' string from registration
                // We do this to ensure the default subject is assigned for the current level
                if (userData.subject) {
                    const subjectNameLower = userData.subject.trim().toLowerCase();
                    const subjectNameOriginal = userData.subject.trim();

                    try {
                        let matchedSubjects = [];

                        // Look for the subject in the current academic level
                        if (academicLevel) {
                            // Try lowercase match first
                            matchedSubjects = await Firebase.db.query('subjects', [
                                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                                { field: 'name_lowercase', op: '==', value: subjectNameLower },
                                { field: 'category', op: '==', value: academicLevel }
                            ]);

                            // Fallback: Try exact name match if lowercase failed
                            if (matchedSubjects.length === 0) {
                                matchedSubjects = await Firebase.db.query('subjects', [
                                    { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                                    { field: 'name', op: '==', value: subjectNameOriginal },
                                    { field: 'category', op: '==', value: academicLevel }
                                ]);
                            }
                        }

                        // Fallback: If no subjects assigned at all and no level specified, search all levels
                        if (matchedSubjects.length === 0 && finalAssignedSubjects.length === 0 && !academicLevel) {
                            // Try lowercase match
                            matchedSubjects = await Firebase.db.query('subjects', [
                                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                                { field: 'name_lowercase', op: '==', value: subjectNameLower }
                            ]);

                            // Fallback: Try exact name match
                            if (matchedSubjects.length === 0) {
                                matchedSubjects = await Firebase.db.query('subjects', [
                                    { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                                    { field: 'name', op: '==', value: subjectNameOriginal }
                                ]);
                            }
                        }

                        if (matchedSubjects.length > 0) {
                            const subjectToAssign = matchedSubjects[0]; // Take the first match
                            const subjectId = subjectToAssign.id;
                            
                            // If this subject is not yet assigned, add it
                            if (!finalAssignedSubjects.includes(subjectId)) {
                                console.log(`Auto-assigning default subject "${userData.subject}" for level ${academicLevel}: ${subjectId}`);

                                // Update DB using arrayUnion to preserve existing subjects
                                await Firebase.db.updateDoc('users', currentUserId, {
                                    assignedSubjects: Firebase.db.arrayUnion(subjectId)
                                });

                                // Update local list and AppState
                                finalAssignedSubjects.push(subjectId);
                                if (AppState.currentUserData) {
                                    AppState.currentUserData.assignedSubjects = finalAssignedSubjects;
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error resolving default subject:', err);
                    }
                }
                
                return finalAssignedSubjects;
            }

            console.warn('Teacher assigned subjects could not be loaded for user:', currentUserId);
            return [];
        } catch (error) {
            console.error('Error in getTeacherAssignedSubjects:', error);
            return [];
        }
    }
    
    /**
     * TEACHER SECURITY: Check if teacher has permission to access section
     */
    function checkTeacherSectionAccess(section) {
        const isAdmin = isCurrentUserAdmin();
        const restrictedSections = ['students', 'subjects', 'settings'];
        
        if (!isAdmin && restrictedSections.includes(section)) {
            console.error(`❌ SECURITY: Teacher attempted to access restricted section: ${section}`);
            showToast('Access denied. This section is for administrators only.', 'error');
            return false;
        }
        return true;
    }
    
    /**
     * SECURITY OVERRIDE: Secure load functions with permission checks
     */
    window.loadStudents = async function(level) {
        if (!isCurrentUserAdmin()) {
            console.error('❌ SECURITY: Teacher attempted to load students');
            showToast('You do not have permission to view students.', 'error');
            
            // Clear student section for teachers
            const studentsList = document.querySelector('#studentsTable tbody');
            if (studentsList) {
                studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><i class="fas fa-lock"></i> Access restricted to administrators</td></tr>';
            }
            return;
        }
        
        // Call original implementation
        await originalLoadStudents(level);
    };
    
    window.loadSubjects = async function(level) {
        if (!isCurrentUserAdmin()) {
            console.error('❌ SECURITY: Teacher attempted to load subjects');
            showToast('You do not have permission to view subjects.', 'error');
            
            // Clear subject section for teachers
            const subjectsList = document.getElementById('subjectsGrid');
            if (subjectsList) {
                subjectsList.innerHTML = '<div class="error-message"><i class="fas fa-lock"></i> Access restricted to administrators</div>';
            }
            return;
        }
        
        // Call original implementation
        await originalLoadSubjects(level);
    };
    
    // Store original functions before overriding
    const originalLoadStudents = async function(level) {
        console.log(`Loading students for level: ${level}`);
        const studentsList = document.querySelector('#studentsTable tbody');
        
        if (studentsList) {
            studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></td></tr>';
        }
        
        try {
            // Query by schoolId only to avoid composite index requirement
            const allStudents = await Firebase.db.query('students', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            const students = allStudents.filter(s => s.category === level);
            
            // Fetch classes for lookup
            const allClasses = await Firebase.db.query('classes', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            const classes = allClasses.filter(c => c.category === level);
            
            const classMap = {};
            classes.forEach(cls => {
                classMap[cls.id] = cls.name;
            });
            
            renderStudents(students, classMap);
            
            // Update class filter dropdown
            const classFilter = document.getElementById('classFilter');
            if (classFilter) {
                classFilter.innerHTML = '<option value="">All Classes</option>';
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    classFilter.appendChild(option);
                });
                
                // Add event listener for filtering
                classFilter.addEventListener('change', debounce(async (e) => {
                    const selectedClassId = e.target.value;
                    if (!selectedClassId) {
                        await loadStudents(level);
                    } else {
                        const filteredStudents = students.filter(student => student.classId === selectedClassId);
                        renderStudents(filteredStudents, classMap);
                    }
                }, 300));
            }
            
        } catch (error) {
            console.error('Error loading students:', error);
            if (studentsList) {
                studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><p class="error-message">Failed to load students.</p></td></tr>';
            }
        }
    };
    
    const originalLoadSubjects = async function(level) {
        console.log(`Loading subjects for level: ${level}`);
        
        const subjectsList = document.getElementById('subjectsGrid');
        const emptyState = document.getElementById('subjectsEmpty');
        
        if (subjectsList) {
            subjectsList.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        try {
            // Query by schoolId only to avoid composite index requirement
            const allSubjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            const subjects = allSubjects.filter(s => s.category === level);
            
            renderSubjects(subjects);
        } catch (error) {
            console.error('Error loading subjects:', error);
            if (subjectsList) {
                subjectsList.innerHTML = '<p class="error-message">Failed to load subjects.</p>';
            }
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        }
    };
    
    // Listen for the app to be initialized
    document.addEventListener('app:initialized', async () => {
        console.log('School Page: app:initialized event received.');
        
        if (pageInitialized) {
            console.log('School Page: Already initialized, skipping.');
            return;
        }
        
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: app:initialized - AppState.currentSchool is available.');
            pageInitialized = true;
            await initializeAndLoad();
        } else {
            console.warn('School Page: app:initialized - AppState.currentSchool is NOT available.');
            hidePageLoading();
            showToast('No school assigned or loaded. Please contact support.', 'warning');
        }
    });
    
    // Listen for school changes
    document.addEventListener('school:changed', async () => {
        console.log('School Page: school:changed event received.');
        if (pageInitialized && !schoolDataLoaded) {
            console.log('School Page: Re-initializing page with new school.');
            await initializeAndLoad();
        }
    });
    
    // Listen for academic level changes
    document.addEventListener('academic-level:changed', debounce(async (e) => {
        console.log(`School Page: academic-level:changed event received. Loading data for level: ${e.detail.level}.`);
        if (pageInitialized && schoolDataLoaded) {
            await loadDataForLevel(e.detail.level);
        }
    }, 300));
    
    // If app was already initialized
    if (window.appInitialized) {
        console.log('School Page: DOMContentLoaded - window.appInitialized is true.');
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: DOMContentLoaded - AppState.currentSchool available.');
            if (!pageInitialized) {
                pageInitialized = true;
                await initializeAndLoad();
            }
        } else {
            console.warn('School Page: DOMContentLoaded - App already initialized but no current school found.');
            hidePageLoading();
            showToast('No school assigned or loaded. Please contact support.', 'warning');
        }
    } else {
        console.log('School Page: DOMContentLoaded - window.appInitialized is false. Waiting for app:initialized event.');
    }
    
    // Safety timeout to ensure loading doesn't get stuck
    setTimeout(() => {
        if (pageLoadingState.isShowing) {
            console.warn('School Page: Safety timeout - hiding loading indicator.');
            hidePageLoading();
            if (!pageInitialized) {
                showToast('Page initialization taking longer than expected.', 'warning');
            }
        }
        // Ensure UI is revealed even if initialization stalls
        document.documentElement.classList.remove('rbac-pending');
    }, 10000);

    /**
     * Main function to set up the page once school data is available.
     */
    async function initializeAndLoad() {
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║  SCHOOL PAGE INITIALIZATION STARTING           ║');
        console.log('║  Current User:', AppState.currentUser?.uid?.substring(0, 8) + '...');
        console.log('║  Current School:', AppState.currentSchool?.name);
        console.log('╚════════════════════════════════════════════════╝');
        
        showPageLoading('Loading school data...');
        
        try {
            setupEventListeners();
            await initializePage();
            await loadInitialData();
            
            // Reapply tab visibility after data is loaded to ensure it's set correctly
            applyRoleBasedTabVisibility();
            
            setupSchoolSettings();
            setupEnterMarksHandlers();
            // Class filters are now populated by loadClasses -> updateClassDropdowns
            setupReportCardHandlers();
            // Class filters are now populated by loadClasses -> updateClassDropdowns
            schoolDataLoaded = true;
            
            console.log('School Page: initializeAndLoad() - Initialization completed successfully.');
            
        } catch (error) {
            console.error("School Page: initializeAndLoad() - Error during school page initialization:", error);
            showToast("Failed to initialize school portal. Please refresh the page.", "error");
        } finally {
            hidePageLoading();
            console.log('School Page: initializeAndLoad() - Hiding loading indicator.');
        }
    }

    /**
     * Show/hide tabs based on user role
     */
    function applyRoleBasedTabVisibility() {
        const isAdmin = isCurrentUserAdmin();
        console.log('=== applyRoleBasedTabVisibility() STARTING ===');
        console.log('User is Admin:', isAdmin);
        
        // Define restricted sections for teachers
        const teacherHiddenSections = ['students', 'subjects', 'settings'];
        
        // Update desktop tabs
        const desktopTabs = document.querySelectorAll('.content-tab');
        desktopTabs.forEach(tab => {
            const section = tab.dataset.section;
            
            if (!isAdmin && teacherHiddenSections.includes(section)) {
                tab.style.display = 'none';
                console.log(`Hiding desktop tab: ${section}`);
            } else {
                tab.style.display = '';
                
                // Update labels for teachers
                if (!isAdmin) {
                    if (section === 'teachers') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-crown';
                        }
                        const span = tab.querySelector('span');
                        if (span) {
                            span.textContent = ' My Admin';
                        } else {
                            // Fallback: Update text node directly if span doesn't exist
                            Array.from(tab.childNodes).forEach(node => {
                                if (node.nodeType === 3 && node.textContent.trim().length > 0) { // 3 is TEXT_NODE
                                    node.textContent = ' My Admin';
                                }
                            });
                        }
                    } else if (section === 'reports') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-chart-line';
                        }
                        const span = tab.querySelector('span');
                        if (span) span.textContent = ' My Analysis';
                        else {
                            Array.from(tab.childNodes).forEach(node => {
                                if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                                    node.textContent = ' My Analysis';
                                }
                            });
                        }
                    } else if (section === 'reportCard') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-chart-pie';
                        }
                        const span = tab.querySelector('span');
                        if (span) span.textContent = ' Analysis';
                    }
                }
            }
        });
        
        // Update mobile tabs
        const mobileTabs = document.querySelectorAll('.mobile-tab');
        mobileTabs.forEach(tab => {
            const section = tab.dataset.section;
            
            if (!isAdmin && teacherHiddenSections.includes(section)) {
                tab.style.display = 'none';
                console.log(`Hiding mobile tab: ${section}`);
            } else {
                tab.style.display = '';
                
                // Update labels for teachers
                if (!isAdmin) {
                    if (section === 'teachers') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-crown';
                        }
                        const span = tab.querySelector('span');
                        if (span) {
                            span.textContent = ' My Admin';
                        } else {
                            // Fallback: Update text node directly if span doesn't exist
                            Array.from(tab.childNodes).forEach(node => {
                                if (node.nodeType === 3 && node.textContent.trim().length > 0) { // 3 is TEXT_NODE
                                    node.textContent = ' My Admin';
                                }
                            });
                        }
                    } else if (section === 'reports') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-chart-line';
                        }
                        const span = tab.querySelector('span');
                        if (span) span.textContent = ' My Analysis';
                        else {
                            Array.from(tab.childNodes).forEach(node => {
                                if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                                    node.textContent = ' My Analysis';
                                }
                            });
                        }
                    } else if (section === 'reportCard') {
                        const icon = tab.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-chart-pie';
                        }
                        const span = tab.querySelector('span');
                        if (span) span.textContent = ' Analysis';
                    }
                }
            }
        });
        
        // Update content sections visibility
        document.querySelectorAll('.content-section').forEach(section => {
            const sectionId = section.id.replace('Section', '');
            if (!isAdmin && teacherHiddenSections.includes(sectionId)) {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });
        
        // Hide admin-only buttons
        const adminOnlyButtons = [
            'addClassBtn',
            'addStudentBtn', 
            'addSubjectBtn',
            'addTeacherBtn',
            'assignSubjectsBtn',
            'settingsTabBtn'
        ];
        
        adminOnlyButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = isAdmin ? '' : 'none';
                console.log(`${isAdmin ? 'Showing' : 'Hiding'} admin button: ${btnId}`);
            }
        });
        
        // For teachers, ensure classes tab is active by default
        if (!isAdmin) {
            const classesTab = document.querySelector('.content-tab[data-section="classes"], .mobile-tab[data-section="classes"]');
            if (classesTab) {
                classesTab.classList.add('active');
                switchTab('classes');
            }
        }
        
        console.log('=== applyRoleBasedTabVisibility() COMPLETE ===');

        // --- START FLICKER FIX ---
        // Remove the pending class to show the correctly configured UI all at once.
        document.documentElement.classList.remove('rbac-pending');
        // --- END FLICKER FIX ---
    }
    
    /**
     * Initialize page elements with school data
     */
    async function initializePage() {
        console.log('School Page: initializePage() - Initializing page elements...');
        
        const school = AppState.currentSchool;
        if (!school) {
            throw new Error('No school data available');
        }
        
        // --- 1. Create/Update Hero Section (Below Header) ---
        const pageHeader = document.querySelector('.page-header');
        const contentTabs = document.getElementById('contentTabs');
        
        if (pageHeader && contentTabs) {
            let heroSection = document.getElementById('schoolHeroSection');
            if (!heroSection) {
                heroSection = document.createElement('div');
                heroSection.id = 'schoolHeroSection';
                // Insert after page header, before tabs
                pageHeader.parentNode.insertBefore(heroSection, contentTabs);
            }
            
            // Premium Hero Styling
            Object.assign(heroSection.style, {
                background: 'linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                padding: '25px 30px',
                margin: '0 0 20px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '25px',
                flexWrap: 'wrap'
            });

            // Populate Hero Section
            heroSection.innerHTML = `
                <div style="position: relative; flex-shrink: 0;">
                    <img src="${school.logoUrl || '../../assets/icons/skore-icon.jpg'}" 
                         alt="${school.name}" 
                         style="width: 80px; height: 80px; object-fit: contain; background: white; padding: 8px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; color: var(--light); font-weight: 700; line-height: 1.2;">${school.name}</h1>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <span style="background: rgba(67, 97, 238, 0.15); color: #93c5fd; padding: 4px 12px; border-radius: 20px; font-size: 13px; border: 1px solid rgba(67, 97, 238, 0.3); display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-key" style="font-size: 11px;"></i> ${school.code}
                        </span>
                        <span style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; padding: 4px 12px; border-radius: 20px; font-size: 13px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-graduation-cap" style="font-size: 11px;"></i> ${school.level === 'primary' ? 'Primary' : 'Secondary'}
                        </span>
                        ${school.location ? `
                        <span style="background: rgba(255, 255, 255, 0.05); color: var(--gray-light); padding: 4px 12px; border-radius: 20px; font-size: 13px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-map-marker-alt" style="font-size: 11px;"></i> ${school.location}
                        </span>` : ''}
                    </div>
                </div>
            `;
        }
        
        // --- 2. Clean up Header (Remove previous injections) ---
        const headerContent = document.querySelector('.header-content');
        const titleEl = document.getElementById('schoolPortalTitle');
        
        if (headerContent && titleEl) {
            // Reset styles
            headerContent.style.display = '';
            headerContent.style.alignItems = '';
            headerContent.style.gap = '';
            
            // Remove logo if it was injected there
            const oldLogo = document.getElementById('schoolHeaderLogo');
            if (oldLogo) oldLogo.remove();
            
            // Unwrap text if wrapped
            const textWrapper = headerContent.querySelector('.header-text-wrapper');
            if (textWrapper) {
                while (textWrapper.firstChild) {
                    headerContent.insertBefore(textWrapper.firstChild, textWrapper);
                }
                textWrapper.remove();
            }
            
            titleEl.textContent = 'School Portal';
            titleEl.style.marginBottom = '';
            
            // Hide the old info badge in header since we have the hero section now
            const infoBadge = headerContent.querySelector('.school-info-badge');
            if (infoBadge) infoBadge.style.display = 'none';

            // Create fixed Exit Portal button if it doesn't exist
            let fixedExitBtn = document.getElementById('exitSchoolBtn');
            if (!fixedExitBtn) {
                fixedExitBtn = document.createElement('button');
                fixedExitBtn.id = 'exitSchoolBtn';
                fixedExitBtn.className = 'fixed-exit-btn';
                fixedExitBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Exit Portal';
                document.body.appendChild(fixedExitBtn);
            }
        }
        
        // Apply role-based tab visibility
        applyRoleBasedTabVisibility();

        // Initialize level navigation
        await initializeLevelNavigation();
        
        let fixedExitBtn = document.getElementById('exitSchoolBtn');
        if (fixedExitBtn) {
            setTimeout(() => {
                const styles = window.getComputedStyle(fixedExitBtn);
                console.log('exitSchoolBtn display:', styles.display);
            }, 1000);
        }

        console.log('School Page: initializePage() - Page elements initialized.');
    }
    
    /**
     * Initialize level navigation based on school type
     */
    async function initializeLevelNavigation() {
        const school = AppState.currentSchool;
        const levelNav = document.getElementById('levelNavigation');
        
        if (!school || !levelNav) return;
        
        let levels = [];
        if (school.level === 'primary') {
            levels = [
                { value: 'lower-primary', label: 'Lower Primary (P1-P3)' },
                { value: 'upper-primary', label: 'Upper Primary (P4-P7)' }
            ];
        } else {
            levels = [
                { value: 'olevel', label: 'O-Level (S1-S4)' },
                { value: 'alevel', label: 'A-Level (S5-S6)' }
            ];
        }
        
        levelNav.innerHTML = levels.map(level => `
            <button class="level-nav-btn ${AppState.currentAcademicLevel === level.value ? 'active' : ''}" 
                    data-level="${level.value}">
                ${level.label}
            </button>
        `).join('');
        
        // Set default academic level if not set
        if (!AppState.currentAcademicLevel) {
            const defaultLevel = levels[0].value;
            AppState.currentAcademicLevel = defaultLevel;
            
            // Update UI to show active level
            const defaultBtn = levelNav.querySelector(`[data-level="${defaultLevel}"]`);
            if (defaultBtn) defaultBtn.classList.add('active');
        }
    }
    
    /**
     * Setup all event listeners for the page
     */
    function setupEventListeners() {
        if (listenersSetup) {
            console.log('School Page: setupEventListeners() - Listeners already set up.');
            return;
        }

        console.log('School Page: setupEventListeners() - Setting up event listeners...');
        
        // Use event delegation for reliability
        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            
            // Handle Content Tabs (Desktop & Mobile)
            const tab = target.closest('.content-tab, .mobile-tab');
            if (tab) {
                const section = tab.dataset.section;
                if (section) {
                    e.preventDefault(); // Prevent default action, e.g., if it were an <a> tag
                    console.log(`School Page: Tab clicked (section: ${section})`);

                    // Handle direct navigation tabs first
                    if (section === 'enterMarks') {
                        navigateToMarksPage();
                        return;
                    }
                    if (section === 'reports' || section === 'reportCard') {
                        showPageLoading('Opening Reports...');
                        window.location.href = '../reports/reports.html';
                        return;
                    }
                    
                    // Check if teacher is trying to access restricted section
                    if (!isCurrentUserAdmin() && ['students', 'subjects', 'settings'].includes(section)) {
                        console.error(`❌ SECURITY: Teacher attempted to access restricted section: ${section}`);
                        showToast('Access denied. This section is for administrators only.', 'error');
                        return;
                    }
                    
                    switchTab(section);

                    // Auto-scroll for mobile users to hide header/hero section
                    if (window.innerWidth <= 768 && tab.classList.contains('mobile-tab')) {
                        const levelNav = document.getElementById('levelNavigation');
                        const contentArea = document.querySelector('.school-content');
                        // Prefer level navigation as scroll target if visible, otherwise content area
                        const targetEl = (levelNav && levelNav.offsetParent) ? levelNav : contentArea;
                        
                        if (targetEl) {
                            setTimeout(() => {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                        }
                    }
                }
                return;
            }

            // Handle Level Navigation
            const levelBtn = target.closest('.level-nav-btn');
            if (levelBtn && levelBtn.dataset && levelBtn.dataset.level) {
                const level = levelBtn.dataset.level;
                document.querySelectorAll('.level-nav-btn').forEach(b => b.classList.remove('active'));
                levelBtn.classList.add('active');
                AppState.currentAcademicLevel = level;
                await loadDataForLevel(level);
                document.dispatchEvent(new CustomEvent('academic-level:changed', { detail: { level } }));
                return;
            }

            // Handle Action Buttons
            const btn = target.closest('button');
            if (!btn) return;

            console.log('School Page: Button clicked:', btn.id);

            switch(btn.id) {
                case 'addClassBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can add classes', 'error');
                        return;
                    }
                    showAddClassModal();
                    break;
                case 'addStudentBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can add students', 'error');
                        return;
                    }
                    showAddStudentModal();
                    break;
                case 'addSubjectBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can add subjects', 'error');
                        return;
                    }
                    showAddSubjectModal();
                    break;
                case 'addTeacherBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can add teachers', 'error');
                        return;
                    }
                    showAddTeacherModal();
                    break;
                case 'assignSubjectsBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can assign subjects', 'error');
                        return;
                    }
                    // Handle assign subjects
                    break;
                case 'refreshSchoolData':
                    e.preventDefault();
                    showToast('Refreshing school data...', 'info');
                    await loadInitialData();
                    break;
                case 'switchLevelBtn':
                    e.preventDefault();
                    try {
                        const selectedLevel = await showLevelSelection(AppState.currentSchool && AppState.currentSchool.level);
                        if (selectedLevel) {
                            AppState.currentAcademicLevel = selectedLevel;
                            await loadDataForLevel(selectedLevel);
                        }
                    } catch (error) {
                        console.error('Error switching level:', error);
                        showToast('Failed to switch level', 'error');
                    }
                    break;
                case 'settingsTabBtn':
                    e.preventDefault();
                    if (!isCurrentUserAdmin()) {
                        showToast('Only admins can access settings', 'error');
                        console.warn('❌ SECURITY: Teacher attempted to access settings');
                        return;
                    }
                    switchTab('settings');
                    break;
                case 'exitSchoolBtn':
                    e.preventDefault();
                    showToast('Exiting school portal...', 'info');
                    if (typeof window.navigateTo === 'function') {
                        window.navigateTo('dashboard');
                    } else {
                        // Fallback if router is not available
                        window.location.href = '../dashboard/dashboard.html';
                    }
                    break;
            }
        });
        
        // Setup Excel file upload handler for students
        setupExcelUpload();
        
        listenersSetup = true;
        console.log('School Page: setupEventListeners() - Event listeners set up via delegation.');
    }
    
    /**
     * Setup Excel file upload for bulk student import
     */
    function setupExcelUpload() {
        const fileInput = document.getElementById('studentExcelFile');
        const bulkUploadArea = document.getElementById('bulkUploadArea');
        
        if (!fileInput || !bulkUploadArea) return;
        
        // Handle file selection
        fileInput.addEventListener('change', handleExcelUpload);
        
        // Handle drag and drop
        bulkUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkUploadArea.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)';
        });
        
        bulkUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            bulkUploadArea.style.backgroundColor = '';
        });
        
        bulkUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            bulkUploadArea.style.backgroundColor = '';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleExcelUpload({ target: fileInput });
            }
        });
        
        bulkUploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    /**
     * Handle Excel file upload and import students
     */
    async function handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check if file is Excel
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showToast('Please select an Excel file (.xlsx or .xls)', 'error');
            return;
        }
        
        showPageLoading('Processing Excel file...');
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const students = parseExcelData(data);
                    
                    if (students.length === 0) {
                        showToast('No students found in the Excel file or the file is empty.', 'warning');
                        return;
                    }
                    
                    // Get selected class
                    const classFilter = document.getElementById('classFilter');
                    const selectedClassId = classFilter ? classFilter.value : '';
                    
                    if (!selectedClassId) {
                        showToast('Please select a class before importing students.', 'warning');
                        return;
                    }
                    
                    // Find the class name
                    const classDoc = await Firebase.db.getDoc('classes', selectedClassId);
                    const className = classDoc.exists() ? classDoc.data().name : 'Unknown Class';
                    
                    // Add each student to Firebase
                    let addedCount = 0;
                    let errorCount = 0;
                    
                    for (const student of students) {
                        try {
                            await Firebase.db.addDoc('students', {
                                name: student.name,
                                classId: selectedClassId,
                                schoolId: AppState.currentSchool.id,
                                category: AppState.currentAcademicLevel,
                                createdAt: new Date().toISOString()
                            });
                            addedCount++;
                        } catch (error) {
                            console.error('Error adding student:', error);
                            errorCount++;
                        }
                    }

                    // Update class student count
                    if (addedCount > 0) {
                        try {
                            const classDoc = await Firebase.db.getDoc('classes', selectedClassId);
                            if (classDoc.exists()) {
                                const currentCount = classDoc.data().studentsCount || 0;
                                await Firebase.db.updateDoc('classes', selectedClassId, {
                                    studentsCount: currentCount + addedCount
                                });
                            }
                        } catch (err) {
                            console.error('Error updating class student count:', err);
                        }
                    }
                    
                    if (addedCount > 0) {
                        showToast(`Successfully imported ${addedCount} students to ${className}.`, 'success');
                    }
                    if (errorCount > 0) {
                        showToast(`${errorCount} students could not be imported due to an error.`, 'error');
                    }
                    
                    // Refresh students list
                    await loadStudents(AppState.currentAcademicLevel);
                    
                    // Clear file input
                    event.target.value = '';
                } catch (error) {
                    console.error('Error processing Excel file:', error);
                    showToast('An error occurred while processing the student file.', 'error');
                } finally {
                    hidePageLoading();
                }
            };
            
            reader.readAsArrayBuffer(file);
            
        } catch (error) {
            console.error('Error uploading file:', error);
            showToast('Error uploading file', 'error');
            hidePageLoading();
        }
    }
    
    /**
     * Parse Excel data using SheetJS library
     */
    function parseExcelData(data) {
        try {
            if (typeof XLSX === 'undefined') {
                console.error('SheetJS library not loaded');
                showToast('A required library for Excel parsing is missing.', 'error');
                return [];
            }
            
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Convert sheet to JSON
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            if (rows.length <= 1) {
                return [];
            }
            
            // Find the name column (assume first column is names)
            const students = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const name = String(row[0] || '').trim();
                if (name && name.length > 0) {
                    students.push({ name });
                }
            }
            
            return students;
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            showToast('Could not read the Excel file. It might be corrupted or in an unsupported format.', 'error');
            return [];
        }
    }
    
    /**
     * Switch between content tabs
     */
    function switchTab(section) {
        console.log(`School Page: switchTab() called with section: ${section} (In-page view)`);
        
        // Check if teacher is trying to access restricted section
        if (!isCurrentUserAdmin() && ['students', 'subjects', 'settings'].includes(section)) {
            console.error(`❌ CRITICAL SECURITY: Teacher attempted to access restricted section: ${section}`);
            showToast('Access denied. This section is for administrators only.', 'error');
            return;
        }
        
        // Update tab active states
        document.querySelectorAll('.content-tab, .mobile-tab').forEach(tab => {
            if (tab.style.display !== 'none') {
                tab.classList.toggle('active', tab.dataset.section === section);
            }
        });
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            const sectionId = `${section}Section`;
            const isActive = sectionEl.id === sectionId;
            sectionEl.classList.toggle('active', isActive);
            
            // Show/hide sections based on role
            if (!isCurrentUserAdmin() && ['students', 'subjects', 'settings'].includes(section)) {
                sectionEl.style.display = 'none';
            } else if (isActive) {
                sectionEl.style.display = 'block';
                console.log(`School Page: Showing section: ${sectionId}`);
                
                // Load specific data when switching to certain tabs
                if (section === 'classes' && schoolDataLoaded) {
                    loadClasses(AppState.currentAcademicLevel);
                } else if (section === 'students' && schoolDataLoaded && isCurrentUserAdmin()) {
                    loadStudents(AppState.currentAcademicLevel);
                } else if (section === 'subjects' && schoolDataLoaded && isCurrentUserAdmin()) {
                    loadSubjects(AppState.currentAcademicLevel);
                } else if (section === 'teachers' && schoolDataLoaded) {
                    loadTeachers();
                } else if ((section === 'reports' || section === 'reportCard') && schoolDataLoaded) {
                    // Handle Reports View Visibility
                    const adminView = document.getElementById('adminReportsView');
                    const teacherView = document.getElementById('teacherAnalysisView');
                    
                    if (isCurrentUserAdmin()) {
                        if (adminView) adminView.style.display = 'block';
                        if (teacherView) teacherView.style.display = 'none';
                    } else {
                        if (adminView) adminView.style.display = 'none';
                        if (teacherView) teacherView.style.display = 'block';
                    }
                }
            } else {
                sectionEl.style.display = 'none';
            }
        });
    }
    
    /**
     * Load initial data for the current school and level
     */
    async function loadInitialData() {
        console.log('School Page: loadInitialData() - Loading initial data...');
        
        if (!AppState.currentAcademicLevel) {
            const defaultLevel = AppState.currentSchool.level === 'primary' ? 'lower-primary' : 'olevel';
            AppState.currentAcademicLevel = defaultLevel;
        }
        
        await loadDataForLevel(AppState.currentAcademicLevel);
        
        console.log('School Page: loadInitialData() - Initial data loaded.');
    }
    
    /**
     * Load data for specific academic level
     */
    async function loadDataForLevel(level) {
        console.log(`School Page: loadDataForLevel() - Loading data for academic level: ${level}`);
        
        if (!level || !AppState.currentSchool) return;
        
        showPageLoading(`Loading ${level.replace('-', ' ')} data...`);
        
        try {
            await loadClasses(level);
            
            // Only load students and subjects if user is admin
            if (isCurrentUserAdmin()) {
                await Promise.all([
                    loadStudents(level),
                    loadSubjects(level)
                ]);
            }
            
            await loadTeachers();
            
            console.log(`School Page: loadDataForLevel() - Data loaded for level: ${level}`);
            
        } catch (error) {
            console.error(`School Page: loadDataForLevel() - Error loading data for level ${level}:`, error);
            showToast(`Failed to load data for ${level}`, 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Update all class dropdowns with the latest classes
     * This ensures dropdowns are always in sync with the grid
     */
    function updateClassDropdowns(classes) {
        const dropdowns = ['reportCardClassFilter', 'enterMarksClassFilter'];
        
        dropdowns.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const currentVal = select.value;
                select.innerHTML = '<option value="">Select Class</option>';
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    select.appendChild(option);
                });
                
                // Restore selection if possible
                if (currentVal && classes.some(c => c.id === currentVal)) {
                    select.value = currentVal;
                }
            }
        });

        // Update level labels
        const levelLabel = AppState.currentAcademicLevel ? AppState.currentAcademicLevel.replace('-', ' ').toUpperCase() : '';
        const labels = ['reportsLevelFilter', 'enterMarksLevelFilter'];
        labels.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = levelLabel;
        });
    }

    /**
     * Load classes for the current level
     */
    async function loadClasses(level) {
        console.log(`Loading classes for level: ${level}`);
        
        const classesList = document.getElementById('classesGrid');
        const emptyState = document.getElementById('classesEmpty');
        
        if (classesList) {
            classesList.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        try {
            // Query by schoolId only to avoid composite index requirement
            const allClasses = await Firebase.db.query('classes', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            const classes = allClasses.filter(c => c.category === level);
            
            // Update dropdowns immediately to ensure they are in sync
            updateClassDropdowns(classes || []);
            
            renderClasses(classes);
            
            // Background sync of student counts to ensure accuracy
            updateClassStudentCounts(classes);
        } catch (error) {
            console.error('Error loading classes:', error);
            if (classesList) {
                classesList.innerHTML = '<p class="error-message">Failed to load classes.</p>';
            }
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        }
    }
    
    /**
     * Background sync of student counts for classes
     * Ensures teachers see accurate numbers even if DB is out of sync
     */
    async function updateClassStudentCounts(classes) {
        if (!classes || classes.length === 0) return;
        
        // Run in background to not block UI
        setTimeout(async () => {
            console.log('Syncing student counts for classes...');
            const isAdmin = isCurrentUserAdmin();
            
            for (const cls of classes) {
                try {
                    // Query students for this class to get actual count
                    const students = await Firebase.db.query('students', [
                        { field: 'classId', op: '==', value: cls.id },
                        { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
                    ]);
                    
                    const actualCount = students.length;
                    const storedCount = cls.studentsCount || 0;
                    
                    // Update UI if different
                    if (actualCount !== storedCount) {
                        const card = document.querySelector(`.class-card[data-id="${cls.id}"]`);
                        if (card) {
                            const countEl = card.querySelector('.student-count');
                            if (countEl) {
                                countEl.textContent = `${actualCount} Students`;
                            }
                        }
                        
                        // Update DB if admin (teachers cannot write to classes)
                        if (isAdmin) {
                            await Firebase.db.updateDoc('classes', cls.id, {
                                studentsCount: actualCount
                            });
                        }
                    }
                } catch (err) {
                    console.error(`Error syncing count for class ${cls.name}:`, err);
                }
            }
        }, 100);
    }

    /**
     * Render classes list
     */
    function renderClasses(classes) {
        const classesList = document.getElementById('classesGrid');
        const emptyState = document.getElementById('classesEmpty');
        
        if (!classesList) return; 
        
        if (!classes || classes.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'flex';
                classesList.innerHTML = '';
            }
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        const isAdmin = isCurrentUserAdmin();

        classesList.innerHTML = classes.map(cls => `
            <div class="class-card" data-id="${cls.id}">
                <div style="flex: 1;">
                    <h3 class="class-name">${cls.name}</h3>
                    <p class="student-count" style="color: var(--gray-light); font-size: 0.9rem; margin: 5px 0;">${cls.studentsCount || 0} Students</p>
                    <span class="class-category">${cls.category || cls.level || 'General'}</span>
                    <div class="card-actions" style="margin-top: 15px;">
                        <span style="color: var(--primary); font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
                            View Details <i class="fas fa-arrow-right"></i>
                        </span>
                    </div>
                </div>
                ${isAdmin ? `<button class="btn btn-sm btn-danger btn-delete" data-class-id="${cls.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>` : ''}
            </div>
        `).join('');
        
        // Add click listeners to class cards
        classesList.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete')) return;
                const className = card.querySelector('h3').textContent;
                showToast(`Opening class: ${className}`, 'info');
                // TODO: Navigate to class details page
            });
        });
        
        // Add delete button listeners
        classesList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const classId = btn.dataset.classId;
                await deleteClass(classId);
            });
        });
    }
    
    /**
     * Delete a class
     */
    async function deleteClass(classId) {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can delete classes', 'error');
            return;
        }
        
        const confirmed = await ui.confirm('Are you sure you want to delete this class? All students in this class will also be deleted. This action cannot be undone.');
        if (!confirmed) return;        
        showPageLoading('Deleting class and associated students...');
        try {
            // 1. Delete all marks associated with this class
            const marks = await Firebase.db.query('marks', [
                { field: 'classId', op: '==', value: classId },
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            
            if (marks.length > 0) {
                await Promise.all(marks.map(mark => 
                    Firebase.db.deleteDoc('marks', mark.id)
                ));
            }

            // 2. Delete all students in this class
            const students = await Firebase.db.query('students', [
                { field: 'classId', op: '==', value: classId },
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            
            if (students.length > 0) {
                await Promise.all(students.map(student => 
                    Firebase.db.deleteDoc('students', student.id)
                ));
            }

            // 3. Delete the class itself
            await Firebase.db.deleteDoc('classes', classId);
            showToast('Class and associated students deleted successfully', 'success');
            await loadClasses(AppState.currentAcademicLevel);
        } catch (error) {
            console.error('Error deleting class:', error);
            showToast('Error deleting class: ' + (error.message || 'Permission denied'), 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Render students list
     */
    function renderStudents(students, classMap = {}) {
        const studentsList = document.querySelector('#studentsTable tbody');
        if (!studentsList) return; 
        
        if (!students || students.length === 0) {
            studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No students found. Click "Add Student" to start.</td></tr>';
            return;
        }
        
        const isAdmin = isCurrentUserAdmin();

        studentsList.innerHTML = students.map(student => `
            <tr data-student-id="${student.id}">
                <td>${student.name}</td>
                <td>${classMap[student.classId] || 'N/A'}</td>
                <td><span class="class-category" style="font-size: 0.8rem;">${student.category || 'N/A'}</span></td>
                <td>
                    ${isAdmin ? `<button class="btn btn-sm btn-danger btn-delete" data-student-id="${student.id}" data-class-id="${student.classId}">
                        <i class="fas fa-trash"></i> Delete
                    </button>` : ''}
                </td>
            </tr>
        `).join('');
        
        // Add delete button listeners
        studentsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const studentId = btn.dataset.studentId;
                const classId = btn.dataset.classId;
                await deleteStudent(studentId, classId);
            });
        });
    }
    
    /**
     * Delete a student
     */
    async function deleteStudent(studentId, classId) {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can delete students', 'error');
            return;
        }
        
        const confirmed = await ui.confirm('Are you sure you want to delete this student? This action cannot be undone.');
        if (!confirmed) return;        
        showPageLoading('Deleting student...');
        try {
            // Delete student's marks first
            const marks = await Firebase.db.query('marks', [
                { field: 'studentId', op: '==', value: studentId },
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            
            if (marks.length > 0) {
                await Promise.all(marks.map(mark => 
                    Firebase.db.deleteDoc('marks', mark.id)
                ));
            }

            await Firebase.db.deleteDoc('students', studentId);
            
            // Update class student count
            if (classId) {
                try {
                    const classDoc = await Firebase.db.getDoc('classes', classId);
                    if (classDoc.exists()) {
                        const currentCount = classDoc.data().studentsCount || 0;
                        if (currentCount > 0) {
                            await Firebase.db.updateDoc('classes', classId, {
                                studentsCount: currentCount - 1
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error updating class student count:', err);
                }
            }
            
            showToast('Student deleted successfully', 'success');
            await loadStudents(AppState.currentAcademicLevel);
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error deleting student', 'error');
        } finally {
            hidePageLoading();
        }
    }

    function renderSubjects(subjects) {
        const subjectsList = document.getElementById('subjectsGrid');
        const emptyState = document.getElementById('subjectsEmpty');
        
        if (!subjectsList) return; 
        
        if (!subjects || subjects.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'flex';
                subjectsList.innerHTML = '';
            }
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        const isAdmin = isCurrentUserAdmin();

        subjectsList.innerHTML = subjects.map(subject => `
            <div class="subject-card" data-subject-id="${subject.id}">
                <div style="flex: 1;">
                    <div class="subject-icon"><i class="fas fa-book"></i></div>
                    <div class="subject-info">
                        <h4 class="subject-name">${subject.name}</h4>
                        <p style="color: var(--gray-light); font-size: 0.85rem; margin: 0;">${subject.code || 'No code'}</p>
                    </div>
                </div>
                ${isAdmin ? `<button class="btn btn-sm btn-danger btn-delete" data-subject-id="${subject.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>` : ''}
            </div>
        `).join('');
        
        // Add delete button listeners
        subjectsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const subjectId = btn.dataset.subjectId;
                await deleteSubject(subjectId);
            });
        });
    }
    
    /**
     * Delete a subject
     */
    async function deleteSubject(subjectId) {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can delete subjects', 'error');
            return;
        }
        
        const confirmed = await ui.confirm('Are you sure you want to delete this subject? This action cannot be undone.');
        if (!confirmed) return;        
        showPageLoading('Deleting subject...');
        try {
            await Firebase.db.deleteDoc('subjects', subjectId);
            showToast('Subject deleted successfully', 'success');
            await loadSubjects(AppState.currentAcademicLevel);
        } catch (error) {
            console.error('Error deleting subject:', error);
            showToast('Error deleting subject', 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Load teachers (not level-specific)
     */
    async function loadTeachers() {
        console.log('Loading teachers');
        const teachersList = document.getElementById('teachersGrid');
        const emptyState = document.getElementById('teachersEmpty');
        const isAdmin = isCurrentUserAdmin();
        
        if (teachersList) {
            teachersList.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        try {
            const teacherConstraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ];
            const teachers = await Firebase.db.query('users', teacherConstraints);

            const subjectConstraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ];
            const allSubjects = await Firebase.db.query('subjects', subjectConstraints);
            const subjectMap = new Map(allSubjects.map(s => [s.id, s.name]));

            if (isAdmin) {
                renderTeachersAdmin(teachers, subjectMap);
            } else {
                renderTeachersTeacher(teachers, subjectMap);
            }
        } catch (error) {
            console.error('Error loading teachers:', error);
            if (teachersList) {
                teachersList.innerHTML = '<p class="error-message">Failed to load teachers.</p>';
            }
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        }
    }

    /**
     * Render teachers view for admins (show all teachers)
     */
    function renderTeachersAdmin(teachers, subjectMap) {
        // CRITICAL SECURITY: Verify this is being called by an admin
        if (!isCurrentUserAdmin()) {
            console.error('❌ CRITICAL SECURITY VIOLATION: Non-admin attempted to call renderTeachersAdmin');
            const teachersList = document.getElementById('teachersGrid');
            if (teachersList) {
                teachersList.innerHTML = '<p style="color: red;"><i class="fas fa-lock"></i> Access Denied</p>';
            }
            return;
        }
        
        const teachersList = document.getElementById('teachersGrid');
        const emptyState = document.getElementById('teachersEmpty');
        
        if (!teachersList) return; 
        
        if (!teachers || teachers.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'flex';
                teachersList.innerHTML = '';
            }
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        const currentSchoolAdmins = AppState.currentSchool.admins || [];
        const schoolCreator = AppState.currentSchool.createdBy;

        teachersList.innerHTML = teachers.map(teacher => {
            const assignedSubjectNames = (teacher.assignedSubjects || [])
                .map(subjectId => subjectMap.get(subjectId))
                .filter(name => name)
                .join(', ');

            const isTeacherAdmin = teacher.role === 'admin';
            const isCurrentUser = teacher.id === AppState.currentUser.uid;
            const isCreator = schoolCreator && teacher.id === schoolCreator;
            const canDemote = isTeacherAdmin && currentSchoolAdmins.length > 1 && !isCreator;
            const showAdminButton = !isCreator && !isCurrentUser;

            return `
                <div class="teacher-card" data-teacher-id="${teacher.id}">
                    <div class="teacher-avatar">
                        ${teacher.profileUrl 
                            ? `<img src="${teacher.profileUrl}" alt="${teacher.name}" onerror="this.style.display='none'">` 
                            : ''}
                        <span style="${teacher.profileUrl ? 'display:none' : ''}">${getInitials(teacher.name)}</span>
                    </div>
                    <div class="teacher-info">
                        <h4>${teacher.name}</h4>
                        <p class="teacher-email">${teacher.email}</p>
                        <p class="teacher-subjects">Subjects: ${assignedSubjectNames || 'No subjects assigned'}</p>
                        <span class="role-badge ${teacher.role || 'teacher'}">${teacher.role || 'Teacher'}</span>
                    </div>
                    <div class="teacher-actions">
                        ${!isTeacherAdmin ? `
                            <button class="btn btn-sm btn-secondary assign-subjects-btn" data-teacher-id="${teacher.id}">
                                <i class="fas fa-book"></i> <span>Assign</span>
                            </button>
                        ` : ''}
                        ${showAdminButton ? `
                            <button class="btn btn-sm ${isTeacherAdmin ? 'btn-warning' : 'btn-primary'} toggle-admin-btn" 
                                    data-teacher-id="${teacher.id}" 
                                    data-is-admin="${isTeacherAdmin}"
                                    data-can-demote="${canDemote}">
                                <i class="fas ${isTeacherAdmin ? 'fa-user-minus' : 'fa-user-plus'}"></i> 
                                <span>${isTeacherAdmin ? (canDemote ? 'Demote' : 'Lock') : 'Promote'}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for the new buttons
        teachersList.querySelectorAll('.assign-subjects-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // CRITICAL SECURITY: Verify user is admin before allowing any action
                if (!isCurrentUserAdmin()) {
                    console.error('❌ CRITICAL SECURITY VIOLATION: Non-admin user attempted to assign subjects');
                    showToast('❌ SECURITY: Unauthorized access attempt. This action has been logged.', 'error');
                    return;
                }
                
                const teacherId = e.currentTarget.dataset.teacherId;
                assignSubjectsToTeacher(teacherId);
            });
        });

        teachersList.querySelectorAll('.toggle-admin-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // CRITICAL SECURITY: Verify user is admin before allowing any action
                if (!isCurrentUserAdmin()) {
                    console.error('❌ CRITICAL SECURITY VIOLATION: Non-admin user attempted to toggle teacher admin status');
                    showToast('❌ SECURITY: Unauthorized access attempt. This action has been logged.', 'error');
                    return;
                }
                
                const teacherId = e.currentTarget.dataset.teacherId;
                const isAdmin = e.currentTarget.dataset.isAdmin === 'true';
                const canDemote = e.currentTarget.dataset.canDemote === 'true';
                if (isAdmin && !canDemote) {
                    showToast('Cannot demote this admin.', 'error');
                    return;
                }
                toggleTeacherAdminStatus(teacherId, isAdmin);
            });
        });
    }

    /**
     * Render teachers view for teachers (show admins and assigned subjects info)
     */
    function renderTeachersTeacher(teachers, subjectMap) {
        const teachersList = document.getElementById('teachersGrid');
        const emptyState = document.getElementById('teachersEmpty');
        
        if (!teachersList) return;
        
        // Get admin users only
        const currentSchoolAdmins = AppState.currentSchool.admins || [];
        const adminUsers = teachers.filter(t => currentSchoolAdmins.includes(t.id));
        
        if (!adminUsers || adminUsers.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'flex';
                teachersList.innerHTML = '';
            }
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        // Render info card first
        const infoCard = `
            <div class="teacher-card teacher-info-card" style="grid-column: 1 / -1;">
                <div class="teacher-info" style="text-align: left;">
                    <h4 style="margin-bottom: 15px;">
                        <i class="fas fa-info-circle"></i> Important Information
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <p style="margin: 0; display: flex; gap: 10px;">
                            <i class="fas fa-lock-open" style="color: var(--primary); min-width: 20px;"></i>
                            <span><strong>Request Subject Access:</strong> If you want to get access to other subjects, request your admin to assign that subject to you.</span>
                        </p>
                        <p style="margin: 0; display: flex; gap: 10px;">
                            <i class="fas fa-crown" style="color: var(--accent); min-width: 20px;"></i>
                            <span><strong>Need Admin Access?</strong> If you want extra functionality such as exporting report cards, managing classes, students, or subject settings, tell your admin to promote you to become an admin.</span>
                        </p>
                    </div>
                </div>
            </div>
        `;

        const adminCards = adminUsers.map(admin => {
            return `
                <div class="teacher-card" data-teacher-id="${admin.id}">
                    <div class="teacher-avatar">
                        ${admin.profileUrl 
                            ? `<img src="${admin.profileUrl}" alt="${admin.name}" onerror="this.style.display='none'">` 
                            : ''}
                        <span style="${admin.profileUrl ? 'display:none' : ''}">${getInitials(admin.name)}</span>
                    </div>
                    <div class="teacher-info">
                        <h4>${admin.name}</h4>
                        <p class="teacher-email">${admin.email}</p>
                        <span class="role-badge admin">Admin</span>
                    </div>
                </div>
            `;
        }).join('');

        teachersList.innerHTML = infoCard + adminCards;
    }
    
    /**
     * Setup school settings section
     */
    function setupSchoolSettings() {
        console.log('School Page: setupSchoolSettings() - Setting up school settings...');
        
        const badgeInput = document.getElementById('schoolBadgeInput');
        const uploadBtn = document.getElementById('uploadSchoolBadgeBtn');
        const badgePreview = document.getElementById('schoolBadgePreview');
        const uploadStatus = document.getElementById('uploadBadgeStatus');
        
        if (badgeInput && uploadBtn && badgePreview && uploadStatus) {
            badgeInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/jpg'];
                    if (!validTypes.includes(file.type)) {
                        uploadStatus.textContent = 'Please select a valid image file (PNG, JPEG, GIF).';
                        uploadStatus.className = 'alert alert-error';
                        uploadStatus.style.display = 'block';
                        uploadBtn.disabled = true;
                        return;
                    }
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        uploadStatus.textContent = 'Image size should be less than 5MB.';
                        uploadStatus.className = 'alert alert-error';
                        uploadStatus.style.display = 'block';
                        uploadBtn.disabled = true;
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        badgePreview.src = event.target.result;
                        uploadBtn.disabled = false;
                        uploadStatus.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            uploadBtn.addEventListener('click', async () => {
                const file = badgeInput.files[0];
                if (!file) return;
                
                showPageLoading('Uploading school badge...');
                
                try {
                    // TODO: Implement actual file upload to Firebase Storage
                    // For now, simulate upload
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    uploadStatus.textContent = 'School badge uploaded successfully!';
                    uploadStatus.className = 'alert alert-success';
                    uploadStatus.style.display = 'block';
                    showToast('School badge uploaded successfully!', 'success');
                    
                    uploadBtn.disabled = true;
                    badgeInput.value = '';
                    
                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        uploadStatus.style.display = 'none';
                    }, 3000);
                    
                } catch (error) {
                    console.error('Error uploading badge:', error);
                    uploadStatus.textContent = 'Error uploading badge. Please try again.';
                    uploadStatus.className = 'alert alert-error';
                    uploadStatus.style.display = 'block';
                    showToast('Error uploading badge', 'error');
                } finally {
                    hidePageLoading();
                }
            });
        }
        
        console.log('School Page: setupSchoolSettings() - School settings set up.');
    }

    /**
     * Show modal to add a new class
     */
    function showAddClassModal() {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can add classes', 'error');
            return;
        }
        
        const currentLevel = AppState.currentAcademicLevel;
        
        if (typeof ui === 'undefined' || typeof ui.form !== 'function') {
            showToast('UI components not loaded. Please refresh the page.', 'error');
            return;
        }
        
        ui.form([
            { 
                name: 'name', 
                label: 'Class Name', 
                type: 'text', 
                placeholder: 'e.g. P1, S1', 
                required: true 
            },
            { 
                name: 'stream', 
                label: 'Stream (Optional)', 
                type: 'text', 
                placeholder: 'e.g. Blue, North' 
            }
        ], 'Add New Class', 'Create Class', async (formData) => {
            showPageLoading('Creating class...');
            try {
                const fullName = formData.stream ? `${formData.name} ${formData.stream}` : formData.name;
                
                await Firebase.db.addDoc('classes', {
                    name: fullName,
                    stream: formData.stream || '',
                    schoolId: AppState.currentSchool.id,
                    level: AppState.currentSchool.level,
                    category: currentLevel,
                    studentsCount: 0,
                    createdAt: new Date().toISOString()
                });
                
                showToast('Class created successfully', 'success');
                await loadClasses(currentLevel);
                return true;
            } catch(e) {
                console.error(e);
                showToast('Error creating class', 'error');
                throw e;
            } finally {
                hidePageLoading();
            }
        });
    }

    /**
     * Show modal to add a new student
     */
    async function showAddStudentModal() {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can add students', 'error');
            return;
        }
        
        const currentLevel = AppState.currentAcademicLevel;
        
        if (typeof ui === 'undefined' || typeof ui.form !== 'function') {
            showToast('UI components not loaded. Please refresh the page.', 'error');
            return;
        }
        
        // Fetch classes for dropdown
        showPageLoading('Loading classes...');
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: currentLevel }
            ];
            const classes = await Firebase.db.query('classes', constraints);
            hidePageLoading();
            
            if (classes.length === 0) {
                showToast('Please create a class first', 'warning');
                return;
            }
            
            const classOptions = classes.map(c => ({ value: c.id, label: c.name }));
            
            ui.form([
                { 
                    name: 'name', 
                    label: 'Student Name', 
                    type: 'text', 
                    required: true 
                },
                { 
                    name: 'gender', 
                    label: 'Gender', 
                    type: 'select', 
                    options: [
                        {value:'Male', label:'Male'}, 
                        {value:'Female', label:'Female'},
                        {value:'Other', label:'Other'}
                    ], 
                    required: true 
                },
                { 
                    name: 'classId', 
                    label: 'Class', 
                    type: 'select', 
                    options: classOptions, 
                    required: true 
                }
            ], 'Add New Student', 'Add Student', async (formData) => {
                showPageLoading('Adding student...');
                try {
                    await Firebase.db.addDoc('students', {
                        name: formData.name,
                        gender: formData.gender,
                        classId: formData.classId,
                        schoolId: AppState.currentSchool.id,
                        category: currentLevel,
                        createdAt: new Date().toISOString()
                    });
                    
                    // Update class student count
                    try {
                        const classDoc = await Firebase.db.getDoc('classes', formData.classId);
                        if (classDoc.exists()) {
                            const currentCount = classDoc.data().studentsCount || 0;
                            await Firebase.db.updateDoc('classes', formData.classId, {
                                studentsCount: currentCount + 1
                            });
                        }
                    } catch (err) {
                        console.error('Error updating class student count:', err);
                    }
                    
                    showToast('Student added successfully', 'success');
                    await loadStudents(currentLevel);
                    return true;
                } catch(e) {
                    console.error(e);
                    showToast('Error adding student', 'error');
                    throw e;
                } finally {
                    hidePageLoading();
                }
            });
        } catch (error) {
            hidePageLoading();
            console.error('Error loading classes for student modal:', error);
            showToast('Error loading classes. Please try again.', 'error');
        }
    }

    /**
     * Show modal to add a new subject
     */
    function showAddSubjectModal() {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can add subjects', 'error');
            return;
        }
        
        const currentLevel = AppState.currentAcademicLevel;
        
        if (typeof ui === 'undefined' || typeof ui.form !== 'function') {
            showToast('UI components not loaded. Please refresh the page.', 'error');
            return;
        }
        
        ui.form([
            { 
                name: 'name', 
                label: 'Subject Name', 
                type: 'text', 
                required: true 
            },
            { 
                name: 'code', 
                label: 'Subject Code (Optional)', 
                type: 'text',
                placeholder: 'e.g. MAT, ENG, SCI'
            }
        ], 'Add New Subject', 'Add Subject', async (formData) => {
            showPageLoading('Adding subject...');
            try {
                await Firebase.db.addDoc('subjects', {
                    name: formData.name,
                    name_lowercase: formData.name.toLowerCase(), // For case-insensitive search
                    code: formData.code || '',
                    schoolId: AppState.currentSchool.id,
                    level: AppState.currentSchool.level,
                    category: currentLevel,
                    createdAt: new Date().toISOString()
                });
                showToast('Subject added successfully', 'success');
                await loadSubjects(currentLevel);
                return true;
            } catch(e) {
                console.error(e);
                showToast('Error adding subject', 'error');
                throw e;
            } finally {
                hidePageLoading();
            }
        });
    }

    /**
     * Show modal to invite a teacher
     */
    function showAddTeacherModal() {
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can add teachers', 'error');
            return;
        }
        
        if (typeof ui === 'undefined' || typeof ui.form !== 'function') {
            showToast('UI components not loaded. Please refresh the page.', 'error');
            return;
        }
        
        ui.form([
            { 
                name: 'email', 
                label: 'Teacher Email', 
                type: 'email', 
                required: true,
                placeholder: 'teacher@example.com'
            },
            { 
                name: 'name', 
                label: 'Teacher Name', 
                type: 'text', 
                required: true,
                placeholder: 'John Doe'
            }
        ], 'Invite Teacher', 'Send Invitation', async (formData) => {
            showPageLoading('Sending invitation...');
            try {
                // TODO: Implement actual teacher invitation
                await new Promise(resolve => setTimeout(resolve, 1000));
                showToast(`Invitation sent to ${formData.email}`, 'success');
                return true;
            } catch (error) {
                console.error('Error sending invitation:', error);
                showToast('Error sending invitation', 'error');
                throw error;
            } finally {
                hidePageLoading();
            }
        });
    }

    /**
     * Setup Report Card tab handlers
     */
    function setupReportCardHandlers() {
        const classFilter = document.getElementById('reportCardClassFilter');
        const generateBtn = document.getElementById('generateReportsBtn');

        // The user refers to an "export" button. This could be the print button.
        // We'll add a handler for both a potential 'export' button and the existing 'print' button.
        const exportBtn = document.getElementById('exportReportCardBtn');
        const printBtn = document.getElementById('printReportCardBtn');

        const reportsLevelFilter = document.getElementById('reportsLevelFilter');
        if (reportsLevelFilter && AppState.currentAcademicLevel) {
            reportsLevelFilter.textContent = AppState.currentAcademicLevel.replace('-', ' ').toUpperCase();
        }

        if (classFilter) {
            classFilter.addEventListener('change', (e) => {
                const classId = e.target.value;
                loadStudentsForReportCard(classId);
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                // Generate the report card preview in-page
                generateReportCard();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', downloadReportCardAsPDF);
        }

        if (printBtn) {
            printBtn.addEventListener('click', printReportCardPreview);
        }
    }

    /**
     * Load students for report card dropdown
     */
    async function loadStudentsForReportCard(classId) {
        const studentFilter = document.getElementById('reportCardStudentFilter');
        if (!studentFilter) return;

        studentFilter.innerHTML = '<option value="">Loading...</option>';
        studentFilter.disabled = true;

        if (!classId) {
            studentFilter.innerHTML = '<option value="">Select Class First</option>';
            return;
        }

        try {
            if (!AppState.currentSchool || !AppState.currentSchool.id) {
                throw new Error('School data missing');
            }

            // Query by schoolId only to avoid composite index requirement
            const allStudents = await Firebase.db.query('students', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            
            const students = allStudents.filter(s => s.classId === classId);

            if (!students || students.length === 0) {
                studentFilter.innerHTML = '<option value="">No students found</option>';
                studentFilter.disabled = false;
                return;
            }

            // Sort students alphabetically
            students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            studentFilter.innerHTML = '<option value="">Select Student</option>';
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                studentFilter.appendChild(option);
            });
            studentFilter.disabled = false;
        } catch (error) {
            console.error('Error loading students for report card:', error);
            studentFilter.innerHTML = '<option value="">Error loading students</option>';
            showToast('Failed to load students: ' + error.message, 'error');
        }
    }

    /**
     * Generate Report Card with premium A4 formatting
     */
    async function generateReportCard() {
        const classId = document.getElementById('reportCardClassFilter')?.value;
        const studentId = document.getElementById('reportCardStudentFilter')?.value;
        const term = document.getElementById('reportCardTermFilter')?.value;
        const previewArea = document.getElementById('reportCardPreview');

        if (!classId || !studentId || !term) {
            showToast('Please select class, student and term', 'warning');
            return;
        }

        if (previewArea) {
            previewArea.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center">Generating premium report card...</p>';
        }

        try {
            // Fetch student details
            const studentDoc = await Firebase.db.getDoc('students', studentId);
            const student = studentDoc.data();

            // Fetch marks
            const marksDoc = await Firebase.db.getDoc('marks', `${studentId}_${term}`);
            const marksData = marksDoc.exists() ? marksDoc.data() : {};

            // Fetch subjects to map names
            const subjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: AppState.currentAcademicLevel }
            ]);

            // Build report HTML with premium formatting
            let marksHtml = '';
            let totalScore = 0;
            let subjectCount = 0;

            subjects.forEach(subject => {
                const mark = marksData[subject.id];
                if (mark !== undefined) {
                    let score = 0;
                    if (typeof mark === 'object') {
                        // Handle complex marks (papers) - simplified average
                        const values = Object.values(mark).filter(v => typeof v === 'number');
                        if (values.length > 0) score = values.reduce((a,b)=>a+b,0) / values.length;
                    } else {
                        score = Number(mark);
                    }
                    
                    // Add padding and proper indentation
                    marksHtml += `
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding:8px 15px; color: #1f2937; font-size: 11px; font-weight: 500;">${subject.name}</td>
                            <td style="padding:8px 15px; text-align:center; font-weight: 600; color: #111827; font-size: 11px;">${Math.round(score)}</td>
                            <td style="padding:8px 15px; text-align:center; color: #374151; font-size: 11px;">${getGrade(score)}</td>
                            <td style="padding:8px 15px; color: #6b7280; font-size: 10px; white-space: nowrap;">${getRemark(score)}</td>
                        </tr>
                    `;
                    totalScore += score;
                    subjectCount++;
                }
            });

            if (subjectCount === 0) {
                marksHtml = `
                    <tr>
                        <td colspan="4" style="text-align:center; padding: 30px; color: #9ca3af; font-size: 12px; font-style: italic;">
                            No marks found for this term
                        </td>
                    </tr>
                `;
            }

            const average = subjectCount > 0 ? Math.round(totalScore / subjectCount) : 0;

            // Premium A4 template with proper margins and formatting
            const html = `
                <div class="report-card premium-report" 
                     style="width: 210mm; 
                            min-height: 297mm; 
                            max-height: 297mm;
                            padding: 15mm 20mm; 
                            box-sizing: border-box;
                            margin: 0 auto; 
                            position: relative; 
                            background: white; 
                            color: #111; 
                            font-family: 'Times New Roman', 'Georgia', serif; 
                            font-size: 11px; 
                            overflow: hidden;
                            border: 2px solid #000;
                            box-shadow: 0 0 20px rgba(0,0,0,0.05);
                            line-height: 1.4;">
                
                <!-- Watermark Background -->
                    ${AppState.currentSchool.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 400px; 
                                height: 400px; 
                                background-image: url('${AppState.currentSchool.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.03; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                    ` : ''}
                    
                <div style="position: relative; z-index: 1; height: 100%;">
                
                <!-- Header Section with Proper Spacing -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #1a73e8;">
                    <!-- School Logo -->
                    ${AppState.currentSchool.logoUrl 
                        ? `<img src="${AppState.currentSchool.logoUrl}" 
                                alt="${AppState.currentSchool.name}" 
                                style="height: 100px; width: 100px; object-fit: contain;">` 
                        : `<img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" 
                                style="height: 100px; width: 100px; opacity: 0.7; object-fit: contain;">`}
                    
                    <!-- School Info -->
                    <div style="text-align: center; flex: 1; padding: 0 20px;">
                        <h1 style="margin:0 0 10px 0; 
                                   color:#1a1a1a; 
                                   font-size: 26px; 
                                   font-weight: 700; 
                                   letter-spacing: -0.5px; 
                                   line-height: 1.1;">
                            ${AppState.currentSchool.name}
                        </h1>
                        <p style="margin:0; 
                                  color:#555; 
                                  font-size: 12px; 
                                  text-transform: uppercase; 
                                  letter-spacing: 2px; 
                                  font-weight: 600;">
                            TERM ${getUgandanTerm()} STUDENT ASSESSMENT PROGRESS REPORT
                        </p>
                    </div>
                    
                    <!-- Spacer for balance -->
                    <div style="width: 100px;"></div>
                </div>
                
                <!-- Student Information Grid -->
                <div style="display:grid; 
                            grid-template-columns:repeat(2, 1fr); 
                            gap: 25px; 
                            margin-bottom: 25px; 
                            padding: 20px; 
                            background: #f8fafc; 
                            border-radius: 8px; 
                            border: 1px solid #e5e7eb;">
                    <div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 9px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        color: #6b7280; 
                                        font-weight: 600; 
                                        margin-bottom: 5px;">
                                Student Name
                            </div>
                            <div style="font-size: 16px; 
                                        font-weight: 700; 
                                        color: #111827; 
                                        padding-bottom: 5px; 
                                        border-bottom: 1px solid #e5e7eb;">
                                ${student.name}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 9px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        color: #6b7280; 
                                        font-weight: 600; 
                                        margin-bottom: 5px;">
                                Class
                            </div>
                            <div style="font-size: 14px; 
                                        font-weight: 600; 
                                        color: #374151;">
                                ${document.getElementById('reportCardClassFilter').options[document.getElementById('reportCardClassFilter').selectedIndex].text}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 9px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        color: #6b7280; 
                                        font-weight: 600; 
                                        margin-bottom: 5px;">
                                Term
                            </div>
                            <div style="font-size: 14px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        padding-bottom: 5px; 
                                        border-bottom: 1px solid #e5e7eb;">
                                ${term.charAt(0).toUpperCase() + term.slice(1)} Term
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 9px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        color: #6b7280; 
                                        font-weight: 600; 
                                        margin-bottom: 5px;">
                                Date Generated
                            </div>
                            <div style="font-size: 14px; 
                                        font-weight: 600; 
                                        color: #374151;">
                                ${new Date().toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Performance Summary -->
                <div style="display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 25px; 
                            padding: 15px 20px; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 8px; 
                            color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Total Score</div>
                        <div style="font-size: 24px; font-weight: 800; margin-top: 5px;">${Math.round(totalScore)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Average</div>
                        <div style="font-size: 24px; font-weight: 800; margin-top: 5px;">${average}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Subjects</div>
                        <div style="font-size: 24px; font-weight: 800; margin-top: 5px;">${subjectCount}</div>
                    </div>
                </div>

                <!-- Marks Table with Clean Borders -->
                <table style="width:100%; 
                              border-collapse:collapse; 
                              margin-bottom: 30px; 
                              border: 1px solid #e5e7eb; 
                              border-radius: 8px; 
                              overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding:12px 15px; 
                                        text-align:left; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        font-weight: 700; 
                                        color: #4b5563; 
                                        border-bottom: 2px solid #d1d5db; 
                                        width: 40%;">
                                Subject
                            </th>
                            <th style="padding:12px 15px; 
                                        text-align:center; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        font-weight: 700; 
                                        color: #4b5563; 
                                        border-bottom: 2px solid #d1d5db; 
                                        width: 15%;">
                                Score
                            </th>
                            <th style="padding:12px 15px; 
                                        text-align:center; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        font-weight: 700; 
                                        color: #4b5563; 
                                        border-bottom: 2px solid #d1d5db; 
                                        width: 15%;">
                                Grade
                            </th>
                            <th style="padding:12px 15px; 
                                        text-align:left; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        letter-spacing: 1px; 
                                        font-weight: 700; 
                                        color: #4b5563; 
                                        border-bottom: 2px solid #d1d5db; 
                                        width: 30%;">
                                Remark
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marksHtml}
                    </tbody>
                </table>

                <!-- Remarks Section -->
                <div style="margin-top: 25px; margin-bottom: 30px;">
                    <div style="margin-bottom: 30px;">
                        <div style="font-size: 10px; 
                                    text-transform: uppercase; 
                                    color: #4b5563; 
                                    margin-bottom: 25px; 
                                    font-weight: 700; 
                                    letter-spacing: 1px;">
                            Class Teacher's Remarks
                        </div>
                        <div style="border-bottom: 1px dashed #9ca3af; 
                                    margin-bottom: 12px; 
                                    padding-bottom: 25px; 
                                    min-height: 40px;"></div>
                        <div style="text-align: right; 
                                    font-size: 10px; 
                                    color: #9ca3af; 
                                    font-style: italic;">
                            Signature: ........................................
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; 
                                    text-transform: uppercase; 
                                    color: #4b5563; 
                                    margin-bottom: 25px; 
                                    font-weight: 700; 
                                    letter-spacing: 1px;">
                            Head Teacher's Remarks
                        </div>
                        <div style="border-bottom: 1px dashed #9ca3af; 
                                    margin-bottom: 12px; 
                                    padding-bottom: 25px; 
                                    min-height: 40px;"></div>
                        <div style="text-align: right; 
                                    font-size: 10px; 
                                    color: #9ca3af; 
                                    font-style: italic;">
                            Signature: ........................................
                        </div>
                    </div>
                </div>
                
                ${term === 'end' ? `
                <div style="text-align: center; 
                            margin-top: 20px; 
                            margin-bottom: 15px; 
                            padding: 15px; 
                            background: #f0f9ff; 
                            border-radius: 6px; 
                            border: 1px solid #bae6fd;">
                    <p style="margin:0; 
                              font-size: 11px; 
                              color: #0369a1; 
                              font-weight: 600;">
                        <strong>Next Term Begins On:</strong> ________________________________
                    </p>
                </div>
                ` : ''}
                
                <!-- Premium Footer -->
                <div style="text-align: center; 
                            border-top: 1px solid #e5e7eb; 
                            padding-top: 20px; 
                            margin-top: 25px;">
                    <img src="../../assets/icons/skore-icon.jpg" 
                         alt="Skore Point" 
                         style="display: block; 
                                margin: 0 auto 8px; 
                                height: 30px; 
                                width: auto; 
                                opacity: 0.8;">
                    <div style="font-size: 9px; 
                                color: #6b7280; 
                                letter-spacing: 1px; 
                                font-weight: 500; 
                                margin-bottom: 2px;">
                        POWERED BY SKORE POINT
                    </div>
                    <div style="font-size: 8px; 
                                color: #9ca3af; 
                                margin-bottom: 4px;">
                        A SERUSOFT PRODUCT
                    </div>
                    <div style="font-size: 10px; 
                                color: #4361ee; 
                                font-weight: 700; 
                                letter-spacing: 0.5px;">
                        skorepoint.com
                    </div>
                </div>

                </div>
            </div>
        `;

            if (previewArea) {
                previewArea.innerHTML = html;
                const printBtn = document.getElementById('printReportCardBtn');
                if (printBtn) printBtn.style.display = 'inline-block';
            }

        } catch (error) {
            console.error('Error generating report:', error);
            showToast('Error generating report', 'error');
        if (previewArea) {
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h4 style="margin-bottom: 10px;">Failed to generate report</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
        }
    }

    /**
     * Downloads the generated report card as a PDF file directly with premium A4 formatting.
     */
    async function downloadReportCardAsPDF() {
        const previewArea = document.getElementById('reportCardPreview');
        const originalReportCardElement = previewArea ? previewArea.querySelector('.premium-report, .report-card') : null;

        if (!originalReportCardElement) {
            showToast('Please generate a report to download.', 'warning');
            return;
        }

        showPageLoading('Generating premium PDF...');

        // Dynamically load html2pdf.js if not present
        if (typeof html2pdf === 'undefined') {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                    script.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==';
                    script.crossOrigin = 'anonymous';
                    script.referrerPolicy = 'no-referrer';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch (error) {
                console.error('Failed to load html2pdf.js', error);
                showToast('Could not load PDF generation library. Please try again.', 'error');
                hidePageLoading();
                return;
            }
        }

        const studentSelect = document.getElementById('reportCardStudentFilter');
        const studentName = studentSelect.options[studentSelect.selectedIndex].text;
        const term = document.getElementById('reportCardTermFilter').value;
        const fileName = `Report_Card_${studentName.replace(/\s+/g, '_')}_Term_${term}_${new Date().toISOString().slice(0,10)}.pdf`;

        // Save current scroll position and scroll to top
        const originalScrollPos = window.scrollY;
        window.scrollTo(0, 0);

        // --- PREMIUM PDF GENERATION FIX ---
        // Clone the report card
        const reportClone = originalReportCardElement.cloneNode(true);
        
        // Apply A4-specific styling to ensure perfect fit
        reportClone.style.setProperty('width', '210mm', 'important');
        reportClone.style.setProperty('min-height', '297mm', 'important');
        reportClone.style.setProperty('max-height', '297mm', 'important');
        reportClone.style.setProperty('padding', '15mm 20mm', 'important'); // Balanced margins
        reportClone.style.setProperty('margin', '0', 'important');
        reportClone.style.setProperty('box-shadow', 'none', 'important');
        reportClone.style.setProperty('border', '2px solid #000', 'important');
        reportClone.style.setProperty('border-radius', '0', 'important');
        reportClone.style.setProperty('background', 'white', 'important');
        reportClone.style.setProperty('font-size', '11px', 'important');
        reportClone.style.setProperty('box-sizing', 'border-box', 'important');
        reportClone.style.setProperty('overflow', 'hidden', 'important');
        reportClone.style.setProperty('transform', 'none', 'important');
        reportClone.style.setProperty('position', 'relative', 'important');
        reportClone.style.setProperty('page-break-inside', 'avoid', 'important');
        
        // Create a temporary container with exact A4 dimensions
        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.left = '0';
        printContainer.style.top = '0';
        printContainer.style.width = '210mm';
        printContainer.style.height = '297mm';
        printContainer.style.zIndex = '99999';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.margin = '0';
        printContainer.style.padding = '0';
        printContainer.style.opacity = '0'; // Hide during processing
        printContainer.style.pointerEvents = 'none';

        // Append clone to container and container to body
        printContainer.appendChild(reportClone);
        document.body.appendChild(printContainer);

        const opt = {
            margin: 0,
            filename: fileName,
            image: { 
                type: 'jpeg', 
                quality: 1.0, // Highest quality
                backgroundColor: '#ffffff' // Ensure white background
            },
            html2canvas: { 
                scale: 2, // High resolution
                useCORS: true,
                letterRendering: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794, // 210mm at 96 DPI
                windowHeight: 1123, // 297mm at 96 DPI
                x: 0,
                y: 0
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'] // Keep everything on one page
            }
        };

        try {
            // Generate the PDF from the cloned element
            await html2pdf()
                .set(opt)
                .from(reportClone)
                .toPdf()
                .get('pdf')
                .then(pdf => {
                    // Ensure single page
                    const totalPages = pdf.internal.getNumberOfPages();
                    if (totalPages > 1) {
                        // If somehow it becomes multiple pages, try to scale down
                        console.warn('PDF generated multiple pages, adjusting...');
                    }
                })
                .save();
                
            showToast('Premium PDF generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('An error occurred while generating the PDF.', 'error');
        } finally {
            // IMPORTANT: Clean up
            hidePageLoading();
            if (document.body.contains(printContainer)) {
                document.body.removeChild(printContainer);
            }
            // Restore scroll position
            window.scrollTo(0, originalScrollPos);
        }
    }

    function getGrade(score) {
        if (AppState.currentAcademicLevel === 'upper-primary') {
            if (score >= 90) return 'D1';
            if (score >= 80) return 'D2';
            if (score >= 75) return 'C3';
            if (score >= 70) return 'C4';
            if (score >= 65) return 'C5';
            if (score >= 60) return 'C6';
            if (score >= 50) return 'P7';
            if (score >= 40) return 'P8';
            return 'F9';
        }
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
    }

    function getRemark(score) {
        if (AppState.currentAcademicLevel === 'upper-primary') {
            if (score >= 90) return 'Distinction';
            if (score >= 80) return 'Very Good';
            if (score >= 75) return 'Credit';
            if (score >= 70) return 'Credit';
            if (score >= 65) return 'Credit';
            if (score >= 60) return 'Credit';
            if (score >= 50) return 'Pass';
            if (score >= 40) return 'Pass';
            return 'Fail';
        }
        if (score >= 80) return 'Excellent';
        if (score >= 70) return 'Very Good';
        if (score >= 60) return 'Good';
        if (score >= 50) return 'Fair';
        if (score >= 40) return 'Pass';
        return 'Fail';
    }

    /**
     * Handles navigation to the marks entry page, including RBAC checks.
     */
    async function navigateToMarksPage() {
        try {
            const isAdmin = isCurrentUserAdmin();
            const level = AppState.currentAcademicLevel;

            showPageLoading('Opening marks entry...');

            if (isAdmin) {
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('marks', { level, isAdmin: true, assignedSubjects: [] });
                } else {
                    // Fallback with query params
                    window.location.href = `../marks/marks.html?level=${level}&isAdmin=true`;
                }
                return;
            }

            // Teacher flow
            const assignedSubjects = await getTeacherAssignedSubjects(level);
            hidePageLoading();

            if (assignedSubjects.length === 0) {
                const userDoc = await Firebase.db.getDoc('users', AppState.currentUser.uid);
                const userData = userDoc.exists() ? userDoc.data() : {};
                
                if (userData.subject) {
                    showToast(`Your registered subject "${userData.subject}" was not found for this academic level. Please contact an admin.`, 'error', 6000);
                } else {
                    showToast('You have no subjects assigned for this level. Please contact an admin.', 'warning', 6000);
                }
                return;
            }

            if (typeof window.navigateTo === 'function') {
                window.navigateTo('marks', { level, isAdmin: false, assignedSubjects });
            } else {
                // Fallback with query params
                window.location.href = `../marks/marks.html?level=${level}&isAdmin=false&assignedSubjects=${assignedSubjects.join(',')}`;
            }
        } catch (error) {
            console.error('Error navigating to marks page:', error);
            hidePageLoading();
            showToast('Failed to open marks page. Please try again.', 'error');
        }
    }

    /**
     * Setup Enter Marks page - wire up handler buttons
     */
    function setupEnterMarksHandlers() {
        const enterMarksBtn = document.getElementById('enterMarksBtn');
        const viewReportCardsBtn = document.getElementById('viewReportCardsBtn');
        
        if (enterMarksBtn) {
            enterMarksBtn.addEventListener('click', navigateToMarksPage);
        }
        
        if (viewReportCardsBtn) {
            viewReportCardsBtn.addEventListener('click', () => {
                // Switch to reports tab
                switchTab('reports'); 
            });
        }
        
        // Update level filter for enter marks section
        const enterMarksLevelFilter = document.getElementById('enterMarksLevelFilter');
        if (enterMarksLevelFilter && AppState.currentAcademicLevel) {
            enterMarksLevelFilter.textContent = AppState.currentAcademicLevel.replace('-', ' ').toUpperCase();
        }
    }

    /**
     * Show level selection modal (generic)
     */
    async function showLevelSelection(schoolLevel) {
        return new Promise((resolve) => {
            let levels = [];
            if (schoolLevel === 'primary') {
                levels = [
                    { value: 'lower-primary', label: 'Lower Primary (P1-P3)' },
                    { value: 'upper-primary', label: 'Upper Primary (P4-P7)' }
                ];
            } else {
                levels = [
                    { value: 'olevel', label: 'O-Level (S1-S4)' },
                    { value: 'alevel', label: 'A-Level (S5-S6)' }
                ];
            }
            
            if (typeof ui === 'undefined' || typeof ui.form !== 'function') {
                resolve(levels[0].value);
                return;
            }
            
            ui.form([
                { 
                    name: 'level', 
                    label: 'Select Level', 
                    type: 'select', 
                    options: levels, 
                    required: true, 
                    value: AppState.currentAcademicLevel 
                }
            ], 'Select Academic Level', 'Continue', async (levelData) => {
                resolve(levelData.level);
                return true;
            });
        });
    }

    /**
     * Show modal to assign subjects to a teacher
     */
    async function assignSubjectsToTeacher(teacherId) {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can assign subjects', 'error');
            return;
        }
        
        showPageLoading('Loading subjects...');
        try {
            const allSubjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            const teacherDoc = await Firebase.db.getDoc('users', teacherId);
            const teacher = teacherDoc.exists() ? teacherDoc.data() : null;

            if (!teacher) {
                showToast('Teacher not found.', 'error');
                return;
            }

            const currentAssignedSubjectIds = teacher.assignedSubjects || [];
            const subjectOptions = allSubjects.map(s => ({
                value: s.id,
                label: s.name,
                selected: currentAssignedSubjectIds.includes(s.id)
            }));

            hidePageLoading();

            const selectedSubjectIds = await ui.form(
                [
                    {
                        name: 'subjects',
                        label: `Assign Subjects to ${teacher.name}`,
                        type: 'multiselect', // Assuming a custom multiselect type for UI.form
                        options: subjectOptions,
                        value: currentAssignedSubjectIds
                    }
                ],
                `Assign Subjects to ${teacher.name}`,
                'Assign',
                async (formData) => {
                    showPageLoading('Updating assigned subjects...');
                    await Firebase.db.updateDoc('users', teacherId, {
                        assignedSubjects: formData.subjects || []
                    });
                    showToast('Subjects assigned successfully.', 'success');
                    await loadTeachers(); // Reload teachers to reflect changes
                    return true;
                }
            );

        } catch (error) {
            console.error('Error assigning subjects:', error);
            showToast('Failed to assign subjects.', 'error');
        } finally {
            hidePageLoading();
        }
    }

    /**
     * Toggle teacher admin status (promote/demote)
     */
    async function toggleTeacherAdminStatus(teacherId, isAdmin) {
        // Permission check
        if (!isCurrentUserAdmin()) {
            showToast('Only admins can change teacher roles', 'error');
            return;
        }
        
        const action = isAdmin ? 'demote' : 'promote';
        const confirmationMessage = `Are you sure you want to ${action} this teacher?`;
        
        const confirmed = await ui.confirm(confirmationMessage, `${action === 'demote' ? 'Demote' : 'Promote'} Teacher`);
        if (!confirmed) return;

        showPageLoading(`${isAdmin ? 'Demoting' : 'Promoting'} teacher...`);
        try {
            const schoolDocRef = Firebase.db.doc('schools', AppState.currentSchool.id);
            const schoolDoc = await Firebase.db.getDoc('schools', AppState.currentSchool.id); // Re-fetch for latest state
            const school = schoolDoc.exists() ? schoolDoc.data() : null;

            if (!school) {
                showToast('School data not found.', 'error');
                return;
            }

            let updatedAdmins = school.admins || [];
            let teacherNewRole = isAdmin ? 'teacher' : 'admin';

            if (action === 'promote') {
                if (!updatedAdmins.includes(teacherId)) {
                    updatedAdmins.push(teacherId);
                }
            } else { // demote
                if (updatedAdmins.length === 1 && updatedAdmins[0] === teacherId) {
                    showToast('Cannot demote the only admin of the school.', 'error');
                    hidePageLoading();
                    return;
                }
                
                const schoolCreator = school.createdBy;
                if (schoolCreator && teacherId === schoolCreator) {
                    showToast('Cannot demote the school creator.', 'error');
                    hidePageLoading();
                    return;
                }

                updatedAdmins = updatedAdmins.filter(id => id !== teacherId);
            }

            // Update school document
            await Firebase.db.updateDoc('schools', AppState.currentSchool.id, {
                admins: updatedAdmins
            });

            // Update teacher's user document role
            await Firebase.db.updateDoc('users', teacherId, {
                role: teacherNewRole
            });
            
            // Update AppState.currentSchool to reflect admin changes immediately
            AppState.currentSchool.admins = updatedAdmins;

            // Manually update the UI for the specific teacher card
            const teacherCard = document.querySelector(`.teacher-card[data-teacher-id="${teacherId}"]`);
            if (teacherCard) {
                // Update Role Badge
                const roleBadge = teacherCard.querySelector('.role-badge');
                if (roleBadge) {
                    roleBadge.textContent = teacherNewRole === 'admin' ? 'Admin' : 'Teacher';
                    roleBadge.className = `role-badge ${teacherNewRole}`;
                }

                // Update Toggle Button
                const toggleBtn = teacherCard.querySelector('.toggle-admin-btn');
                if (toggleBtn) {
                    const isNowAdmin = teacherNewRole === 'admin';
                    toggleBtn.dataset.isAdmin = isNowAdmin.toString();
                    
                    // Update classes
                    toggleBtn.classList.remove('btn-primary', 'btn-warning');
                    toggleBtn.classList.add(isNowAdmin ? 'btn-warning' : 'btn-primary');
                    
                    // Update content
                    const iconClass = isNowAdmin ? 'fa-user-minus' : 'fa-user-plus';
                    const canDemoteNow = isNowAdmin && updatedAdmins.length > 1 && (!school.createdBy || teacherId !== school.createdBy);
                    toggleBtn.dataset.canDemote = canDemoteNow.toString();
                    const btnText = isNowAdmin ? (canDemoteNow ? 'Demote Admin' : 'Admin (Locked)') : 'Make Admin';
                    
                    toggleBtn.innerHTML = `<i class="fas ${iconClass}"></i> ${btnText}`;
                }

                // Update Actions (Add/Remove Assign Subjects button)
                const actionsContainer = teacherCard.querySelector('.teacher-actions');
                if (actionsContainer) {
                    const existingAssignBtn = actionsContainer.querySelector('.assign-subjects-btn');
                    
                    if (teacherNewRole === 'teacher') {
                        // Demoted: Add button if not exists
                        if (!existingAssignBtn) {
                            const assignBtn = document.createElement('button');
                            assignBtn.className = 'btn btn-sm btn-secondary assign-subjects-btn';
                            assignBtn.style.cssText = 'width: 100%; justify-content: center; white-space: normal;';
                            assignBtn.dataset.teacherId = teacherId;
                            assignBtn.innerHTML = '<i class="fas fa-book"></i> Assign Subjects';
                            
                            // Add event listener
                            assignBtn.addEventListener('click', (e) => {
                                const tId = e.currentTarget.dataset.teacherId;
                                assignSubjectsToTeacher(tId);
                            });

                            // Insert as first child
                            actionsContainer.insertBefore(assignBtn, actionsContainer.firstChild);
                        }
                    } else {
                        // Promoted: Remove button if exists
                        if (existingAssignBtn) {
                            existingAssignBtn.remove();
                        }
                    }
                }
            }

            showToast(`Teacher ${action === 'demote' ? 'demoted' : 'promoted'} successfully.`, 'success');
            // await loadTeachers(); // Removed to prevent overwriting manual UI updates
        } catch (error) {
            console.error(`Error ${action} teacher:`, error);
            showToast(`Failed to ${action} teacher.`, 'error');
        } finally {
            hidePageLoading();
        }
    }
});