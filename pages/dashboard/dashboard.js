// Dashboard page functionality

// --- NEW: Centralized UI Rendering ---
function renderDashboard() {
    const user = AppState.currentUser;
    if (!user) return;

    const schools = AppState.userSchools || [];
    const currentSchool = AppState.currentSchool;
    
    const schoolPortalCard = document.getElementById('schoolPortalCard');
    const mySchoolsCard = document.getElementById('mySchoolsCard');
    const schoolsList = document.getElementById('schoolsList');
    const noSchoolsMessage = document.getElementById('noSchoolsMessage'); // Assuming an element for this state

    if (schools.length === 0) {
        schoolPortalCard.style.display = 'none';
        mySchoolsCard.style.display = 'none';
        if (noSchoolsMessage) noSchoolsMessage.style.display = 'block';
        return;
    }
    
    // Show cards and hide no-school message
    schoolPortalCard.style.display = 'block';
    mySchoolsCard.style.display = 'block';
    if (noSchoolsMessage) noSchoolsMessage.style.display = 'none';

    // Update current school info display
    if (currentSchool) {
        updateCurrentSchoolInfo(currentSchool);
    }
    
    // Populate schools list
    if (schoolsList) {
        schoolsList.innerHTML = '';
        schools.forEach(school => {
            const isCurrent = currentSchool && school.id === currentSchool.id;
            const isAdmin = school.admins && school.admins.includes(user.uid);
            
            const schoolItem = document.createElement('div');
            schoolItem.className = `school-item ${isCurrent ? 'active' : ''}`;
            schoolItem.innerHTML = `
                <h4>${school.name} ${isCurrent ? '<span class="tag-current">(Current)</span>' : ''}</h4>
                <p>Code: ${school.code} • Role: ${isAdmin ? 'Admin' : 'Teacher'}</p>
            `;
            
            if (!isCurrent) {
                schoolItem.addEventListener('click', () => switchToSchool(school.id));
            }
            
            schoolsList.appendChild(schoolItem);
        });
    }
}

function updateCurrentSchoolInfo(school) {
    if (!school) return;
    const schoolName = document.getElementById('schoolName');
    const schoolCode = document.getElementById('schoolCode');
    const schoolInfo = document.getElementById('schoolInfo');
    const schoolLogo = document.getElementById('schoolLogo');
    const defaultSchoolIcon = document.getElementById('defaultSchoolIcon');
    
    if (schoolLogo && defaultSchoolIcon) {
        if (school.logoUrl) {
            schoolLogo.src = school.logoUrl;
            schoolLogo.style.display = 'block';
            defaultSchoolIcon.style.display = 'none';
        } else {
            schoolLogo.style.display = 'none';
            defaultSchoolIcon.style.display = 'block';
        }
    }
    
    if (schoolName) schoolName.textContent = school.name;
    if (schoolCode) schoolCode.textContent = `Code: ${school.code}`;
    if (schoolInfo) schoolInfo.style.display = 'block';
}

async function switchToSchool(schoolId) {
    try {
        showLoading('Switching school...');
        
        // This will trigger the 'school:changed' event from app.js
        await setCurrentSchool(schoolId); 
        
        // UI will update automatically via the event listener.
        
        hideLoading();
        showToast('School switched successfully', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error switching school:', error);
        showToast('Error switching school', 'error');
    }
}

// --- REFACTORED: Initialization and Event Listeners ---
function initDashboard() {
    // Remove user profile menu from dashboard header since it's now in navbar
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        const existingUserProfile = dashboardHeader.querySelector('.user-profile-menu');
        if (existingUserProfile) {
            existingUserProfile.remove();
        }
    }

    renderDashboard(); // Initial render with data from AppState
    setupEventListeners();

    // Listen for state changes from the core app script
    document.addEventListener('schools:loaded', renderDashboard);
    document.addEventListener('school:changed', renderDashboard);
}

