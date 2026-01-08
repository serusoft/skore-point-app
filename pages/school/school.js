// School management page functionality
document.addEventListener('DOMContentLoaded', () => {
    initSchoolPage();
});

async function initSchoolPage() {
    // Check if user has access to a school
    if (!AppState.currentSchool) {
        UI.showToast('Please join or create a school first', 'warning');
        Router.navigateTo('dashboard');
        return;
    }
    
    // Initialize page
    await initializePage();
    setupEventListeners();
    setupNavigation();
    
    // Load initial data based on current level
    await loadInitialData();
}

async function initializePage() {
    // Update school info
    updateSchoolInfo();
    
    // Setup level navigation
    setupLevelNavigation();
    
    // Setup tabs
    setupContentTabs();
}

function updateSchoolInfo() {
    const school = AppState.currentSchool;
    if (!school) return;
    
    document.getElementById('schoolPortalTitle').textContent = `${school.name} Portal`;
    document.getElementById('currentSchoolCode').textContent = school.code;
    
    const levelBadge = document.getElementById('schoolLevelBadge');
    if (levelBadge) {
        levelBadge.textContent = school.level === 'primary' ? 'Primary School' : 'Secondary School';
    }
}

function setupLevelNavigation() {
    const school = AppState.currentSchool;
    if (!school) return;
    
    const levelNav = document.getElementById('levelNavigation');
    if (!levelNav) return;
    
    const levels = school.level === 'primary' 
        ? [
            { id: 'lower-primary', name: 'Lower Primary', icon: 'fa-child' },
            { id: 'upper-primary', name: 'Upper Primary', icon: 'fa-user-graduate' }
        ]
        : [
            { id: 'olevel', name: 'O-Level', icon: 'fa-certificate' },
            { id: 'alevel', name: 'A-Level', icon: 'fa-university' }
        ];
    
    levelNav.innerHTML = levels.map(level => `
        <button class="level-tab ${Router.getCurrentLevel() === level.id ? 'active' : ''}" 
                data-level="${level.id}">
            <i class="fas ${level.icon} level-icon"></i>
            <span class="level-name">${level.name}</span>
        </button>
    `).join('');
    
    // Add click handlers
    levelNav.querySelectorAll('.level-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const level = tab.dataset.level;
            
            // Update active tab
            levelNav.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update level in router
            Router.currentLevel = level;
            
            // Reload data for new level
            loadDataForLevel(level);
        });
    });
}

function setupContentTabs() {
    // Setup navigation between sections
    const sections = ['classes', 'students', 'subjects', 'teachers'];
    
    sections.forEach(section => {
        const btn = document.getElementById(`${section}Tab`);
        if (btn) {
            btn.addEventListener('click', () => switchSection(section));
        }
    });
    
    // Set initial active section
    switchSection('classes');
}

function switchSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${section}Section`);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === section);
    });
    
    // Load data for section
    loadSectionData(section);
}

async function loadInitialData() {
    const currentLevel = Router.getCurrentLevel() || getDefaultLevel();
    
    // Load data for current level
    await loadDataForLevel(currentLevel);
}

async function loadDataForLevel(level) {
    UI.showLoading(`Loading ${level} data...`);
    
    try {
        // Update level filters
        updateLevelFilters(level);
        
        // Load classes, students, subjects, teachers for this level
        await Promise.all([
            loadClasses(level),
            loadStudents(level),
            loadSubjects(level),
            loadTeachers()
        ]);
        
    } catch (error) {
        console.error('Error loading level data:', error);
        UI.showToast('Error loading data', 'error');
    } finally {
        UI.hideLoading();
    }
}

function updateLevelFilters(level) {
    const levelName = getLevelDisplayName(level);
    
    // Update all level filters
    document.querySelectorAll('.level-filter').forEach(filter => {
        filter.textContent = levelName;
    });
}

async function loadClasses(level) {
    const classesGrid = document.getElementById('classesGrid');
    const emptyState = document.getElementById('classesEmpty');
    
    if (!classesGrid) return;
    
    try {
        const classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        if (classes.length === 0) {
            classesGrid.innerHTML = '';
            emptyState?.classList.remove('d-none');
            return;
        }
        
        emptyState?.classList.add('d-none');
        
        // Get student counts for each class
        const studentCounts = {};
        for (const classData of classes) {
            const students = await Firebase.db.query('students', [
                { field: 'classId', op: '==', value: classData.id },
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);
            studentCounts[classData.id] = students.length;
        }
        
        // Render classes
        classesGrid.innerHTML = classes.map(classData => `
            <div class="class-card" data-class-id="${classData.id}">
                <div class="class-header">
                    <div class="class-name">${classData.name}</div>
                    <div class="class-category">${getClassCategoryName(classData.category)}</div>
                </div>
                <p class="class-description">${getClassDescription(classData.name, classData.category)}</p>
                <div class="class-stats">
                    <span>
                        <i class="fas fa-users"></i>
                        ${studentCounts[classData.id] || 0} students
                    </span>
                    <span>
                        <i class="fas fa-calendar"></i>
                        Created: ${formatDate(classData.createdAt)}
                    </span>
                </div>
                ${AppState.currentUserData.role === 'admin' ? `
                    <div class="class-actions mt-15">
                        <button class="btn btn-sm btn-danger" onclick="deleteClass('${classData.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading classes:', error);
        classesGrid.innerHTML = '<div class="alert error">Error loading classes</div>';
    }
}

async function loadStudents(level) {
    const tableBody = document.querySelector('#studentsTable tbody');
    const classFilter = document.getElementById('classFilter');
    
    if (!tableBody) return;
    
    try {
        // Get classes for this level
        const classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        // Update class filter
        if (classFilter) {
            classFilter.innerHTML = '<option value="">All Classes</option>' + 
                classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // Get students
        const students = await Firebase.db.query('students', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
        ]);
        
        // Filter students by class level
        const filteredStudents = students.filter(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            return studentClass && studentClass.category === level;
        });
        
        if (filteredStudents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No students found</td></tr>';
            return;
        }
        
        // Render students
        tableBody.innerHTML = filteredStudents.map(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            return `
                <tr>
                    <td>
                        <div class="student-info">
                            <strong>${student.name}</strong>
                        </div>
                    </td>
                    <td>${studentClass ? studentClass.name : 'N/A'}</td>
                    <td>
                        <span class="level-badge">${getLevelDisplayName(level)}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${AppState.currentUserData.role === 'admin' ? `
                                <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading students:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center error">Error loading students</td></tr>';
    }
}

async function loadSubjects(level) {
    const subjectsGrid = document.getElementById('subjectsGrid');
    const emptyState = document.getElementById('subjectsEmpty');
    
    if (!subjectsGrid) return;
    
    try {
        const subjects = await Firebase.db.query('subjects', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        if (subjects.length === 0) {
            subjectsGrid.innerHTML = '';
            emptyState?.classList.remove('d-none');
            return;
        }
        
        emptyState?.classList.add('d-none');
        
        // Render subjects
        subjectsGrid.innerHTML = subjects.map(subject => `
            <div class="subject-card">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-level">${getLevelDisplayName(level)}</div>
                ${AppState.currentUserData.role === 'admin' ? `
                    <div class="subject-actions mt-10">
                        <button class="btn btn-sm btn-danger" onclick="deleteSubject('${subject.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectsGrid.innerHTML = '<div class="alert error">Error loading subjects</div>';
    }
}

async function loadTeachers() {
    const teachersGrid = document.getElementById('teachersGrid');
    const emptyState = document.getElementById('teachersEmpty');
    
    if (!teachersGrid) return;
    
    try {
        // Get all teachers in this school
        const teachers = await Firebase.db.query('users', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
        ]);
        
        if (teachers.length === 0) {
            teachersGrid.innerHTML = '';
            emptyState?.classList.remove('d-none');
            return;
        }
        
        emptyState?.classList.add('d-none');
        
        // Get current level to show relevant subjects
        const currentLevel = Router.getCurrentLevel();
        
        // Render teachers
        teachersGrid.innerHTML = teachers.map(teacher => {
            const assignedSubjects = teacher.assignedSubjects || [];
            const levelSubjects = assignedSubjects.filter(subject => 
                isSubjectInLevel(subject, currentLevel)
            );
            
            return `
                <div class="teacher-card">
                    <div class="teacher-header">
                        <div class="teacher-avatar">
                            ${teacher.profileUrl ? 
                                `<img src="${teacher.profileUrl}" alt="${teacher.name}" onerror="this.style.display='none'">` :
                                `<div style="width:100%;height:100%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${getInitials(teacher.name)}</div>`
                            }
                        </div>
                        <div class="teacher-details">
                            <h3>${teacher.name}</h3>
                            <div class="teacher-email">${teacher.email}</div>
                            <div class="teacher-role ${teacher.role || 'teacher'}">
                                ${(teacher.role || 'teacher').toUpperCase()}
                            </div>
                        </div>
                    </div>
                    
                    ${levelSubjects.length > 0 ? `
                        <div class="teacher-subjects">
                            <h4>Assigned Subjects (${getLevelDisplayName(currentLevel)})</h4>
                            <div class="subject-tags">
                                ${levelSubjects.map(subject => `
                                    <span class="subject-tag">${subject}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${AppState.currentUserData.role === 'admin' && teacher.id !== AppState.currentUser.uid ? `
                        <div class="teacher-actions mt-15">
                            <button class="btn btn-sm btn-warning" onclick="manageTeacher('${teacher.id}')">
                                <i class="fas fa-edit"></i> Manage
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="removeTeacher('${teacher.id}')">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading teachers:', error);
        teachersGrid.innerHTML = '<div class="alert error">Error loading teachers</div>';
    }
}

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshSchoolData').addEventListener('click', async () => {
        await loadDataForLevel(Router.getCurrentLevel());
    });
    
    // Switch level button
    document.getElementById('switchLevelBtn').addEventListener('click', () => {
        showLevelSelectionModal();
    });
    
    // Add class button
    document.getElementById('addClassBtn').addEventListener('click', () => {
        showAddClassModal();
    });
    
    // Add student button
    document.getElementById('addStudentBtn').addEventListener('click', () => {
        showAddStudentModal();
    });
    
    // Add subject button
    document.getElementById('addSubjectBtn').addEventListener('click', () => {
        showAddSubjectModal();
    });
    
    // Add teacher button
    document.getElementById('addTeacherBtn').addEventListener('click', () => {
        showAddTeacherModal();
    });
    
    // Assign subjects button
    document.getElementById('assignSubjectsBtn').addEventListener('click', () => {
        showAssignSubjectsModal();
    });
    
    // Class filter
    document.getElementById('classFilter')?.addEventListener('change', (e) => {
        filterStudentsByClass(e.target.value);
    });
    
    // Bulk upload
    const uploadArea = document.getElementById('bulkUploadArea');
    const fileInput = document.getElementById('studentExcelFile');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            await handleBulkUpload(e.target.files[0]);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            
            if (e.dataTransfer.files.length > 0) {
                await handleBulkUpload(e.dataTransfer.files[0]);
            }
        });
    }
}

async function handleBulkUpload(file) {
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        UI.showToast('Please upload an Excel file (.xlsx or .xls)', 'error');
        return;
    }
    
    try {
        UI.showLoading('Processing Excel file...');
        
        // Read Excel file
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            throw new Error('No data found in file');
        }
        
        // Get current level and classes
        const currentLevel = Router.getCurrentLevel();
        const classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: currentLevel }
        ]);
        
        if (classes.length === 0) {
            throw new Error('No classes found for this level');
        }
        
        // Show class selection modal
        const selectedClassId = await showClassSelectionModal(classes);
        if (!selectedClassId) return;
        
        // Process students
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of data) {
            const studentName = row[0];
            if (studentName && typeof studentName === 'string' && studentName.trim()) {
                try {
                    await Firebase.db.addDoc('students', {
                        name: studentName.trim(),
                        classId: selectedClassId,
                        schoolId: AppState.currentSchool.id,
                        level: currentLevel,
                        createdAt: Firebase.db.serverTimestamp()
                    });
                    successCount++;
                } catch (error) {
                    console.error('Error adding student:', error);
                    errorCount++;
                }
            }
        }
        
        UI.hideLoading();
        
        if (successCount > 0) {
            UI.showToast(`Successfully added ${successCount} students`, 'success');
            await loadStudents(currentLevel);
        }
        
        if (errorCount > 0) {
            UI.showToast(`Failed to add ${errorCount} students`, 'warning');
        }
        
    } catch (error) {
        UI.hideLoading();
        console.error('Error processing bulk upload:', error);
        UI.showToast('Error processing file: ' + error.message, 'error');
    }
}

async function showLevelSelectionModal() {
    const school = AppState.currentSchool;
    const availableLevels = school.level === 'primary' 
        ? ['lower-primary', 'upper-primary']
        : ['olevel', 'alevel'];
    
    const levelOptions = availableLevels.map(level => ({ 
        value: level, 
        label: `${getLevelDisplayName(level)} (${getLevelDescription(level)})` 
    }));

    const fields = [
        {
            name: 'selectedLevel',
            label: 'Select Academic Level',
            type: 'select',
            options: levelOptions,
            value: Router.getCurrentLevel(),
            required: true
        }
    ];

    const submitCallback = async (formData) => {
        const selectedLevel = formData.selectedLevel;
        if (selectedLevel) {
            Router.navigateTo('school', selectedLevel);
            UI.showToast(`Switched to ${getLevelDisplayName(selectedLevel)}`, 'info');
            return true; // Indicate success
        }
        return false; // Indicate cancellation or no selection
    };
    
    await UI.form(fields, 'Switch Academic Level', 'Switch Level', submitCallback);
}

async function showAddClassModal() {
    const currentLevel = Router.getCurrentLevel();
    
    const fields = [
        {
            name: 'className',
            label: 'Class Name',
            type: 'text',
            placeholder: 'e.g., P1A, S3B',
            required: true,
            icon: 'fas fa-chalkboard' // Not directly used by UI.form but can be for custom rendering
        },
        {
            name: 'academicLevelDisplay',
            label: 'Academic Level',
            type: 'display',
            value: getLevelDisplayName(currentLevel),
            icon: 'fas fa-layer-group' // Not directly used by UI.form but can be for custom rendering
        },
        {
            name: 'classLevel',
            type: 'hidden', // Hidden field for data submission
            value: currentLevel
        }
    ];

    const submitCallback = async (formData) => {
        const className = formData.className.trim();
        const classLevel = formData.classLevel;

        if (!className) {
            throw new Error('Please enter class name');
        }

        UI.showLoading('Adding class...');
        try {
            await Firebase.db.addDoc('classes', {
                name: className,
                schoolId: AppState.currentSchool.id,
                level: AppState.currentSchool.level,
                category: classLevel,
                createdAt: Firebase.db.serverTimestamp()
            });
            UI.hideLoading();
            UI.showToast('Class added successfully', 'success');
            await loadClasses(classLevel);
        } catch (error) {
            UI.hideLoading();
            console.error('Error adding class:', error);
            throw new Error('Error adding class: ' + error.message);
        }
    };
    
    await UI.form(fields, 'Add New Class', 'Add Class', submitCallback);
}

async function showAddStudentModal() {
    const currentLevel = Router.getCurrentLevel();
    
    // Load classes for current level for the select input
    const classes = await Firebase.db.query('classes', [
        { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
        { field: 'category', op: '==', value: currentLevel }
    ]);

    const classOptions = classes.map(c => ({ value: c.id, label: c.name }));
    classOptions.unshift({ value: '', label: 'Select Class' }); // Add a default option
    
    const fields = [
        {
            name: 'studentName',
            label: 'Student Name',
            type: 'text',
            placeholder: 'Enter full name',
            required: true,
            icon: 'fas fa-user-graduate'
        },
        {
            name: 'studentClass',
            label: 'Class',
            type: 'select',
            options: classOptions,
            required: true,
            icon: 'fas fa-chalkboard'
        },
        {
            name: 'academicLevelDisplay',
            label: 'Academic Level',
            type: 'display',
            value: getLevelDisplayName(currentLevel),
            icon: 'fas fa-layer-group'
        }
    ];

    const submitCallback = async (formData) => {
        const studentName = formData.studentName.trim();
        const studentClass = formData.studentClass;

        if (!studentName || !studentClass) {
            throw new Error('Please fill all fields');
        }

        UI.showLoading('Adding student...');
        try {
            await Firebase.db.addDoc('students', {
                name: studentName,
                classId: studentClass,
                schoolId: AppState.currentSchool.id,
                level: currentLevel,
                createdAt: Firebase.db.serverTimestamp()
            });
            UI.hideLoading();
            UI.showToast('Student added successfully', 'success');
            await loadStudents(currentLevel);
        } catch (error) {
            UI.hideLoading();
            console.error('Error adding student:', error);
            throw new Error('Error adding student: ' + error.message);
        }
    };
    
    await UI.form(fields, 'Add New Student', 'Add Student', submitCallback);
}

async function showAddSubjectModal() {
    const currentLevel = Router.getCurrentLevel();
    
    // Get subject type based on level
    const isALevel = currentLevel === 'alevel';
    
    let fields = [
        {
            name: 'subjectName',
            label: 'Subject Name',
            type: 'text',
            placeholder: 'e.g., Mathematics, Physics',
            required: true,
            icon: 'fas fa-book'
        }
    ];

    if (isALevel) {
        fields = fields.concat([
            {
                name: 'subjectType',
                label: 'Subject Type',
                type: 'select',
                options: [
                    { value: 'principal', label: 'Principal Subject' },
                    { value: 'subsidiary', label: 'Subsidiary Subject' },
                    { value: 'general', label: 'General Paper' }
                ],
                required: true,
                icon: 'fas fa-tag'
            },
            {
                name: 'paperCount',
                label: 'Number of Papers',
                type: 'select',
                options: [
                    { value: '1', label: '1 Paper' },
                    { value: '2', label: '2 Papers' },
                    { value: '3', label: '3 Papers' },
                    { value: '4', label: '4 Papers' },
                    { value: '5', label: '5 Papers' }
                ],
                value: '1', // Default to 1 paper
                icon: 'fas fa-file-alt'
            }
        ]);
    }

    fields.push({
        name: 'academicLevelDisplay',
        label: 'Academic Level',
        type: 'display',
        value: getLevelDisplayName(currentLevel),
        icon: 'fas fa-layer-group'
    });

    fields.push({
        name: 'subjectLevel',
        type: 'hidden', // Hidden field for data submission
        value: currentLevel
    });

    const submitCallback = async (formData) => {
        const subjectName = formData.subjectName.trim();
        const subjectLevel = formData.subjectLevel;

        if (!subjectName) {
            throw new Error('Please enter subject name');
        }
        
        const subjectData = {
            name: subjectName,
            schoolId: AppState.currentSchool.id,
            level: AppState.currentSchool.level,
            category: subjectLevel,
            createdAt: Firebase.db.serverTimestamp()
        };
        
        // Add A-Level specific data
        if (isALevel) {
            subjectData.type = formData.subjectType;
            subjectData.paperCount = parseInt(formData.paperCount);
        }

        UI.showLoading('Adding subject...');
        try {
            await Firebase.db.addDoc('subjects', subjectData);
            UI.hideLoading();
            UI.showToast('Subject added successfully', 'success');
            await loadSubjects(subjectLevel);
        } catch (error) {
            UI.hideLoading();
            console.error('Error adding subject:', error);
            throw new Error('Error adding subject: ' + error.message);
        }
    };
    
    await UI.form(fields, 'Add New Subject', 'Add Subject', submitCallback);
}

// Helper functions
function getDefaultLevel() {
    const school = AppState.currentSchool;
    if (!school) return null;
    
    return school.level === 'primary' ? 'lower-primary' : 'olevel';
}

function getLevelDisplayName(level) {
    const names = {
        'lower-primary': 'Lower Primary',
        'upper-primary': 'Upper Primary',
        'olevel': 'O-Level',
        'alevel': 'A-Level'
    };
    return names[level] || level;
}

function getLevelIcon(level) {
    const icons = {
        'lower-primary': 'fa-child',
        'upper-primary': 'fa-user-graduate',
        'olevel': 'fa-certificate',
        'alevel': 'fa-university'
    };
    return icons[level] || 'fa-layer-group';
}

function getLevelDescription(level) {
    const descriptions = {
        'lower-primary': 'Primary 1-3 classes',
        'upper-primary': 'Primary 4-7 classes',
        'olevel': 'Senior 1-4 classes',
        'alevel': 'Senior 5-6 classes'
    };
    return descriptions[level] || '';
}

function getClassCategoryName(category) {
    return getLevelDisplayName(category);
}

function getClassDescription(className, category) {
    if (category === 'lower-primary') {
        return 'Lower Primary class focusing on foundational skills';
    } else if (category === 'upper-primary') {
        return 'Upper Primary class preparing for secondary education';
    } else if (category === 'olevel') {
        return 'O-Level class following national curriculum';
    } else if (category === 'alevel') {
        return 'A-Level class with specialized subject combinations';
    }
    return 'Class for academic learning';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function isSubjectInLevel(subjectName, level) {
    // This should check if the subject belongs to the given level
    // For now, we'll return true for all subjects
    return true;
}


function filterStudentsByClass(classId) {
    const tableRows = document.querySelectorAll('#studentsTable tbody tr');
    
    tableRows.forEach(row => {
        const studentClass = row.querySelector('td:nth-child(2)').textContent;
        const shouldShow = !classId || row.getAttribute('data-class-id') === classId;
        row.style.display = shouldShow ? '' : 'none';
    });
}

// Export functions for HTML event handlers
window.deleteClass = async function(classId) {
    if (!confirm('Are you sure you want to delete this class? All students in this class will also be deleted.')) {
        return;
    }
    
    try {
        // Delete all students in this class
        const students = await Firebase.db.query('students', [
            { field: 'classId', op: '==', value: classId }
        ]);
        
        for (const student of students) {
            await Firebase.db.deleteDoc('students', student.id);
        }
        
        // Delete the class
        await Firebase.db.deleteDoc('classes', classId);
        
        UI.showToast('Class deleted successfully', 'success');
        await loadClasses(Router.getCurrentLevel());
        
    } catch (error) {
        console.error('Error deleting class:', error);
        UI.showToast('Error deleting class', 'error');
    }
};

window.deleteStudent = async function(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    
    try {
        await Firebase.db.deleteDoc('students', studentId);
        UI.showToast('Student deleted successfully', 'success');
        await loadStudents(Router.getCurrentLevel());
        
    } catch (error) {
        console.error('Error deleting student:', error);
        UI.showToast('Error deleting student', 'error');
    }
};

window.deleteSubject = async function(subjectId) {
    if (!confirm('Are you sure you want to delete this subject?')) {
        return;
    }
    
    try {
        await Firebase.db.deleteDoc('subjects', subjectId);
        UI.showToast('Subject deleted successfully', 'success');
        await loadSubjects(Router.getCurrentLevel());
        
    } catch (error) {
        console.error('Error deleting subject:', error);
        UI.showToast('Error deleting subject', 'error');
    }
};

window.manageTeacher = function(teacherId) {
    // Show teacher management modal
    UI.showToast('Teacher management coming soon', 'info');
};

window.removeTeacher = async function(teacherId) {
    if (!confirm('Are you sure you want to remove this teacher from the school?')) {
        return;
    }
    
    try {
        // Remove from school teachers list
        await Firebase.db.updateDoc('schools', AppState.currentSchool.id, {
            teachers: Firebase.db.arrayRemove(teacherId),
            admins: Firebase.db.arrayRemove(teacherId)
        });
        
        // Update teacher document
        await Firebase.db.updateDoc('users', teacherId, {
            schoolId: null,
            assignedSubjects: []
        });
        
        UI.showToast('Teacher removed successfully', 'success');
        await loadTeachers();
        
    } catch (error) {
        console.error('Error removing teacher:', error);
        UI.showToast('Error removing teacher', 'error');
    }
};