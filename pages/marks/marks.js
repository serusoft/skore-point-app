// Marks entry page functionality
document.addEventListener('DOMContentLoaded', () => {
    if (window.appInitialized) {
        initMarksPage();
    } else {
        document.addEventListener('app:initialized', initMarksPage);
    }
});

async function initMarksPage() {
    // Check if user has access to a school
    if (!AppState.currentSchool) {
        showToast('Please join or create a school first', 'warning');
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('dashboard');
        }
        return;
    }
    
    // Get params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const levelParam = urlParams.get('level');
    
    // Set level if provided in URL
    if (levelParam) {
        AppState.currentAcademicLevel = levelParam;
    }
    
    // Check if level is selected
    const currentLevel = AppState.currentAcademicLevel;
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
    
    if (!prompt || !options) return;
    
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
            AppState.currentAcademicLevel = level;
            // Re-initialize with selected level
            initializeMarksPage(level);
        });
    });
}

async function initializeMarksPage(level) {
    // Hide level selection
    const prompt = document.getElementById('levelSelectionPrompt');
    if (prompt) prompt.style.display = 'none';
    
    // Show marks interface
    const marksInterface = document.getElementById('marksInterface');
    if (marksInterface) marksInterface.style.display = 'block';
    
    // Disable student search until a class is selected
    const studentSearchInput = document.getElementById('studentSearch');
    if (studentSearchInput) {
        studentSearchInput.disabled = true;
        studentSearchInput.placeholder = 'Select a class to enable search';
    }
    
    // Update level badge
    const badge = document.getElementById('marksLevelBadge');
    if (badge) badge.textContent = getLevelDisplayName(level);
    
    // Populate level filter
    populateLevelFilter(level);
    
    // Setup event listeners
    setupMarksEventListeners();
    
    // Load initial data
    await loadMarksData(level);
}

function setupMarksEventListeners() {
    // Back to School
    document.getElementById('backToSchoolBtn')?.addEventListener('click', () => {
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('school');
        } else {
            window.location.href = '../school/school.html';
        }
    });

    // Level selection
    document.getElementById('marksLevel')?.addEventListener('change', async (e) => {
        const level = e.target.value;
        if (level) {
            AppState.currentAcademicLevel = level;
            const badge = document.getElementById('marksLevelBadge');
            if (badge) badge.textContent = getLevelDisplayName(level);
            clearMarksForm();
            await loadMarksData(level);
        }
    });

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
        studentSearch.setAttribute('autocomplete', 'off');
        studentSearch.addEventListener('input', () => {
            handleStudentSearch(studentSearch.value);
        });

        // Show suggestions on focus — if empty, show top alphabetical suggestions
        studentSearch.addEventListener('focus', () => {
            handleStudentSearch(studentSearch.value || '');
        });
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

    // Add listener for clicking on disabled subject inputs
    const marksGrid = document.getElementById('marksGrid');
    if (marksGrid) {
        marksGrid.addEventListener('click', (e) => {
            const mismatchedGroup = e.target.closest('.mark-input-group.mismatched');
            if (mismatchedGroup) {
                showToast('This subject is not offered for the current academic level.', 'warning');
            }
        });
    }
}

async function loadMarksData(level) {
    try {
        // Load classes for this level
        await loadClassesForMarks(level);
        
        // Load subjects for this level
        await loadSubjectsForMarks(level);
        
        // Load all students for this level to enable search immediately
        await loadAllStudentsForLevel(level);
        
        // Set current term
        updateTermDisplay();
        
        // Check for pre-selected values from URL or AppState
        const urlParams = new URLSearchParams(window.location.search);
        const classIdParam = urlParams.get('classId') || (window.AppState && window.AppState.selectedClassForMarks);
        const termParam = urlParams.get('term') || (window.AppState && window.AppState.selectedTermForMarks);

        if (classIdParam) {
            const classSelect = document.getElementById('marksClass');
            if (classSelect) {
                classSelect.value = classIdParam;
                await handleClassSelection(classIdParam);
                window.AppState.selectedClassForMarks = null;
            }
        }
        
        if (termParam) {
            const termSelect = document.getElementById('marksTerm');
            if (termSelect) {
                termSelect.value = termParam;
                await handleTermSelection(termParam);
                window.AppState.selectedTermForMarks = null;
            }
        }
        
    } catch (error) {
        console.error('Error loading marks data:', error);
        showToast('Error loading data', 'error');
    }
}

