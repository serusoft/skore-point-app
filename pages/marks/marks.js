// Marks entry page functionality
document.addEventListener('DOMContentLoaded', () => {
    initMarksPage();
});

async function initMarksPage() {
    // Check if user has access to a school
    if (!AppState.currentSchool) {
        UI.showToast('Please join or create a school first', 'warning');
        Router.navigateTo('dashboard');
        return;
    }
    
    // Check if level is selected
    const currentLevel = Router.getCurrentLevel();
    if (!currentLevel) {
        showLevelSelection();
        return;
    }
    
    // Initialize marks page
    await initializeMarksPage(currentLevel);
}

function showLevelSelection() {
    const prompt = document.getElementById('levelSelectionPrompt');
    const options = document.getElementById('marksLevelOptions');
    const school = AppState.currentSchool;
    
    if (!school) return;
    
    const levels = school.level === 'primary' 
        ? [
            { id: 'lower-primary', name: 'Lower Primary', icon: 'fa-child', description: 'P1-P3 classes' },
            { id: 'upper-primary', name: 'Upper Primary', icon: 'fa-user-graduate', description: 'P4-P7 classes' }
        ]
        : [
            { id: 'olevel', name: 'O-Level', icon: 'fa-certificate', description: 'S1-S4 classes' },
            { id: 'alevel', name: 'A-Level', icon: 'fa-university', description: 'S5-S6 classes' }
        ];
    
    options.innerHTML = levels.map(level => `
        <div class="level-option" data-level="${level.id}">
            <i class="fas ${level.icon}"></i>
            <h4>${level.name}</h4>
            <p>${level.description}</p>
        </div>
    `).join('');
    
    prompt.style.display = 'block';
    
    // Add click handlers
    options.querySelectorAll('.level-option').forEach(option => {
        option.addEventListener('click', () => {
            const level = option.dataset.level;
            Router.navigateTo('marks', level);
        });
    });
}

async function initializeMarksPage(level) {
    // Hide level selection
    document.getElementById('levelSelectionPrompt').style.display = 'none';
    
    // Show marks interface
    document.getElementById('marksInterface').style.display = 'block';
    
    // Update level badge
    document.getElementById('marksLevelBadge').textContent = getLevelDisplayName(level);
    
    // Setup event listeners
    setupMarksEventListeners();
    
    // Load initial data
    await loadMarksData(level);
}

function setupMarksEventListeners() {
    // Class selection
    document.getElementById('marksClass')?.addEventListener('change', async (e) => {
        await handleClassSelection(e.target.value);
    });
    
    // Term selection
    document.getElementById('marksTerm')?.addEventListener('change', async (e) => {
        await handleTermSelection(e.target.value);
    });
    
    // Subject selection
    document.getElementById('marksSubject')?.addEventListener('change', async (e) => {
        await handleSubjectSelection(e.target.value);
    });
    
    // Student search
    const studentSearch = document.getElementById('studentSearch');
    const searchClear = document.getElementById('searchClear');
    const searchSuggestions = document.getElementById('searchSuggestions');
    
    if (studentSearch) {
        studentSearch.addEventListener('input', debounce(async () => {
            await handleStudentSearch(studentSearch.value);
        }, 300));
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            studentSearch.value = '';
            searchSuggestions.style.display = 'none';
            searchClear.style.display = 'none';
            clearSelectedStudent();
        });
    }
    
    // Save marks
    document.getElementById('saveMarksBtn')?.addEventListener('click', async () => {
        await saveMarks();
    });
    
    // Clear form
    document.getElementById('clearFormBtn')?.addEventListener('click', () => {
        clearMarksForm();
    });
}

async function loadMarksData(level) {
    try {
        // Load classes for this level
        await loadClassesForMarks(level);
        
        // Load subjects for this level
        await loadSubjectsForMarks(level);
        
        // Set current term
        updateTermDisplay();
        
    } catch (error) {
        console.error('Error loading marks data:', error);
        UI.showToast('Error loading data', 'error');
    }
}

async function loadClassesForMarks(level) {
    const classSelect = document.getElementById('marksClass');
    if (!classSelect) return;
    
    try {
        const classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        classSelect.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
    } catch (error) {
        console.error('Error loading classes:', error);
        classSelect.innerHTML = '<option value="">Error loading classes</option>';
    }
}

