// Reports Page Controller
import ReportService from '../../services/report.service.js';
import GradingUtils from '../../utils/grading.js';

// Local SchoolService helper to avoid import dependency issues
const SchoolService = {
    async getClassesByLevel(schoolId, level) {
        return await window.Firebase.db.query('classes', [
            { field: 'schoolId', op: '==', value: schoolId },
            { field: 'category', op: '==', value: level }
        ]);
    },
    async getSubjectsByLevel(schoolId, level) {
        return await window.Firebase.db.query('subjects', [
            { field: 'schoolId', op: '==', value: schoolId },
            { field: 'category', op: '==', value: level }
        ]);
    },
    async getStudentsByClass(classId) {
        return await window.Firebase.db.query('students', [
            { field: 'classId', op: '==', value: classId }
        ]);
    },
    async getStudent(studentId) {
        const doc = await window.Firebase.db.getDoc('students', studentId);
        return doc.exists() ? { id: doc.id, ...doc.data() } : null;
    }
};

// Premium Report Card Style
const PREMIUM_BORDER_STYLE = `
    border: 2px solid #000;
    background: white;
    position: relative;
    overflow: hidden;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
`;

class ReportsController {
    constructor() {
        console.log('ReportsController initialized');
        this.currentLevel = null;
        this.currentSchool = null;
        this.currentUser = null;
        this.currentReportData = null;
        this.gradeChart = null;
        
        this.initialize();
    }

    /**
     * Get the current Ugandan school term based on the month.
     * @returns {string} 'I', 'II', or 'III'
     */
    getUgandanTerm() {
        const month = new Date().getMonth() + 1; // getMonth() is 0-indexed
        if (month >= 2 && month <= 4) return 'I';      // Term I: Feb - Apr
        if (month >= 5 && month <= 8) return 'II';     // Term II: May - Aug
        return 'III';                                  // Term III: Sep - Dec (and Jan holidays)
    }
    
    async initialize() {
        // Wait for app state to be ready
        if (!window.appInitialized) {
            // Add timeout to prevent infinite loading
            await Promise.race([
                new Promise(resolve => {
                    document.addEventListener('app:initialized', resolve, { once: true });
                }),
                new Promise(resolve => setTimeout(() => {
                    console.warn('App initialization timed out in Reports');
                    resolve();
                }, 10000))
            ]);
        }
        
        this.currentUser = window.AppState.currentUser;
        this.currentSchool = window.AppState.currentSchool;
        
        if (!this.currentSchool) {
            window.navigateTo('dashboard');
            return;
        }
        
        // Apply role-based tab visibility
        this.applyRoleBasedReportVisibility();
        
        this.setupEventListeners();
        this.showLevelSelection();
        this.addBackToSchoolButton();
        this.hideLoading();
    }
    
    /**
     * Apply role-based visibility to report tabs
     */
    applyRoleBasedReportVisibility() {
        const isAdmin = this.currentSchool.admins && this.currentSchool.admins.includes(this.currentUser.uid);
        
        if (!isAdmin) {
            // Hide class and school report tabs for teachers
            const classTab = document.querySelector('[data-type="class"]');
            const schoolTab = document.querySelector('[data-type="school"]');
            
            if (classTab) classTab.style.display = 'none';
            if (schoolTab) schoolTab.style.display = 'none';
            
            // Set subject as default active tab for teachers
            const subjectTab = document.querySelector('[data-type="subject"]');
            if (subjectTab) {
                subjectTab.click();
            }
        }
    }
    