async function loadClassesForMarks(level) {
    const classSelect = document.getElementById('marksClass');
    if (!classSelect) return;
    
    try {
        let classes = await Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        // For teachers, filter classes to only those where they teach a subject
        const userRole = AppState.currentUserData?.role;
        const userSubjects = AppState.currentUserData?.assignedSubjects || [];
        
        if (userRole === 'teacher' && userSubjects.length > 0) {
            // Filter classes that have at least one subject the teacher is assigned to
            classes = classes.filter(cls => {
                const classSubjects = cls.subjects || [];
                // If class has no specific subjects defined, assume it's available for all
                if (classSubjects.length === 0) return true;
                return classSubjects.some(subjectId => userSubjects.includes(subjectId));
            });
            
            if (classes.length === 0) {
                classSelect.innerHTML = '<option value="" disabled selected>No classes available for your subjects</option>';
                showToast('No classes found for your assigned subjects.', 'info');
                return;
            }
        }
        
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

    const urlParams = new URLSearchParams(window.location.search);
    const userSubjectIds = (urlParams.get('assignedSubjects') || '').split(',').filter(id => id);
    const isAdmin = urlParams.get('isAdmin') === 'true';

    try {
        let subjects = [];
        if (isAdmin) {
            // Admins see all subjects for the current level
            subjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ]);
        } else {
            // Teachers see their assigned subjects
            if (userSubjectIds.length === 0) {
                subjectSelect.innerHTML = '<option value="" disabled selected>No subjects assigned to you</option>';
                showToast('You do not have any subjects assigned. Contact your admin.', 'warning');
                return;
            }

            // Fetch all subjects for the school to filter locally.
            const allSchoolSubjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id }
            ]);

            // Filter to get only the teacher's assigned subjects
            subjects = allSchoolSubjects.filter(s => userSubjectIds.includes(s.id));
        }

        if (subjects.length === 0 && !isAdmin) {
            subjectSelect.innerHTML = '<option value="" disabled selected>No subjects assigned to you</option>';
            return;
        }
        
        const defaultOption = isAdmin ? 'All Subjects' : 'Select Subject';
        subjectSelect.innerHTML = `<option value="">${defaultOption}</option>` + 
            subjects.map(s => {
                const isMismatched = s.category !== level;
                const warningText = isMismatched ? ` (Wrong Level: ${s.category.replace('-', ' ')})` : '';
                return `<option value="${s.id}" data-mismatched="${isMismatched}">${s.name}${warningText}</option>`;
            }).join('');
            
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

