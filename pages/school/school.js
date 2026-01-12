// pages/school/school.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('School Page: DOMContentLoaded - Starting initialization process.');
    
    // Track if we've already initialized to prevent duplicate calls
    let pageInitialized = false;
    let schoolDataLoaded = false;
    
    // Single source of truth for page loading state
    const pageLoadingState = {
        isShowing: false,
    };
    
    // Show loading with specific ID for school page
    function showPageLoading(message = 'Loading school portal...') {
        // Always update the loading message if possible
        if (typeof showLoading === 'function') {
            showLoading(message);
            pageLoadingState.isShowing = true;
        }
    }
    
    // Hide loading for school page
    function hidePageLoading() {
        // Always try to hide
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        pageLoadingState.isShowing = false;
    }
    
    // Show loading immediately as the page starts to initialize
    // showPageLoading('Preparing school portal...');
    
    // Listen for the app to be initialized, which means AppState is ready
    document.addEventListener('app:initialized', async () => {
        console.log('School Page: app:initialized event received.');
        
        // Prevent duplicate initialization
        if (pageInitialized) {
            console.log('School Page: Already initialized, skipping.');
            return;
        }
        
        // Now AppState should be populated
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: app:initialized - AppState.currentSchool is available. Calling initializeAndLoad().');
            pageInitialized = true;
            await initializeAndLoad();
        } else {
            // If app is initialized but no currentSchool, it means user likely has no schools
            console.warn('School Page: app:initialized - AppState.currentSchool is NOT available. Hiding loading.');
            hidePageLoading();
            if (typeof showToast === 'function') showToast('No school assigned or loaded. Please contact support.', 'warning');
            // Optionally redirect or show setup UI
        }
    });
    
    // Also listen for school changes in case it's set later or changed
    document.addEventListener('school:changed', async () => {
        console.log('School Page: school:changed event received.');
        if (pageInitialized && !schoolDataLoaded) {
            console.log('School Page: Re-initializing page with new school.');
            await initializeAndLoad();
        }
    });
    
    document.addEventListener('academic-level:changed', (e) => {
        console.log(`School Page: academic-level:changed event received. Loading data for level: ${e.detail.level}.`);
        if (pageInitialized && schoolDataLoaded) {
            loadDataForLevel(e.detail.level);
        }
    });
    
    // If app was already initialized (e.g., navigating back to page without full reload)
    if (window.appInitialized) {
        console.log('School Page: DOMContentLoaded - window.appInitialized is true.');
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: DOMContentLoaded - AppState.currentSchool available (app already initialized).');
            if (!pageInitialized) {
                pageInitialized = true;
                await initializeAndLoad();
            }
        } else {
            console.warn('School Page: DOMContentLoaded - App already initialized but no current school found for user.');
            hidePageLoading();
            if (typeof showToast === 'function') showToast('No school assigned or loaded. Please contact support.', 'warning');
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
                if (typeof showToast === 'function') showToast('Page initialization taking longer than expected.', 'warning');
            }
        }
    }, 10000); // 10 second safety timeout

    /**
     * Main function to set up the page once school data is available.
     */
    async function initializeAndLoad() {
        console.log('School Page: initializeAndLoad() - Starting initialization...');
        
        // Ensure loading is showing during initialization
        showPageLoading('Loading school data...');
        
        try {
            await initializePage();
            setupEventListeners();
            await loadInitialData();
            setupSchoolSettings();
            schoolDataLoaded = true;
            
            console.log('School Page: initializeAndLoad() - Initialization completed successfully.');
            
        } catch (error) {
            console.error("School Page: initializeAndLoad() - Error during school page initialization:", error);
            if (typeof showToast === 'function') showToast("Failed to initialize school portal. Please refresh the page.", "error");
        } finally {
            // Always hide loading when done
            hidePageLoading();
            console.log('School Page: initializeAndLoad() - Hiding loading indicator.');
        }
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
        
        // Update page title and school info
        document.getElementById('schoolPortalTitle').textContent = `${school.name} Portal`;
        document.getElementById('currentSchoolCode').textContent = school.code || 'N/A';
        
        // Update school level badge
        const levelBadge = document.getElementById('schoolLevelBadge');
        if (levelBadge) {
            levelBadge.textContent = school.level === 'primary' ? 'Primary School' : 'Secondary School';
            levelBadge.className = `school-level-badge ${school.level}`;
        }
        
        // Check if user is admin and toggle settings button
        const isAdmin = school.admins && school.admins.includes(AppState.currentUser.uid);
        const settingsBtn = document.getElementById('settingsTabBtn');
        if (settingsBtn) {
            settingsBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
        
        // Inject Reports Tab into the tabs bar
        const firstTab = document.querySelector('.content-tab');
        if (firstTab && firstTab.parentElement && !document.getElementById('reportsTabBtn')) {
            console.log('School Page: Injecting Report Cards tab');
            const reportsTab = document.createElement('button');
            reportsTab.className = 'content-tab';
            reportsTab.id = 'reportsTabBtn';
            reportsTab.innerHTML = '<i class="fas fa-chart-bar"></i> Report Cards';
            reportsTab.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                window.navigateTo('reports');
            });
            firstTab.parentElement.appendChild(reportsTab);
            
            // Resize tabs to fit
            const tabsContainer = firstTab.parentElement;
            tabsContainer.style.display = 'flex';
            tabsContainer.style.overflowX = 'auto';
            
            const allTabs = tabsContainer.querySelectorAll('.content-tab');
            allTabs.forEach(tab => {
                tab.style.padding = '10px 4px';
                tab.style.fontSize = '0.85rem';
                tab.style.flex = '1';
                tab.style.minWidth = 'auto';
                tab.style.whiteSpace = 'nowrap';
            });
        }
        
        // Initialize level navigation
        await initializeLevelNavigation();
        
        console.log('School Page: initializePage() - Page elements initialized.');
    }
    
    /**
     * Initialize level navigation based on school type
     */
    async function initializeLevelNavigation() {
        const school = AppState.currentSchool;
        const levelNav = document.getElementById('levelNavigation');
        
        if (!school || !levelNav) return;
        
        if (school.level === 'primary') {
            levelNav.innerHTML = `
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'lower-primary' ? 'active' : ''}" 
                        data-level="lower-primary">
                    Lower Primary (P1-P3)
                </button>
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'upper-primary' ? 'active' : ''}" 
                        data-level="upper-primary">
                    Upper Primary (P4-P7)
                </button>
            `;
        } else {
            levelNav.innerHTML = `
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'olevel' ? 'active' : ''}" 
                        data-level="olevel">
                    O-Level (S1-S4)
                </button>
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'alevel' ? 'active' : ''}" 
                        data-level="alevel">
                    A-Level (S5-S6)
                </button>
            `;
        }
        
        // Set default academic level if not set
        if (!AppState.currentAcademicLevel) {
            const defaultLevel = school.level === 'primary' ? 'lower-primary' : 'olevel';
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
        console.log('School Page: setupEventListeners() - Setting up event listeners...');
        
        // Use event delegation for reliability
        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            
            // Handle Content Tabs
            const tab = target.closest('.content-tab');
            if (tab && !tab.id.includes('reportsTabBtn')) {
                const section = tab.dataset.section;
                if (section) switchTab(section);
                return;
            }
            
            // Handle Level Navigation
            const levelBtn = target.closest('.level-nav-btn');
            if (levelBtn && levelBtn.dataset.level) {
                const level = levelBtn.dataset.level;
                document.querySelectorAll('.level-nav-btn').forEach(b => b.classList.remove('active'));
                levelBtn.classList.add('active');
                AppState.currentAcademicLevel = level;
                loadDataForLevel(level);
                document.dispatchEvent(new CustomEvent('academic-level:changed', { detail: { level } }));
                return;
            }
            
            // Handle Action Buttons
            const btn = target.closest('button');
            if (!btn) return;
            
            switch(btn.id) {
                case 'addClassBtn': showAddClassModal(); break;
                case 'addStudentBtn': showAddStudentModal(); break;
                case 'addSubjectBtn': showAddSubjectModal(); break;
                case 'addTeacherBtn': showAddTeacherModal(); break;
                case 'refreshSchoolData':
                    if (typeof showToast === 'function') showToast('Refreshing school data...', 'info');
                    await loadInitialData();
                    break;
                case 'switchLevelBtn':
                    try {
                        const selectedLevel = await showLevelSelection(AppState.currentSchool.level);
                        if (selectedLevel) {
                            setAcademicLevel(selectedLevel);
                            loadDataForLevel(selectedLevel);
                        }
                    } catch (error) {
                        console.error('Error switching level:', error);
                        if (typeof showToast === 'function') showToast('Failed to switch level', 'error');
                    }
                    break;
                case 'settingsTabBtn': switchTab('settings'); break;
            }
        });

        console.log('School Page: setupEventListeners() - Event listeners set up via delegation.');
    }
    
    /**
     * Switch between content tabs
     */
    function switchTab(section) {
        // Update tab buttons
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === `${section}Section`);
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
        
        // Show loading for data fetch
        showPageLoading(`Loading ${level.replace('-', ' ')} data...`);
        
        try {
            // Load classes, students, subjects, teachers for this level
            await Promise.all([
                loadClasses(level),
                loadStudents(level),
                loadSubjects(level),
                loadTeachers()
            ]);
            
            console.log(`School Page: loadDataForLevel() - Data loaded for level: ${level}`);
            
        } catch (error) {
            console.error(`School Page: loadDataForLevel() - Error loading data for level ${level}:`, error);
            if (typeof showToast === 'function') showToast(`Failed to load data for ${level}`, 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Load classes for the current level
     */
    async function loadClasses(level) {
        console.log(`Loading classes for level: ${level}`);
        const classesList = document.getElementById('classesList');
        if (classesList) classesList.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            // Query classes for this school and level category
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];

            const classes = await Firebase.db.query('classes', constraints);
            renderClasses(classes);
        } catch (error) {
            console.error('Error loading classes:', error);
            if (classesList) classesList.innerHTML = '<p class="error-message">Failed to load classes.</p>';
        }
    }

    /**
     * Render classes list
     */
    function renderClasses(classes) {
        const classesList = document.getElementById('classesList');
        if (!classesList) return;
        
        if (!classes || classes.length === 0) {
            classesList.innerHTML = '<div class="empty-state"><p>No classes found for this level.</p></div>';
            return;
        }
        
        classesList.innerHTML = classes.map(cls => `
            <div class="class-card" data-id="${cls.id}" style="cursor: pointer;">
                <h3>${cls.name}</h3>
                <p>${cls.studentsCount || 0} Students</p>
                <div class="card-actions" style="margin-top: 10px;">
                    <span style="color: var(--primary); font-size: 0.9rem;">View Details <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to class cards
        classesList.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                const className = card.querySelector('h3').textContent;
                if (typeof showToast === 'function') showToast(`Opening class: ${className}`, 'info');
            });
        });
    }
    
    /**
     * Load students for the current level
     */
    async function loadStudents(level) {
        console.log(`Loading students for level: ${level}`);
        const studentsList = document.getElementById('studentsList');
        if (studentsList) studentsList.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            // Query students for this school and level category
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];

            const students = await Firebase.db.query('students', constraints);
            renderStudents(students);
        } catch (error) {
            console.error('Error loading students:', error);
            if (studentsList) studentsList.innerHTML = '<p class="error-message">Failed to load students.</p>';
        }
    }

    /**
     * Render students list
     */
    function renderStudents(students) {
        const studentsList = document.getElementById('studentsList');
        if (!studentsList) return;
        
        if (!students || students.length === 0) {
            studentsList.innerHTML = '<div class="empty-state"><p>No students found. Click "Add Student" to start.</p></div>';
            return;
        }
        
        // We need to fetch class names for display, but for now we'll just list them
        // In a real app, we'd map classId to className using a cache
        
        studentsList.innerHTML = students.map(student => `
            <div class="student-card">
                <div class="student-avatar">${getInitials(student.name)}</div>
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p>${student.gender || 'N/A'}</p>
                </div>
                <button class="btn-icon"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        `).join('');
    }
    
    /**
     * Load subjects for the current level
     */
    async function loadSubjects(level) {
        console.log(`Loading subjects for level: ${level}`);
        const subjectsList = document.getElementById('subjectsList');
        if (subjectsList) subjectsList.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];
            const subjects = await Firebase.db.query('subjects', constraints);
            renderSubjects(subjects);
        } catch (error) {
            console.error('Error loading subjects:', error);
            if (subjectsList) subjectsList.innerHTML = '<p class="error-message">Failed to load subjects.</p>';
        }
    }

    function renderSubjects(subjects) {
        const subjectsList = document.getElementById('subjectsList');
        if (!subjectsList) return;
        
        if (!subjects || subjects.length === 0) {
            subjectsList.innerHTML = '<div class="empty-state"><p>No subjects found. Click "Add Subject" to start.</p></div>';
            return;
        }
        
        subjectsList.innerHTML = subjects.map(subject => `
            <div class="subject-card">
                <div class="subject-icon"><i class="fas fa-book"></i></div>
                <div class="subject-info">
                    <h4>${subject.name}</h4>
                    <p>${subject.code || ''}</p>
                </div>
                <button class="btn-icon"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        `).join('');
    }
    
    /**
     * Load teachers (not level-specific)
     */
    async function loadTeachers() {
        console.log('Loading teachers');
        const teachersList = document.getElementById('teachersList');
        if (teachersList) teachersList.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            // Fetch users belonging to this school
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ];
            const users = await Firebase.db.query('users', constraints);
            renderTeachers(users);
        } catch (error) {
            console.error('Error loading teachers:', error);
            if (teachersList) teachersList.innerHTML = '<p class="error-message">Failed to load teachers.</p>';
        }
    }

    function renderTeachers(teachers) {
        const teachersList = document.getElementById('teachersList');
        if (!teachersList) return;
        
        if (!teachers || teachers.length === 0) {
            teachersList.innerHTML = '<div class="empty-state"><p>No teachers found.</p></div>';
            return;
        }
        
        teachersList.innerHTML = teachers.map(teacher => `
            <div class="teacher-card">
                <div class="teacher-avatar">
                    ${teacher.profileUrl 
                        ? `<img src="${teacher.profileUrl}" alt="${teacher.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` 
                        : ''}
                    <span style="${teacher.profileUrl ? 'display:none' : ''}">${getInitials(teacher.name)}</span>
                </div>
                <div class="teacher-info">
                    <h4>${teacher.name}</h4>
                    <p>${teacher.email}</p>
                    <span class="role-badge ${teacher.role || 'teacher'}">${teacher.role || 'Teacher'}</span>
                </div>
                <button class="btn-icon"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        `).join('');
    }
    
    /**
     * Setup school settings section
     */
    function setupSchoolSettings() {
        console.log('School Page: setupSchoolSettings() - Setting up school settings...');
        
        // School badge upload
        const badgeInput = document.getElementById('schoolBadgeInput');
        const uploadBtn = document.getElementById('uploadSchoolBadgeBtn');
        const badgePreview = document.getElementById('schoolBadgePreview');
        
        if (badgeInput && uploadBtn && badgePreview) {
            // Update preview when file is selected
            badgeInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        badgePreview.src = event.target.result;
                        uploadBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Handle upload
            uploadBtn.addEventListener('click', async () => {
                const file = badgeInput.files[0];
                if (!file) return;
                
                // Implementation for uploading badge would go here
                if (typeof showToast === 'function') showToast('Uploading school badge...', 'info');
                
                // Simulate upload
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (typeof showToast === 'function') showToast('School badge uploaded successfully!', 'success');
                uploadBtn.disabled = true;
                badgeInput.value = '';
            });
        }
        
        console.log('School Page: setupSchoolSettings() - School settings set up.');
    }

    /**
     * Show modal to add a new class
     */
    function showAddClassModal() {
        const currentLevel = AppState.currentAcademicLevel;
        
        UI.form([
            { name: 'name', label: 'Class Name', type: 'text', placeholder: 'e.g. P1, S1', required: true },
            { name: 'stream', label: 'Stream (Optional)', type: 'text', placeholder: 'e.g. Blue, North' }
        ], 'Add New Class', 'Create Class', async (formData) => {
            showPageLoading('Creating class...');
            try {
                // Create class name with stream if provided
                const fullName = formData.stream ? `${formData.name} ${formData.stream}` : formData.name;
                
                await Firebase.db.addDoc('classes', {
                    name: fullName,
                    stream: formData.stream || '',
                    schoolId: AppState.currentSchool.id,
                    level: AppState.currentSchool.level,
                    category: currentLevel,
                    studentsCount: 0
                });
                
                showToast('Class created successfully', 'success');
                loadClasses(currentLevel);
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
        const currentLevel = AppState.currentAcademicLevel;
        
        // Fetch classes for dropdown
        const constraints = [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: currentLevel }
        ];
        const classes = await Firebase.db.query('classes', constraints);
        
        if (classes.length === 0) {
            showToast('Please create a class first', 'warning');
            return;
        }
        
        const classOptions = classes.map(c => ({ value: c.id, label: c.name }));
        
        UI.form([
            { name: 'name', label: 'Student Name', type: 'text', required: true },
            { name: 'gender', label: 'Gender', type: 'select', options: [{value:'Male', label:'Male'}, {value:'Female', label:'Female'}], required: true },
            { name: 'classId', label: 'Class', type: 'select', options: classOptions, required: true }
        ], 'Add New Student', 'Add Student', async (formData) => {
             showPageLoading('Adding student...');
             try {
                 await Firebase.db.addDoc('students', {
                     name: formData.name,
                     gender: formData.gender,
                     classId: formData.classId,
                     schoolId: AppState.currentSchool.id,
                     category: currentLevel
                 });
                 showToast('Student added successfully', 'success');
                 loadStudents(currentLevel);
                 return true;
             } catch(e) {
                 console.error(e);
                 showToast('Error adding student', 'error');
                 throw e;
             } finally {
                 hidePageLoading();
             }
        });
    }

    /**
     * Show modal to add a new subject
     */
    function showAddSubjectModal() {
        const currentLevel = AppState.currentAcademicLevel;
        UI.form([
            { name: 'name', label: 'Subject Name', type: 'text', required: true },
            { name: 'code', label: 'Subject Code (Optional)', type: 'text' }
        ], 'Add New Subject', 'Add Subject', async (formData) => {
            showPageLoading('Adding subject...');
            try {
                await Firebase.db.addDoc('subjects', {
                    name: formData.name,
                    code: formData.code || '',
                    schoolId: AppState.currentSchool.id,
                    level: AppState.currentSchool.level,
                    category: currentLevel
                });
                showToast('Subject added successfully', 'success');
                loadSubjects(currentLevel);
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
        UI.form([
            { name: 'email', label: 'Teacher Email', type: 'email', required: true },
            { name: 'name', label: 'Teacher Name', type: 'text', required: true }
        ], 'Invite Teacher', 'Send Invitation', async (formData) => {
             // Simulation of invite
             showToast(`Invitation sent to ${formData.email}`, 'success');
             return true;
        });
    }
});