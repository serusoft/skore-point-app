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

// A-Level Combination Mapping - Maps subject sets to their exact codes
const ALEVEL_COMBINATIONS = {
    'Physics,Mathematics,Chemistry': 'PCM',
    'Physics,Mathematics,Biology': 'PMB',
    'Physics,Chemistry,Biology': 'PCB',
    'Physics,Mathematics,Economics': 'PEM',
    'Physics,Mathematics,Geography': 'PMG',
    'Physics,Mathematics,Entrepreneurship': 'PEM',
    'Biology,Chemistry,Mathematics': 'BCM',
    'Biology,Chemistry,Geography': 'BCG',
    'Biology,Chemistry,Economics': 'BCE',
    'Biology,Chemistry,Agriculture': 'BCA',
    'Mathematics,Economics,Geography': 'MEG',
    'Mathematics,Economics,Entrepreneurship': 'MEE',
    'Economics,Geography,History': 'HEG',
    'Economics,Geography,Divinity': 'EGD',
    'Economics,Geography,Entrepreneurship': 'GEE',
    'Economics,Geography,Literature': 'LEG',
    'History,Economics,Geography': 'HEG',
    'History,Economics,Divinity': 'HED',
    'History,Economics,Literature': 'HEL',
    'History,Geography,Divinity': 'HDG',
    'History,Geography,Literature': 'HGL',
    'Literature,Economics,Geography': 'LEG',
    'Literature,Economics,Divinity': 'LED',
    'Literature,History,Geography': 'LHG',
    'Divinity,Economics,Geography': 'DEG',
    'Divinity,History,Geography': 'DHG',
    'Divinity,Literature,Geography': 'DLG',
    'Art,Economics,Geography': 'GEA',
    'Art,History,Geography': 'HAG',
    'Music,Economics,Geography': 'MEG',
    'Music,History,Geography': 'MGH',
    'Agriculture,Chemistry,Biology': 'BAC',
    'Agriculture,Economics,Geography': 'GEA',
    'Agriculture,Biology,Geography': 'BAG',
    'Art,Economics,Mathematics': 'MEA',
    'Art,Entrepreneurship,Mathematics': 'MEA'
};

// A-Level Subject Codes - For generating combinations not in the standard list
const ALEVEL_SUBJECT_CODES = {
    'Physics': 'P',
    'Mathematics': 'M',
    'Chemistry': 'C',
    'Biology': 'B',
    'Economics': 'E',
    'Geography': 'G',
    'History': 'H',
    'Entrepreneurship': 'E',
    'Agriculture': 'A',
    'Art': 'A',
    'Music': 'M',
    'Literature': 'L',
    'Divinity': 'D'
};

// Helper function to get A-Level combination code
function getALevelCombination(subjectNames) {
    if (!subjectNames || subjectNames.length !== 3) return 'N/A';
    
    // Normalize and sort subject names for lookup
    const sorted = subjectNames.sort().join(',');
    
    // Check if combination exists in mapping
    if (ALEVEL_COMBINATIONS[sorted]) {
        return ALEVEL_COMBINATIONS[sorted];
    }
    
    // Generate combination from subject codes if not found
    const codes = subjectNames.map(name => ALEVEL_SUBJECT_CODES[name] || name.charAt(0).toUpperCase()).sort();
    return codes.join('');
}