async function loadSubjectsForMarks(level) {
    const subjectSelect = document.getElementById('marksSubject');
    if (!subjectSelect) return;
    
    // Check user permissions
    const userRole = AppState.currentUserData.role;
    const userSubjects = AppState.currentUserData.assignedSubjects || [];
    
    try {
        let subjects = await Firebase.db.query('subjects', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        // Filter subjects for teachers (admins see all)
        if (userRole === 'teacher' && userSubjects.length > 0) {
            subjects = subjects.filter(subject => 
                userSubjects.includes(subject.name)
            );
        }
        
        subjectSelect.innerHTML = '<option value="">All Subjects</option>' + 
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

async function handleClassSelection(classId) {
    if (!classId) {
        clearSelectedStudent();
        hideMarksForm();
        return;
    }
    
    try {
        // Load students for this class
        await loadStudentsForClass(classId);
        
        // Show marks form if we have a selected student
        const selectedStudent = getSelectedStudent();
        if (selectedStudent) {
            await loadStudentMarks(selectedStudent.id);
        }
        
    } catch (error) {
        console.error('Error handling class selection:', error);
        UI.showToast('Error loading class data', 'error');
    }
}

async function handleTermSelection(term) {
    // Update term display
    updateTermDisplay(term);
    
    // Reload marks for selected student
    const selectedStudent = getSelectedStudent();
    if (selectedStudent) {
        await loadStudentMarks(selectedStudent.id);
    }
}

async function handleSubjectSelection(subjectId) {
    // Update marks form based on selected subject
    await updateMarksForm(subjectId);
}

async function loadStudentsForClass(classId) {
    // Store students in memory for search
    window.marksStudents = [];
    
    try {
        const students = await Firebase.db.query('students', [
            { field: 'classId', op: '==', value: classId },
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
        ]);
        
        window.marksStudents = students;
        
    } catch (error) {
        console.error('Error loading students:', error);
        window.marksStudents = [];
    }
}

async function handleStudentSearch(query) {
    const suggestions = document.getElementById('searchSuggestions');
    const clearBtn = document.getElementById('searchClear');
    
    if (!query || query.length < 2) {
        suggestions.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
    }
    
    clearBtn.style.display = 'block';
    
    const students = window.marksStudents || [];
    const filtered = students.filter(student => 
        student.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length > 0) {
        suggestions.innerHTML = filtered.map(student => `
            <div class="suggestion-item" data-student-id="${student.id}">
                <strong>${student.name}</strong>
                <small>${getClassFromId(student.classId)}</small>
            </div>
        `).join('');
        
        suggestions.style.display = 'block';
        
        // Add click handlers
        suggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', async () => {
                const studentId = item.dataset.studentId;
                const student = students.find(s => s.id === studentId);
                
                if (student) {
                    selectStudent(student);
                    suggestions.style.display = 'none';
                }
            });
        });
    } else {
        suggestions.style.display = 'none';
    }
}

function selectStudent(student) {
    // Update selected student display
    document.getElementById('selectedStudentName').textContent = student.name;
    document.getElementById('selectedStudentClass').textContent = getClassFromId(student.classId);
    document.getElementById('selectedStudentInfo').style.display = 'block';
    
    // Store selected student
    window.selectedStudent = student;
    
    // Load marks for this student
    loadStudentMarks(student.id);
}

async function loadStudentMarks(studentId) {
    const term = document.getElementById('marksTerm').value;
    const subjectId = document.getElementById('marksSubject').value;
    
    if (!term) {
        hideMarksForm();
        return;
    }
    
    try {
        // Get existing marks
        const marksDoc = await Firebase.db.getDoc('marks', `${studentId}_${term}`);
        
        // Show marks form
        await showMarksForm(subjectId, marksDoc?.data());
        
    } catch (error) {
        console.error('Error loading student marks:', error);
        hideMarksForm();
    }
}