async function handleClassSelection(classId) {
    const studentSearchInput = document.getElementById('studentSearch');

    if (!classId) {
        clearSelectedStudent();
        hideMarksForm();
        await loadAllStudentsForLevel(AppState.currentAcademicLevel);
        if (studentSearchInput) {
            studentSearchInput.disabled = true;
            studentSearchInput.placeholder = 'Select a class to enable search';
        }
        return;
    }

    // Enable student search
    if (studentSearchInput) {
        studentSearchInput.disabled = false;
        studentSearchInput.placeholder = 'Type student name...';
    }
    
    try {
        // Load students for this class
        await loadStudentsForClass(classId);
        showToast('Class loaded. Search for a student to enter marks.', 'info');
        
        // Show marks form if we have a selected student
        const selectedStudent = getSelectedStudent();
        if (selectedStudent) {
            await loadStudentMarks(selectedStudent.id);
        }
        
    } catch (error) {
        console.error('Error handling class selection:', error);
        showToast('Error loading class data', 'error');
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
    // Check for mismatched level warning
    const subjectSelect = document.getElementById('marksSubject');
    const selectedOption = subjectSelect.querySelector(`option[value="${subjectId}"]`);
    if (selectedOption && selectedOption.dataset.mismatched === 'true') {
        const subjectName = selectedOption.textContent.split(' (')[0];
        showToast(
            `Warning: "${subjectName}" is not offered for this level. Go to the "My Admin" tab to contact an admin for help.`, 
            'warning', 
            8000 // show for 8 seconds
        );
    }

    // Update marks form based on selected subject
    const selectedStudent = getSelectedStudent();
    if (selectedStudent) {
        await loadStudentMarks(selectedStudent.id);
    } else {
        await showMarksForm(subjectId);
    }
}

async function loadAllStudentsForLevel(level) {
    // Store students in memory for search
    window.marksStudents = [];
    
    try {
        const students = await Firebase.db.query('students', [
            { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
            { field: 'category', op: '==', value: level }
        ]);
        
        window.marksStudents = students;
        console.log(`Loaded ${students.length} students for search`);
        
    } catch (error) {
        console.error('Error loading all students:', error);
        window.marksStudents = [];
    }
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

function handleStudentSearch(query) {
    const suggestions = document.getElementById('searchSuggestions');
    const clearBtn = document.getElementById('searchClear');
    
    if (!suggestions) return;

    const students = (window.marksStudents || []).slice();

    // Logging for debugging
    console.debug('handleStudentSearch called with query:', query, 'studentsCount:', students.length);

    // If query is empty, show top alphabetical suggestions
    const searchTerm = (query || '').toLowerCase().trim();
    let filtered = [];

    if (!searchTerm) {
        filtered = students;
    } else {
        // Prioritize prefix matches, then include-containing matches
        const term = searchTerm;
        const prefixMatches = [];
        const partialMatches = [];

        students.forEach(student => {
            if (!student.name) return;
            const name = student.name.toLowerCase();
            if (name.startsWith(term)) prefixMatches.push(student);
            else if (name.includes(term)) partialMatches.push(student);
        });

        // Combine and use as filtered
        filtered = prefixMatches.concat(partialMatches);
    }

    // Sort alphabetically by student name
    filtered.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
    });

    if (filtered.length > 0) {
        if (clearBtn) clearBtn.style.display = (searchTerm ? 'block' : 'none');

        // Limit to 10 results for performance
        // Highlight match
        const makeHighlighted = (name) => {
            if (!searchTerm) return name;
            try {
                const re = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
                return name.replace(re, '<strong>$1</strong>');
            } catch (e) {
                return name;
            }
        };

        suggestions.innerHTML = filtered.slice(0, 10).map(student => `
            <div class="suggestion-item" data-student-id="${student.id}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div style="font-weight: bold;">${makeHighlighted(student.name)}</div>
                <div style="font-size: 0.85em; opacity: 0.7;">${getClassFromId(student.classId)}</div>
            </div>
        `).join('');

        suggestions.style.display = 'block';

        // Use event delegation to handle clicks reliably
        suggestions.onclick = function (evt) {
            const item = evt.target.closest('.suggestion-item');
            if (!item) return;
            evt.stopPropagation();
            const studentId = item.dataset.studentId;
            // find in the live window list (not the sliced copy) to avoid id type issues
            const student = (window.marksStudents || []).find(s => String(s.id) === String(studentId));
            console.debug('suggestion clicked, studentId:', studentId, 'found:', !!student);
            if (student) {
                selectStudent(student);
                suggestions.style.display = 'none';
                const searchInput = document.getElementById('studentSearch');
                if (searchInput) searchInput.value = student.name;
            }
        };
    } else {
        suggestions.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
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
    
    let marksData = null;
    try {
        // Get existing marks
        const marksDoc = await Firebase.db.getDoc('marks', `${studentId}_${term}`);
        if (marksDoc && marksDoc.exists()) {
            marksData = marksDoc.data();
        }
    } catch (error) {
        console.error('Error loading student marks:', error);
        // Continue to show form even if marks load fails
    }
    
    // Show marks form
    await showMarksForm(subjectId, marksData);
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
    
    try {
        if (subjectId) {
            // Single subject
            const subjectDoc = await Firebase.db.getDoc('subjects', subjectId);
            if (subjectDoc && subjectDoc.exists()) {
                subjects = [{ id: subjectDoc.id, ...subjectDoc.data() }];
            }
        } else {
            // All subjects for current level
            const level = AppState.currentAcademicLevel;
            subjects = await Firebase.db.query('subjects', [
                { field: 'schoolId', op: '==', value: AppState.currentSchool.id },
                { field: 'category', op: '==', value: level }
            ]);
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        // Continue with empty subjects, will show "No subjects found"
    }
    
    if (subjects.length === 0) {
        marksGrid.innerHTML = '<div class="alert info">No subjects found</div>';
        marksForm.style.display = 'block';
        return;
    }
    
    // Generate marks inputs
    marksGrid.innerHTML = subjects.map(subject => {
        const existingMark = existingMarks ? existingMarks[subject.id] : null;
        const isMismatched = subject.category !== AppState.currentAcademicLevel;
        
        if (subject.level === 'secondary' && subject.category === 'alevel' && subject.type) {
            // A-Level subject with multiple papers
            return generateALevelInputs(subject, existingMark, isMismatched);
        } else {
            // Regular subject (single mark)
            return generateRegularInput(subject, existingMark, isMismatched);
        }
    }).join('');
    
    // Show form
    marksForm.style.display = 'block';
    
    // Update summary
    updateMarksSummary();
}

function generateRegularInput(subject, existingMark, isMismatched) {
    const disabledAttr = isMismatched ? 'disabled' : '';
    return `
        <div class="mark-input-group ${isMismatched ? 'mismatched' : ''}" data-subject-id="${subject.id}">
            <label>${subject.name}</label>
            <input type="number" class="mark-input" 
                   min="0" max="100" 
                   value="${existingMark || ''}" 
                   placeholder="0-100"
                   oninput="updateMarksSummary()"
                   ${disabledAttr}>
            ${isMismatched ? '<div class="level-mismatch-warning"><i class="fas fa-exclamation-triangle"></i> Not for this level</div>' : ''}
        </div>
    `;
}

function generateALevelInputs(subject, existingMark, isMismatched) {
    const disabledAttr = isMismatched ? 'disabled' : '';
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
                           oninput="updateMarksSummary()"
                           ${disabledAttr}>
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
                   oninput="updateMarksSummary()"
                   ${disabledAttr}>
        `;
    }
    
    return `
        <div class="mark-input-group ${isMismatched ? 'mismatched' : ''}" data-subject-id="${subject.id}" 
             data-subject-type="${subject.type}">
            <label>
                ${subject.name}
                ${isGeneralPaper ? '<span class="badge">GP</span>' : ''}
                ${isSubsidiary ? '<span class="badge">Sub</span>' : ''}
            </label>
            <div class="paper-inputs">
                ${inputs}
            </div>
            ${isMismatched ? '<div class="level-mismatch-warning"><i class="fas fa-exclamation-triangle"></i> Not for this level</div>' : ''}
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
        showToast('Please select a student first', 'error');
        return;
    }
    
    const term = document.getElementById('marksTerm').value;
    if (!term) {
        showToast('Please select a term', 'error');
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
        showToast('Please enter at least one mark', 'warning');
        return;
    }
    
    try {
        showLoading('Saving marks...');
        
        // Get teacher initials
        const teacherName = AppState.currentUserData.name || '';
        const teacherInitials = getTeacherInitials(teacherName);
        
        // Prepare marks data
        const marksData = {
            studentId: selectedStudent.id,
            schoolId: AppState.currentSchool.id,
            classId: selectedStudent.classId,
            level: AppState.currentAcademicLevel,
            term: term,
            ...marks,
            enteredBy: AppState.currentUser.uid,
            enteredByInitials: teacherInitials,
            updatedAt: Firebase.db.serverTimestamp()
        };
        
        // Save to Firestore
        await Firebase.db.setDoc('marks', `${selectedStudent.id}_${term}`, marksData);
        
        hideLoading();
        showToast('Marks saved successfully!', 'success');
        
        // Update summary
        updateMarksSummary();
        
        // Clear form to get ready for next student
        clearMarksForm();
        
        // Focus search input for better UX
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) searchInput.focus();
        
    } catch (error) {
        hideLoading();
        console.error('Error saving marks:', error);
        showToast('Error saving marks', 'error');
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
    const select = document.getElementById('marksClass');
    if (select) {
        const option = select.querySelector(`option[value="${classId}"]`);
        if (option) return option.textContent;
    }
    return 'Unknown Class';
}

function getSelectedStudent() {
    return window.selectedStudent;
}

function getTeacherInitials(name) {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
}

function getLevelDisplayName(level) {
    const levels = {
        'lower-primary': 'Lower Primary (P1-P3)',
        'upper-primary': 'Upper Primary (P4-P7)',
        'olevel': 'O-Level (S1-S4)',
        'alevel': 'A-Level (S5-S6)'
    };
    return levels[level] || level;
}

function populateLevelFilter(currentLevel) {
    const select = document.getElementById('marksLevel');
    if (!select || !AppState.currentSchool) return;
    
    const isPrimary = AppState.currentSchool.level === 'primary';
    const options = isPrimary 
        ? [
            { value: 'lower-primary', label: 'Lower Primary (P1-P3)' },
            { value: 'upper-primary', label: 'Upper Primary (P4-P7)' }
        ]
        : [
            { value: 'olevel', label: 'O-Level (S1-S4)' },
            { value: 'alevel', label: 'A-Level (S5-S6)' }
        ];
        
    select.innerHTML = options.map(opt => 
        `<option value="${opt.value}" ${opt.value === currentLevel ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
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