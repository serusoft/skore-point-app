// pages/school/school.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('School Page: DOMContentLoaded - Starting initialization process.');
    
    // Track if we've already initialized to prevent duplicate calls
    let pageInitialized = false;
    let schoolDataLoaded = false;
    let listenersSetup = false;
    // Ensure UI is interactive immediately, even before data loads
    setupEventListeners();
    
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
            // Setup listeners first to ensure interactivity even if rendering has partial issues
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
        const titleEl = document.getElementById('schoolPortalTitle');
        if (titleEl) {
            titleEl.textContent = `${school.name} Portal`;
            
            // Inject Exit Portal button
            if (!document.getElementById('exitPortalBtn')) {
                const headerContainer = titleEl.parentElement;
                if (headerContainer) {
                    // Ensure container is flex for proper alignment
                    headerContainer.style.display = 'flex';
                    headerContainer.style.justifyContent = 'space-between';
                    headerContainer.style.alignItems = 'center';
                    headerContainer.style.flexWrap = 'wrap';
                    
                    const exitBtn = document.createElement('button');
                    exitBtn.id = 'exitPortalBtn';
                    exitBtn.className = 'btn btn-secondary btn-sm';
                    exitBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Exit Portal';
                    exitBtn.style.marginLeft = 'auto';
                    exitBtn.addEventListener('click', () => {
                        window.navigateTo('dashboard');
                    });
                    
                    headerContainer.appendChild(exitBtn);
                }
            }
        }
        
        const codeEl = document.getElementById('currentSchoolCode');
        if (codeEl) codeEl.textContent = school.code || 'N/A';
        
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
        if (listenersSetup) {
            console.log('School Page: setupEventListeners() - Listeners already set up.');
            return;
        }

        console.log('School Page: setupEventListeners() - Setting up event listeners...');
        
        // Use event delegation for reliability
        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            
            // Handle Content Tabs (safe checks)
            const tab = target.closest('.content-tab');
            if (tab) {
                console.log('School Page: Tab clicked:', tab.dataset.section);
                // If it's the injected reports tab, let its own listener handle navigation
                if (tab.id === 'reportsTabBtn') return;
                const section = tab.dataset.section;
                if (section) {
                    console.log('School Page: Switching to section:', section);
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
                loadDataForLevel(level);
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
                    if (typeof showToast === 'function') showToast('Refreshing school data...', 'info');
                    await loadInitialData();
                    break;
                case 'switchLevelBtn':
                    e.preventDefault();
                    try {
                        const selectedLevel = await showLevelSelection(AppState.currentSchool && AppState.currentSchool.level);
                        if (selectedLevel) {
                            setAcademicLevel(selectedLevel);
                            loadDataForLevel(selectedLevel);
                        }
                    } catch (error) {
                        console.error('Error switching level:', error);
                        if (typeof showToast === 'function') showToast('Failed to switch level', 'error');
                    }
                    break;
                case 'settingsTabBtn':
                    e.preventDefault();
                    switchTab('settings');
                    break;
            }
        });
        listenersSetup = true;
        console.log('School Page: setupEventListeners() - Event listeners set up via delegation.');
        
        // Setup exit button
        const exitBtn = document.getElementById('exitSchoolBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (typeof showToast === 'function') showToast('Exiting school portal...', 'info');
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('dashboard');
                }
            });
        }
        
        // Setup Excel file upload handler for students
        setupExcelUpload();
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
            // Read the Excel file
            const reader = new FileReader();
            reader.onload = async (e) => {
                // Get the binary data
                const data = new Uint8Array(e.target.result);
                
                const students = parseExcelData(data);
                
                if (students.length === 0) {
                    showToast('No students found in the Excel file or the file is empty.', 'warning');
                    hidePageLoading();
                    return;
                }
                
                // Get selected class
                const classFilter = document.getElementById('classFilter');
                const selectedClassId = classFilter ? classFilter.value : '';
                
                if (!selectedClassId) {
                    showToast('Please select a class before importing students.', 'warning');
                    hidePageLoading();
                    return;
                }
                
                // Find the class name
                const constraints = [
                    { field: 'id', op: '==', value: selectedClassId }
                ];
                const classData = await Firebase.db.query('classes', constraints);
                const className = classData.length > 0 ? classData[0].name : 'Unknown Class';
                
                // Add each student to Firebase
                let addedCount = 0;
                let errorCount = 0;
                for (const student of students) {
                    try {
                        await Firebase.db.addDoc('students', {
                            name: student.name,
                            classId: selectedClassId,
                            schoolId: AppState.currentSchool.id,
                            category: AppState.currentAcademicLevel
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
                
                hidePageLoading();
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
     * Expected column: Name (only one column needed, others are ignored)
     * The function will focus on the Name column and ignore Gender or other columns
     */
    function parseExcelData(data) {
        try {
            if (typeof XLSX === 'undefined') {
                console.error('SheetJS library not loaded');
                if (typeof showToast === 'function') {
                    showToast('A required library for Excel parsing is missing.', 'error');
                }
                return [];
            }
            
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Convert sheet to an array of arrays, ignoring headers.
            // Each inner array represents a row.
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            if (rows.length === 0) {
                return [];
            }
            
            // Treat every row as a potential student, taking the name from the first column.
            const students = rows.map(row => ({
                name: String(row[0] || '').trim()
            })).filter(student => student.name.length > 0);
            
            return students;
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            if (typeof showToast === 'function') {
                showToast('Could not read the Excel file. It might be corrupted or in an unsupported format.', 'error');
            }
            return [];
        }
    }
    
    /**
     * Switch between content tabs
     */
    function switchTab(section) {
        console.log(`School Page: switchTab() called with section: ${section}`);
        // Update tab buttons
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            const sectionId = `${section}Section`;
            const isActive = sectionEl.id === sectionId;
            sectionEl.classList.toggle('active', isActive);
            if (isActive) {
                console.log(`School Page: Showing section: ${sectionId}`);
            }
        });
        
        // Show level selection modal when switching to Classes or Students tab
        if (section === 'classes') {
            console.log('School Page: Classes tab clicked - showing level selection modal');
            showLevelSelectionForClasses();
        } else if (section === 'students') {
            console.log('School Page: Students tab clicked - showing level selection modal');
            showLevelSelectionForStudents();
        }
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
            const classesList = document.getElementById('classesGrid') || document.getElementById('classesList');
            if (classesList) classesList.innerHTML = '<p class="error-message">Failed to load classes.</p>';
        }
    }

    /**
     * Render classes list
     */
    function renderClasses(classes) {
        const classesList = document.getElementById('classesGrid') || document.getElementById('classesList');
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
        
        classesList.innerHTML = classes.map(cls => `
            <div class="class-card" data-id="${cls.id}" style="cursor: pointer; position: relative;">
                <div style="flex: 1;">
                    <h3>${cls.name}</h3>
                    <p>${cls.studentsCount || 0} Students</p>
                    <div class="card-actions" style="margin-top: 10px;">
                        <span style="color: var(--primary); font-size: 0.9rem;">View Details <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
                <button class="btn-delete" data-class-id="${cls.id}" style="position: absolute; top: 10px; right: 10px; background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `).join('');
        
        // Add click listeners to class cards
        classesList.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete')) return;
                const className = card.querySelector('h3').textContent;
                if (typeof showToast === 'function') showToast(`Opening class: ${className}`, 'info');
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
        const confirmed = confirm('Are you sure you want to delete this class? This action cannot be undone.');
        if (!confirmed) return;
        
        showPageLoading('Deleting class...');
        try {
            await Firebase.db.deleteDoc('classes', classId);
            showToast('Class deleted successfully', 'success');
            await loadClasses(AppState.currentAcademicLevel);
        } catch (error) {
            console.error('Error deleting class:', error);
            showToast('Error deleting class', 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Load students for the current level
     */
    async function loadStudents(level) {
        console.log(`Loading students for level: ${level}`);
        const studentsList = document.querySelector('#studentsTable tbody') || document.getElementById('studentsList');
        if (studentsList) studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></td></tr>'; 
        
        try {
            // Query students for this school and level category
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];

            const students = await Firebase.db.query('students', constraints);
            
            // Fetch classes to create a lookup
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
        } catch (error) {
            console.error('Error loading students:', error);
            if (studentsList) studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><p class="error-message">Failed to load students.</p></td></tr>';
        }
    }

    /**
     * Render students list
     */
    function renderStudents(students, classMap = {}) {
        const studentsList = document.querySelector('#studentsTable tbody') || document.getElementById('studentsList');
        if (!studentsList) return; 
        
        if (!students || students.length === 0) {
            studentsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No students found. Click "Add Student" to start.</td></tr>';
            return;
        }
        
        studentsList.innerHTML = students.map(student => `
            <tr data-student-id="${student.id}">
                <td>${student.name}</td>
                <td>${classMap[student.classId] || 'N/A'}</td>
                <td>${student.category || 'N/A'}</td>
                <td>
                    <button class="btn-delete" data-student-id="${student.id}" style="background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
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
        const confirmed = confirm('Are you sure you want to delete this student? This action cannot be undone.');
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
        
        try {
            const constraints = [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ];
            const subjects = await Firebase.db.query('subjects', constraints);
            renderSubjects(subjects);
        } catch (error) {
            console.error('Error loading subjects:', error);
            const subjectsList = document.getElementById('subjectsGrid') || document.getElementById('subjectsList');
            if (subjectsList) subjectsList.innerHTML = '<p class="error-message">Failed to load subjects.</p>';
        }
    }

    function renderSubjects(subjects) {
        const subjectsList = document.getElementById('subjectsGrid') || document.getElementById('subjectsList');
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
        subjectsList.style.display = 'grid';
        
        subjectsList.innerHTML = subjects.map(subject => `
            <div class="subject-card" data-subject-id="${subject.id}" style="position: relative;">
                <div style="flex: 1;">
                    <div class="subject-icon"><i class="fas fa-book"></i></div>
                    <div class="subject-info">
                        <h4>${subject.name}</h4>
                        <p>${subject.code || ''}</p>
                    </div>
                </div>
                <button class="btn-delete" data-subject-id="${subject.id}" style="position: absolute; top: 10px; right: 10px; background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
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
        const confirmed = confirm('Are you sure you want to delete this subject? This action cannot be undone.');
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
        const teachersList = document.getElementById('teachersGrid') || document.getElementById('teachersList');
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
        const teachersList = document.getElementById('teachersGrid') || document.getElementById('teachersList');
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
     * Show level selection modal when switching to Classes tab
     */
    function showLevelSelectionForClasses() {
        const school = AppState.currentSchool;
        
        // Get available levels based on school type
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
        
        // Show level selection modal
        ui.form([
            { name: 'level', label: 'Select Level', type: 'select', options: levels, required: true, value: AppState.currentAcademicLevel }
        ], 'Select Academic Level', 'Continue', async (levelData) => {
            const selectedLevel = levelData.level;
            AppState.currentAcademicLevel = selectedLevel;
            
            // Update active level button
            document.querySelectorAll('.level-nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.level === selectedLevel);
            });
            
            // Load classes for selected level
            await loadClasses(selectedLevel);
            return true;
        });
    }

    /**
     * Show level selection modal when switching to Students tab
     */
    function showLevelSelectionForStudents() {
        const school = AppState.currentSchool;
        
        // Get available levels based on school type
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
        
        // Show level selection modal
        ui.form([
            { name: 'level', label: 'Select Level', type: 'select', options: levels, required: true, value: AppState.currentAcademicLevel }
        ], 'Select Academic Level', 'Continue', async (levelData) => {
            const selectedLevel = levelData.level;
            AppState.currentAcademicLevel = selectedLevel;
            
            // Update active level button
            document.querySelectorAll('.level-nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.level === selectedLevel);
            });
            
            // Load students and classes for selected level
            await Promise.all([
                loadStudents(selectedLevel),
                loadClasses(selectedLevel)
            ]);
            
            // Populate the class filter dropdown with all classes
            const classFilter = document.getElementById('classFilter');
            if (classFilter) {
                const constraints = [
                    { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                    { field: 'category', op: '==', value: selectedLevel }
                ];
                try {
                    const classes = await Firebase.db.query('classes', constraints);
                    classFilter.innerHTML = '<option value="">All Classes</option>';
                    classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls.id;
                        option.textContent = cls.name;
                        classFilter.appendChild(option);
                    });
                } catch (error) {
                    console.error('Error loading classes for filter:', error);
                }
            }
            
            return true;
        });
    }

    /**
     * Show modal to add a new class
     */
    function showAddClassModal() {
        const currentLevel = AppState.currentAcademicLevel;
        
        ui.form([
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
        
        ui.form([
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
        ui.form([
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
        ui.form([
            { name: 'email', label: 'Teacher Email', type: 'email', required: true },
            { name: 'name', label: 'Teacher Name', type: 'text', required: true }
        ], 'Invite Teacher', 'Send Invitation', async (formData) => {
             // Simulation of invite
             showToast(`Invitation sent to ${formData.email}`, 'success');
             return true;
        });
    }

    /**
     * Setup Enter Marks page - wire up handler buttons
     */
    function setupEnterMarksHandlers() {
        const enterMarksBtn = document.getElementById('enterMarksBtn');
        const viewReportCardsBtn = document.getElementById('viewReportCardsBtn');
        const enterMarksClassFilter = document.getElementById('enterMarksClassFilter');
        
        if (enterMarksBtn) {
            enterMarksBtn.addEventListener('click', async () => {
                const selectedClass = enterMarksClassFilter ? enterMarksClassFilter.value : '';
                if (!selectedClass) {
                    if (typeof showToast === 'function') showToast('Please select a class first', 'warning');
                    return;
                }
                if (typeof showToast === 'function') showToast('Opening marks entry for selected class...', 'info');
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('marks');
                }
            });
        }
        
        if (viewReportCardsBtn) {
            viewReportCardsBtn.addEventListener('click', () => {
                if (typeof showToast === 'function') showToast('Opening report cards...', 'info');
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('reports');
                }
            });
        }
    }

    /**
     * Populate Enter Marks class filter dropdown
     */
    async function populateEnterMarksClassFilter() {
        const classFilter = document.getElementById('enterMarksClassFilter');
        if (!classFilter || !AppState.currentSchool) return;
        
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
        } catch (error) {
            console.error('Error populating class filter:', error);
        }
    }
});