async function showMarksForm(subjectId, existingMarks = null) {
    const marksGrid = document.getElementById('marksGrid');
    const marksForm = document.getElementById('marksEntryForm');
    const emptyState = document.getElementById('marksEmptyState');
    
    if (!marksGrid || !marksForm) return;
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Get subjects to show
    let subjects = [];
    
    if (subjectId) {
        // Single subject
        const subject = await Firebase.db.getDoc('subjects', subjectId);
        if (subject) subjects = [subject];
    } else {
        // All subjects for current level
        const level = Router.getCurrentLevel();
        subjects = await Firebase.db.query('subjects', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
    }
    
    if (subjects.length === 0) {
        marksGrid.innerHTML = '<div class="alert info">No subjects found</div>';
        marksForm.style.display = 'block';
        return;
    }
    
    // Generate marks inputs
    marksGrid.innerHTML = subjects.map(subject => {
        const existingMark = existingMarks ? existingMarks[subject.id] : null;
        
        if (subject.level === 'secondary' && subject.category === 'alevel' && subject.type) {
            // A-Level subject with multiple papers
            return generateALevelInputs(subject, existingMark);
        } else {
            // Regular subject (single mark)
            return generateRegularInput(subject, existingMark);
        }
    }).join('');
    
    // Show form
    marksForm.style.display = 'block';
    
    // Update summary
    updateMarksSummary();
}

function generateRegularInput(subject, existingMark) {
    return `
        <div class="mark-input-group" data-subject-id="${subject.id}">
            <label>${subject.name}</label>
            <input type="number" class="mark-input" 
                   min="0" max="100" 
                   value="${existingMark || ''}" 
                   placeholder="0-100"
                   oninput="updateMarksSummary()">
        </div>
    `;
}

function generateALevelInputs(subject, existingMark) {
    const paperCount = subject.paperCount || 1;
    const isGeneralPaper = subject.type === 'general';
    const isSubsidiary = subject.type === 'subsidiary';
    
    let inputs = '';
    
    if (paperCount > 1) {
        // Multiple papers
        for (let i = 1; i <= paperCount; i++) {
            const paperMark = existingMark && existingMark[`paper${i}`] ? existingMark[`paper${i}`] : '';
            inputs += `
                <div class="paper-input">
                    <span class="paper-label">Paper ${i}:</span>
                    <input type="number" class="mark-input paper-mark" 
                           data-paper="${i}"
                           min="0" max="100" 
                           value="${paperMark}" 
                           placeholder="0-100"
                           oninput="updateMarksSummary()">
                </div>
            `;
        }
    } else {
        // Single paper
        inputs = `
            <input type="number" class="mark-input" 
                   min="0" max="100" 
                   value="${existingMark || ''}" 
                   placeholder="0-100"
                   oninput="updateMarksSummary()">
        `;
    }
    
    return `
        <div class="mark-input-group" data-subject-id="${subject.id}" 
             data-subject-type="${subject.type}">
            <label>
                ${subject.name}
                ${isGeneralPaper ? '<span class="badge">GP</span>' : ''}
                ${isSubsidiary ? '<span class="badge">Sub</span>' : ''}
            </label>
            <div class="paper-inputs">
                ${inputs}
            </div>
        </div>
    `;
}

function updateMarksSummary() {
    const summary = document.getElementById('marksSummary');
    const stats = document.getElementById('summaryStats');
    
    if (!summary || !stats) return;
    
    const markInputs = document.querySelectorAll('.mark-input-group');
    let totalMarks = 0;
    let count = 0;
    let highest = 0;
    let lowest = 100;
    
    markInputs.forEach(group => {
        const subjectId = group.dataset.subjectId;
        const subjectType = group.dataset.subjectType;
        
        if (subjectType === 'general' || subjectType === 'subsidiary') {
            // General Paper and Subsidiary subjects have special handling
            const paperInputs = group.querySelectorAll('.paper-mark');
            if (paperInputs.length > 0) {
                let paperTotal = 0;
                paperInputs.forEach(input => {
                    const value = parseFloat(input.value) || 0;
                    paperTotal += value;
                });
                const average = paperInputs.length > 0 ? paperTotal / paperInputs.length : 0;
                
                if (average > 0) {
                    totalMarks += average;
                    count++;
                    highest = Math.max(highest, average);
                    lowest = Math.min(lowest, average);
                }
            } else {
                const input = group.querySelector('.mark-input');
                const value = parseFloat(input.value) || 0;
                if (value > 0) {
                    totalMarks += value;
                    count++;
                    highest = Math.max(highest, value);
                    lowest = Math.min(lowest, value);
                }
            }
        } else {
            // Regular subjects
            const paperInputs = group.querySelectorAll('.paper-mark');
            if (paperInputs.length > 0) {
                // A-Level subject with multiple papers
                paperInputs.forEach(input => {
                    const value = parseFloat(input.value) || 0;
                    if (value > 0) {
                        totalMarks += value;
                        count++;
                        highest = Math.max(highest, value);
                        lowest = Math.min(lowest, value);
                    }
                });
            } else {
                const input = group.querySelector('.mark-input');
                const value = parseFloat(input.value) || 0;
                if (value > 0) {
                    totalMarks += value;
                    count++;
                    highest = Math.max(highest, value);
                    lowest = Math.min(lowest, value);
                }
            }
        }
    });
    
    const average = count > 0 ? (totalMarks / count).toFixed(1) : 0;
    
    stats.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${count}</div>
            <div class="stat-label">Subjects</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${average}</div>
            <div class="stat-label">Average</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${highest.toFixed(1)}</div>
            <div class="stat-label">Highest</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${lowest === 100 ? 0 : lowest.toFixed(1)}</div>
            <div class="stat-label">Lowest</div>
        </div>
    `;
    
    summary.style.display = 'block';
}

async function saveMarks() {
    const selectedStudent = window.selectedStudent;
    if (!selectedStudent) {
        UI.showToast('Please select a student first', 'error');
        return;
    }
    
    const term = document.getElementById('marksTerm').value;
    if (!term) {
        UI.showToast('Please select a term', 'error');
        return;
    }
    
    const marks = {};
    let hasMarks = false;
    
    // Collect marks from all inputs
    document.querySelectorAll('.mark-input-group').forEach(group => {
        const subjectId = group.dataset.subjectId;
        const subjectType = group.dataset.subjectType;
        
        if (subjectType === 'general' || subjectType === 'subsidiary') {
            // Handle General Paper and Subsidiary subjects
            const paperInputs = group.querySelectorAll('.paper-mark');
            if (paperInputs.length > 0) {
                const paperMarks = {};
                paperInputs.forEach(input => {
                    const paperNum = input.dataset.paper;
                    const value = parseFloat(input.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                        paperMarks[`paper${paperNum}`] = value;
                        hasMarks = true;
                    }
                });
                if (Object.keys(paperMarks).length > 0) {
                    marks[subjectId] = paperMarks;
                }
            } else {
                const input = group.querySelector('.mark-input');
                const value = parseFloat(input.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    marks[subjectId] = value;
                    hasMarks = true;
                }
            }
        } else {
            // Handle regular subjects
            const paperInputs = group.querySelectorAll('.paper-mark');
            if (paperInputs.length > 0) {
                // A-Level subject with multiple papers
                const paperMarks = {};
                paperInputs.forEach(input => {
                    const paperNum = input.dataset.paper;
                    const value = parseFloat(input.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                        paperMarks[`paper${paperNum}`] = value;
                        hasMarks = true;
                    }
                });
                if (Object.keys(paperMarks).length > 0) {
                    marks[subjectId] = paperMarks;
                }
            } else {
                const input = group.querySelector('.mark-input');
                const value = parseFloat(input.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    marks[subjectId] = value;
                    hasMarks = true;
                }
            }
        }
    });
    
    if (!hasMarks) {
        UI.showToast('Please enter at least one mark', 'warning');
        return;
    }
    
    try {
        UI.showLoading('Saving marks...');
        
        // Get teacher initials
        const teacherName = AppState.currentUserData.name || '';
        const teacherInitials = getTeacherInitials(teacherName);
        
        // Prepare marks data
        const marksData = {
            studentId: selectedStudent.id,
            schoolId: AppState.currentSchool.id,
            classId: selectedStudent.classId,
            level: Router.getCurrentLevel(),
            term: term,
            ...marks,
            enteredBy: AppState.currentUser.uid,
            enteredByInitials: teacherInitials,
            updatedAt: Firebase.db.serverTimestamp()
        };
        
        // Save to Firestore
        await Firebase.db.setDoc('marks', `${selectedStudent.id}_${term}`, marksData);
        
        UI.hideLoading();
        UI.showToast('Marks saved successfully!', 'success');
        
        // Update summary
        updateMarksSummary();
        
    } catch (error) {
        UI.hideLoading();
        console.error('Error saving marks:', error);
        UI.showToast('Error saving marks', 'error');
    }
}

function clearMarksForm() {
    // Clear all inputs
    document.querySelectorAll('.mark-input').forEach(input => {
        input.value = '';
    });
    
    // Clear selected student
    clearSelectedStudent();
    
    // Hide marks form
    hideMarksForm();
    
    // Show empty state
    document.getElementById('marksEmptyState').style.display = 'block';
}

function clearSelectedStudent() {
    window.selectedStudent = null;
    document.getElementById('selectedStudentInfo').style.display = 'none';
    document.getElementById('studentSearch').value = '';
    document.getElementById('searchClear').style.display = 'none';
}

function hideMarksForm() {
    document.getElementById('marksEntryForm').style.display = 'none';
    document.getElementById('marksSummary').style.display = 'none';
}

function updateTermDisplay(term) {
    const termDisplay = document.getElementById('academicTerm');
    if (!termDisplay) return;
    
    const termNames = {
        'beginning': 'Beginning of Term',
        'mid': 'Mid Term',
        'end': 'End of Term'
    };
    
    const selectedTerm = term || document.getElementById('marksTerm').value;
    termDisplay.textContent = termNames[selectedTerm] || '';
}

function getClassFromId(classId) {
    // This should look up class name from stored classes
    return 'Class';
}

function getSelectedStudent() {
    return window.selectedStudent;
}

function getTeacherInitials(name) {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).toUpperCase().join('').substring(0, 3);
}

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

// Export for inline event handlers
window.updateMarksSummary = updateMarksSummary;