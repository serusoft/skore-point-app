// pages/school/school.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('School Page: DOMContentLoaded - Starting initialization process.');
    
    // Track initialization state
    let pageInitialized = false;
    let schoolDataLoaded = false;
    let listenersSetup = false;
    
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
    }, 10000);

    /**
     * Main function to set up the page once school data is available.
     */
    async function initializeAndLoad() {
        console.log('School Page: initializeAndLoad() - Starting initialization...');
        
        showPageLoading('Loading school data...');
        
        try {
            setupEventListeners();
            await initializePage();
            await loadInitialData();
            setupSchoolSettings();
            setupEnterMarksHandlers();
            await populateEnterMarksClassFilter();
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
     * Initialize page elements with school data
     */
    async function initializePage() {
        console.log('School Page: initializePage() - Initializing page elements...');
        
        const school = AppState.currentSchool;
        if (!school) {
            throw new Error('No school data available');
        }
        
        // Update page title and school info
        const titleEl = document.getElementById('schoolPortalTitle');
        if (titleEl) {
            titleEl.textContent = `${school.name} Portal`;
            
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
        
        const codeEl = document.getElementById('currentSchoolCode');
        if (codeEl) codeEl.textContent = school.code || 'N/A';
        
        // Create school level badge if not exists
        let levelBadge = document.getElementById('schoolLevelBadge');
        if (!levelBadge) {
            const schoolInfoBadge = document.querySelector('.school-info-badge');
            if (schoolInfoBadge) {
                levelBadge = document.createElement('span');
                levelBadge.id = 'schoolLevelBadge';
                levelBadge.className = `school-level-badge ${school.level}`;
                levelBadge.textContent = school.level === 'primary' ? 'Primary School' : 'Secondary School';
                schoolInfoBadge.insertBefore(levelBadge, codeEl.parentElement);
            }
        } else {
            levelBadge.textContent = school.level === 'primary' ? 'Primary School' : 'Secondary School';
            levelBadge.className = `school-level-badge ${school.level}`;
        }
        
        // Check if user is admin and toggle settings button
        const isAdmin = school.admins && school.admins.includes(AppState.currentUser.uid);
        const settingsBtn = document.getElementById('settingsTabBtn');
        if (settingsBtn) {
            settingsBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
        

        
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
                    console.log(`School Page: Tab clicked (section: ${section})`);
                    switchTab(section);
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
                    showAddClassModal();
                    break;
                case 'addStudentBtn':
                    e.preventDefault();
                    showAddStudentModal();
                    break;
                case 'addSubjectBtn':
                    e.preventDefault();
                    showAddSubjectModal();
                    break;
                case 'addTeacherBtn':
                    e.preventDefault();
                    showAddTeacherModal();
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
                    switchTab('settings');
                    break;
                case 'exitSchoolBtn':
                    e.preventDefault();
                    showToast('Exiting school portal...', 'info');
                    if (typeof window.navigateTo === 'function') {
                        window.navigateTo('dashboard');
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
        console.log(`School Page: switchTab() called with section: ${section}`);
        
        // Update tab buttons for both desktop and mobile
        document.querySelectorAll('.content-tab, .mobile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            const sectionId = `${section}Section`;
            const isActive = sectionEl.id === sectionId;
            sectionEl.classList.toggle('active', isActive);
            if (isActive) {
                console.log(`School Page: Showing section: ${sectionId}`);
                
                // Load specific data when switching to certain tabs
                if (section === 'classes' && schoolDataLoaded) {
                    loadClasses(AppState.currentAcademicLevel);
                } else if (section === 'students' && schoolDataLoaded) {
                    loadStudents(AppState.currentAcademicLevel);
                } else if (section === 'subjects' && schoolDataLoaded) {
                    loadSubjects(AppState.currentAcademicLevel);
                } else if (section === 'teachers' && schoolDataLoaded) {
                    loadTeachers();
                }
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
            await Promise.all([
                loadClasses(level),
                loadStudents(level),
                loadSubjects(level),
                loadTeachers()
            ]);
            
            console.log(`School Page: loadDataForLevel() - Data loaded for level: ${level}`);
            
        } catch (error) {
            console.error(`School Page: loadDataForLevel() - Error loading data for level ${level}:`, error);
            showToast(`Failed to load data for ${level}`, 'error');
        } finally {
            hidePageLoading();
        }
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
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];

            const classes = await Firebase.db.query('classes', constraints);
            renderClasses(classes);
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
        
        const isAdmin = AppState.currentSchool && AppState.currentSchool.admins && AppState.currentSchool.admins.includes(AppState.currentUser.uid);

        classesList.innerHTML = classes.map(cls => `
            <div class="class-card" data-id="${cls.id}">
                <div style="flex: 1;">
                    <h3 class="class-name">${cls.name}</h3>
                    <p style="color: var(--gray-light); font-size: 0.9rem; margin: 5px 0;">${cls.studentsCount || 0} Students</p>
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
        const confirmed = await ui.confirm('Are you sure you want to delete this class? All students in this class will also be deleted. This action cannot be undone.');
        if (!confirmed) return;        
        showPageLoading('Deleting class and associated students...');
        try {
            // Delete all students in this class first
            const students = await Firebase.db.query('students', [
                { field: 'classId', op: '==', value: classId },
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            
            if (students.length > 0) {
                await Promise.all(students.map(student => 
                    Firebase.db.deleteDoc('students', student.id)
                ));
            }

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
     * Load students for the current level
     */
    async function loadStudents(level) {
        console.log(`Loading students for level: ${level}`);
        const studentsList = document.querySelector('#studentsTable tbody');
        
        if (studentsList) {
            studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></td></tr>';
        }
        
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];

            const students = await Firebase.db.query('students', constraints);
            
            // Fetch classes for lookup
            const classConstraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];
            const classes = await Firebase.db.query('classes', classConstraints);
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
        
        const isAdmin = AppState.currentSchool && AppState.currentSchool.admins && AppState.currentSchool.admins.includes(AppState.currentUser.uid);

        studentsList.innerHTML = students.map(student => `
            <tr data-student-id="${student.id}">
                <td>${student.name}</td>
                <td>${classMap[student.classId] || 'N/A'}</td>
                <td><span class="class-category" style="font-size: 0.8rem;">${student.category || 'N/A'}</span></td>
                <td>
                    ${isAdmin ? `<button class="btn btn-sm btn-danger btn-delete" data-student-id="${student.id}">
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
                await deleteStudent(studentId);
            });
        });
    }
    
    /**
     * Delete a student
     */
    async function deleteStudent(studentId) {
        const confirmed = await ui.confirm('Are you sure you want to delete this student? This action cannot be undone.');
        if (!confirmed) return;        
        showPageLoading('Deleting student...');
        try {
            await Firebase.db.deleteDoc('students', studentId);
            showToast('Student deleted successfully', 'success');
            await loadStudents(AppState.currentAcademicLevel);
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error deleting student', 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Load subjects for the current level
     */
    async function loadSubjects(level) {
        console.log(`Loading subjects for level: ${level}`);
        
        const subjectsList = document.getElementById('subjectsGrid');
        const emptyState = document.getElementById('subjectsEmpty');
        
        if (subjectsList) {
            subjectsList.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];
            const subjects = await Firebase.db.query('subjects', constraints);
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
        
        const isAdmin = AppState.currentSchool && AppState.currentSchool.admins && AppState.currentSchool.admins.includes(AppState.currentUser.uid);

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

            renderTeachers(teachers, subjectMap);
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

    function renderTeachers(teachers, subjectMap) {
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
                .filter(name => name) // Filter out undefined names if subjectId not found
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
                    <div class="teacher-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 15px;">
                        ${!isTeacherAdmin ? `
                            <button class="btn btn-sm btn-secondary assign-subjects-btn" style="width: 100%; justify-content: center; white-space: normal;" data-teacher-id="${teacher.id}">
                                <i class="fas fa-book"></i> Assign Subjects
                            </button>
                        ` : ''}
                        ${showAdminButton ? `
                            <button class="btn btn-sm ${isTeacherAdmin ? 'btn-warning' : 'btn-primary'} toggle-admin-btn" 
                                    style="width: 100%; justify-content: center; white-space: normal;"
                                    data-teacher-id="${teacher.id}" 
                                    data-is-admin="${isTeacherAdmin}"
                                    data-can-demote="${canDemote}">
                                <i class="fas ${isTeacherAdmin ? 'fa-user-minus' : 'fa-user-plus'}"></i> 
                                ${isTeacherAdmin ? (canDemote ? 'Demote Admin' : 'Admin (Locked)') : 'Make Admin'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for the new buttons
        teachersList.querySelectorAll('.assign-subjects-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const teacherId = e.currentTarget.dataset.teacherId;
                assignSubjectsToTeacher(teacherId);
            });
        });

        teachersList.querySelectorAll('.toggle-admin-btn').forEach(button => {
            button.addEventListener('click', (e) => {
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
     * Setup Enter Marks page - wire up handler buttons
     */
    function setupEnterMarksHandlers() {
        const enterMarksBtn = document.getElementById('enterMarksBtn');
        const viewReportCardsBtn = document.getElementById('viewReportCardsBtn');
        
        if (enterMarksBtn) {
            enterMarksBtn.addEventListener('click', async () => {
                showToast('Opening marks entry...', 'info');
                
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('marks', {
                        level: AppState.currentAcademicLevel
                    });
                }
            });
        }
        
        if (viewReportCardsBtn) {
            viewReportCardsBtn.addEventListener('click', () => {
                // Switch to reports tab instead of navigating away
                switchTab('reports');
                if (typeof showToast === 'function') showToast('Switched to Reports tab', 'info');
            });
        }
        
        // Update level filter for enter marks section
        const enterMarksLevelFilter = document.getElementById('enterMarksLevelFilter');
        if (enterMarksLevelFilter && AppState.currentAcademicLevel) {
            enterMarksLevelFilter.textContent = AppState.currentAcademicLevel.replace('-', ' ').toUpperCase();
        }
    }

    /**
     * Populate Enter Marks class filter dropdown
     */
    async function populateEnterMarksClassFilter() {
        const classFilter = document.getElementById('enterMarksClassFilter');
        if (!classFilter || !AppState.currentSchool) return;
        
        showPageLoading('Loading classes...');
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: AppState.currentAcademicLevel || 'lower-primary' }
            ];
            const classes = await Firebase.db.query('classes', constraints);
            
            classFilter.innerHTML = '<option value="">Select Class</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classFilter.appendChild(option);
            });
            
            // Add event listener to filter classes when level changes
            document.addEventListener('academic-level:changed', async (e) => {
                if (classFilter) {
                    const level = e.detail.level;
                    const constraints = [
                        { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                        { field: 'category', op: '==', value: level }
                    ];
                    const classes = await Firebase.db.query('classes', constraints);
                    
                    classFilter.innerHTML = '<option value="">Select Class</option>';
                    classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls.id;
                        option.textContent = cls.name;
                        classFilter.appendChild(option);
                    });
                    
                    // Update level filter text
                    const enterMarksLevelFilter = document.getElementById('enterMarksLevelFilter');
                    if (enterMarksLevelFilter) {
                        enterMarksLevelFilter.textContent = level.replace('-', ' ').toUpperCase();
                    }
                }
            });
            
        } catch (error) {
            console.error('Error populating class filter:', error);
            showToast('Error loading classes for marks entry', 'error');
        } finally {
            hidePageLoading();
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