    addBackToSchoolButton() {
        const btnId = 'backToSchoolBtn';
        if (document.getElementById(btnId)) return;

        const btn = document.createElement('button');
        btn.id = btnId;
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to School';
        
        // Apply styles directly to ensure visibility
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9999',
            padding: '12px 24px',
            backgroundColor: '#1f2937',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'all 0.2s ease'
        });

        btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(0)');

        btn.addEventListener('click', () => {
            if (typeof window.navigateTo === 'function') {
                window.navigateTo('school');
            } else {
                window.location.href = '../school/school.html';
            }
        });

        document.body.appendChild(btn);
    }

    setupEventListeners() {
        // Report type tabs
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchReportType(e.target.dataset.type));
        });
        
        // Level selection
        document.getElementById('levelSelectBtn')?.addEventListener('click', () => this.showLevelSelection());
        
        // Generate report
        document.getElementById('generateReportBtn')?.addEventListener('click', () => this.generateReport());
        
        // Export buttons
        document.getElementById('exportPDFBtn')?.addEventListener('click', () => this.exportReport('pdf'));
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportReport('excel'));
        document.getElementById('printReportBtn')?.addEventListener('click', () => this.printReport());
        
        // Refresh preview
        document.getElementById('refreshPreviewBtn')?.addEventListener('click', () => this.refreshPreview());
        
        // Fullscreen preview
        document.getElementById('fullscreenPreviewBtn')?.addEventListener('click', () => this.toggleFullscreen());
        
        // Class selection for student report
        document.getElementById('reportClass')?.addEventListener('change', (e) => this.loadStudentsForClass(e.target.value));
        
        // Class selection for class report
        document.getElementById('classReportClass')?.addEventListener('change', (e) => this.prepareClassReport(e.target.value));
        
        // Subject selection
        document.getElementById('subjectReportSubject')?.addEventListener('change', (e) => this.prepareSubjectReport(e.target.value));
        
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
    }
    
    showLevelSelection() {
        const prompt = document.getElementById('levelSelectionPrompt');
        const interfaceEl = document.getElementById('reportsInterface');
        const optionsContainer = document.getElementById('levelOptionsPrompt');
        
        if (!this.currentSchool) {
            window.navigateTo('dashboard');
            return;
        }
        
        // Clear previous options
        optionsContainer.innerHTML = '';
        
        // Create level options based on school type
        const levels = this.getAvailableLevels();
        
        levels.forEach(level => {
            const option = document.createElement('div');
            option.className = 'level-option-card';
            option.dataset.level = level.id;
            
            option.innerHTML = `
                <i class="${level.icon}"></i>
                <h4>${level.name}</h4>
                <p>${level.description}</p>
            `;
            
            option.addEventListener('click', () => this.selectLevel(level.id));
            optionsContainer.appendChild(option);
        });
        
        // Show prompt and hide interface
        prompt.style.display = 'block';
        interfaceEl.style.display = 'none';
    }
    
    getAvailableLevels() {
        if (this.currentSchool.level === 'primary') {
            return [
                {
                    id: 'lower-primary',
                    name: 'Lower Primary',
                    icon: 'fas fa-child',
                    description: 'Generate P1-P3 reports'
                },
                {
                    id: 'upper-primary',
                    name: 'Upper Primary',
                    icon: 'fas fa-user-graduate',
                    description: 'Generate P4-P7 reports'
                }
            ];
        } else {
            return [
                {
                    id: 'olevel',
                    name: 'O-Level',
                    icon: 'fas fa-certificate',
                    description: 'Generate S1-S4 reports'
                },
                {
                    id: 'alevel',
                    name: 'A-Level',
                    icon: 'fas fa-university',
                    description: 'Generate S5-S6 reports'
                }
            ];
        }
    }
    
    async selectLevel(level) {
        this.currentLevel = level;
        
        // Update UI
        document.getElementById('levelSelectionPrompt').style.display = 'none';
        document.getElementById('reportsInterface').style.display = 'block';
        
        const levelName = this.getAvailableLevels().find(l => l.id === level)?.name || level;
        document.getElementById('currentLevelBadge').textContent = levelName;
        
        // Load data for selected level
        await this.loadLevelData();
    }
    
    async loadLevelData() {
        try {
            this.showLoading('Loading level data...');
            
            // Load classes for this level
            await this.loadClasses();
            
            // Load subjects for this level
            await this.loadSubjects();
            
            // Update class selectors
            this.updateClassSelectors();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading level data:', error);
            this.hideLoading();
            this.showError('Failed to load level data');
        }
    }
    
    async loadClasses() {
        try {
            const classes = await SchoolService.getClassesByLevel(this.currentSchool.id, this.currentLevel);
            this.classes = classes;
            
            // Update class selectors
            this.updateClassSelectors();
            
        } catch (error) {
            console.error('Error loading classes:', error);
            this.showError('Failed to load classes');
        }
    }
    
    async loadSubjects() {
        try {
            let subjects = await SchoolService.getSubjectsByLevel(this.currentSchool.id, this.currentLevel);
            
            // Filter subjects for teachers (only show their assigned subjects)
            const isAdmin = this.currentSchool.admins && this.currentSchool.admins.includes(this.currentUser.uid);
            if (!isAdmin) {
                // Get current user's assigned subjects from AppState
                const assignedSubjectIds = AppState.currentUserData?.assignedSubjects || [];
                subjects = subjects.filter(subject => assignedSubjectIds.includes(subject.id));
                
                if (subjects.length === 0) {
                    console.warn('No subjects assigned to this teacher for the selected level');
                }
            }
            
            this.subjects = subjects;
            
            // Update subject selectors
            this.updateSubjectSelectors();
            
        } catch (error) {
            console.error('Error loading subjects:', error);
            this.showError('Failed to load subjects');
        }
    }
    
    updateClassSelectors() {
        const classSelectors = [
            'reportClass',
            'classReportClass',
            'subjectReportClass'
        ];
        
        classSelectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select Class</option>';
                
                this.classes?.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    select.appendChild(option);
                });
                
                // Restore selection if possible
                if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }
    
    updateSubjectSelectors() {
        const subjectSelect = document.getElementById('subjectReportSubject');
        if (!subjectSelect) return;
        
        const currentValue = subjectSelect.value;
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        
        this.subjects?.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });
        
        // Restore selection if possible
        if (currentValue && Array.from(subjectSelect.options).some(opt => opt.value === currentValue)) {
            subjectSelect.value = currentValue;
        }
    }
    
    async loadStudentsForClass(classId) {
        const studentSelect = document.getElementById('reportStudent');
        if (!studentSelect) return;
        
        if (!classId) {
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            studentSelect.disabled = true;
            return;
        }
        
        try {
            const students = await SchoolService.getStudentsByClass(classId);
            
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            
            // Add All Students option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Students (Bulk Export)';
            studentSelect.appendChild(allOption);

            students.sort((a,b) => a.name.localeCompare(b.name)).forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                studentSelect.appendChild(option);
            });
            
            studentSelect.disabled = false;
            
        } catch (error) {
            console.error('Error loading students:', error);
            studentSelect.innerHTML = '<option value="">Error loading students</option>';
        }
    }
    
    switchReportType(type) {
        // Update active tab
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        // Show/hide filter sections
        const filterTypes = ['student', 'class', 'subject', 'school'];
        filterTypes.forEach(filterType => {
            const section = document.getElementById(`${filterType}Filters`);
            if (section) {
                section.style.display = filterType === type ? 'block' : 'none';
            }
        });
        
        // Update UI state
        this.clearPreview();
        
        // Enable/disable export buttons
        const exportButtons = document.querySelectorAll('.export-buttons button');
        exportButtons.forEach(btn => {
            btn.disabled = true;
        });
    }
    
    async generateReport() {
        const activeTab = document.querySelector('.report-tab.active');
        if (!activeTab) return;
        
        const reportType = activeTab.dataset.type;
        
        try {
            this.showLoading(`Generating ${reportType} report...`);
            
            let reportData;
            
            switch (reportType) {
                case 'student':
                    reportData = await this.generateStudentReport();
                    break;
                case 'class':
                    reportData = await this.generateClassReport();
                    break;
                case 'subject':
                    reportData = await this.generateSubjectReport();
                    break;
                case 'school':
                    reportData = await this.generateSchoolReport();
                    break;
            }
            
            if (reportData) {
                await this.displayReportPreview(reportData);
                await this.updateStatistics(reportData);
                
                // Enable export buttons
                document.getElementById('exportPDFBtn').disabled = false;
                document.getElementById('exportExcelBtn').disabled = false;
                document.getElementById('printReportBtn').disabled = false;
                
                // Store report data for export
                this.currentReportData = reportData;
                
                this.showSuccess('Report generated successfully');
            }
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showError(`Failed to generate report: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    async generateStudentReport() {
        const classId = document.getElementById('reportClass').value;
        const studentId = document.getElementById('reportStudent').value;
        const term = document.getElementById('reportTerm').value;
        
        if (!classId || !studentId || !term) {
            this.showError('Please select class, student, and term');
            return null;
        }
        
        try {
            if (studentId === 'all') {
                return await this.generateBulkStudentReports(classId, term);
            }

            const student = await SchoolService.getStudent(studentId);
            const classData = this.classes.find(c => c.id === classId);
            
            // Get marks
            const marks = await ReportService.getStudentMarks(studentId, term);
            
            // Process marks based on level
            const processedMarks = this.processMarks(marks);
            
            // Calculate summary
            const summary = this.calculateStudentSummary(processedMarks);
            
            return {
                type: 'student',
                level: this.currentLevel,
                student: {
                    ...student,
                    className: classData?.name || 'N/A'
                },
                class: classData,
                term: this.getTermDisplayName(term),
                termType: term,
                marks: processedMarks,
                summary: summary,
                generatedAt: new Date().toISOString(),
                school: this.currentSchool
            };
            
        } catch (error) {
            console.error('Error generating student report:', error);
            throw error;
        }
    }
    
    async generateBulkStudentReports(classId, term) {
        const classData = this.classes.find(c => c.id === classId);
        const students = await SchoolService.getStudentsByClass(classId);
        
        if (students.length === 0) {
            this.showError('No students found in this class');
            return null;
        }
        
        const reports = [];
        
        for (const student of students) {
            const marks = await ReportService.getStudentMarks(student.id, term);
            // Process marks even if empty to generate report card
            const processedMarks = this.processMarks(marks || {});
            const summary = this.calculateStudentSummary(processedMarks);
            
            reports.push({
                student: {
                    ...student,
                    className: classData?.name || 'N/A'
                },
                marks: processedMarks,
                summary: summary
            });
        }
        
        // Sort by name
        reports.sort((a, b) => a.student.name.localeCompare(b.student.name));
        
        return {
            type: 'bulk-student',
            level: this.currentLevel,
            class: classData,
            term: this.getTermDisplayName(term),
            termType: term,
            reports: reports,
            generatedAt: new Date().toISOString(),
            school: this.currentSchool
        };
    }

    async generateClassReport() {
        const classId = document.getElementById('classReportClass').value;
        const term = document.getElementById('classReportTerm').value;
        
        if (!classId || !term) {
            this.showError('Please select class and term');
            return null;
        }
        
        try {
            const classData = this.classes.find(c => c.id === classId);
            const students = await SchoolService.getStudentsByClass(classId);
            
            const studentReports = [];
            let classTotal = 0;
            let studentCount = 0;
            
            for (const student of students) {
                const marks = await ReportService.getStudentMarks(student.id, term);
                if (marks) {
                    const processedMarks = this.processMarks(marks);
                    const summary = this.calculateStudentSummary(processedMarks);
                    
                    studentReports.push({
                        student: student,
                        marks: processedMarks,
                        summary: summary
                    });
                    
                    if (summary.average > 0) {
                        classTotal += summary.average;
                        studentCount++;
                    }
                }
            }
            
            // Calculate class statistics
            const classAverage = studentCount > 0 ? classTotal / studentCount : 0;
            
            // Sort by performance
            studentReports.sort((a, b) => b.summary.average - a.summary.average);
            
            return {
                type: 'class',
                level: this.currentLevel,
                class: classData,
                term: this.getTermDisplayName(term),
                studentReports: studentReports,
                statistics: {
                    totalStudents: students.length,
                    studentsWithMarks: studentReports.length,
                    classAverage: Math.round(classAverage),
                    topPerformer: studentReports[0] || null,
                    lowestPerformer: studentReports[studentReports.length - 1] || null
                },
                generatedAt: new Date().toISOString(),
                school: this.currentSchool
            };
            
        } catch (error) {
            console.error('Error generating class report:', error);
            throw error;
        }
    }
    
    async generateSubjectReport() {
        const classId = document.getElementById('subjectReportClass').value;
        const subjectId = document.getElementById('subjectReportSubject').value;
        const term = document.getElementById('subjectReportTerm').value;
        
        if (!classId || !subjectId || !term) {
            this.showError('Please select class, subject, and term');
            return null;
        }
        
        try {
            const classData = this.classes.find(c => c.id === classId);
            const subject = this.subjects.find(s => s.id === subjectId);
            const students = await SchoolService.getStudentsByClass(classId);
            
            const subjectMarks = [];
            let totalMarks = 0;
            let markCount = 0;
            
            for (const student of students) {
                const marks = await ReportService.getStudentMarks(student.id, term);
                if (marks && marks[subjectId] !== undefined) {
                    const mark = marks[subjectId];
                    let score = 0;
                    
                    if (typeof mark === 'object' && mark.paper1 !== undefined) {
                        // A-Level paper scores
                        const papers = Object.values(mark).filter(v => typeof v === 'number');
                        score = papers.length > 0 ? papers.reduce((a, b) => a + b) / papers.length : 0;
                    } else if (typeof mark === 'number') {
                        score = mark;
                    }
                    
                    if (score > 0) {
                        subjectMarks.push({
                            student: student,
                            score: Math.round(score),
                            grade: GradingUtils.calculateGrade(score, this.currentLevel),
                            papers: typeof mark === 'object' ? mark : null
                        });
                        
                        totalMarks += score;
                        markCount++;
                    }
                }
            }
            
            // Calculate subject statistics
            const averageScore = markCount > 0 ? totalMarks / markCount : 0;
            const passCount = subjectMarks.filter(m => m.score >= 40).length;
            const passRate = markCount > 0 ? (passCount / markCount) * 100 : 0;
            
            // Sort by score
            subjectMarks.sort((a, b) => b.score - a.score);
            
            // Grade distribution
            const gradeDistribution = {};
            subjectMarks.forEach(mark => {
                const grade = mark.grade;
                gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
            });
            
            return {
                type: 'subject',
                level: this.currentLevel,
                class: classData,
                subject: subject,
                term: this.getTermDisplayName(term),
                marks: subjectMarks,
                statistics: {
                    totalStudents: students.length,
                    studentsWithMarks: subjectMarks.length,
                    averageScore: Math.round(averageScore),
                    highestScore: subjectMarks[0]?.score || 0,
                    lowestScore: subjectMarks[subjectMarks.length - 1]?.score || 0,
                    passRate: Math.round(passRate),
                    gradeDistribution: gradeDistribution
                },
                generatedAt: new Date().toISOString(),
                school: this.currentSchool
            };
            
        } catch (error) {
            console.error('Error generating subject report:', error);
            throw error;
        }
    }
    
    async generateSchoolReport() {
        const term = document.getElementById('schoolReportTerm').value;
        
        try {
            const classReports = [];
            let schoolTotal = 0;
            let classCount = 0;
            
            for (const classData of this.classes) {
                const classReport = await this.generateClassSummary(classData.id, term);
                if (classReport) {
                    classReports.push(classReport);
                    if (classReport.average > 0) {
                        schoolTotal += classReport.average;
                        classCount++;
                    }
                }
            }
            
            // Calculate school statistics
            const schoolAverage = classCount > 0 ? schoolTotal / classCount : 0;
            
            // Sort by performance
            classReports.sort((a, b) => b.average - a.average);
            
            return {
                type: 'school',
                level: this.currentLevel,
                term: this.getTermDisplayName(term),
                classReports: classReports,
                statistics: {
                    totalClasses: this.classes.length,
                    classesWithData: classReports.length,
                    schoolAverage: Math.round(schoolAverage),
                    bestPerformingClass: classReports[0] || null,
                    lowestPerformingClass: classReports[classReports.length - 1] || null
                },
                generatedAt: new Date().toISOString(),
                school: this.currentSchool
            };
            
        } catch (error) {
            console.error('Error generating school report:', error);
            throw error;
        }
    }
    
    async generateClassSummary(classId, term) {
        try {
            const students = await SchoolService.getStudentsByClass(classId);
            
            if (students.length === 0) return null;
            
            let totalMarks = 0;
            let studentCount = 0;
            
            for (const student of students) {
                const marks = await ReportService.getStudentMarks(student.id, term);
                if (marks) {
                    const markValues = Object.values(marks).filter(v => typeof v === 'number');
                    if (markValues.length > 0) {
                        const studentAverage = markValues.reduce((a, b) => a + b) / markValues.length;
                        totalMarks += studentAverage;
                        studentCount++;
                    }
                }
            }
            
            const classData = this.classes.find(c => c.id === classId);
            
            return {
                classId: classId,
                className: classData?.name || 'Unknown',
                totalStudents: students.length,
                studentsWithMarks: studentCount,
                average: studentCount > 0 ? Math.round(totalMarks / studentCount) : 0
            };
            
        } catch (error) {
            console.error('Error generating class summary:', error);
            return null;
        }
    }
    
    processMarks(marksData) {
        const processedMarks = [];
        
        this.subjects?.forEach(subject => {
            const mark = marksData[subject.id];
            if (mark !== undefined) {
                let score = 0;
                let papers = null;
                
                if (typeof mark === 'object' && mark.paper1 !== undefined) {
                    // A-Level paper scores
                    const paperScores = Object.values(mark).filter(v => typeof v === 'number');
                    score = paperScores.length > 0 ? paperScores.reduce((a, b) => a + b) / paperScores.length : 0;
                    papers = mark;
                } else if (typeof mark === 'number') {
                    score = mark;
                }
                
                if (score > 0) {
                    const grade = GradingUtils.calculateGrade(score, this.currentLevel);
                    const gradePoints = GradingUtils.getGradePoints(grade, this.currentLevel);
                    
                    processedMarks.push({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        score: Math.round(score),
                        grade: grade,
                        gradePoints: gradePoints,
                        papers: papers,
                        type: subject.type || 'regular'
                    });
                }
            }
        });
        
        return processedMarks;
    }
    
    calculateStudentSummary(marks) {
        if (marks.length === 0) {
            return {
                totalSubjects: 0,
                totalMarks: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                aggregate: 0,
                division: 'N/A'
            };
        }
        
        const totalMarks = marks.reduce((sum, mark) => sum + mark.score, 0);
        const average = Math.round(totalMarks / marks.length);
        const highest = Math.max(...marks.map(m => m.score));
        const lowest = Math.min(...marks.map(m => m.score));
        
        let aggregate = 0;
        
        if (this.currentLevel === 'alevel') {
            // A-Level aggregate calculation
            const principalSubjects = marks.filter(m => m.type === 'principal');
            const generalPaper = marks.find(m => m.type === 'general');
            const subsidiary = marks.find(m => m.type === 'subsidiary');
            
            // Take best 3 principals
            const sortedPrincipals = principalSubjects.sort((a, b) => b.gradePoints - a.gradePoints);
            const bestPrincipals = sortedPrincipals.slice(0, 3);
            
            aggregate = bestPrincipals.reduce((sum, subj) => sum + subj.gradePoints, 0);
            
            // Add General Paper
            if (generalPaper && generalPaper.score >= 50) {
                aggregate += 1;
            }
            
            // Add Subsidiary
            if (subsidiary && subsidiary.score >= 50) {
                aggregate += 1;
            }
        } else {
            // O-Level and Primary aggregate
            aggregate = marks.reduce((sum, mark) => sum + mark.gradePoints, 0);
        }
        
        let division;
        if (this.currentLevel === 'upper-primary') {
            if (aggregate <= 12) division = 'Division 1';
            else if (aggregate <= 23) division = 'Division 2';
            else if (aggregate <= 29) division = 'Division 3';
            else if (aggregate <= 34) division = 'Division 4';
            else division = 'Ungraded';
        } else {
            division = GradingUtils.calculateDivision(average, aggregate, this.currentLevel);
        }
        
        return {
            totalSubjects: marks.length,
            totalMarks: totalMarks,
            average: average,
            highest: highest,
            lowest: lowest,
            aggregate: aggregate,
            division: division
        };
    }
    
    async displayReportPreview(reportData) {
        const preview = document.getElementById('reportPreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        switch (reportData.type) {
            case 'student':
                preview.innerHTML = this.generateStudentReportHTML(reportData);
                break;
            case 'bulk-student':
                preview.innerHTML = this.generateBulkStudentReportHTML(reportData);
                break;
            case 'class':
                preview.innerHTML = this.generateClassReportHTML(reportData);
                break;
            case 'subject':
                preview.innerHTML = this.generateSubjectReportHTML(reportData);
                break;
            case 'school':
                preview.innerHTML = this.generateSchoolReportHTML(reportData);
                break;
        }
        
        // Show statistics
        document.getElementById('statisticsSummary').style.display = 'block';
    }
    
    generateStudentReportHTML(reportData) {
        if (this.currentLevel === 'alevel') {
            return this.generateALevelReportHTML(reportData);
        } else if (this.currentLevel.includes('primary')) {
            return this.generatePrimaryReportHTML(reportData);
        } else {
            return this.generateOLevelReportHTML(reportData);
        }
    }
    
    generateBulkStudentReportHTML(reportData) {
        return reportData.reports.map(report => {
            const singleReportData = {
                type: 'student',
                level: reportData.level,
                student: report.student,
                class: reportData.class,
                term: reportData.term,
                termType: reportData.termType,
                marks: report.marks,
                summary: report.summary,
                generatedAt: reportData.generatedAt,
                school: reportData.school
            };
            
            return `<div style="page-break-after: always; margin-bottom: 50px; border-bottom: 4px dashed #ccc; padding-bottom: 40px;">${this.generateStudentReportHTML(singleReportData)}</div>`;
        }).join('');
    }

    generateALevelReportHTML(reportData) {
        const { student, marks, summary, school, term, termType } = reportData;
        
        // Get A-Level combination
        const principalSubjects = marks.filter(m => m.type === 'principal');
        const combination = principalSubjects.map(m => m.subjectName.charAt(0)).join('');
        
        return `
            <div class="report-card alevel-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm; 
                        max-height: 297mm;
                        padding: 15mm 20mm; 
                        box-sizing: border-box; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', 'Georgia', serif; 
                        color: #111;
                        line-height: 1.4;">
                ${school.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 350px; 
                                height: 350px; 
                                background-image: url('${school.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.03; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                
                <!-- Premium Header -->
                <div style="display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            margin-bottom: 25px; 
                            padding-bottom: 20px; 
                            border-bottom: 2px solid #1a73e8;">
                    <!-- School Logo -->
                    ${school.logoUrl 
                        ? `<img src="${school.logoUrl}" 
                                alt="${school.name}" 
                                style="height: 100px; width: 100px; object-fit: contain;">` 
                        : `<img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" 
                                style="height: 100px; width: 100px; opacity: 0.7; object-fit: contain;">`}
                    
                    <!-- School Info -->
                    <div style="text-align: center; flex: 1; padding: 0 20px;">
                        <h1 style="margin:0 0 10px 0; 
                                   color:#1a1a1a; 
                                   font-size: 24px; 
                                   font-weight: 700; 
                                   letter-spacing: -0.5px; 
                                   line-height: 1.1;">
                            ${school.name}
                        </h1>
                        <p style="margin:0; 
                                  color:#555; 
                                  font-size: 12px; 
                                  text-transform: uppercase; 
                                  letter-spacing: 2px; 
                                  font-weight: 600;">
                            TERM ${this.getUgandanTerm()} STUDENT ASSESSMENT PROGRESS REPORT
                        </p>
                    </div>
                    
                    <!-- Spacer for balance -->
                    <div style="width: 100px;"></div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="margin-bottom: 30px;">
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    color: #6b7280; 
                                    letter-spacing: 1px; 
                                    margin-bottom: 5px; 
                                    font-weight: 600;">
                            Student Name
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700; 
                                    color: #111827; 
                                    padding-bottom: 8px; 
                                    border-bottom: 1px solid #e5e7eb;">
                            ${student.name}
                        </div>
                    </div>
                    <div style="display: flex; gap: 40px; padding-top: 15px;">
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Class
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${student.className}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Combination
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${combination}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Term
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${term}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table" 
                       style="width: 100%; 
                              border-collapse: collapse; 
                              margin-bottom: 30px; 
                              border: 1px solid #e5e7eb; 
                              border-radius: 6px; 
                              overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="text-align: left; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 40%;">
                                Subject
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 15%;">
                                Grade
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 15%;">
                                Points
                            </th>
                            <th style="text-align: left; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 30%;">
                                Remarks
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map((mark, index) => `
                            <tr>
                                <td style="padding: 10px 15px; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-size: 11px; 
                                            font-weight: 500;">
                                    ${mark.subjectName}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-weight: 600; 
                                            font-size: 11px;">
                                    ${mark.grade}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-size: 11px;">
                                    ${mark.gradePoints}
                                </td>
                                <td style="padding: 10px 15px; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #6b7280; 
                                            font-size: 10px;">
                                    ${GradingUtils.getGradeRemark(mark.grade)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Summary Section -->
                <div class="summary-section" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 8px; 
                            padding: 20px; 
                            margin-bottom: 30px; 
                            display: grid; 
                            grid-template-columns: repeat(3, 1fr); 
                            gap: 20px; 
                            color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Average Grade
                        </div>
                        <div style="font-size: 20px; 
                                    font-weight: 800;">
                            ${GradingUtils.calculateGrade(summary.average, 'alevel')}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Total Points
                        </div>
                        <div style="font-size: 20px; 
                                    font-weight: 800;">
                            ${summary.aggregate}
                        </div>
                    </div>
                    <div style="text-align: center; 
                                border-left: 1px solid rgba(255,255,255,0.3); 
                                padding-left: 20px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Aggregate
                        </div>
                        <div style="font-size: 22px; 
                                    font-weight: 900;">
                            ${summary.aggregate}
                        </div>
                    </div>
                </div>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-bottom: 30px;">
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
                
                ${termType === 'end' ? `
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
    }
    
    generatePrimaryReportHTML(reportData) {
        const { student, marks, summary, school, term, termType } = reportData;
        const isLowerPrimary = this.currentLevel === 'lower-primary';
        
        return `
            <div class="report-card primary-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm; 
                        max-height: 297mm;
                        padding: 15mm 20mm; 
                        box-sizing: border-box; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', 'Georgia', serif; 
                        color: #111;
                        line-height: 1.4;">
                ${school.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 350px; 
                                height: 350px; 
                                background-image: url('${school.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.03; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                
                <!-- Premium Header -->
                <div style="display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            margin-bottom: 25px; 
                            padding-bottom: 20px; 
                            border-bottom: 2px solid #1a73e8;">
                    <!-- School Logo -->
                    ${school.logoUrl 
                        ? `<img src="${school.logoUrl}" 
                                alt="${school.name}" 
                                style="height: 100px; width: 100px; object-fit: contain;">` 
                        : `<img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" 
                                style="height: 100px; width: 100px; opacity: 0.7; object-fit: contain;">`}
                    
                    <!-- School Info -->
                    <div style="text-align: center; flex: 1; padding: 0 20px;">
                        <h1 style="margin:0 0 10px 0; 
                                   color:#1a1a1a; 
                                   font-size: 24px; 
                                   font-weight: 700; 
                                   letter-spacing: -0.5px; 
                                   line-height: 1.1;">
                            ${school.name}
                        </h1>
                        <p style="margin:0; 
                                  color:#555; 
                                  font-size: 12px; 
                                  text-transform: uppercase; 
                                  letter-spacing: 2px; 
                                  font-weight: 600;">
                            TERM ${this.getUgandanTerm()} STUDENT ASSESSMENT PROGRESS REPORT
                        </p>
                    </div>
                    
                    <!-- Spacer for balance -->
                    <div style="width: 100px;"></div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="margin-bottom: 30px;">
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    color: #6b7280; 
                                    letter-spacing: 1px; 
                                    margin-bottom: 5px; 
                                    font-weight: 600;">
                            Student Name
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700; 
                                    color: #111827; 
                                    padding-bottom: 8px; 
                                    border-bottom: 1px solid #e5e7eb;">
                            ${student.name}
                        </div>
                    </div>
                    <div style="display: flex; gap: 40px; padding-top: 15px;">
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Class
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${student.className}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Term
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${term}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Date
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table" 
                       style="width: 100%; 
                              border-collapse: collapse; 
                              margin-bottom: 30px; 
                              border: 1px solid #e5e7eb; 
                              border-radius: 6px; 
                              overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="text-align: left; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 40%;">
                                Subject
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 20%;">
                                Score
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 40%;">
                                ${isLowerPrimary ? 'Remarks' : 'Grade'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map((mark, index) => `
                            <tr>
                                <td style="padding: 10px 15px; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-size: 11px; 
                                            font-weight: 500;">
                                    ${mark.subjectName}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-weight: 500; 
                                            font-size: 12px;">
                                    ${mark.score}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-size: 12px; 
                                            white-space: nowrap;">
                                    ${isLowerPrimary ? GradingUtils.getPrimaryRemark(mark.score) : mark.grade}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Summary (Boxed) -->
                <div class="summary-section" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 8px; 
                            padding: 20px; 
                            margin-bottom: 30px; 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 20px; 
                            color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Total Marks
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${summary.totalMarks}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Average
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${summary.average}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            ${isLowerPrimary ? 'Conduct' : 'Aggregates'}
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${isLowerPrimary ? 'Good' : summary.aggregate}
                        </div>
                    </div>
                    <div style="text-align: center; 
                                border-left: 1px solid rgba(255,255,255,0.3); 
                                padding-left: 20px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            ${isLowerPrimary ? 'Overall' : 'Division'}
                        </div>
                        <div style="font-size: 20px; 
                                    font-weight: 800;">
                            ${isLowerPrimary ? GradingUtils.getPrimaryRemark(summary.average) : summary.division}
                        </div>
                    </div>
                </div>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-bottom: 30px;">
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
                
                ${termType === 'end' ? `
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
                            <strong>Next Term Begins On:</strong> ________________________
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
    }
    
    generateOLevelReportHTML(reportData) {
        const { student, marks, summary, school, term, termType } = reportData;
        
        return `
            <div class="report-card olevel-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm; 
                        max-height: 297mm;
                        padding: 15mm 20mm; 
                        box-sizing: border-box; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', 'Georgia', serif; 
                        color: #111;
                        line-height: 1.4;">
                ${school.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 350px; 
                                height: 350px; 
                                background-image: url('${school.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.03; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                
                <!-- Premium Header -->
                <div style="display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            margin-bottom: 25px; 
                            padding-bottom: 20px; 
                            border-bottom: 2px solid #1a73e8;">
                    <!-- School Logo -->
                    ${school.logoUrl 
                        ? `<img src="${school.logoUrl}" 
                                alt="${school.name}" 
                                style="height: 100px; width: 100px; object-fit: contain;">` 
                        : `<img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" 
                                style="height: 100px; width: 100px; opacity: 0.7; object-fit: contain;">`}
                    
                    <!-- School Info -->
                    <div style="text-align: center; flex: 1; padding: 0 20px;">
                        <h1 style="margin:0 0 10px 0; 
                                   color:#1a1a1a; 
                                   font-size: 24px; 
                                   font-weight: 700; 
                                   letter-spacing: -0.5px; 
                                   line-height: 1.1;">
                            ${school.name}
                        </h1>
                        <p style="margin:0; 
                                  color:#555; 
                                  font-size: 12px; 
                                  text-transform: uppercase; 
                                  letter-spacing: 2px; 
                                  font-weight: 600;">
                            TERM ${this.getUgandanTerm()} STUDENT ASSESSMENT PROGRESS REPORT
                        </p>
                    </div>
                    
                    <!-- Spacer for balance -->
                    <div style="width: 100px;"></div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="margin-bottom: 30px;">
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    color: #6b7280; 
                                    letter-spacing: 1px; 
                                    margin-bottom: 5px; 
                                    font-weight: 600;">
                            Student Name
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700; 
                                    color: #111827; 
                                    padding-bottom: 8px; 
                                    border-bottom: 1px solid #e5e7eb;">
                            ${student.name}
                        </div>
                    </div>
                    <div style="display: flex; gap: 40px; padding-top: 15px;">
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Class
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${student.className}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Term
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${term}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Date
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table" 
                       style="width: 100%; 
                              border-collapse: collapse; 
                              margin-bottom: 30px; 
                              border: 1px solid #e5e7eb; 
                              border-radius: 6px; 
                              overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="text-align: left; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 40%;">
                                Subject
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 15%;">
                                Score
                            </th>
                            <th style="text-align: center; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 15%;">
                                Grade
                            </th>
                            <th style="text-align: left; 
                                        padding: 12px 15px; 
                                        border-bottom: 2px solid #d1d5db; 
                                        color: #4b5563; 
                                        font-size: 10px; 
                                        text-transform: uppercase; 
                                        font-weight: 700; 
                                        width: 30%;">
                                Remarks
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map((mark, index) => `
                            <tr>
                                <td style="padding: 10px 15px; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-size: 11px; 
                                            font-weight: 500;">
                                    ${mark.subjectName}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-weight: 500; 
                                            font-size: 12px;">
                                    ${mark.score}
                                </td>
                                <td style="padding: 10px 15px; 
                                            text-align: center; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #1f2937; 
                                            font-weight: 600; 
                                            font-size: 12px;">
                                    ${mark.grade}
                                </td>
                                <td style="padding: 10px 15px; 
                                            border-bottom: 1px solid #f3f4f6; 
                                            color: #6b7280; 
                                            font-size: 10px;">
                                    ${GradingUtils.getGradeRemark(mark.grade)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Summary (Boxed) -->
                <div class="summary-section" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 8px; 
                            padding: 20px; 
                            margin-bottom: 30px; 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 20px; 
                            color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Average Score
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${summary.average}%
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Average Grade
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${GradingUtils.calculateGrade(summary.average, 'olevel')}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Aggregate
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 700;">
                            ${summary.aggregate}
                        </div>
                    </div>
                    <div style="text-align: center; 
                                border-left: 1px solid rgba(255,255,255,0.3); 
                                padding-left: 20px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Division
                        </div>
                        <div style="font-size: 20px; 
                                    font-weight: 800;">
                            ${summary.division}
                        </div>
                    </div>
                </div>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-bottom: 30px;">
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
                
                ${termType === 'end' ? `
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
                        <strong>Next Term Begins On:</strong> ________________________
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
    }
    
    generateClassReportHTML(reportData) {
        const { class: classData, studentReports, statistics, term } = reportData;
        
        return `
            <div class="report-card" 
                 style="padding:40px; 
                        max-width: 210mm; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;">
                ${this.currentSchool.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 500px; 
                                height: 500px; 
                                background-image: url('${this.currentSchool.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.04; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                <!-- Class Header -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 1px solid #333;">
                    ${this.currentSchool.logoUrl ? `<img src="${this.currentSchool.logoUrl}" alt="${this.currentSchool.name}" style="height: 70px; width: auto; object-fit: contain;">` : ''}
                    <div style="text-align: center;">
                        <h1 style="margin:0 0 8px 0; color:#1a1a1a; font-family: 'Times New Roman', serif; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1;">${this.currentSchool.name}</h1>
                        <p style="margin:0; color:#555; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Class Performance Report - ${classData.name}</p>
                    </div>
                </div>
                
                <!-- Class Information -->
                <div class="class-info" style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 40px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Class</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${classData.name}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Term</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${term}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Total Students</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${statistics.totalStudents}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">With Marks</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${statistics.studentsWithMarks}</div>
                    </div>
                </div>
                
                <!-- Performance Statistics -->
                <div class="performance-stats" style="margin-bottom: 40px;">
                    <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Performance Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Class Average</div>
                            <div style="font-size: 24px; font-weight: 700; color: #111827;">${statistics.classAverage}%</div>
                        </div>
                        
                        ${statistics.topPerformer ? `
                            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Top Performer</div>
                                <div style="font-size: 16px; font-weight: 600; color: #111827;">${statistics.topPerformer.student.name}</div>
                                <div style="font-size: 14px; color: #059669; font-weight: 600;">${statistics.topPerformer.summary.average}%</div>
                            </div>
                        ` : ''}
                        
                        ${statistics.lowestPerformer ? `
                            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Lowest Performer</div>
                                <div style="font-size: 16px; font-weight: 600; color: #111827;">${statistics.lowestPerformer.student.name}</div>
                                <div style="font-size: 14px; color: #dc2626; font-weight: 600;">${statistics.lowestPerformer.summary.average}%</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Student Performance Table -->
                <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Student Performance</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Rank</th>
                            <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Student Name</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Average</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Grade</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Division</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentReports.map((report, index) => `
                            <tr>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 12px;">${index + 1}</td>
                                <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500; font-size: 12px;">${report.student.name}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.summary.average}%</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${GradingUtils.calculateGrade(report.summary.average, this.currentLevel)}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.summary.division}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Footer -->
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                    <img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" style="display: block; margin: 0 auto 5px; height: 25px; width: auto; opacity: 0.7;">
                    <div style="font-size: 10px; color: #9ca3af; letter-spacing: 0.5px;">POWERED BY SKORE POINT</div>
                    <div style="font-size: 9px; color: #d1d5db; margin-top: 2px;">A SERUSOFT PRODUCT</div>
                    <div style="font-size: 11px; color: #4361ee; font-weight: 600; margin-top: 4px;">skorepoint.com</div>
                </div>
                </div>
            </div>
        `;
    }
    
    generateSubjectReportHTML(reportData) {
        const { subject, marks, statistics, class: classData, term } = reportData;
        
        return `
            <div class="report-card" 
                 style="padding:40px; 
                        max-width: 210mm; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;">
                ${this.currentSchool.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 500px; 
                                height: 500px; 
                                background-image: url('${this.currentSchool.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.04; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                <!-- Subject Header -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 1px solid #333;">
                    ${this.currentSchool.logoUrl ? `<img src="${this.currentSchool.logoUrl}" alt="${this.currentSchool.name}" style="height: 70px; width: auto; object-fit: contain;">` : ''}
                    <div style="text-align: center;">
                        <h1 style="margin:0 0 8px 0; color:#1a1a1a; font-family: 'Times New Roman', serif; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1;">${this.currentSchool.name}</h1>
                        <p style="margin:0; color:#555; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Subject Analysis - ${subject.name}</p>
                    </div>
                </div>
                
                <!-- Subject Information -->
                <div class="subject-info" style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 40px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Subject</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${subject.name}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Class</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${classData?.name || 'All Classes'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Term</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${term}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Total Students</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${statistics.totalStudents}</div>
                    </div>
                </div>
                
                <!-- Performance Statistics -->
                <div class="performance-stats" style="margin-bottom: 40px;">
                    <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Subject Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Average Score</div>
                            <div style="font-size: 24px; font-weight: 700; color: #111827;">${statistics.averageScore}%</div>
                        </div>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Highest Score</div>
                            <div style="font-size: 24px; font-weight: 700; color: #059669;">${statistics.highestScore}%</div>
                        </div>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Lowest Score</div>
                            <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${statistics.lowestScore}%</div>
                        </div>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Pass Rate</div>
                            <div style="font-size: 24px; font-weight: 700; color: ${statistics.passRate >= 70 ? '#059669' : statistics.passRate >= 50 ? '#d97706' : '#dc2626'};">${statistics.passRate}%</div>
                        </div>
                    </div>
                </div>
                
                <!-- Grade Distribution -->
                <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Grade Distribution</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr>
                            <th style="text-align: center; padding: 12px 0; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 600;">Grade</th>
                            <th style="text-align: center; padding: 12px 0; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 600;">Count</th>
                            <th style="text-align: center; padding: 12px 0; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 600;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(statistics.gradeDistribution).map(([grade, count], index) => {
                            const percentage = statistics.studentsWithMarks > 0 ? Math.round((count / statistics.studentsWithMarks) * 100) : 0;
                            return `
                                <tr>
                                    <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 600;">${grade}</td>
                                    <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937;">${count}</td>
                                    <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937;">${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <!-- Top Performers -->
                <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Top Performers</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Rank</th>
                            <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Student Name</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Score</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.slice(0, 10).map((mark, index) => `
                            <tr>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 12px;">${index + 1}</td>
                                <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500; font-size: 12px;">${mark.student.name}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${mark.score}%</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 600; font-size: 12px;">${mark.grade}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Footer -->
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                    <img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" style="display: block; margin: 0 auto 5px; height: 25px; width: auto; opacity: 0.7;">
                    <div style="font-size: 10px; color: #9ca3af; letter-spacing: 0.5px;">POWERED BY SKORE POINT</div>
                    <div style="font-size: 9px; color: #d1d5db; margin-top: 2px;">A SERUSOFT PRODUCT</div>
                    <div style="font-size: 11px; color: #4361ee; font-weight: 600; margin-top: 4px;">skorepoint.com</div>
                </div>
                </div>
            </div>
        `;
    }
    
    generateSchoolReportHTML(reportData) {
        const { classReports, statistics, term } = reportData;
        
        return `
            <div class="report-card" 
                 style="padding:40px; 
                        max-width: 210mm; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;">
                ${this.currentSchool.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 500px; 
                                height: 500px; 
                                background-image: url('${this.currentSchool.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.04; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1;">
                <!-- School Header -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 1px solid #333;">
                    ${this.currentSchool.logoUrl ? `<img src="${this.currentSchool.logoUrl}" alt="${this.currentSchool.name}" style="height: 70px; width: auto; object-fit: contain;">` : ''}
                    <div style="text-align: center;">
                        <h1 style="margin:0 0 8px 0; color:#1a1a1a; font-family: 'Times New Roman', serif; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1;">${this.currentSchool.name}</h1>
                        <p style="margin:0; color:#555; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">School Performance Summary</p>
                    </div>
                </div>
                
                <!-- School Information -->
                <div class="school-info" style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 40px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Academic Level</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${this.getAvailableLevels().find(l => l.id === this.currentLevel)?.name || this.currentLevel}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Term</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${term}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Total Classes</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${statistics.totalClasses}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Classes with Data</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${statistics.classesWithData}</div>
                    </div>
                </div>
                
                <!-- School Statistics -->
                <div class="performance-stats" style="margin-bottom: 40px;">
                    <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">School Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">School Average</div>
                            <div style="font-size: 24px; font-weight: 700; color: #111827;">${statistics.schoolAverage}%</div>
                        </div>
                        
                        ${statistics.bestPerformingClass ? `
                            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Best Performing Class</div>
                                <div style="font-size: 16px; font-weight: 600; color: #111827;">${statistics.bestPerformingClass.className}</div>
                                <div style="font-size: 14px; color: #059669; font-weight: 600;">${statistics.bestPerformingClass.average}%</div>
                            </div>
                        ` : ''}
                        
                        ${statistics.needsImprovementClass ? `
                            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">Needs Improvement</div>
                                <div style="font-size: 16px; font-weight: 600; color: #111827;">${statistics.needsImprovementClass.className}</div>
                                <div style="font-size: 14px; color: #dc2626; font-weight: 600;">${statistics.needsImprovementClass.average}%</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Class Performance Table -->
                <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px;">Class Performance Ranking</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Rank</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Class</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Total Students</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">With Marks</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classReports.map((report, index) => `
                            <tr>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 12px;">${index + 1}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500; font-size: 12px;">${report.className}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.totalStudents}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.studentsWithMarks}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 600; font-size: 12px;">${report.average}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Recommendations -->
                <div class="recommendations" style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 40px;">
                    <h4 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #92400e; margin-bottom: 10px;">Recommendations</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
                        ${statistics.schoolAverage < 50 ? '<li>Consider implementing remedial classes for struggling students</li>' : ''}
                        ${statistics.classesWithData < statistics.totalClasses ? '<li>Ensure all teachers enter marks for their classes</li>' : ''}
                        <li>Provide additional support for classes with averages below 50%</li>
                        <li>Recognize and reward top-performing classes</li>
                    </ul>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                    <img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" style="display: block; margin: 0 auto 5px; height: 25px; width: auto; opacity: 0.7;">
                    <div style="font-size: 10px; color: #9ca3af; letter-spacing: 0.5px;">POWERED BY SKORE POINT</div>
                    <div style="font-size: 9px; color: #d1d5db; margin-top: 2px;">A SERUSOFT PRODUCT</div>
                    <div style="font-size: 11px; color: #4361ee; font-weight: 600; margin-top: 4px;">skorepoint.com</div>
                </div>
                </div>
            </div>
        `;
    }
    
    async updateStatistics(reportData) {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        
        let statsHTML = '';
        
        switch (reportData.type) {
            case 'student':
                statsHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${reportData.summary.average}%</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.summary.division}</div>
                        <div class="stat-label">Division</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.summary.aggregate}</div>
                        <div class="stat-label">Aggregate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.summary.totalSubjects}</div>
                        <div class="stat-label">Subjects</div>
                    </div>
                `;
                break;
                
            case 'bulk-student':
                statsHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${reportData.reports.length}</div>
                        <div class="stat-label">Total Reports</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.class ? reportData.class.name : 'N/A'}</div>
                        <div class="stat-label">Class</div>
                    </div>
                `;
                break;

            case 'class':
                statsHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.classAverage}%</div>
                        <div class="stat-label">Class Average</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.totalStudents}</div>
                        <div class="stat-label">Total Students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.studentsWithMarks}</div>
                        <div class="stat-label">With Marks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.topPerformer ? reportData.statistics.topPerformer.summary.average + '%' : 'N/A'}</div>
                        <div class="stat-label">Top Student</div>
                    </div>
                `;
                break;
                
            case 'subject':
                statsHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.averageScore}%</div>
                        <div class="stat-label">Subject Average</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.highestScore}%</div>
                        <div class="stat-label">Highest Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.lowestScore}%</div>
                        <div class="stat-label">Lowest Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.passRate}%</div>
                        <div class="stat-label">Pass Rate</div>
                    </div>
                `;
                break;
                
            case 'school':
                statsHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.schoolAverage}%</div>
                        <div class="stat-label">School Average</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.totalClasses}</div>
                        <div class="stat-label">Total Classes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.classesWithData}</div>
                        <div class="stat-label">With Data</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${reportData.statistics.bestPerformingClass ? reportData.statistics.bestPerformingClass.average + '%' : 'N/A'}</div>
                        <div class="stat-label">Best Class</div>
                    </div>
                `;
                break;
        }
        
        statsGrid.innerHTML = statsHTML;
        document.getElementById('statisticsSummary').style.display = 'block';
    }
    
    async exportReport(format) {
        if (!this.currentReportData) {
            this.showError('No report data to export. Please generate a report first.');
            return;
        }
        
        try {
            this.showLoading(`Exporting report as ${format.toUpperCase()}...`);
            
            if (format === 'pdf') {
                await this.exportToPDF();
            } else if (format === 'excel') {
                await this.exportToExcel();
            }
            
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError(`Failed to export report: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async exportToPDF() {
        const element = document.getElementById('reportPreview');
        const reportCard = element ? element.querySelector('.premium-report, .report-card') : null;
        const targetElement = reportCard || element;

        if (!targetElement) throw new Error('Nothing to export');

        // Dynamically load html2pdf if needed
        if (typeof html2pdf === 'undefined') {
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
        }

        const fileName = `Premium_Report_${this.currentReportData.type}_${this.currentReportData.termType || 'term'}_${new Date().toISOString().split('T')[0]}.pdf`;

        // Clone the element for PDF generation
        const clone = targetElement.cloneNode(true);
        
        // Apply A4-specific styling
        clone.style.setProperty('width', '210mm', 'important');
        clone.style.setProperty('min-height', '297mm', 'important');
        clone.style.setProperty('padding', '15mm 20mm', 'important');
        clone.style.setProperty('margin', '0', 'important');
        clone.style.setProperty('box-shadow', 'none', 'important');
        clone.style.setProperty('border', '2px solid #000', 'important');
        clone.style.setProperty('background', 'white', 'important');
        clone.style.setProperty('font-size', '11px', 'important');
        
        // Create temporary container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '210mm';
        container.style.height = '297mm';
        container.style.zIndex = '99999';
        container.style.backgroundColor = 'white';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        
        container.appendChild(clone);
        document.body.appendChild(container);

        const opt = {
            margin: 0,
            filename: fileName,
            image: { 
                type: 'jpeg', 
                quality: 1.0,
                backgroundColor: '#ffffff'
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794,
                windowHeight: 1123,
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
                mode: ['avoid-all', 'css', 'legacy']
            }
        };

        try {
            await html2pdf()
                .set(opt)
                .from(clone)
                .toPdf()
                .get('pdf')
                .then(pdf => {
                    // Ensure content fits on one page
                    const totalPages = pdf.internal.getNumberOfPages();
                    if (totalPages > 1) {
                        console.warn('Content spans multiple pages, consider reducing content');
                    }
                })
                .save();
            
            this.showSuccess('Premium PDF exported successfully!');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw error;
        } finally {
            // Clean up
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    }

    async exportToExcel() {
        if (typeof XLSX === 'undefined') throw new Error('Excel library not loaded');

        const table = document.querySelector('#reportPreview table');
        if (table) {
            const wb = XLSX.utils.table_to_book(table, {sheet: "Report Data"});
            const fileName = `Report_${this.currentReportData.type}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            this.showSuccess('Excel exported successfully');
        } else {
            throw new Error('No table data found to export to Excel.');
        }
    }
    
    printReport() {
        if (!this.currentReportData) {
            this.showError('No report to print. Please generate a report first.');
            return;
        }
        
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (!printWindow) {
            this.showError('Please allow pop-ups to print the report.');
            return;
        }

        const reportContent = document.getElementById('reportPreview').innerHTML;
        
        // Get all stylesheets from the current document to maintain styling
        const stylesheets = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => `<link rel="stylesheet" href="${link.href}">`)
            .join('\n');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Print Report - ${this.currentReportData.type}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                ${stylesheets}
                <style>
                    body { font-family: 'Inter', sans-serif; color: #1f2937; }
                    /* Print-specific overrides */
                    @media print {
                        body { 
                            -webkit-print-color-adjust: exact; /* Chrome, Safari */
                            print-color-adjust: exact; /* Firefox */
                            background: white;
                        }
                        .report-card {
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0;
                            max-width: 100%;
                            padding: 0 !important;
                            page-break-inside: avoid;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .no-print { display: none !important; }
                    }
                    body { margin: 0; background: #f3f4f6; }
                </style>
            </head>
            <body>
                <div style="padding: 40px; display: flex; justify-content: center;">
                    ${reportContent}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 100);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close(); // Important for some browsers
    }
    
    refreshPreview() {
        if (this.currentReportData) {
            this.generateReport();
        } else {
            this.showError('No report to refresh. Please generate a report first.');
        }
    }
    
    toggleFullscreen() {
        const preview = document.getElementById('reportPreview');
        if (!preview) return;
        
        if (!document.fullscreenElement) {
            if (preview.requestFullscreen) {
                preview.requestFullscreen();
            } else if (preview.webkitRequestFullscreen) {
                preview.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    clearPreview() {
        const preview = document.getElementById('reportPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="empty-preview">
                    <i class="fas fa-chart-line"></i>
                    <h4>No Report Generated</h4>
                    <p>Select filters and click "Generate Report" to see preview</p>
                </div>
            `;
        }
        
        document.getElementById('statisticsSummary').style.display = 'none';
        
        // Disable export buttons
        document.getElementById('exportPDFBtn').disabled = true;
        document.getElementById('exportExcelBtn').disabled = true;
        document.getElementById('printReportBtn').disabled = true;
    }
    
    getTermDisplayName(term) {
        const termNames = {
            'beginning': 'Beginning of Term',
            'mid': 'Mid Term',
            'end': 'End of Term'
        };
        return termNames[term] || term;
    }
    
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (overlay && text) {
            text.textContent = message;
            overlay.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    prepareClassReport(classId) {
        // Implementation for class report preparation
    }
    
    prepareSubjectReport(subjectId) {
        // Implementation for subject report preparation
    }
}

// Initialize the controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReportsController();
});