class ReportsController {
    constructor() {
        console.log('ReportsController initialized');
        console.log('ReportsController initialized - v1.10 (O-Level Table Compact)');
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

    getReportFileName(reportData, extension) {
        const year = new Date().getFullYear();
        const termNum = this.getUgandanTerm();
        const safeName = (name) => (name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        const termType = (reportData.termType || 'term').toUpperCase();
        
        let baseName = '';
        
        if (reportData.type === 'student') {
            baseName = `${safeName(reportData.student.name)}_Term_${termNum}_Report_${year}`;
        } else if (reportData.type === 'class') {
            const className = (reportData.class ? reportData.class.name : 'Class').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            baseName = `${className}_CLASS_ANALYSIS_${termType}_TERM_${termNum}_${year}`;
        } else if (reportData.type === 'subject') {
            const subjectName = (reportData.subject ? reportData.subject.name : 'Subject').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            baseName = `${subjectName}_SUBJECT_ANALYSIS_${termType}_TERM_${termNum}_${year}`;
        } else if (reportData.type === 'bulk-student') {
            const className = (reportData.class ? reportData.class.name : 'Class').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            baseName = `${className}_CLASS_${termType}_TERM_${termNum}_Premium_student_Report_${dateStr}`;
        } else {
            baseName = `Report_${reportData.type}_Term_${termNum}_${year}`;
        }
        
        return `${baseName}.${extension}`;
    }
    
    async initialize() {
        const optionsContainer = document.getElementById('levelOptionsPrompt');

        try {
            console.log('ReportsController: initialize() started');
            
            // Wait for app state to be ready
            if (!window.appInitialized) {
                if (optionsContainer) optionsContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner-border"></div><div style="color: #94a3b8;">Loading application data...</div></div>';
                
                // Add timeout to prevent infinite loading
                await Promise.race([
                    new Promise(resolve => {
                        document.addEventListener('app:initialized', resolve, { once: true });
                    }),
                    new Promise(resolve => setTimeout(() => {
                        console.warn('App initialization timed out in Reports');
                        resolve();
                    }, 5000)) // Reduced timeout to 5s for faster feedback
                ]);
            }
            
            if (!window.AppState) {
                console.error('AppState not initialized');
                if (optionsContainer) optionsContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #ef4444;">
                        <div style="font-weight:700; margin-bottom:8px;">Application failed to initialize.</div>
                        <div style="margin-bottom:12px;color:#ffe4e6;">This usually happens when the app bundle or session data didn't load on hard refresh.</div>
                        <div style="display:flex; gap:8px; justify-content:center;">
                            <button id="reportsRetryInit" style="padding:8px 12px; background:#4361ee; color:#fff; border:none; border-radius:6px; cursor:pointer;">Retry Initialization</button>
                            <button id="reportsGoHome" style="padding:8px 12px; background:#ef4444; color:#fff; border:none; border-radius:6px; cursor:pointer;">Go Home</button>
                        </div>
                    </div>
                `;

                // Attach handlers for the buttons if present
                setTimeout(() => {
                    const retryBtn = document.getElementById('reportsRetryInit');
                    const homeBtn = document.getElementById('reportsGoHome');
                    if (retryBtn) retryBtn.addEventListener('click', async () => {
                        // try a soft reload of the app scripts/state
                        if (typeof window.initApp === 'function') {
                            try { await window.initApp(); } catch (e) { console.error('Retry init failed', e); }
                        }
                        // try reloading the page to re-run normal init
                        window.location.reload();
                    });
                    if (homeBtn) homeBtn.addEventListener('click', () => {
                        if (typeof window.navigateTo === 'function') window.navigateTo('dashboard');
                        else window.location.href = '../../index.html';
                    });
                }, 50);

                return;
            }
            
            this.currentUser = window.AppState.currentUser;
            this.currentSchool = window.AppState.currentSchool;
            console.log('ReportsController: School loaded:', this.currentSchool?.name);

            // Attempt recovery if school is missing but user exists
            if (!this.currentSchool && this.currentUser) {
                if (optionsContainer) optionsContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner-border"></div><div style="color: #94a3b8;">Retrieving school data...</div></div>';
                console.warn('ReportsController: School data missing, attempting recovery...');
                if (typeof window.loadUserSchools === 'function') {
                    await window.loadUserSchools();
                    if (window.AppState.userSchools && window.AppState.userSchools.length > 0) {
                        this.currentSchool = window.AppState.userSchools[0];
                        window.AppState.currentSchool = this.currentSchool;
                    }
                }
            }
            
            if (!this.currentSchool || !this.currentUser) {
                console.warn('Missing school or user data in ReportsController', { currentSchool: this.currentSchool, currentUser: this.currentUser });
                if (optionsContainer) optionsContainer.innerHTML = `
                    <div style="text-align:center; padding:20px; color:#f59e0b;">
                        <div style="font-weight:700; margin-bottom:8px;">No school selected.</div>
                        <div style="margin-bottom:12px;color:#724b00;">The reports page requires a selected school and a signed-in user.</div>
                        <div style="display:flex; gap:8px; justify-content:center;">
                            <button id="reportsRetrySchool" style="padding:8px 12px; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer;">Retry</button>
                            <button id="reportsChooseSchool" style="padding:8px 12px; background:#3b82f6; color:#fff; border:none; border-radius:6px; cursor:pointer;">Choose School</button>
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    const retryBtn = document.getElementById('reportsRetrySchool');
                    const chooseBtn = document.getElementById('reportsChooseSchool');
                    if (retryBtn) retryBtn.addEventListener('click', async () => {
                        if (typeof window.loadUserSchools === 'function') {
                            try {
                                await window.loadUserSchools();
                                if (window.AppState && window.AppState.userSchools && window.AppState.userSchools.length > 0) {
                                    this.currentSchool = window.AppState.userSchools[0];
                                    window.AppState.currentSchool = this.currentSchool;
                                    // attempt to show levels now
                                    this.showLevelSelection();
                                    return;
                                }
                            } catch (e) { console.error('Retry loadUserSchools failed', e); }
                        }
                        // fallback: reload the page
                        window.location.reload();
                    });
                    if (chooseBtn) chooseBtn.addEventListener('click', () => {
                        if (typeof window.navigateTo === 'function') window.navigateTo('dashboard');
                        else window.location.href = '../dashboard/dashboard.html';
                    });
                }, 50);

                return;
            }
            
            // Apply role-based tab visibility
            this.applyRoleBasedReportVisibility();
            
            this.setupEventListeners();
            this.showLevelSelection();
            this.addBackToSchoolButton();
        } catch (error) {
            console.error('Error initializing ReportsController:', error);
            if (optionsContainer) optionsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">Error: ${error.message}</div>`;
            this.showError('Failed to initialize reports page: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Apply role-based visibility to report tabs
     */
    applyRoleBasedReportVisibility() {
        const admins = this.currentSchool.admins || [];
        const uid = this.currentUser?.uid;
        const isAdmin = uid && admins.includes(uid);
        
        if (!isAdmin) {
            // Make non-subject tabs inactive/pale for teachers
            const tabs = document.querySelectorAll('.report-tab');
            tabs.forEach(tab => {
                const type = tab.dataset.type;
                if (type !== 'subject') {
                    tab.classList.add('restricted-tab');
                    Object.assign(tab.style, {
                        opacity: '0.5',
                        cursor: 'not-allowed',
                        filter: 'grayscale(100%)'
                    });
                }
            });

            // Ensure subject is active if current selection is restricted
            if (document.querySelector('.report-tab.active.restricted-tab')) {
                const subjectTab = document.querySelector('[data-type="subject"]');
                if (subjectTab) subjectTab.click();
            }
        }
    }
    
    addBackToSchoolButton() {
        const btnId = 'backToSchoolBtn';
        if (document.getElementById(btnId)) return;

        // Add blinking animation style
        if (!document.getElementById('blink-animation-style')) {
            const styleSheet = document.createElement("style");
            styleSheet.id = 'blink-animation-style';
            styleSheet.innerText = `
                @keyframes blink-red {
                    0% { background-color: #dc2626; box-shadow: 0 0 5px rgba(220, 38, 38, 0.5); transform: scale(1); }
                    50% { background-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); transform: scale(1.05); }
                    100% { background-color: #dc2626; box-shadow: 0 0 5px rgba(220, 38, 38, 0.5); transform: scale(1); }
                }
            `;
            document.head.appendChild(styleSheet);
        }

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
            backgroundColor: '#dc2626', // Red color
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
            transition: 'all 0.2s ease',
            animation: 'blink-red 2s infinite' // Blinking animation
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
            tab.addEventListener('click', (e) => {
                if (tab.classList.contains('restricted-tab')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showRestrictedAccessModal();
                    return;
                }
                this.switchReportType(e.currentTarget.dataset.type);
            });
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

    showRestrictedAccessModal() {
        const existing = document.getElementById('restrictedAccessModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'restrictedAccessModal';
        modal.className = 'modal active';
        modal.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.8); position: fixed; top: 0; left: 0; width: 100%; height: 100%;';
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center; position: relative; animation: slideUp 0.3s ease;">
                <div id="restrictedInitialContent">
                    <div style="width: 60px; height: 60px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-exclamation" style="font-size: 30px; color: #d97706;"></i>
                    </div>
                    <h3 style="color: #1f2937; margin-bottom: 10px; font-size: 18px; font-weight: 800; text-transform: uppercase;">YOU CANT DO IT BECAUSE NOT AN ADMIN</h3>
                    <p style="color: #4b5563; margin-bottom: 25px; font-size: 15px;">You can only get your subject analysis.</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-secondary" onclick="document.getElementById('restrictedAccessModal').remove()">Close</button>
                        <button class="btn btn-primary" id="restrictedMoreBtn">More</button>
                    </div>
                </div>
                
                <div id="restrictedMoreContent" style="display: none;">
                    <h4 style="color: #1f2937; margin-bottom: 15px; font-size: 16px; font-weight: 700;">Access Limitation</h4>
                    <p style="color: #4b5563; margin-bottom: 15px; font-size: 14px; line-height: 1.5;">This limitation is done to ensure safty and authenticative use of skore point.</p>
                    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dbeafe;">
                        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
                            If want extra acces to the school portal more subject , generating report cards. check My admin tab on the school page and see your admin and contact him to assign you subject or make you an admin to have extra functionalities.
                        </p>
                    </div>
                    
                    <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                        <img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" style="height: 40px; width: auto; opacity: 0.9; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;">
                        <div style="font-size: 12px; font-weight: 800; color: #4361ee; letter-spacing: 1px;">THANKS FOR USING SKORE POINT</div>
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 20px; width: 100%;" onclick="document.getElementById('restrictedAccessModal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('restrictedMoreBtn').addEventListener('click', () => {
            document.getElementById('restrictedInitialContent').style.display = 'none';
            document.getElementById('restrictedMoreContent').style.display = 'block';
        });
    }
    
    showLevelSelection() {
        const prompt = document.getElementById('levelSelectionPrompt');
        const interfaceEl = document.getElementById('reportsInterface');
        const optionsContainer = document.getElementById('levelOptionsPrompt');
        
        if (!prompt) {
            console.error('Level selection prompt element not found');
            return;
        }

        // Force display block immediately to ensure visibility
        prompt.style.setProperty('display', 'block', 'important');
        if (interfaceEl) interfaceEl.style.display = 'none';

        // Clear previous options immediately to remove "Loading..." text
        if (optionsContainer) optionsContainer.innerHTML = '';

        if (!this.currentSchool || !optionsContainer) {
            if (!this.currentSchool) {
                if (typeof window.navigateTo === 'function') window.navigateTo('dashboard');
                else window.location.href = '../dashboard/dashboard.html';
            }
            if (!optionsContainer) console.error('Level options container not found');
            return;
        }
        
        // Create level options based on school type
        const levels = this.getAvailableLevels();
        console.log('ReportsController: Populating levels:', levels);

        if (!levels || levels.length === 0) {
            optionsContainer.innerHTML = '<div style="text-align: center; width: 100%; padding: 20px; color: #cbd5e1;">No academic levels configuration found for this school.</div>';
            return;
        }
        
        levels.forEach(level => {
            const option = document.createElement('div');
            option.className = 'level-option-card';
            option.dataset.level = level.id;
            
            // Add inline styles to ensure visibility even if CSS fails
            option.style.cssText = `
                background: #1e293b;
                color: #f8fafc;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                cursor: pointer;
                border: 1px solid #334155;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 200px;
                transition: all 0.3s ease;
            `;
            
            option.innerHTML = `
                <i class="${level.icon}" style="font-size: 48px; color: #60a5fa; margin-bottom: 20px;"></i>
                <h4 style="font-size: 18px; margin-bottom: 10px; color: #f8fafc;">${level.name}</h4>
                <p style="color: #94a3b8; font-size: 14px; margin: 0;">${level.description}</p>
            `;
            
            option.addEventListener('mouseenter', () => {
                option.style.transform = 'translateY(-5px)';
                option.style.boxShadow = '0 10px 15px rgba(0,0,0,0.4)';
                option.style.borderColor = '#60a5fa';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.transform = 'translateY(0)';
                option.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
                option.style.borderColor = '#334155';
            });
            
            option.addEventListener('click', () => this.selectLevel(level.id));
            optionsContainer.appendChild(option);
        });
        
        // Ensure prompt is visible (redundant check)
        prompt.style.display = 'block';
    }
    
    getAvailableLevels() {
        if (!this.currentSchool) return [];
        const schoolLevel = (this.currentSchool && this.currentSchool.level) ? this.currentSchool.level.toLowerCase() : 'secondary';
        if (schoolLevel === 'primary') {
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
            // Sort subjects alphabetically for consistent report order
            this.subjects = subjects.sort((a, b) => a.name.localeCompare(b.name));
            
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
                
                // Render chart for class reports
                if (reportData.type === 'class') {
                    this.renderClassGradeChart(reportData);
                }
                
                // Enable export buttons
                document.getElementById('exportPDFBtn').disabled = false;
                
                const excelBtn = document.getElementById('exportExcelBtn');
                if (excelBtn) {
                    if (reportData.type === 'student' || reportData.type === 'bulk-student' || reportData.type === 'school') {
                        excelBtn.style.display = 'none';
                    } else {
                        excelBtn.style.display = 'inline-block';
                        excelBtn.disabled = false;
                    }
                }
                
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
            
            // Sort by performance and assign ranks
            studentReports.sort((a, b) => {
                if (this.currentLevel === 'alevel') {
                    // A-Level: Rank by Points (desc), then Average (desc)
                    if (b.summary.totalPoints !== a.summary.totalPoints) {
                        return b.summary.totalPoints - a.summary.totalPoints;
                    }
                    return b.summary.average - a.summary.average;
                }
                // Default: Rank by Average (desc)
                return b.summary.average - a.summary.average;
            });

            // Calculate ranks with tie-breaking
            let currentRank = 1;
            studentReports.forEach((report, index) => {
                if (index > 0) {
                    const prev = studentReports[index - 1];
                    const isTied = this.currentLevel === 'alevel' 
                        ? (report.summary.totalPoints === prev.summary.totalPoints && report.summary.average === prev.summary.average)
                        : (report.summary.average === prev.summary.average);
                    
                    if (!isTied) currentRank = index + 1;
                }
                report.rank = currentRank;
            });
            
            return {
                type: 'class',
                level: this.currentLevel,
                class: classData,
                term: this.getTermDisplayName(term),
                termType: term,
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
            
            // IMPORTANT: For A-Level, only students who actually sat for this subject are included in the analysis
            // This is different from O-Level where all students should have marks for all subjects
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
                termType: term,
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
        const isPrimary = this.currentSchool.level === 'primary';
        
        try {
            // Determine classes to process
            let classesToProcess = this.classes;
            let subjectsToProcess = this.subjects;

            // For primary schools, fetch ALL classes and subjects irrespective of level
            if (isPrimary) {
                classesToProcess = await window.Firebase.db.query('classes', [
                    { field: 'schoolId', op: '==', value: this.currentSchool.id }
                ]);
                subjectsToProcess = await window.Firebase.db.query('subjects', [
                    { field: 'schoolId', op: '==', value: this.currentSchool.id }
                ]);
            }

            // Create a map for subject names
            const subjectMap = new Map();
            subjectsToProcess.forEach(s => subjectMap.set(s.id, s.name));

            const classReports = [];
            const subjectStats = {}; // Map: subjectName -> { total: 0, count: 0 }
            let schoolTotal = 0;
            let classCount = 0;
            
            for (const classData of classesToProcess) {
                // We implement custom logic here instead of generateClassSummary to capture subject stats
                const classReport = await this.processClassForSchoolReport(classData, term, subjectMap, subjectStats);
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

            // Calculate Subject Rankings
            const subjectRankings = Object.values(subjectStats).map(s => ({
                name: s.name,
                average: s.count > 0 ? Math.round(s.total / s.count) : 0
            })).sort((a, b) => b.average - a.average);
            
            return {
                type: 'school',
                level: this.currentLevel,
                term: this.getTermDisplayName(term),
                termType: term,
                classReports: classReports,
                statistics: {
                    totalClasses: this.classes.length,
                    classesWithData: classReports.length,
                    schoolAverage: Math.round(schoolAverage),
                    bestPerformingClass: classReports[0] || null,
                    lowestPerformingClass: classReports[classReports.length - 1] || null
                },
                subjectRankings: subjectRankings,
                generatedAt: new Date().toISOString(),
                school: this.currentSchool
            };
            
        } catch (error) {
            console.error('Error generating school report:', error);
            throw error;
        }
    }
    
    async processClassForSchoolReport(classData, term, subjectMap, subjectStats) {
        try {
            const students = await SchoolService.getStudentsByClass(classData.id);
            
            if (students.length === 0) return null;
            
            let totalMarks = 0;
            let studentCount = 0;
            
            for (const student of students) {
                const marks = await ReportService.getStudentMarks(student.id, term);
                if (marks) {
                    let studentTotal = 0;
                    let studentSubjCount = 0;

                    // Iterate over marks to calculate average and populate subject stats
                    // IMPORTANT: For A-Level, subject stats only include students who have marks for each subject
                    // This correctly handles the fact that A-Level students only take their chosen subject combinations
                    for (const [key, val] of Object.entries(marks)) {
                        // Skip metadata keys
                        if (['studentId', 'schoolId', 'classId', 'term', 'level', 'enteredBy', 'enteredByInitials', 'updatedAt'].includes(key)) continue;

                        let score = 0;
                        if (typeof val === 'number') {
                            score = val;
                        } else if (typeof val === 'object' && val.paper1) {
                            // Handle papers
                            const papers = Object.values(val).filter(p => typeof p === 'number');
                            score = papers.length > 0 ? papers.reduce((a, b) => a + b, 0) / papers.length : 0;
                        } else {
                            continue;
                        }

                        if (score > 0) {
                            studentTotal += score;
                            studentSubjCount++;

                            // Update Subject Stats
                            const subjName = subjectMap.get(key) || key; // Use ID if name not found
                            if (!subjectStats[subjName]) {
                                subjectStats[subjName] = { name: subjName, total: 0, count: 0 };
                            }
                            subjectStats[subjName].total += score;
                            subjectStats[subjName].count++;
                        }
                    }

                    if (studentSubjCount > 0) {
                        const studentAverage = studentTotal / studentSubjCount;
                        totalMarks += studentAverage;
                        studentCount++;
                    }
                }
            }
            
            return {
                classId: classData.id,
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
                let paperDetails = [];
                
                if (typeof mark === 'object' && mark.paper1 !== undefined) {
                    // A-Level paper scores
                    const paperScores = Object.values(mark).filter(v => typeof v === 'number');
                    score = paperScores.length > 0 ? paperScores.reduce((a, b) => a + b) / paperScores.length : 0;
                    papers = mark;
                } else if (typeof mark === 'number') {
                    score = mark;
                }
                
                if (score > 0) {
                    let grade, gradePoints;
                    
                    if (this.currentLevel === 'olevel') {
                        // Custom O-Level Grading
                        if (score >= 90) grade = 'A';
                        else if (score >= 80) grade = 'B';
                        else if (score >= 70) grade = 'C';
                        else if (score >= 55) grade = 'D';
                        else grade = 'E';
                        
                        gradePoints = 0; // Not used for new O-Level Result logic
                    } else if (this.currentLevel === 'alevel') {
                        if (subject.type === 'principal') {
                            // Principal Subject: Balance papers
                            if (typeof mark === 'object') {
                                const paperGrades = [];
                                Object.keys(mark).sort().forEach(key => {
                                    if (key.startsWith('paper') && typeof mark[key] === 'number') {
                                        const pScore = mark[key];
                                        const pGrade = GradingUtils.calculateALevelPaperScoreToGrade(pScore);
                                        paperGrades.push(pGrade);
                                        paperDetails.push(`${key.replace('paper', 'P')}: ${pScore}`);
                                    }
                                });
                                
                                if (paperGrades.length > 0) {
                                    grade = GradingUtils.calculateALevelPaperGrade(paperGrades);
                                    gradePoints = GradingUtils.getGradePoints(grade, this.currentLevel);
                                } else {
                                    grade = 'F'; gradePoints = 0;
                                }
                            } else {
                                // Fallback for single score principal
                                grade = GradingUtils.calculateGrade(score, this.currentLevel);
                                gradePoints = GradingUtils.getGradePoints(grade, this.currentLevel);
                            }
                        } else {
                            // Subsidiary / GP: Pass/Fail
                            grade = score >= 50 ? 'Pass' : 'Fail';
                            gradePoints = score >= 50 ? 1 : 0;
                        }
                    } else {
                        grade = GradingUtils.calculateGrade(score, this.currentLevel);
                        gradePoints = GradingUtils.getGradePoints(grade, this.currentLevel);
                    }
                    
                    processedMarks.push({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        score: Math.round(score),
                        grade: grade,
                        gradePoints: gradePoints,
                        papers: papers,
                        paperDetails: paperDetails,
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
                totalPoints: 0,
                result: 'N/A'
            };
        }
        
        const totalMarks = marks.reduce((sum, mark) => sum + mark.score, 0);
        const average = Math.round(totalMarks / marks.length);
        const highest = Math.max(...marks.map(m => m.score));
        const lowest = Math.min(...marks.map(m => m.score));
        
        let totalPoints = 0;
        let result;
        let aggregate = 0; // fallback aggregate value for compatibility
        
        if (this.currentLevel === 'alevel') {
            // A-Level UNEB Classification System
            const principalSubjects = marks.filter(m => m.type === 'principal');
            const generalPaper = marks.find(m => m.type === 'general');
            const subsidiary = marks.find(m => m.type === 'subsidiary');
            
            // Calculate total points from all subjects
            totalPoints = marks.reduce((sum, subj) => sum + subj.gradePoints, 0);
            
            // A-Level Result Logic (Simplified)
            // Result 1: Has marks for 3 Principal Subjects, 1 Subsidiary, and 1 General Paper
            // Result 2: Otherwise
            const hasThreePrincipals = principalSubjects.length >= 3;
            const hasGeneralPaper = !!generalPaper;
            const hasSubsidiary = !!subsidiary;

            if (hasThreePrincipals && hasGeneralPaper && hasSubsidiary) {
                result = '1';
            } else {
                result = '2';
            }
        } else if (this.currentLevel === 'olevel') {
            // O-Level Result Calculation
            let division;
            // Result 4: No marks (Handled by marks.length check above, but let's be safe)
            if (marks.length === 0) division = '4';
            // Result 2: Less than 9 subjects
            else if (marks.length < 9) division = '2';
            else {
                // Check grades
                const hasPassingGrade = marks.some(m => m.score >= 55); // D or better
                const allElementary = marks.every(m => m.score < 55); // All E
                
                if (allElementary) division = '3';
                else if (hasPassingGrade) division = '1';
                else division = '3'; // Fallback if somehow neither (should be covered by allElementary)
            }
            
            totalPoints = totalMarks; // For O-Level, total points = total marks
            result = division;
        } else {
            // Primary aggregate
            totalPoints = marks.reduce((sum, mark) => sum + mark.gradePoints, 0);
            result = 'N/A';
        }
        
        // Compute a displayable aggregate used elsewhere in the UI
        // For O-Level we use totalMarks as aggregate (older behavior), for others use totalPoints
        if (this.currentLevel === 'olevel') {
            aggregate = totalMarks;
        } else {
            aggregate = totalPoints;
        }

        let division;
        if (!result || result === 'N/A') {
            if (this.currentLevel === 'upper-primary') {
                if (marks.length < 4) division = 'U';
                else if (totalPoints <= 12) division = 'Division 1';
                else if (totalPoints <= 23) division = 'Division 2';
                else if (totalPoints <= 28) division = 'Division 3';
                else if (totalPoints <= 34) division = 'Division 4';
                else division = 'U';
                result = division;
            } else if (this.currentLevel === 'lower-primary') {
                result = GradingUtils.calculateDivision(average, totalPoints, this.currentLevel);
            }
        }
        
        return {
            totalSubjects: marks.length,
            totalMarks: totalMarks,
            average: average,
            highest: highest,
            lowest: lowest,
            totalPoints: totalPoints,
            result: result,
            division: result, // Alias for compatibility with class reports
            aggregate: aggregate // Ensure aggregate is returned for display
        };
    }
    
    async displayReportPreview(reportData) {
        const preview = document.getElementById('reportPreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        // Add responsive styles for mobile preview
        const responsiveStyles = `
            <style>
                @media screen and (max-width: 768px) {
                    #reportPreview {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        overflow-x: hidden;
                        background: #525659;
                        padding: 20px 0;
                    }
                    .report-card {
                        /* Scale down for mobile devices to fit screen */
                        zoom: 0.42; 
                        margin: 10px auto !important;
                    }
                    /* Firefox fallback */
                    @supports (-moz-appearance:none) {
                        .report-card {
                            zoom: 1;
                            transform: scale(0.42);
                            transform-origin: top center;
                            margin-bottom: -170mm !important;
                        }
                    }
                }
            </style>
        `;
        
        let html = responsiveStyles;
        
        switch (reportData.type) {
            case 'student':
                html += this.generateStudentReportHTML(reportData);
                break;
            case 'bulk-student':
                html += this.generateBulkStudentReportHTML(reportData);
                break;
            case 'class':
                html += this.generateClassReportHTML(reportData);
                break;
            case 'subject':
                html += this.generateSubjectReportHTML(reportData);
                break;
            case 'school':
                html += this.generateSchoolReportHTML(reportData);
                break;
        }
        
        preview.innerHTML = html;
        
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
        
        // Get A-Level combination using the standard codes
        const principalSubjects = marks.filter(m => m.type === 'principal');
        const principalSubjectNames = principalSubjects.map(m => m.subjectName);
        const combination = getALevelCombination(principalSubjectNames);
        
        // Get current date as "Issued" date
        const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Helper to format paper scores
        const formatPapers = (mark) => {
            if (!mark.paperDetails || mark.paperDetails.length === 0) return '';
            return `<div style="font-size: 9px; color: #666; margin-top: 2px;">${mark.paperDetails.join(', ')}</div>`;
        };

        // Reorder marks: first 3 principals, then subsidiary, then general (compulsory), then any remaining principals
        const principalsAll = marks.filter(m => m.type === 'principal');
        const firstThreePrincipals = principalsAll.slice(0, 3);
        const remainingPrincipals = principalsAll.slice(3);
        const subsidiarySubjects = marks.filter(m => m.type === 'subsidiary');
        const generalSubjects = marks.filter(m => m.type === 'general');
        const otherSubjects = marks.filter(m => !['principal', 'subsidiary', 'general'].includes(m.type));

        const orderedMarks = [
            ...firstThreePrincipals,
            ...remainingPrincipals,
            ...otherSubjects,
            ...subsidiarySubjects,
            ...generalSubjects
        ];

        return `
            <div class="report-card alevel-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm; 
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
                        <div>
                            <span style="font-size: 9px; 
                                          text-transform: uppercase; 
                                          color: #6b7280; 
                                          font-weight: 600;">
                                Issued
                            </span>
                            <div style="font-size: 13px; 
                                        font-weight: 600; 
                                        color: #374151; 
                                        margin-top: 4px;">
                                ${issuedDate}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Subjects Table with Paper Subdivisions -->
                <table class="subject-table" 
                       style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0;">
                            <th style="text-align: left; padding: 12px 15px; color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; width: 28%;">Subject</th>
                            <th style="text-align: center; padding: 8px 10px; color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; width: 12%; border-right: 1px solid #e2e8f0;">Paper 1</th>
                            <th style="text-align: center; padding: 8px 10px; color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; width: 12%; border-right: 1px solid #e2e8f0;">Paper 2</th>
                            <th style="text-align: center; padding: 12px 15px; color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; width: 12%;">Grade</th>
                            <th style="text-align: center; padding: 12px 15px; color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; width: 10%;">Points</th>
                            <th style="text-align: left; padding: 12px 15px; color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; width: 26%;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orderedMarks.map((mark, index) => {
                            const rowBg = index % 2 !== 0 ? 'background-color: #fafafa;' : '';
                            
                            // Extract paper scores if available (service provides "P1: 78", "P2: 82")
                            let paper1Score = '';
                            let paper2Score = '';
                            if (mark.paperDetails && mark.paperDetails.length > 0) {
                                mark.paperDetails.forEach(detail => {
                                    const d = String(detail).trim();
                                    // Match formats like "P1: 78", "P2: 82", "paper1: 78" or "paper2:82"
                                    const p1 = d.match(/^\s*(?:P1|P\s*1|paper1|paper 1)\s*[:\-]?\s*(\d{1,3})/i);
                                    const p2 = d.match(/^\s*(?:P2|P\s*2|paper2|paper 2)\s*[:\-]?\s*(\d{1,3})/i);
                                    if (p1) paper1Score = p1[1];
                                    if (p2) paper2Score = p2[1];
                                });
                            }
                            
                            return `
                            <tr style="border-bottom: 1px solid #f1f5f9; ${rowBg}">
                                <td style="padding: 12px 15px; color: #334155; font-size: 11px; font-weight: 500;">
                                    ${mark.subjectName}
                                </td>
                                <td style="padding: 8px 10px; text-align: center; color: #475569; font-size: 11px; border-right: 1px solid #e2e8f0;">
                                    ${paper1Score ? paper1Score : '-'}
                                </td>
                                <td style="padding: 8px 10px; text-align: center; color: #475569; font-size: 11px; border-right: 1px solid #e2e8f0;">
                                    ${paper2Score ? paper2Score : '-'}
                                </td>
                                <td style="padding: 12px 15px; text-align: center; color: #0f172a; font-weight: 600; font-size: 11px;">
                                    ${mark.grade}
                                </td>
                                <td style="padding: 12px 15px; text-align: center; color: #475569; font-size: 11px;">
                                    ${mark.gradePoints}
                                </td>
                                <td style="padding: 12px 15px; color: #64748b; font-size: 10px;">
                                    ${GradingUtils.getGradeRemark(mark.grade)}
                                </td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
                
                <!-- Summary Section -->
                <div class="summary-section" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            border-radius: 8px; 
                            padding: 20px; 
                            margin-bottom: 30px; 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 15px; 
                            color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Average Grade
                        </div>
                        <div style="font-size: 18px; 
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
                        <div style="font-size: 18px; 
                                    font-weight: 800;">
                            ${summary.totalPoints}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Conduct
                        </div>
                        <div style="font-size: 18px; 
                                    font-weight: 800; 
                                    color: #86efac;">
                            GOOD
                        </div>
                    </div>
                    <div style="text-align: center; 
                                border-left: 1px solid rgba(255,255,255,0.3); 
                                padding-left: 15px;">
                        <div style="font-size: 9px; 
                                    text-transform: uppercase; 
                                    opacity: 0.9; 
                                    margin-bottom: 5px;">
                            Result
                        </div>
                        <div style="font-size: 16px; 
                                    font-weight: 900; 
                                    ${summary.result === '1' || summary.result.includes('PASS') ? 'color: #86efac;' : 'color: #fca5a5;'}">
                            ${summary.result}
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
                            margin-top: 25px;
                            padding-bottom: 15px;">
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
        const { student, marks, summary, school, term, termType, level } = reportData;
        const isLowerPrimary = (level || this.currentLevel) === 'lower-primary';
        
        return `
            <div class="report-card primary-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm; 
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
                              background-color: white;">
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
                                    font-weight: 800;
                                    ${!isLowerPrimary && summary.division === 'U' ? 'color: #ff6b6b;' : ''}">
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
                            margin-top: 25px;
                            padding-bottom: 15px;">
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

        // Helper for remarks
        const getRemark = (grade) => {
            if (grade === 'A') return 'Exceptional';
            if (grade === 'B') return 'Outstanding';
            if (grade === 'C') return 'Satisfactory';
            if (grade === 'D') return 'Basic';
            return 'Elementary';
        };

        let subjectsContent = '';
        
        if (marks.length > 10) {
            const mid = Math.ceil(marks.length / 2);
            const leftMarks = marks.slice(0, mid);
            const rightMarks = marks.slice(mid);
            
            const renderRow = (mark) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 7px 8px; color: #1f2937; font-size: 12px; font-weight: 500;">${mark.subjectName}</td>
                    <td style="padding: 7px 8px; text-align: center; color: #1f2937; font-size: 12px;">${mark.score}</td>
                    <td style="padding: 7px 8px; text-align: center; font-weight: 600; color: #1f2937; font-size: 12px;">${mark.grade}</td>
                    <td style="padding: 7px 8px; color: #6b7280; font-size: 11px;">${getRemark(mark.grade)}</td>
                </tr>
            `;

            const tableHeader = `
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="text-align: left; padding: 8px 8px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 40%;">Subject</th>
                        <th style="text-align: center; padding: 8px 8px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 15%;">Scr</th>
                        <th style="text-align: center; padding: 8px 8px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 15%;">Grd</th>
                        <th style="text-align: left; padding: 8px 8px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 30%;">Rmk</th>
                    </tr>
                </thead>
            `;

            subjectsContent = `
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
                            ${tableHeader}
                            <tbody>${leftMarks.map(renderRow).join('')}</tbody>
                        </table>
                    </div>
                    <div style="flex: 1;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
                            ${tableHeader}
                            <tbody>${rightMarks.map(renderRow).join('')}</tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            // Single table (compact)
            subjectsContent = `
                <table class="subject-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="text-align: left; padding: 7px 10px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 40%;">Subject</th>
                            <th style="text-align: center; padding: 7px 10px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 15%;">Score</th>
                            <th style="text-align: center; padding: 7px 10px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 15%;">Grade</th>
                            <th style="text-align: left; padding: 7px 10px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; width: 30%;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(mark => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 7px 10px; color: #1f2937; font-size: 12px; font-weight: 500;">${mark.subjectName}</td>
                                <td style="padding: 7px 10px; text-align: center; color: #1f2937; font-size: 12px;">${mark.score}</td>
                                <td style="padding: 7px 10px; text-align: center; font-weight: 600; color: #1f2937; font-size: 12px;">${mark.grade}</td>
                                <td style="padding: 7px 10px; color: #6b7280; font-size: 11px;">${getRemark(mark.grade)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        return `
            <div class="report-card olevel-report premium-report" 
                 style="width: 210mm; 
                        min-height: 297mm;
                        height: auto; 
                        padding: 10mm 15mm; 
                        box-sizing: border-box; 
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', 'Georgia', serif; 
                        color: #111;
                        line-height: 1.3;
                        display: flex; flex-direction: column;">
                ${school.logoUrl ? `
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%); 
                                width: 300px; 
                                height: 300px; 
                                background-image: url('${school.logoUrl}'); 
                                background-size: contain; 
                                background-repeat: no-repeat; 
                                background-position: center; 
                                opacity: 0.03; 
                                filter: grayscale(100%); 
                                pointer-events: none; 
                                z-index: 0;"></div>
                ` : ''}
                <div style="position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column;">
                
                <!-- Compact Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1a73e8;">
                    ${school.logoUrl 
                        ? `<img src="${school.logoUrl}" 
                                alt="${school.name}" 
                                style="height: 85px; width: 85px; object-fit: contain;">` 
                        : `<img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" 
                                style="height: 85px; width: 85px; opacity: 0.7; object-fit: contain;">`}
                    
                    <div style="text-align: center; flex: 1; padding: 0 15px;">
                        <h1 style="margin:0 0 5px 0; color:#1a1a1a; font-size: 28px; font-weight: 700; line-height: 1.1;">${school.name}</h1>
                        <p style="margin:0; color:#555; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">COMPETENT BASED TERM ${this.getUgandanTerm()} STUDENT ASSESSMENT PROGRESS REPORT</p>
                    </div>
                    
                    <div style="width: 85px;"></div>
                </div>
                
                <!-- Compact Student Info -->
                <div class="student-info" style="margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Student Name</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${student.name}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Class</div>
                        <div style="font-size: 15px; font-weight: 600; color: #374151;">${student.className}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Term</div>
                        <div style="font-size: 15px; font-weight: 600; color: #374151;">${term}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Date</div>
                        <div style="font-size: 15px; font-weight: 600; color: #374151;">${new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                
                <!-- Subjects Content (Split or Single) -->
                ${subjectsContent}
                
                <!-- Compact Summary -->
                <div class="summary-section" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; color: white;">
                    <div style="text-align: center;">
                        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;">Average Score</div>
                        <div style="font-size: 16px; font-weight: 700;">${summary.average}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;">Total Score</div>
                        <div style="font-size: 16px; font-weight: 700;">${summary.aggregate}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;">Subjects</div>
                        <div style="font-size: 16px; font-weight: 700;">${summary.totalSubjects}</div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid rgba(255,255,255,0.3);">
                        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;">RESULT</div>
                        <div style="font-size: 18px; font-weight: 800; ${summary.division === 'U' ? 'color: #ff6b6b;' : ''}">${summary.division}</div>
                    </div>
                </div>
                
                <!-- Compact Remarks -->
                <div class="remarks-section" style="margin-bottom: 15px; flex: 1;">
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #4b5563; margin-bottom: 15px; font-weight: 700;">Class Teacher's Remarks</div>
                        <div style="border-bottom: 1px dashed #9ca3af; margin-bottom: 5px; padding-bottom: 15px;"></div>
                        <div style="text-align: right; font-size: 11px; color: #9ca3af; font-style: italic;">Signature: ........................................</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #4b5563; margin-bottom: 15px; font-weight: 700;">Head Teacher's Remarks</div>
                        <div style="border-bottom: 1px dashed #9ca3af; margin-bottom: 5px; padding-bottom: 15px;"></div>
                        <div style="text-align: right; font-size: 11px; color: #9ca3af; font-style: italic;">Signature: ........................................</div>
                    </div>
                </div>
                
                <!-- Result Insight & Explanation -->
                <div style="margin-bottom: 15px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e5e7eb; margin-bottom: 8px;">
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 4px; border-right: 1px solid #e5e7eb; text-align: center; width: 40px; font-weight: 700;">RESULT</th>
                            <th style="padding: 4px; text-align: left; font-weight: 700;">DESCRIPTION</th>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 3px; border-right: 1px solid #e5e7eb; text-align: center; font-weight: 700;">1</td>
                            <td style="padding: 3px;">Achieved Basic (D) or better in at least one subject.</td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 3px; border-right: 1px solid #e5e7eb; text-align: center; font-weight: 700;">2</td>
                            <td style="padding: 3px;">Sat for less than 9 subjects.</td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 3px; border-right: 1px solid #e5e7eb; text-align: center; font-weight: 700;">3</td>
                            <td style="padding: 3px;">Scored Elementary (E) in all subjects.</td>
                        </tr>
                         <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 3px; border-right: 1px solid #e5e7eb; text-align: center; font-weight: 700;">4</td>
                            <td style="padding: 3px;">Did not sit for exams.</td>
                        </tr>
                    </table>
                    
                    <div style="padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                        <div style="font-size: 11px; font-weight: 700; color: #4b5563; margin-bottom: 2px; text-transform: uppercase;">Student Result Explanation</div>
                        <div style="font-size: 11px; color: #1f2937;">
                            ${(() => {
                                if (summary.division === '1') return 'The student has achieved a Basic competency (Grade D) or higher in at least one subject.';
                                if (summary.division === '2') return `The student sat for ${summary.totalSubjects} subjects, which is less than the required minimum of 9 subjects.`;
                                if (summary.division === '3') return 'The student scored Elementary (Grade E) in all subjects.';
                                if (summary.division === '4') return 'The student did not sit for any exams.';
                                return 'Result not available.';
                            })()}
                        </div>
                    </div>
                </div>
                
                <!-- Grading Scale -->
                <div style="margin-bottom: 15px; text-align: center; font-size: 11px; color: #555; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                    <span style="font-weight: 700; color: #111; margin-right: 5px;">GRADING SCALE:</span>
                    <span style="margin: 0 5px;">A: 90-100 (Exceptional)</span> |
                    <span style="margin: 0 5px;">B: 80-89 (Outstanding)</span> |
                    <span style="margin: 0 5px;">C: 70-79 (Satisfactory)</span> |
                    <span style="margin: 0 5px;">D: 55-69 (Basic)</span> |
                    <span style="margin: 0 5px;">E: 0-54 (Elementary)</span>
                </div>
                
                ${termType === 'end' ? `
                <div style="text-align: center; margin-bottom: 15px; padding: 8px; background: #f0f9ff; border-radius: 4px; border: 1px solid #bae6fd;">
                    <p style="margin:0; font-size: 12px; color: #0369a1; font-weight: 600;"><strong>Next Term Begins On:</strong> ________________________</p>
                </div>
                ` : ''}
                
                <!-- Premium Footer -->
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 15px; padding-bottom: 20px; margin-top: auto;">
                    <img src="../../assets/icons/skore-icon.jpg" alt="Skore Point" style="display: block; margin: 0 auto 4px; height: 20px; width: auto; opacity: 0.7;">
                    <div style="font-size: 11px; color: #9ca3af; letter-spacing: 0.5px;">POWERED BY SKORE POINT</div>
                    <div style="font-size: 10px; color: #d1d5db; margin-top: 1px;">A SERUSOFT PRODUCT</div>
                    <div style="font-size: 11px; color: #4361ee; font-weight: 600; margin-top: 2px;">skorepoint.com</div>
                </div>
                
                </div>
            </div>
        `;
    }
    
    generateClassReportHTML(reportData) {
        const { class: classData, studentReports, statistics, term, school } = reportData;
        const isALevel = (this.currentLevel === 'alevel') || (reportData && reportData.level === 'alevel');
        
        // --- CALCULATIONS ---
        
        // 1. Pass Rate (Average >= 45%)
        const passCount = studentReports.filter(r => r.summary.average >= 45).length;
        const passRate = studentReports.length > 0 ? Math.round((passCount / studentReports.length) * 100) : 0;
        
        // 2. Aggregates
        const aggregates = studentReports.map(r => r.summary.aggregate);
        // For A-Level, higher points are better. For O-Level/Primary, lower aggregates are better.
        const bestAggregate = aggregates.length > 0 ? (isALevel ? Math.max(...aggregates) : Math.min(...aggregates)) : 0;
        const worstAggregate = aggregates.length > 0 ? (isALevel ? Math.min(...aggregates) : Math.max(...aggregates)) : 0;
        const avgAggregate = aggregates.length > 0 ? Math.round(aggregates.reduce((a,b)=>a+b,0) / aggregates.length) : 0;
        // helper: get student display name
        const getStudentDisplayName = (r) => {
            if (!r) return '';
            if (r.student) return r.student.name || (r.student.firstname && r.student.lastname ? `${r.student.firstname} ${r.student.lastname}` : r.student.firstname || r.student.lastname) || '';
            return r.studentName || r.name || r.fullName || '';
        }

        // For A-Level also determine which students had the best/worst points (useful to show who achieved them)
        let bestStudentName = '';
        let worstStudentName = '';
        if (isALevel && studentReports.length > 0) {
            const best = studentReports.find(r => r.summary && r.summary.aggregate === bestAggregate);
            const worst = studentReports.find(r => r.summary && r.summary.aggregate === worstAggregate);
            bestStudentName = getStudentDisplayName(best) || '';
            worstStudentName = getStudentDisplayName(worst) || '';
        }
        
        // 3. Division Distribution
        const divisionDist = {};
        studentReports.forEach(r => {
            const div = r.summary.division || 'U';
            divisionDist[div] = (divisionDist[div] || 0) + 1;
        });
        const divisionKeys = Object.keys(divisionDist).sort();
        
        // 4. Subject Analysis
        // IMPORTANT: For A-Level, subject analysis is based ONLY on students who actually sat for each subject
        // This is different from O-Level where all students are expected to take all subjects
        const subjectStats = {};
        studentReports.forEach(report => {
            report.marks.forEach(mark => {
                if (!subjectStats[mark.subjectName]) {
                    subjectStats[mark.subjectName] = {
                        name: mark.subjectName,
                        totalScore: 0,
                        count: 0,
                        highest: 0,
                        lowest: 100,
                        passCount: 0
                    };
                }
                const stats = subjectStats[mark.subjectName];
                stats.totalScore += mark.score;
                stats.count++;
                if (mark.score > stats.highest) stats.highest = mark.score;
                if (mark.score < stats.lowest) stats.lowest = mark.score;
                if (mark.score >= 45) stats.passCount++;
            });
        });
        
        const subjectAnalysis = Object.values(subjectStats).map(s => ({
            ...s,
            average: Math.round(s.totalScore / s.count),
            passRate: Math.round((s.passCount / s.count) * 100)
        })).sort((a, b) => b.average - a.average);
        
        const bestSubject = subjectAnalysis.length > 0 ? subjectAnalysis[0] : null;
        const weakestSubject = subjectAnalysis.length > 0 ? subjectAnalysis[subjectAnalysis.length - 1] : null;
        
        // 5. At Risk (D4, U, Fail)
        const atRiskStudents = studentReports.filter(r => 
            ['Division 4', 'U', 'Fail', 'F9'].includes(r.summary.division)
        );

        // 6. Grade Distribution Analysis (For Page 2)
        const subjects = this.subjects || [];
        const gradeStats = {};
        subjects.forEach(s => gradeStats[s.name] = { total: 0 });
        
        const allGradesSet = new Set();
        
        studentReports.forEach(report => {
            report.marks.forEach(mark => {
                if (!gradeStats[mark.subjectName]) gradeStats[mark.subjectName] = { total: 0 };
                const stats = gradeStats[mark.subjectName];
                const grade = mark.grade;
                if (grade) {
                    stats[grade] = (stats[grade] || 0) + 1;
                    stats.total++;
                    allGradesSet.add(grade);
                }
            });
        });
        
        const sortedGrades = Array.from(allGradesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        
        let gradeTableRows = '';
        subjects.forEach(subj => {
            const stats = gradeStats[subj.name];
            if (!stats || stats.total === 0) return;
            
            let row = `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${subj.name}</td>`;
            sortedGrades.forEach(g => {
                const count = stats[g] || 0;
                const pct = stats.total > 0 ? Math.round((count/stats.total)*100) : 0;
                row += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count} (${pct}%)</td>`;
            });
            row += '</tr>';
            gradeTableRows += row;
        });
        
        const page1 = `
            <div class="report-card class-report premium-report" 
                 style="padding: 15mm 20mm; 
                        width: 210mm; 
                        min-height: 297mm;
                        box-sizing: border-box;
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;">
                
                <!-- 1. Report Header -->
                <div style="border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;">
                    ${school.logoUrl ? `<img src="${school.logoUrl}" alt="Logo" style="height: 80px; width: 80px; object-fit: contain;">` : '<div style="width:80px;"></div>'}
                    <div style="text-align: center; flex: 1;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase;">${school.name}</h1>
                        <h2 style="margin: 5px 0 0; font-size: 18px; color: #444;">Class Performance Report</h2>
                        <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #555;">
                            ${classData.name} | ${term} (TERM ${this.getUgandanTerm()}) | ${new Date().getFullYear()}
                        </div>
                    </div>
                    <div style="text-align: right; width: 80px; font-size: 12px; font-weight: 600;">
                        Candidates: ${studentReports.length}
                    </div>
                </div>
                
                <!-- 2. Executive Summary -->
                <div style="margin-bottom: 30px;">
                    <h3 style="background: #1a73e8; color: white; padding: 8px 15px; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase;">Executive Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Total Candidates</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Pass Rate (>=45%)</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">${isALevel ? 'Best Point' : 'Best Aggregate'}</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">${isALevel ? 'Worst Point' : 'Worst Aggregate'}</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">${isALevel ? 'Average Point' : 'Class Mean Agg.'}</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">${studentReports.length}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${passRate >= 80 ? 'green' : passRate < 50 ? 'red' : 'black'}">${passRate}%</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${isALevel ? `${bestAggregate}<div style="font-size:10px;color:#666; font-weight:500;">${bestStudentName}</div>` : bestAggregate}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${isALevel ? `${worstAggregate}<div style="font-size:10px;color:#666; font-weight:500;">${worstStudentName}</div>` : worstAggregate}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${avgAggregate}</td>
                        </tr>
                    </table>
                    
                    <!-- Division Distribution -->
                    <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                        ${divisionKeys.map(div => `
                            <div style="flex: 1; border: 1px solid #ddd; padding: 10px; text-align: center; background: #fafafa; min-width: 80px;">
                                <div style="font-size: 10px; color: #666; text-transform: uppercase;">${div}</div>
                                <div style="font-size: 16px; font-weight: 700;">${divisionDist[div]}</div>
                                <div style="font-size: 10px; color: #888;">${Math.round((divisionDist[div] / studentReports.length) * 100)}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 4. Subject Performance Analysis -->
                <div style="margin-bottom: 30px;">
                    <h3 style="background: #1a73e8; color: white; padding: 8px 15px; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase;">Subject Performance Analysis</h3>
                    
                    <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                        <div style="flex: 1; padding: 10px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px;">
                            <div style="font-size: 10px; color: #047857; text-transform: uppercase; font-weight: 700;">Best Performing Subject</div>
                            <div style="font-size: 14px; font-weight: 700; color: #065f46;">${bestSubject ? bestSubject.name : 'N/A'} (${bestSubject ? bestSubject.average : 0}%)</div>
                        </div>
                        <div style="flex: 1; padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 4px;">
                            <div style="font-size: 10px; color: #b91c1c; text-transform: uppercase; font-weight: 700;">Weakest Subject</div>
                            <div style="font-size: 14px; font-weight: 700; color: #991b1b;">${weakestSubject ? weakestSubject.name : 'N/A'} (${weakestSubject ? weakestSubject.average : 0}%)</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Subject</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Avg Mark</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Best Score</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Lowest Score</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Pass Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjectAnalysis.map(s => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${s.name}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s.average}%</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: green;">${s.highest}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: red;">${s.lowest}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${s.passRate}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- 5. Class Ranking Overview -->
                <div style="margin-bottom: 30px; display: flex; gap: 30px;">
                    <div style="flex: 1;">
                        <h3 style="border-bottom: 2px solid #1a73e8; color: #1a73e8; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">Top 5 Students</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <tr style="background: #f9fafb;"><th style="padding: 5px; text-align: left;">Name</th><th style="padding: 5px; text-align: right;">${isALevel ? 'Points' : 'Agg'}</th><th style="padding: 5px; text-align: right;">Avg</th></tr>
                            ${studentReports.slice(0, 5).map(r => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 5px;">${r.student.name}</td>
                                    <td style="padding: 5px; text-align: right; font-weight: bold;">${r.summary.aggregate}</td>
                                    <td style="padding: 5px; text-align: right;">${r.summary.average}%</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="border-bottom: 2px solid #dc2626; color: #dc2626; padding-bottom: 5px; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">Bottom 5 Students</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <tr style="background: #f9fafb;"><th style="padding: 5px; text-align: left;">Name</th><th style="padding: 5px; text-align: right;">${isALevel ? 'Points' : 'Agg'}</th><th style="padding: 5px; text-align: right;">Avg</th></tr>
                            ${studentReports.slice(-5).reverse().map(r => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 5px;">${r.student.name}</td>
                                    <td style="padding: 5px; text-align: right; font-weight: bold;">${r.summary.aggregate}</td>
                                    <td style="padding: 5px; text-align: right;">${r.summary.average}%</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                </div>

                <!-- 6. At-Risk Learners Section -->
                <div style="margin-bottom: 30px; background: #fff1f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px;">
                    <h4 style="margin: 0 0 5px 0; color: #991b1b; font-size: 13px; text-transform: uppercase;">⚠️ At-Risk Learners (Division 4 / U)</h4>
                    <p style="margin: 0; font-size: 12px; color: #7f1d1d;">
                        <strong>${atRiskStudents.length} students</strong> have been identified as at-risk. 
                        Suggested Action: Remedial teaching and close monitoring required.
                    </p>
                </div>

                <!-- Footer -->
                <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; padding-bottom: 15px;">
                    <img src="../../assets/icons/skore-icon.jpg" 
                         alt="Skore Point" 
                         style="display: block; margin: 0 auto 5px; height: 30px; width: auto; opacity: 0.8;">
                    <div style="font-size: 10px; color: #6b7280; letter-spacing: 1px; font-weight: 700; margin-bottom: 3px; text-transform: uppercase;">
                        POWERED BY SKORE POINT
                    </div>
                    <div style="font-size: 9px; color: #9ca3af; margin-bottom: 2px;">
                        A product of serusoft
                    </div>
                    <div style="font-size: 9px; color: #4361ee; font-weight: 600;">
                        skorepoint.com
                    </div>
                </div>
            </div>
        `;

        const page2 = `
            <div class="report-card class-report premium-report" 
                 style="padding: 15mm 20mm; 
                        width: 210mm; 
                        min-height: 297mm;
                        box-sizing: border-box;
                        margin: 20px auto 0; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;
                        page-break-before: always;
                        display: flex;
                        flex-direction: column;">
                
                <div style="border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase;">Subject Grade Distribution Analysis</h2>
                    <div style="margin-top: 5px; font-size: 14px; color: #555;">${classData.name} | ${term} | ${new Date().getFullYear()}</div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Subject</th>
                            ${sortedGrades.map(g => `<th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${g}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${gradeTableRows}
                    </tbody>
                </table>

                <!-- Grade Distribution Chart -->
                <div style="width: 100%; height: 300px; margin-bottom: 20px;">
                    <canvas id="gradeDistributionChart"></canvas>
                </div>
                
                <!-- 7. Remarks (Moved to Page 2) -->
                <div style="margin-top: auto; margin-bottom: 40px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                        <div style="width: 45%;">
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Class Teacher's Comment</div>
                            <div style="border-bottom: 1px dotted #999; margin-bottom: 10px;"></div>
                            <div style="border-bottom: 1px dotted #999;"></div>
                        </div>
                        <div style="width: 45%;">
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Head Teacher's Comment</div>
                            <div style="border-bottom: 1px dotted #999; margin-bottom: 10px;"></div>
                            <div style="border-bottom: 1px dotted #999;"></div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div style="text-align: center; width: 200px;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
                            <div style="font-size: 10px; font-weight: 600;">Class Teacher Signature</div>
                        </div>
                        <div style="text-align: center; width: 200px;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
                            <div style="font-size: 10px; font-weight: 600;">Head Teacher Signature</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; padding-bottom: 15px;">
                    <img src="../../assets/icons/skore-icon.jpg" 
                         alt="Skore Point" 
                         style="display: block; margin: 0 auto 5px; height: 30px; width: auto; opacity: 0.8;">
                    <div style="font-size: 10px; color: #6b7280; letter-spacing: 1px; font-weight: 700; margin-bottom: 3px; text-transform: uppercase;">
                        POWERED BY SKORE POINT
                    </div>
                    <div style="font-size: 9px; color: #9ca3af; margin-bottom: 2px;">
                        A product of serusoft
                    </div>
                    <div style="font-size: 9px; color: #4361ee; font-weight: 600;">
                        skorepoint.com
                    </div>
                </div>
            </div>
        `;
        
        return `<div class="class-report-container">${page1}${page2}</div>`;
    }
    
    renderClassGradeChart(reportData) {
        const ctx = document.getElementById('gradeDistributionChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.gradeChart) {
            this.gradeChart.destroy();
        }

        const isLowerPrimary = reportData.level === 'lower-primary';
        
        let grades = [];
        if (isLowerPrimary) {
            grades = ['Excellent', 'V.GOOD', 'Good', 'Fair', 'Pass', 'Fail'];
        } else {
             const allGradesSet = new Set();
             reportData.studentReports.forEach(r => r.marks.forEach(m => {
                 if(m.grade) allGradesSet.add(m.grade);
             }));
             const gradeOrder = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9', 'A', 'B', 'C', 'D', 'E', 'O', 'F'];
             grades = Array.from(allGradesSet).sort((a, b) => {
                 const idxA = gradeOrder.indexOf(a);
                 const idxB = gradeOrder.indexOf(b);
                 if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                 return a.localeCompare(b);
             });
        }

        const colors = {
            'Excellent': '#10b981', 'V.GOOD': '#34d399', 'Good': '#60a5fa', 'Fair': '#fbbf24', 'Pass': '#f87171', 'Fail': '#ef4444',
            'D1': '#15803d', 'D2': '#16a34a', 'C3': '#2563eb', 'C4': '#3b82f6', 'C5': '#60a5fa', 'C6': '#93c5fd', 'P7': '#f59e0b', 'P8': '#fbbf24', 'F9': '#ef4444',
            'A': '#15803d', 'B': '#16a34a', 'C': '#2563eb', 'D': '#f59e0b', 'E': '#f97316', 'O': '#a855f7', 'F': '#ef4444'
        };

        // Calculate total counts per grade across all subjects
        const data = grades.map(grade => {
            let count = 0;
            reportData.studentReports.forEach(report => {
                report.marks.forEach(mark => {
                    if (mark.grade === grade) {
                        count++;
                    }
                });
            });
            return count;
        });

        const backgroundColors = grades.map(g => colors[g] || '#94a3b8');

        this.gradeChart = new Chart(ctx, {
            type: 'pie',
            data: { 
                labels: grades, 
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { 
                    legend: { 
                        position: 'right', 
                        labels: { 
                            boxWidth: 12, 
                            font: { size: 11, family: "'Times New Roman', serif" } 
                        } 
                    },
                    title: {
                        display: true,
                        text: 'Overall Grade Distribution',
                        font: { size: 14, family: "'Times New Roman', serif" }
                    }
                }
            }
        });
    }
    
    generateSubjectReportHTML(reportData) {
        const { subject, marks, statistics, class: classData, term } = reportData;
        
        return `
            <div class="report-card" 
                 style="padding:40px; 
                        width: 210mm; 
                        min-height: 297mm;
                        box-sizing: border-box;
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;
                        display: flex; flex-direction: column;">
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
                        <p style="margin:0; color:#555; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Subject Analysis - ${subject.name}</p>
                        <div style="font-size: 12px; color: #555; margin-top: 5px;">${classData?.name || 'All Classes'} | ${term} (TERM ${this.getUgandanTerm()}) | ${new Date().getFullYear()}</div>
                    </div>
                </div>
                
                <!-- Subject Information -->
                <div class="subject-info" style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 40px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div style="display: none;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Subject</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${subject.name}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Class</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${classData?.name || 'All Classes'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">${this.currentLevel === 'alevel' ? 'Students Who Sat' : 'Total Students'}</div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827;">${this.currentLevel === 'alevel' ? statistics.studentsWithMarks : statistics.totalStudents}</div>
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
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; padding-bottom: 30px; margin-top: auto;">
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
        const { classReports, statistics, term, subjectRankings } = reportData;
        
        return `
            <div class="report-card" 
                 style="padding:40px; 
                        width: 210mm; 
                        min-height: 297mm;
                        box-sizing: border-box;
                        margin: 0 auto; 
                        ${PREMIUM_BORDER_STYLE} 
                        font-family: 'Times New Roman', serif; 
                        color: #111;
                        display: flex; flex-direction: column;">
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
                        <div style="font-size: 12px; color: #555; margin-top: 5px;">${term} (TERM ${this.getUgandanTerm()}) | ${new Date().getFullYear()}</div>
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
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 12px;">${report.rank || index + 1}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500; font-size: 12px;">${report.className}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.totalStudents}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 12px;">${report.studentsWithMarks}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 600; font-size: 12px;">${report.average}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Subject Performance Ranking -->
                <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; margin-bottom: 20px; margin-top: 30px;">Subject Performance Ranking</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Rank</th>
                            <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Subject</th>
                            <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 10px; text-transform: uppercase; font-weight: 600;">Average Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectRankings ? subjectRankings.map((subj, index) => `
                            <tr>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 12px;">${index + 1}</td>
                                <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500; font-size: 12px;">${subj.name}</td>
                                <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 600; font-size: 12px;">${subj.average}%</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center; padding:10px;">No subject data available</td></tr>'}
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
                <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; padding-bottom: 30px; margin-top: auto;">
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
        
        const isALevel = (reportData && reportData.level === 'alevel') || this.currentLevel === 'alevel';

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
                        <div class="stat-label">${isALevel ? 'Points' : 'Aggregate'}</div>
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
        
        // Security Check: Teachers can only export subject reports
        const isAdmin = this.currentSchool.admins && this.currentSchool.admins.includes(this.currentUser.uid);
        if (!isAdmin && this.currentReportData.type !== 'subject') {
            this.showError('Access Denied: Teachers can only export Subject Analysis reports.');
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
        
        let targetElement = element;
        const isBulk = this.currentReportData.type === 'bulk-student';
        const isClassReport = this.currentReportData.type === 'class';
        
        // Treat Class Report as iterative (like bulk) to handle multi-page charts/tables better
        const useIterativeRendering = isBulk || isClassReport;
        
        if (!useIterativeRendering) {
            const reportCard = element ? element.querySelector('.premium-report, .report-card') : null;
            targetElement = reportCard || element;
        } else if (isClassReport) {
            const container = element ? element.querySelector('.class-report-container') : null;
            targetElement = container || element;
        }

        if (!targetElement) throw new Error('Nothing to export');

        // Create Progress UI
        const progressOverlay = document.createElement('div');
        progressOverlay.id = 'exportProgressOverlay';
        progressOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; font-family: sans-serif;
        `;
        progressOverlay.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 20px;">Generating PDF...</div>
            <div style="width: 300px; height: 20px; background: #333; border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
                <div id="exportProgressBar" style="width: 0%; height: 100%; background: #4361ee; transition: width 0.3s;"></div>
            </div>
            <div id="exportProgressText" style="font-size: 16px; color: #ccc;">Initializing...</div>
        `;
        document.body.appendChild(progressOverlay);

        const updateProgress = (current, total) => {
            const percentage = Math.round((current / total) * 100);
            const bar = document.getElementById('exportProgressBar');
            const text = document.getElementById('exportProgressText');
            if (bar) bar.style.width = `${percentage}%`;
            if (text) text.textContent = `Processing report ${current} of ${total} (${percentage}%)`;
        };

        const updatePdfProgress = (state) => {
            if (!state) return;
            const progressText = document.getElementById('exportProgressText');
            if (progressText) {
                let stage = '';
                switch(state.stage) {
                    case 'build': stage = 'Building PDF structure'; break;
                    case 'render': stage = 'Rendering content'; break;
                    case 'output': stage = 'Finalizing PDF'; break;
                    default: stage = state.stage;
                }
                progressText.textContent = `${stage}... (${state.progress}%)`;
            }
            const bar = document.getElementById('exportProgressBar');
            if (bar) bar.style.width = `${state.progress}%`;
        };

        try {
            const fileName = this.getReportFileName(this.currentReportData, 'pdf');

            if (useIterativeRendering) {
                // --- BULK EXPORT LOGIC (Iterative) ---
                
                // Load dependencies manually if needed
                if (typeof window.jspdf === 'undefined') {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }
                if (typeof window.html2canvas === 'undefined') {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'mm', 'a4');
                
                let reports = [];
                if (isClassReport) {
                    // For class report, the container's children are the pages (report cards)
                    reports = Array.from(targetElement.children).filter(child => 
                        child.classList.contains('report-card')
                    );
                } else {
                    // For bulk student reports
                    reports = Array.from(targetElement.children).filter(child => 
                        child.tagName !== 'STYLE' && 
                        (child.classList.contains('report-card') || child.querySelector('.report-card'))
                    );
                }
                
                const total = reports.length;

                for (let i = 0; i < total; i++) {
                    updateProgress(i + 1, total);
                    
                    const reportWrapper = reports[i];
                    const card = reportWrapper.querySelector('.report-card') || reportWrapper;
                    
                    // Clone to temp container for rendering
                    const tempContainer = document.createElement('div');
                    tempContainer.style.cssText = `
                        position: fixed; top: 0; left: 0; width: 210mm; min-height: 297mm;
                        background: white; z-index: -1000;
                    `;
                    
                    const clone = card.cloneNode(true);
                    // Ensure styles for A4
                    clone.style.width = '210mm';
                    clone.style.minHeight = '297mm';
                    clone.style.margin = '0';
                    clone.style.boxShadow = 'none';
                    clone.style.border = 'none'; // Remove border to prevent double lines/overflow
                    clone.style.zoom = '1'; // Reset zoom to prevent mobile scaling issues
                    
                    // Handle Canvas Elements (Charts) in clone
                    const originalCanvases = card.querySelectorAll('canvas');
                    const clonedCanvases = clone.querySelectorAll('canvas');
                    
                    originalCanvases.forEach((originalCanvas, idx) => {
                        if (clonedCanvases[idx]) {
                            try {
                                if (originalCanvas.width > 0 && originalCanvas.height > 0) {
                                    const imgData = originalCanvas.toDataURL('image/jpeg', 1.0);
                                    const img = document.createElement('img');
                                    img.src = imgData;
                                    img.style.width = '100%';
                                    img.style.display = 'block';
                                    clonedCanvases[idx].parentNode.replaceChild(img, clonedCanvases[idx]);
                                }
                            } catch (e) {
                                console.warn('Failed to convert canvas in iterative export', e);
                            }
                        }
                    });
                    
                    tempContainer.appendChild(clone);
                    document.body.appendChild(tempContainer);

                    // Wait for DOM layout to settle before rendering
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const canvas = await html2canvas(tempContainer, {
                        scale: window.innerWidth <= 768 ? 1.5 : 2, // Optimize scale for mobile
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        windowWidth: 794, // A4 width in px at 96dpi
                        windowHeight: 1123
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.90);
                    const imgWidth = 210;
                    const imgHeight = canvas.height * imgWidth / canvas.width;

                    if (i > 0) doc.addPage();
                    doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

                    document.body.removeChild(tempContainer);
                    
                    // Yield to UI thread to allow progress bar update
                    await new Promise(r => setTimeout(r, 0));
                }

                doc.save(fileName);
                this.showSuccess(`Successfully exported report!`);

            } else {
                // --- SINGLE EXPORT LOGIC (Existing) ---
                
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

                // Clone the element for PDF generation
                const clone = targetElement.cloneNode(true);
                
                // --- FIX: Handle Canvas Elements (Charts) ---
                // cloneNode does not copy canvas content. We must manually convert canvases to images in the clone.
                const originalCanvases = targetElement.querySelectorAll('canvas');
                const clonedCanvases = clone.querySelectorAll('canvas');
                
                originalCanvases.forEach((originalCanvas, index) => {
                    if (clonedCanvases[index]) {
                        try {
                            // Use JPEG to reduce memory usage for charts
                            if (originalCanvas.width > 0 && originalCanvas.height > 0) {
                                const imgData = originalCanvas.toDataURL('image/jpeg', 0.85);
                                const img = document.createElement('img');
                                img.src = imgData;
                                
                                // FIX: Copy exact computed dimensions to prevent html2canvas layout issues
                                const style = window.getComputedStyle(originalCanvas);
                                img.style.width = style.width;
                                img.style.height = style.height;
                                // FIX: Copy exact computed dimensions and attributes to prevent html2canvas layout issues
                                const rect = originalCanvas.getBoundingClientRect();
                                img.width = originalCanvas.width;
                                img.height = originalCanvas.height;
                                img.style.width = (rect.width || originalCanvas.width) + 'px';
                                img.style.height = (rect.height || originalCanvas.height) + 'px';
                                img.style.display = 'block';
                                clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
                            } else {
                                clonedCanvases[index].remove();
                            }
                        } catch (e) {
                            console.warn('Failed to convert canvas to image for export', e);
                        }
                    }
                });

            // Apply A4-specific styling for single report
            clone.style.setProperty('width', '210mm', 'important');
            
            clone.style.setProperty('min-height', '296mm', 'important');
            clone.style.setProperty('padding', '15mm 20mm', 'important');
            clone.style.setProperty('border', '2px solid #000', 'important');

            clone.style.setProperty('margin', '0', 'important');
            clone.style.setProperty('box-shadow', 'none', 'important');
            clone.style.setProperty('background', 'white', 'important');
            clone.style.setProperty('font-size', '11px', 'important');
            // Reset zoom to ensure correct scaling
            clone.style.setProperty('display', 'block', 'important'); // Fix for mobile flex containers
            clone.style.setProperty('zoom', '1', 'important');
            clone.style.setProperty('transform', 'none', 'important');
        
        // Create temporary container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px'; // Move off-screen instead of opacity 0
        container.style.top = '0';
        container.style.width = '210mm';
        // For class reports, allow container to be tall enough for multiple pages
        container.style.height = '297mm';
        container.style.zIndex = '99999';
        container.style.backgroundColor = 'white';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.opacity = '1';
        container.style.pointerEvents = 'none';
        
        container.appendChild(clone);
        document.body.appendChild(container);

        // Wait for DOM layout to settle before rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        await new Promise(resolve => setTimeout(resolve, 800));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const opt = {
            margin: 0,
            filename: fileName,
            image: { 
                type: 'jpeg', 
                quality: 0.95, // Slightly reduced for stability
                backgroundColor: '#ffffff'
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794, // A4 width at 96 DPI
                windowHeight: 1123,
                ignoreElements: (element) => element.classList.contains('no-print'),
                onclone: (clonedDoc) => {
                    // Fix SVG dimensions to prevent html2canvas errors
                    const svgs = clonedDoc.querySelectorAll('svg');
                    svgs.forEach(svg => {
                        const rect = svg.getBoundingClientRect();
                        if (!svg.getAttribute('width') && rect.width) svg.setAttribute('width', rect.width + 'px');
                        if (!svg.getAttribute('height') && rect.height) svg.setAttribute('height', rect.height + 'px');
                    });
                },
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
                mode: ['css', 'legacy']
            },
            progress: updatePdfProgress
        };

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
            
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
            }
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showError(`Failed to export PDF: ${error.message}`);
        } finally {
            if (document.body.contains(progressOverlay)) {
                document.body.removeChild(progressOverlay);
            }
        }
    }

    async exportClassReportToExcel(reportData) {
        const { class: classData, studentReports, term, level, school } = reportData;
        const isLowerPrimary = level === 'lower-primary';
        const isALevel = level === 'alevel';

        // Prepare data for Excel
        const data = [];

        // Add new headers
        const schoolName = school ? school.name.toUpperCase() : 'CLASS REPORT';
        const className = classData ? classData.name.toUpperCase() : 'CLASS';
        const termName = term.toUpperCase();
        const year = new Date().getFullYear();
        const termNum = this.getUgandanTerm();
        const analysisTitle = `${className} CLASS PERFORMANCE ANALYSIS - ${termName} TERM ${termNum} ${year}`;

        data.push([schoolName]);
        data.push([analysisTitle]);
        data.push([`Generated: ${new Date().toLocaleDateString()}`]);
        data.push(['']); // Spacer row

        
        // Headers
        const headers = ['Rank', 'Student Name'];
        
        // Use this.subjects which contains all subjects for the level
        const reportSubjects = this.subjects || [];
        
        reportSubjects.forEach(s => {
            if (isALevel && s.type === 'principal') {
                headers.push(`${s.name} P1`);
                headers.push(`${s.name} P2`);
                headers.push(`${s.name} Grade`);
            } else {
                headers.push(s.name);
                if (!isLowerPrimary) {
                    headers.push('Grade');
                }
            }
        });
        
        if (isALevel) {
            headers.push('Total Points');
            headers.push('Average Marks');
        } else {
            headers.push('Total Marks');
            headers.push('Average Score');
            
            if (!isLowerPrimary) {
                headers.push('Aggregate');
                headers.push('Division');
            }
        }
        
        data.push(headers);
        
        // Rows
        studentReports.forEach((report, index) => {
            const row = [report.rank || index + 1, report.student.name];
            
            reportSubjects.forEach(subject => {
                const markObj = report.marks.find(m => m.subjectId === subject.id);
                
                if (isALevel && subject.type === 'principal') {
                    let p1 = '', p2 = '';
                    if (markObj && markObj.papers) {
                        p1 = markObj.papers.paper1 !== undefined ? markObj.papers.paper1 : '';
                        p2 = markObj.papers.paper2 !== undefined ? markObj.papers.paper2 : '';
                    }
                    row.push(p1);
                    row.push(p2);
                    row.push(markObj ? markObj.grade : '');
                } else {
                    row.push(markObj ? markObj.score : '');
                    if (!isLowerPrimary) {
                        row.push(markObj ? markObj.grade : '');
                    }
                }
            });
            
            if (isALevel) {
                row.push(report.summary.totalPoints);
                row.push(report.summary.average);
            } else {
                row.push(report.summary.totalMarks);
                row.push(report.summary.average);
                
                if (!isLowerPrimary) {
                    row.push(report.summary.aggregate);
                    row.push(report.summary.division);
                }
            }
            
            data.push(row);
        });
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Auto-width
        const wscols = headers.map(h => ({ wch: Math.max(h.length + 2, 10) }));
        ws['!cols'] = wscols;
        
        // Merge title cells
        const totalCols = headers.length;
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // School Name
            { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }  // Date
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Class Analysis");
        
        const fileName = this.getReportFileName(reportData, 'xlsx');
        XLSX.writeFile(wb, fileName);
        
        this.showSuccess('Class analysis exported successfully');
    }

    async exportSubjectReportToExcel(reportData) {
        const ws = ReportService.createSubjectWorksheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Subject Analysis');
        
        const fileName = this.getReportFileName(reportData, 'xlsx');
        XLSX.writeFile(wb, fileName);
        
        this.showSuccess('Subject analysis exported successfully');
    }

    async exportToExcel() {
        if (typeof XLSX === 'undefined') throw new Error('Excel library not loaded');

        // Custom handling for Class Report to support Lower Primary exclusion of Division/Aggregate
        if (this.currentReportData && this.currentReportData.type === 'class') {
            await this.exportClassReportToExcel(this.currentReportData);
            return;
        }

        // Use ReportService for structured Excel export if available (Subject reports)
        if (this.currentReportData && this.currentReportData.type === 'subject') {
            await this.exportSubjectReportToExcel(this.currentReportData);
            return;
        }

        // Fallback to table scraping for other report types
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
        const excelBtn = document.getElementById('exportExcelBtn');
        if (excelBtn) {
            excelBtn.disabled = true;
            excelBtn.style.display = 'inline-block';
        }
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
const initReports = () => {
    new ReportsController();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReports);
} else {
    initReports();
}