function setupEventListeners() {
    // Join School button
    document.getElementById('joinSchoolBtn')?.addEventListener('click', () => {
        showJoinSchoolModal();
    });
    
    // Register School button
    document.getElementById('registerSchoolBtn')?.addEventListener('click', () => {
        showRegisterSchoolModal();
    });
    
    // Enter Portal button
    document.getElementById('enterPortalBtn')?.addEventListener('click', () => {
        if (AppState.currentSchool) {
            // Use the global showLevelSelection if needed, then navigate
            const school = AppState.currentSchool;
            if (school.level === 'primary' || school.level === 'secondary') {
                showLevelSelection(school.level).then(academicLevel => {
                    if (academicLevel) {
                        setAcademicLevel(academicLevel);
                        navigateTo('school');
                    }
                });
            } else {
                navigateTo('school');
            }
        } else {
            showToast('Please join or create a school first.', 'warning');
        }
    });
    
    // Switch School button
    document.getElementById('switchSchoolBtn')?.addEventListener('click', () => {
        showSchoolSwitchModal();
    });
}

// --- Entry Point ---
function onAppReady() {
    initDashboard();
}

if (window.appInitialized) {
    onAppReady();
} else {
    document.addEventListener('app:initialized', onAppReady);
}


function showJoinSchoolModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Join a School</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="alert error" id="joinError" style="display: none;">
                <i class="fas fa-exclamation-circle"></i>
                <span id="joinErrorText"></span>
            </div>
            <div class="alert success" id="joinSuccess" style="display: none;">
                <i class="fas fa-check-circle"></i>
                <span id="joinSuccessText"></span>
            </div>
            <form id="joinSchoolForm">
                <div class="form-group">
                    <label for="joinSchoolName">
                        <i class="fas fa-school"></i> School Name
                    </label>
                    <input type="text" id="joinSchoolName" placeholder="Start typing school name" required>
                    <div class="school-suggestions" id="schoolSuggestions"></div>
                </div>
                <div class="form-group">
                    <label for="joinSchoolCode">
                        <i class="fas fa-key"></i> School Code
                    </label>
                    <input type="text" id="joinSchoolCode" placeholder="6-digit code" required maxlength="6" 
                           oninput="this.value = this.value.toUpperCase()">
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i> Join School
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // School name autocomplete
    const schoolNameInput = modal.querySelector('#joinSchoolName');
    const suggestions = modal.querySelector('#schoolSuggestions');
    
    let schoolsCache = [];
    
    // Load all schools for search
    Firebase.db.getAll('schools').then(schools => {
        schoolsCache = schools;
    });
    
    schoolNameInput.addEventListener('input', () => {
        const searchTerm = schoolNameInput.value.toLowerCase();
        suggestions.innerHTML = '';
        
        if (searchTerm.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filtered = schoolsCache.filter(school => 
            school.name.toLowerCase().includes(searchTerm)
        );
        
        if (filtered.length > 0) {
            filtered.forEach(school => {
                const suggestion = document.createElement('div');
                suggestion.className = 'school-suggestion';
                suggestion.innerHTML = `
                    <span>${school.name}</span>
                    <small>${school.location || ''}</small>
                `;
                suggestion.addEventListener('click', () => {
                    schoolNameInput.value = school.name;
                    modal.querySelector('#joinSchoolCode').value = school.code;
                    suggestions.style.display = 'none';
                });
                suggestions.appendChild(suggestion);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });
    
    // Form submission
    const form = modal.querySelector('#joinSchoolForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const schoolName = schoolNameInput.value.trim();
        const schoolCode = modal.querySelector('#joinSchoolCode').value.trim().toUpperCase();
        
        if (!schoolName || !schoolCode) {
            showJoinError('Please enter both school name and code');
            return;
        }
        
        if (schoolCode.length !== 6) {
            showJoinError('School code must be 6 characters');
            return;
        }
        
        try {
            if (!AppState.currentUser || !AppState.currentUser.uid) {
                showJoinError('User not authenticated. Please log in again.');
                hideLoading();
                return;
            }

            showLoading('Joining school...');
            
            // Search for school in cache
            // Use schoolsCache populated from Firebase.db.getAll('schools')
            const school = schoolsCache.find(s => 
                s.code === schoolCode && s.name.toLowerCase() === schoolName.toLowerCase()
            );
            
            if (!school) {
                hideLoading();
                showJoinError('School not found. Please check name and code.');
                return;
            }
            
            // Check if user is already a member
            if (school.teachers && school.teachers.includes(AppState.currentUser.uid)) {
                hideLoading();
                showJoinError('You are already a member of this school');
                return;
            }
            
            // Add user to school
            await Firebase.db.updateDoc('schools', school.id, {
                teachers: Firebase.db.arrayUnion(AppState.currentUser.uid)
            });
            
            // Update user document
            await Firebase.db.updateDoc('users', AppState.currentUser.uid, {
                schoolId: school.id
            });
            
            // Update app state
            AppState.currentSchool = { id: school.id, ...school };
            AppState.currentUserData.schoolId = school.id;
            
            // Update app state and navigate immediately
            AppState.currentSchool = { id: school.id, ...school };
            AppState.currentUserData.schoolId = school.id;
            
            hideLoading();
            
            // Show success
            modal.querySelector('#joinError').style.display = 'none';
            const successEl = modal.querySelector('#joinSuccess');
            const successText = modal.querySelector('#joinSuccessText');
            successText.textContent = `Successfully joined ${school.name}! Redirecting to portal...`;
            successEl.style.display = 'flex';
            
            // Navigate to school portal after a short delay
            setTimeout(() => {
                document.body.removeChild(modal);
                navigateTo('school');
            }, 1500);
            
        } catch (error) {
            hideLoading();
            console.error('Error joining school:', error);
            showJoinError(`Error joining school: ${error.message || 'Please try again.'}`);
        }
    });
    
    function showJoinError(message) {
        const errorEl = modal.querySelector('#joinError');
        const errorText = modal.querySelector('#joinErrorText');
        
        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
}

function showRegisterSchoolModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Register New School</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="alert error" id="registerSchoolError" style="display: none;">
                <i class="fas fa-exclamation-circle"></i>
                <span id="registerSchoolErrorText"></span>
            </div>
            <div class="alert success" id="registerSchoolSuccess" style="display: none;">
                <i class="fas fa-check-circle"></i>
                <span>School registered successfully!</span>
            </div>
            <form id="registerSchoolForm">
                <div class="form-group">
                    <label for="schoolName">
                        <i class="fas fa-school"></i> School Name
                    </label>
                    <input type="text" id="schoolName" placeholder="Enter school name" required>
                </div>
                <div class="form-group">
                    <label for="schoolLocation">
                        <i class="fas fa-map-marker-alt"></i> Location
                    </label>
                    <input type="text" id="schoolLocation" placeholder="City, Country" required>
                </div>
                <div class="form-group">
                    <label for="schoolPhone">
                        <i class="fas fa-phone"></i> Phone Number
                    </label>
                    <input type="tel" id="schoolPhone" placeholder="+1234567890" required>
                </div>
                <div class="form-group">
                    <label for="schoolLevel">
                        <i class="fas fa-graduation-cap"></i> School Level
                    </label>
                    <select id="schoolLevel" required>
                        <option value="">Select Level</option>
                        <option value="primary">Primary School</option>
                        <option value="secondary">Secondary School</option>
                    </select>
                </div>
                <div class="image-upload" id="schoolLogoUpload">
                    <i class="fas fa-image"></i>
                    <p>Upload School Logo</p>
                    <span>Click to upload (Optional)</span>
                    <div class="image-preview" id="logoPreview" style="display: none;">
                        <img id="logoPreviewImg" src="" alt="Logo Preview">
                    </div>
                    <input type="file" class="file-input" id="logoFile" accept="image/*">
                    <input type="hidden" id="logoUrl">
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-plus-circle"></i> Register School
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Logo upload
    const logoUpload = modal.querySelector('#schoolLogoUpload');
    const logoFile = modal.querySelector('#logoFile');
    const logoPreview = modal.querySelector('#logoPreview');
    const logoPreviewImg = modal.querySelector('#logoPreviewImg');
    
    let logoFileToUpload = null; 
    
    logoUpload.addEventListener('click', () => logoFile.click());
    logoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            logoFileToUpload = null;
            return;
        };
        
        if (!file.type.match('image.*')) {
            showRegisterSchoolError('Please select an image file');
            logoFileToUpload = null;
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showRegisterSchoolError('Image size should be less than 2MB');
            logoFileToUpload = null;
            return;
        }
        
        logoFileToUpload = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            logoPreviewImg.src = e.target.result;
            logoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
    
    // Form submission
    const form = modal.querySelector('#registerSchoolForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = modal.querySelector('#schoolName').value.trim();
        const location = modal.querySelector('#schoolLocation').value.trim();
        const phone = modal.querySelector('#schoolPhone').value.trim();
        const level = modal.querySelector('#schoolLevel').value;
        
        if (!name || !location || !phone || !level) {
            showRegisterSchoolError('Please fill in all required fields');
            return;
        }
        
        // Generate school code
        const code = generateSchoolCode();
        
        try {
            showLoading('Registering school...');
            
            let logoUrl = '';
            if (logoFileToUpload) {
                showLoading('Uploading logo...');
                logoUrl = await window.uploadToCloudinary(logoFileToUpload, 'school_logos');
            }

            // Create school document
            const schoolData = {
                name: name,
                location: location,
                phone: phone,
                level: level,
                code: code,
                logoUrl: logoUrl,
                admins: [AppState.currentUser.uid],
                teachers: [AppState.currentUser.uid],
                createdAt: Firebase.db.serverTimestamp()
            };
            
            const schoolRef = await Firebase.db.addDoc('schools', schoolData);
            
            // Update user document
            await Firebase.db.updateDoc('users', AppState.currentUser.uid, {
                schoolId: schoolRef.id,
                role: 'admin'
            });
            
            // Update app state
            AppState.currentSchool = { id: schoolRef.id, ...schoolData };
            AppState.currentUserData.schoolId = schoolRef.id;
            AppState.currentUserData.role = 'admin';
            
            // Create default classes and subjects based on level
            await createDefaultStructure(schoolRef.id, level);
            
            hideLoading();
            
            // Show success
            modal.querySelector('#registerSchoolError').style.display = 'none';
            modal.querySelector('#registerSchoolSuccess').style.display = 'flex';
            
            // Close modal and reload dashboard after 2 seconds
            setTimeout(() => {
                document.body.removeChild(modal);
                loadUserSchools();
            }, 2000);
            
        } catch (error) {
            hideLoading();
            console.error('Error registering school:', error);
            showRegisterSchoolError('Error registering school. Please try again.');
        }
    });
    
    function showRegisterSchoolError(message) {
        const errorEl = modal.querySelector('#registerSchoolError');
        const errorText = modal.querySelector('#registerSchoolErrorText');
        
        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
}

function showSchoolSwitchModal() {
    // This would show a modal with all user's schools
    // Similar to join school modal but for switching
    showToast('School switching functionality', 'info');
}

function generateSchoolCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function createDefaultStructure(schoolId, level) {
    const defaultClasses = level === 'primary' 
        ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
        : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    
    const defaultSubjects = level === 'primary'
        ? {
            'lower-primary': ['Literacy One', 'Literacy Two', 'Mathematics', 'English', 'Christian Religious Education'],
            'upper-primary': ['Science', 'Mathematics', 'English', 'Social Studies']
        }
        : {
            'olevel': [
                'Entrepreneurship', 'Biology', 'History', 'Agriculture', 'Chemistry',
                'Physics', 'Mathematics', 'French', 'Kiswahili', 'Geography',
                'English Language', 'ICT', 'Religious Education'
            ],
            'alevel': [
                'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Agriculture',
                'Economics', 'History', 'Geography', 'Divinity', 'Islamic Religious Education',
                'Literature in English', 'Fine Art', 'Entrepreneurship Education', 'Luganda',
                'General Paper', 'Subsidiary Mathematics', 'Subsidiary ICT'
            ]
        };
    
    // Create classes
    for (const className of defaultClasses) {
        await Firebase.db.addDoc('classes', {
            name: className,
            schoolId: schoolId,
            level: level,
            category: getClassCategory(className, level),
            createdAt: Firebase.db.serverTimestamp()
        });
    }
    
    // Create subjects for each level
    const subjectCategories = level === 'primary' 
        ? ['lower-primary', 'upper-primary']
        : ['olevel', 'alevel'];
    
    for (const category of subjectCategories) {
        const subjects = defaultSubjects[category];
        for (const subjectName of subjects) {
            await Firebase.db.addDoc('subjects', {
                name: subjectName,
                schoolId: schoolId,
                level: level,
                category: category,
                createdAt: Firebase.db.serverTimestamp()
            });
        }
    }
}

function getClassCategory(className, level) {
    if (level === 'primary') {
        if (['P1', 'P2', 'P3'].includes(className)) return 'lower-primary';
        if (['P4', 'P5', 'P6', 'P7'].includes(className)) return 'upper-primary';
    } else {
        if (['S1', 'S2', 'S3', 'S4'].includes(className)) return 'olevel';
        if (['S5', 'S6'].includes(className)) return 'alevel';
    }
    return 'general';
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}