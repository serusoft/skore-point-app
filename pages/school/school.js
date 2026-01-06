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

function showLevelSelectionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    const school = AppState.currentSchool;
    const levels = school.level === 'primary' 
        ? ['lower-primary', 'upper-primary']
        : ['olevel', 'alevel'];
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Switch Academic Level</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="level-selection">
                ${levels.map(level => `
                    <div class="level-option ${Router.getCurrentLevel() === level ? 'active' : ''}" 
                         data-level="${level}">
                        <i class="fas ${getLevelIcon(level)}"></i>
                        <h4>${getLevelDisplayName(level)}</h4>
                        <p>${getLevelDescription(level)}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Level selection
    modal.querySelectorAll('.level-option').forEach(option => {
        option.addEventListener('click', () => {
            const level = option.dataset.level;
            Router.navigateTo('school', level);
            document.body.removeChild(modal);
        });
    });
}

function showAddClassModal() {
    const currentLevel = Router.getCurrentLevel();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Class</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="addClassForm">
                <div class="form-group">
                    <label for="className">
                        <i class="fas fa-chalkboard"></i> Class Name
                    </label>
                    <input type="text" id="className" placeholder="e.g., P1A, S3B" required>
                </div>
                <div class="form-group">
                    <label>
                        <i class="fas fa-layer-group"></i> Academic Level
                    </label>
                    <div class="level-display">${getLevelDisplayName(currentLevel)}</div>
                    <input type="hidden" id="classLevel" value="${currentLevel}">
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-plus"></i> Add Class
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Form submission
    modal.querySelector('#addClassForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const className = modal.querySelector('#className').value.trim();
        const classLevel = modal.querySelector('#classLevel').value;
        
        if (!className) {
            UI.showToast('Please enter class name', 'error');
            return;
        }
        
        try {
            await Firebase.db.addDoc('classes', {
                name: className,
                schoolId: AppState.currentSchool.id,
                level: AppState.currentSchool.level,
                category: classLevel,
                createdAt: Firebase.db.serverTimestamp()
            });
            
            document.body.removeChild(modal);
            UI.showToast('Class added successfully', 'success');
            await loadClasses(classLevel);
            
        } catch (error) {
            console.error('Error adding class:', error);
            UI.showToast('Error adding class', 'error');
        }
    });
}

function showAddStudentModal() {
    const currentLevel = Router.getCurrentLevel();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Student</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="addStudentForm">
                <div class="form-group">
                    <label for="studentName">
                        <i class="fas fa-user-graduate"></i> Student Name
                    </label>
                    <input type="text" id="studentName" placeholder="Enter full name" required>
                </div>
                <div class="form-group">
                    <label for="studentClass">
                        <i class="fas fa-chalkboard"></i> Class
                    </label>
                    <select id="studentClass" required>
                        <option value="">Select Class</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <i class="fas fa-layer-group"></i> Academic Level
                    </label>
                    <div class="level-display">${getLevelDisplayName(currentLevel)}</div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-plus"></i> Add Student
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load classes for current level
    loadClassesForSelection(modal.querySelector('#studentClass'), currentLevel);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Form submission
    modal.querySelector('#addStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentName = modal.querySelector('#studentName').value.trim();
        const studentClass = modal.querySelector('#studentClass').value;
        
        if (!studentName || !studentClass) {
            UI.showToast('Please fill all fields', 'error');
            return;
        }
        
        try {
            await Firebase.db.addDoc('students', {
                name: studentName,
                classId: studentClass,
                schoolId: AppState.currentSchool.id,
                level: currentLevel,
                createdAt: Firebase.db.serverTimestamp()
            });
            
            document.body.removeChild(modal);
            UI.showToast('Student added successfully', 'success');
            await loadStudents(currentLevel);
            
        } catch (error) {
            console.error('Error adding student:', error);
            UI.showToast('Error adding student', 'error');
        }
    });
}

function showAddSubjectModal() {
    const currentLevel = Router.getCurrentLevel();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    // Get subject type based on level
    const subjectType = currentLevel === 'alevel' ? 'subjectType' : 'regular';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Subject</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="addSubjectForm">
                <div class="form-group">
                    <label for="subjectName">
                        <i class="fas fa-book"></i> Subject Name
                    </label>
                    <input type="text" id="subjectName" placeholder="e.g., Mathematics, Physics" required>
                </div>
                
                ${subjectType === 'subjectType' ? `
                    <div class="form-group">
                        <label for="subjectType">
                            <i class="fas fa-tag"></i> Subject Type
                        </label>
                        <select id="subjectType" required>
                            <option value="principal">Principal Subject</option>
                            <option value="subsidiary">Subsidiary Subject</option>
                            <option value="general">General Paper</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="paperCountGroup">
                        <label for="paperCount">
                            <i class="fas fa-file-alt"></i> Number of Papers
                        </label>
                        <select id="paperCount">
                            <option value="1">1 Paper</option>
                            <option value="2">2 Papers</option>
                            <option value="3">3 Papers</option>
                            <option value="4">4 Papers</option>
                            <option value="5">5 Papers</option>
                        </select>
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label>
                        <i class="fas fa-layer-group"></i> Academic Level
                    </label>
                    <div class="level-display">${getLevelDisplayName(currentLevel)}</div>
                    <input type="hidden" id="subjectLevel" value="${currentLevel}">
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-plus"></i> Add Subject
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Form submission
    modal.querySelector('#addSubjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const subjectName = modal.querySelector('#subjectName').value.trim();
        const subjectLevel = modal.querySelector('#subjectLevel').value;
        
        if (!subjectName) {
            UI.showToast('Please enter subject name', 'error');
            return;
        }
        
        const subjectData = {
            name: subjectName,
            schoolId: AppState.currentSchool.id,
            level: AppState.currentSchool.level,
            category: subjectLevel,
            createdAt: Firebase.db.serverTimestamp()
        };
        
        // Add A-Level specific data
        if (subjectType === 'subjectType') {
            subjectData.type = modal.querySelector('#subjectType').value;
            subjectData.paperCount = parseInt(modal.querySelector('#paperCount').value);
        }
        
        try {
            await Firebase.db.addDoc('subjects', subjectData);
            
            document.body.removeChild(modal);
            UI.showToast('Subject added successfully', 'success');
            await loadSubjects(subjectLevel);
            
        } catch (error) {
            console.error('Error adding subject:', error);
            UI.showToast('Error adding subject', 'error');
        }
    });
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

async function loadClassesForSelection(selectElement, level) {
    try {
        const classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        selectElement.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
    } catch (error) {
        console.error('Error loading classes:', error);
        selectElement.innerHTML = '<option value="">Error loading classes</option>';
    }
}

async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function showClassSelectionModal(classes) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Class for Import</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="class-selection">
                    ${classes.map(cls => `
                        <div class="class-option" data-class-id="${cls.id}">
                            <h4>${cls.name}</h4>
                            <p>${getLevelDisplayName(cls.category)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
        
        // Class selection
        modal.querySelectorAll('.class-option').forEach(option => {
            option.addEventListener('click', () => {
                const classId = option.dataset.classId;
                document.body.removeChild(modal);
                resolve(classId);
            });
        });
    });
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