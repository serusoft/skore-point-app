// Reports Page Controller
import { AuthService } from '/services/auth.service.js';
import { SchoolService } from '/services/school.service.js';
import { ReportService } from '/services/report.service.js';
import { GradingUtils } from '/utils/grading.js';
import { AppState, Router } from '/shared/js/app.js';

class ReportsController {
    constructor() {
        this.currentLevel = null;
        this.currentSchool = null;
        this.currentUser = null;
        this.currentReportData = null;
        this.gradeChart = null;
        
        this.initialize();
    }
    
    async initialize() {
        // Wait for app state to be ready
        await AppState.ready();
        
        this.currentUser = AppState.currentUser;
        this.currentSchool = AppState.currentSchool;
        
        if (!this.currentSchool) {
            Router.navigateTo('dashboard');
            return;
        }
        
        this.setupEventListeners();
        this.showLevelSelection();
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
            Router.navigateTo('dashboard');
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
            const subjects = await SchoolService.getSubjectsByLevel(this.currentSchool.id, this.currentLevel);
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
            students.forEach(student => {
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
        
        const division = GradingUtils.calculateDivision(average, aggregate, this.currentLevel);
        
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
    
    generateALevelReportHTML(reportData) {
        const { student, marks, summary, school, term } = reportData;
        
        // Get A-Level combination
        const principalSubjects = marks.filter(m => m.type === 'principal');
        const combination = principalSubjects.map(m => m.subjectName.charAt(0)).join('');
        
        return `
            <div class="report-card alevel-report">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- School Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    ${school.logoUrl ? `
                        <div class="school-logo" style="margin: 0 auto 15px; width: 80px; height: 80px;">
                            <img src="${school.logoUrl}" alt="${school.name}" style="width: 100%; height: 100%; object-fit: contain; border: 1px solid #ddd; padding: 5px;">
                        </div>
                    ` : ''}
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${school.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">A-LEVEL PROGRESS REPORT CARD</div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Student Name:</span>
                        <span>${student.name}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Class:</span>
                        <span>${student.className}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Combination:</span>
                        <span>${combination}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                </div>
                
                <!-- Combination Info -->
                <div class="combination-info">
                    <h4>Subject Combination: ${combination}</h4>
                    <p>Principal Subjects: ${principalSubjects.map(s => s.subjectName).join(', ')}</p>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">SUBJECT</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">GRADE</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">POINTS</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(mark => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.subjectName}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold;">${mark.grade}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.gradePoints}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${GradingUtils.getGradeRemark(mark.grade)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Grade Points Summary -->
                <div class="grade-points">
                    <div class="grade-point-item">
                        <div class="grade">A</div>
                        <div class="points">6</div>
                        <div class="remark">Exceptional</div>
                    </div>
                    <div class="grade-point-item">
                        <div class="grade">B</div>
                        <div class="points">5</div>
                        <div class="remark">Outstanding</div>
                    </div>
                    <div class="grade-point-item">
                        <div class="grade">C</div>
                        <div class="points">4</div>
                        <div class="remark">Good</div>
                    </div>
                </div>
                
                <!-- Summary Table -->
                <table class="summary-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">AVERAGE GRADE</th>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">TOTAL POINTS</th>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">AGGREGATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${GradingUtils.calculateGrade(summary.average, 'alevel')}</td>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${summary.aggregate}</td>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${summary.aggregate}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000;">
                    <h4 style="font-weight: bold; margin-bottom: 10px;">Teachers remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                    
                    <h4 style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Headteacher remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                </div>
                
                <!-- Signature Area -->
                <div class="signature-area">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Headteacher</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Class teacher</div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
                </div>
            </div>
        `;
    }
    
    generatePrimaryReportHTML(reportData) {
        const { student, marks, summary, school, term } = reportData;
        const isLowerPrimary = this.currentLevel === 'lower-primary';
        
        return `
            <div class="report-card primary-report">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- School Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    ${school.logoUrl ? `
                        <div class="school-logo" style="margin: 0 auto 15px; width: 80px; height: 80px;">
                            <img src="${school.logoUrl}" alt="${school.name}" style="width: 100%; height: 100%; object-fit: contain; border: 1px solid #ddd; padding: 5px;">
                        </div>
                    ` : ''}
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${school.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">${isLowerPrimary ? 'LOWER' : 'UPPER'} PRIMARY PROGRESS REPORT CARD</div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Student Name:</span>
                        <span>${student.name}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Class:</span>
                        <span>${student.className}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Date:</span>
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table">
                    <thead>
                        <tr>
                            <th>SUBJECT</th>
                            <th>SCORE</th>
                            ${isLowerPrimary ? '<th>REMARKS</th>' : '<th>GRADE</th>'}
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(mark => `
                            <tr>
                                <td>${mark.subjectName}</td>
                                <td>${mark.score}</td>
                                <td>${isLowerPrimary ? GradingUtils.getPrimaryRemark(mark.score) : mark.grade}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Summary Table -->
                <table class="summary-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">TOTAL MARKS</th>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">AVERAGE MARK</th>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">${isLowerPrimary ? 'OVERALL REMARKS' : 'AGGREGATES'}</th>
                            <th style="background: var(--primary); color: white; padding: 12px; border: 1px solid #000; text-align: center;">${isLowerPrimary ? 'STUDENT CONDUCT' : 'FINAL GRADE/DIVISION'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${summary.totalMarks}</td>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${summary.average}</td>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${isLowerPrimary ? GradingUtils.getPrimaryRemark(summary.average) : summary.aggregate}</td>
                            <td style="padding: 12px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8f9fa;">${isLowerPrimary ? 'GOOD' : summary.division}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000;">
                    <h4 style="font-weight: bold; margin-bottom: 10px;">Class Teacher's Remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                    
                    <h4 style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Head Teacher's Remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                    
                    ${!isLowerPrimary ? `
                        <div class="next-term-info" style="margin-top: 12px;">
                            <p><strong>Next Term Begins On:</strong> ________________________</p>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Signature Area -->
                <div class="signature-area">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Class Teacher Signature</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Head Teacher Signature</div>
                    </div>
                    ${!isLowerPrimary ? `
                        <div class="signature-box">
                            <div style="width: 80px; height: 80px; border: 2px dashed #666; margin: 0 auto;"></div>
                            <div>School Stamp</div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
                </div>
            </div>
        `;
    }
    
    generateOLevelReportHTML(reportData) {
        const { student, marks, summary, school, term } = reportData;
        
        return `
            <div class="report-card olevel-report">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- School Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    ${school.logoUrl ? `
                        <div class="school-logo" style="margin: 0 auto 15px; width: 80px; height: 80px;">
                            <img src="${school.logoUrl}" alt="${school.name}" style="width: 100%; height: 100%; object-fit: contain; border: 1px solid #ddd; padding: 5px;">
                        </div>
                    ` : ''}
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${school.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">O-LEVEL STUDENT PROGRESS REPORT CARD</div>
                </div>
                
                <!-- Student Information -->
                <div class="student-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Student Name:</span>
                        <span>${student.name}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Class:</span>
                        <span>${student.className}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Date:</span>
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                
                <!-- Subjects Table -->
                <table class="subject-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">SUBJECT</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">SCORE</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">GRADE</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(mark => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.subjectName}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.score}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold;">${mark.grade}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${GradingUtils.getGradeRemark(mark.grade)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Grade Summary -->
                <div class="grade-summary">
                    <div class="grade-summary-item">
                        <div class="label">Average Score</div>
                        <div class="value">${summary.average}%</div>
                    </div>
                    <div class="grade-summary-item">
                        <div class="label">Average Grade</div>
                        <div class="value">${GradingUtils.calculateGrade(summary.average, 'olevel')}</div>
                    </div>
                    <div class="grade-summary-item">
                        <div class="label">Aggregate</div>
                        <div class="value">${summary.aggregate}</div>
                    </div>
                    <div class="grade-summary-item">
                        <div class="label">Division</div>
                        <div class="value">${summary.division}</div>
                    </div>
                </div>
                
                <!-- Remarks Section -->
                <div class="remarks-section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000;">
                    <h4 style="font-weight: bold; margin-bottom: 10px;">Class Teacher's Remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                    
                    <h4 style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Head Teacher's Remarks:</h4>
                    <div class="signature-line" style="border-bottom: 1px solid #000; margin-top: 2px; padding-top: 20px; height: 20px;"></div>
                    
                    <div class="next-term-info" style="margin-top: 12px;">
                        <p><strong>Next Term Begins On:</strong> ________________________</p>
                    </div>
                </div>
                
                <!-- Signature Area -->
                <div class="signature-area">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Class Teacher Signature</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Head Teacher Signature</div>
                    </div>
                    <div class="signature-box">
                        <div style="width: 80px; height: 80px; border: 2px dashed #666; margin: 0 auto;"></div>
                        <div>School Stamp</div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
                </div>
            </div>
        `;
    }
    
    generateClassReportHTML(reportData) {
        const { class: classData, studentReports, statistics, term } = reportData;
        
        return `
            <div class="report-card">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- Class Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${this.currentSchool.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">CLASS PERFORMANCE REPORT - ${classData.name}</div>
                </div>
                
                <!-- Class Information -->
                <div class="class-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Class:</span>
                        <span>${classData.name}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Total Students:</span>
                        <span>${statistics.totalStudents}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">With Marks:</span>
                        <span>${statistics.studentsWithMarks}</span>
                    </div>
                </div>
                
                <!-- Performance Statistics -->
                <div class="performance-stats" style="margin-bottom: 30px;">
                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Performance Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Class Average</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--primary);">${statistics.classAverage}%</div>
                        </div>
                        
                        ${statistics.topPerformer ? `
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Top Performer</div>
                                <div style="font-size: 16px; font-weight: bold; color: var(--primary);">${statistics.topPerformer.student.name}</div>
                                <div style="font-size: 14px; color: #666;">${statistics.topPerformer.summary.average}%</div>
                            </div>
                        ` : ''}
                        
                        ${statistics.lowestPerformer ? `
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Lowest Performer</div>
                                <div style="font-size: 16px; font-weight: bold; color: var(--primary);">${statistics.lowestPerformer.student.name}</div>
                                <div style="font-size: 14px; color: #666;">${statistics.lowestPerformer.summary.average}%</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Student Performance Table -->
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Student Performance</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Rank</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Student Name</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Average</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Grade</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Division</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentReports.map((report, index) => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${index + 1}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.student.name}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.summary.average}%</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${GradingUtils.calculateGrade(report.summary.average, this.currentLevel)}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.summary.division}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
                </div>
            </div>
        `;
    }
    
    generateSubjectReportHTML(reportData) {
        const { subject, marks, statistics, class: classData, term } = reportData;
        
        return `
            <div class="report-card">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- Subject Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${this.currentSchool.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">SUBJECT ANALYSIS - ${subject.name}</div>
                </div>
                
                <!-- Subject Information -->
                <div class="subject-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Subject:</span>
                        <span>${subject.name}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Class:</span>
                        <span>${classData?.name || 'All Classes'}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Total Students:</span>
                        <span>${statistics.totalStudents}</span>
                    </div>
                </div>
                
                <!-- Performance Statistics -->
                <div class="performance-stats" style="margin-bottom: 30px;">
                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Subject Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Average Score</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--primary);">${statistics.averageScore}%</div>
                        </div>
                        
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Highest Score</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--success);">${statistics.highestScore}%</div>
                        </div>
                        
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Lowest Score</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--error);">${statistics.lowestScore}%</div>
                        </div>
                        
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Pass Rate</div>
                            <div style="font-size: 28px; font-weight: bold; color: ${statistics.passRate >= 70 ? 'var(--success)' : statistics.passRate >= 50 ? 'var(--warning)' : 'var(--error)'};">${statistics.passRate}%</div>
                        </div>
                    </div>
                </div>
                
                <!-- Grade Distribution -->
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Grade Distribution</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Grade</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Count</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(statistics.gradeDistribution).map(([grade, count]) => {
                            const percentage = statistics.studentsWithMarks > 0 ? Math.round((count / statistics.studentsWithMarks) * 100) : 0;
                            return `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold;">${grade}</td>
                                    <td style="padding: 10px; border: 1px solid #000; text-align: center;">${count}</td>
                                    <td style="padding: 10px; border: 1px solid #000; text-align: center;">${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <!-- Top Performers -->
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Top Performers</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Rank</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Student Name</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Score</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.slice(0, 10).map((mark, index) => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${index + 1}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.student.name}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${mark.score}%</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold;">${mark.grade}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
                </div>
            </div>
        `;
    }
    
    generateSchoolReportHTML(reportData) {
        const { classReports, statistics, term } = reportData;
        
        return `
            <div class="report-card">
                <!-- Skore Point Branding -->
                <div class="skore-point-branding">
                    <div class="skore-icon">SP</div>
                    <div class="skore-text">SKORE POINT</div>
                </div>
                
                <!-- School Header -->
                <div class="report-header" style="text-align: center; margin-bottom: 30px;">
                    <div class="school-name" style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">${this.currentSchool.name}</div>
                    <div class="report-title" style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">SCHOOL PERFORMANCE SUMMARY</div>
                </div>
                
                <!-- School Information -->
                <div class="school-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd;">
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Academic Level:</span>
                        <span>${this.getAvailableLevels().find(l => l.id === this.currentLevel)?.name || this.currentLevel}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Term:</span>
                        <span>${term}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Total Classes:</span>
                        <span>${statistics.totalClasses}</span>
                    </div>
                    <div class="info-item">
                        <span style="font-weight: bold; min-width: 120px;">Classes with Data:</span>
                        <span>${statistics.classesWithData}</span>
                    </div>
                </div>
                
                <!-- School Statistics -->
                <div class="performance-stats" style="margin-bottom: 30px;">
                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">School Statistics</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">School Average</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--primary);">${statistics.schoolAverage}%</div>
                        </div>
                        
                        ${statistics.bestPerformingClass ? `
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Best Performing Class</div>
                                <div style="font-size: 16px; font-weight: bold; color: var(--primary);">${statistics.bestPerformingClass.className}</div>
                                <div style="font-size: 14px; color: #666;">${statistics.bestPerformingClass.average}%</div>
                            </div>
                        ` : ''}
                        
                        ${statistics.needsImprovementClass ? `
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Needs Improvement</div>
                                <div style="font-size: 16px; font-weight: bold; color: var(--primary);">${statistics.needsImprovementClass.className}</div>
                                <div style="font-size: 14px; color: #666;">${statistics.needsImprovementClass.average}%</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Class Performance Table -->
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Class Performance Ranking</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Rank</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Class</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Total Students</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">With Marks</th>
                            <th style="background: #f0f0f0; padding: 10px; border: 1px solid #000; text-align: center;">Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classReports.map((report, index) => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${index + 1}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.className}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.totalStudents}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center;">${report.studentsWithMarks}</td>
                                <td style="padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold;">${report.average}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Recommendations -->
                <div class="recommendations" style="background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid var(--warning); margin-bottom: 30px;">
                    <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: var(--warning);">Recommendations:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${statistics.schoolAverage < 50 ? '<li>Consider implementing remedial classes for struggling students</li>' : ''}
                        ${statistics.classesWithData < statistics.totalClasses ? '<li>Ensure all teachers enter marks for their classes</li>' : ''}
                        <li>Provide additional support for classes with averages below 50%</li>
                        <li>Recognize and reward top-performing classes</li>
                    </ul>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #666;">
                    <strong>SKORE POINT</strong> - A product of SERUSOFT | skorepoint.com
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
            
            const result = await ReportService.exportReport(this.currentReportData, format);
            
            if (result.success) {
                this.showSuccess(`Report exported successfully as ${format.toUpperCase()}`);
            } else {
                this.showError(`Failed to export report: ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Failed to export report. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    printReport() {
        if (!this.currentReportData) {
            this.showError('No report to print. Please generate a report first.');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        const reportContent = document.getElementById('reportPreview').innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Report - ${this.currentReportData.type}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .report-card { max-width: 800px; margin: 0 auto; }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                ${reportContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `);
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