// Dashboard page functionality

// --- NEW: Centralized UI Rendering ---
function renderDashboard() {
    const user = AppState.currentUser;
    if (!user) return;

    const schools = AppState.userSchools || [];
    const currentSchool = AppState.currentSchool;

    const manageSchoolCard = document.getElementById('manageSchoolCard');
    const joinSchoolCard = document.getElementById('joinSchoolCard');
    const registerSchoolCard = document.getElementById('registerSchoolCard');
    const schoolsList = document.getElementById('schoolsList');
    const noSchoolsMessage = document.getElementById('noSchoolsMessage'); // Optional element for empty state

    if (schools.length === 0) {
        if (manageSchoolCard) manageSchoolCard.style.display = 'none';
        if (joinSchoolCard) joinSchoolCard.style.display = 'block';
        if (registerSchoolCard) registerSchoolCard.style.display = 'block';
        if (noSchoolsMessage) noSchoolsMessage.style.display = 'block';
        return;
    }

    // Show management card and hide no-school message
    if (manageSchoolCard) manageSchoolCard.style.display = 'block';
    if (joinSchoolCard) joinSchoolCard.style.display = 'block';
    if (registerSchoolCard) registerSchoolCard.style.display = 'block';
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
    const schoolName = document.getElementById('schoolCardName');
    const schoolCode = document.getElementById('schoolCardCode');
    const schoolInfo = document.getElementById('schoolCardInfo');
    const schoolLogo = document.getElementById('schoolCardLogo');
    const defaultSchoolIcon = null; // not used in new card

    if (schoolLogo) {
        if (school.logoUrl) {
            schoolLogo.src = school.logoUrl;
            schoolLogo.style.display = 'block';
        } else {
            schoolLogo.style.display = 'none';
        }
    }

    if (schoolName) schoolName.textContent = school.name;
    if (schoolCode) schoolCode.textContent = school.code || '';
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

function renderUserProfileCard() {
    try {
        const user = window.AppState.currentUser;
        const userData = window.AppState.currentUserData || {};

        const userDashboardDetails = document.getElementById('userDashboardDetails');
        const profilePictureContainer = document.getElementById('userDashboardProfileImg');
        const userNameElement = document.getElementById('userDashboardName');
        const userRoleElement = document.getElementById('userDashboardRole');
        const userEmailElement = document.getElementById('userDashboardEmail');
        
        if (!user || !userDashboardDetails || !profilePictureContainer || !userNameElement || !userRoleElement || !userEmailElement) {
            console.warn('User data or dashboard elements not found for rendering user profile card.');
            // Optionally hide the card if essential elements are missing
            if (userDashboardDetails) userDashboardDetails.style.display = 'none';
            return;
        }

        // Populate profile picture
        if (userData.profileUrl) {
            profilePictureContainer.innerHTML = `<img src="${userData.profileUrl}" alt="${userData.name || 'Profile'}">`;
        } else {
            profilePictureContainer.innerHTML = `<span>${getInitials(userData.name)}</span>`;
            profilePictureContainer.className = 'user-profile-img initials'; // Use new class name
        }

        // Populate name, role, and email
        userNameElement.textContent = userData.name || user.displayName || user.email.split('@')[0];
        const userRole = userData.role || 'teacher';
        userRoleElement.textContent = userRole.toUpperCase();
        userRoleElement.className = `user-role ${userRole}`; // Add role-specific class for styling
        userEmailElement.textContent = user.email;

        // Add Edit Profile Button if not exists
        if (!document.getElementById('editProfileBtn')) {
            const editBtn = document.createElement('button');
            editBtn.id = 'editProfileBtn';
            editBtn.innerHTML = '<i class="fas fa-pen"></i>';
            editBtn.title = 'Edit Profile';
            Object.assign(editBtn.style, {
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--light)',
                cursor: 'pointer',
                marginLeft: 'auto',
                transition: 'background 0.2s'
            });
            editBtn.addEventListener('mouseenter', () => editBtn.style.background = 'rgba(255, 255, 255, 0.2)');
            editBtn.addEventListener('mouseleave', () => editBtn.style.background = 'rgba(255, 255, 255, 0.1)');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showEditProfileModal();
            });
            
            userDashboardDetails.appendChild(editBtn);
        }

        // Ensure the card is visible (if it was hidden initially)
        userDashboardDetails.style.display = 'flex'; // Assuming flex display for the card

    } catch (error) {
        console.error('Error rendering user profile card:', error);
    }
}

// --- REFACTORED: Initialization and Event Listeners ---
function initDashboard() {
    // The user profile menu is now handled as a separate card below the dashboard header.
    // No need to remove it from the dashboard header.

    renderDashboard(); // Initial render with data from AppState
    renderUserProfileCard();
    setupEventListeners();

    // Listen for state changes from the core app script
    document.addEventListener('schools:loaded', renderDashboard);
    document.addEventListener('school:changed', renderDashboard);
    document.addEventListener('user:loaded', renderUserProfileCard);
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
    document.getElementById('openSchoolPortalBtn')?.addEventListener('click', () => {
        if (AppState.currentSchool) {
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
    
    // Logout button
    document.getElementById('dashboardLogoutBtn')?.addEventListener('click', async () => {
        try {
            await window.Firebase.auth.signOut();
            window.AppState.clear();
            window.navigateTo('login');
        } catch (error) {
            console.error('Error logging out:', error);
            window.showToast('Error logging out', 'error');
        }
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
            
            // Use the teacher's registered subject
            const subjectName = (AppState.currentUserData && AppState.currentUserData.subject) ? AppState.currentUserData.subject : '';
            
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
            const isAlreadyMember = school.teachers && school.teachers.includes(AppState.currentUser.uid);
            
            // Add user to school if not already a member
            if (!isAlreadyMember) {
                await Firebase.db.updateDoc('schools', school.id, {
                    teachers: Firebase.db.arrayUnion(AppState.currentUser.uid)
                });
            }
            
            // Find and assign subject if provided
            let assignedSubjects = [];
            if (subjectName) {
                try {
                    // More efficient: Directly query for the lowercase subject name.
                    let matchedSubjects = await Firebase.db.query('subjects', [
                        { field: 'schoolId', op: '==', value: school.id },
                        { field: 'name_lowercase', op: '==', value: subjectName.toLowerCase() }
                    ]);

                    // Fallback: Try exact name match if lowercase failed (for legacy data)
                    if (matchedSubjects.length === 0) {
                        matchedSubjects = await Firebase.db.query('subjects', [
                            { field: 'schoolId', op: '==', value: school.id },
                            { field: 'name', op: '==', value: subjectName }
                        ]);
                    }

                    assignedSubjects = matchedSubjects.map(s => s.id);
                    
                    if (assignedSubjects.length === 0) {
                        console.warn(`Subject "${subjectName}" not found in school. Teacher will need to be assigned subjects by admin.`);
                    }
                } catch (err) {
                    console.warn('Error matching subject during join:', err);
                }
            }

            // Update user document with assigned subjects
            await Firebase.db.updateDoc('users', AppState.currentUser.uid, {
                schoolId: school.id,
                assignedSubjects: assignedSubjects
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
            if (isAlreadyMember) {
                successText.textContent = `Switched to ${school.name}! Redirecting...`;
            } else {
                successText.textContent = `Successfully joined ${school.name}! Redirecting to portal...`;
            }
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
                createdBy: AppState.currentUser.uid,
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
                'Entrepreneurship', 'Biology', 'History', 'Agriculture', 'Chemistry', 'Physics', 
                'Mathematics', 'French', 'Kiswahili', 'Geography', 'English Language', 'ICT', 
                'Religious Education', 'Islamic Religious Education', 'Luganda', 'Fine art', 'Physical education'
            ],
            'alevel': [
                // Principal Pass Subjects
                { name: 'Mathematics', type: 'principal', paperCount: 2 },
                { name: 'Physics', type: 'principal', paperCount: 2 },
                { name: 'Chemistry', type: 'principal', paperCount: 2 },
                { name: 'Biology', type: 'principal', paperCount: 2 },
                { name: 'Agriculture', type: 'principal', paperCount: 2 },
                { name: 'Economics', type: 'principal', paperCount: 2 },
                { name: 'History', type: 'principal', paperCount: 2 },
                { name: 'Geography', type: 'principal', paperCount: 2 },
                { name: 'Divinity', type: 'principal', paperCount: 2 },
                { name: 'Islamic Religious Education', type: 'principal', paperCount: 2 },
                { name: 'Literature in English', type: 'principal', paperCount: 2 },
                { name: 'Fine Art', type: 'principal', paperCount: 2 },
                { name: 'Entrepreneurship Education', type: 'principal', paperCount: 2 },
                { name: 'Luganda', type: 'principal', paperCount: 2 },
                // Subsidiary Subjects
                { name: 'Subsidiary Math (Sub math)', type: 'subsidiary' },
                { name: 'Sub ICT', type: 'subsidiary' },
                // Compulsory Subject
                { name: 'General paper (GP)', type: 'general' }
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
        for (const subject of subjects) {
            const isAlevelObject = typeof subject === 'object';
            const subjectName = isAlevelObject ? subject.name : subject;

            const subjectData = {
                name: subjectName,
                name_lowercase: subjectName.toLowerCase(),
                schoolId: schoolId,
                level: level,
                category: category,
                createdAt: Firebase.db.serverTimestamp()
            };

            if (isAlevelObject) {
                subjectData.type = subject.type;
                if (subject.paperCount) subjectData.paperCount = subject.paperCount;
            }

            await Firebase.db.addDoc('subjects', subjectData);
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

function showEditProfileModal() {
    const user = AppState.currentUser;
    const userData = AppState.currentUserData || {};
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Profile</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <form id="editProfileForm">
                <div class="form-group">
                    <label><i class="fas fa-user"></i> Full Name</label>
                    <input type="text" id="editName" value="${userData.name || user.displayName || ''}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-envelope"></i> Email Address</label>
                    <input type="email" id="editEmail" value="${user.email || ''}" required>
                    <small style="display:block; margin-top:5px; color:var(--gray-light); font-size:0.85em;">
                        <i class="fas fa-info-circle"></i> Changing email may require re-login.
                    </small>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-book"></i> Subject</label>
                    <input type="text" id="editSubject" value="${userData.subject || ''}" placeholder="e.g. Mathematics">
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => document.body.removeChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.querySelector('#editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newName = document.getElementById('editName').value.trim();
        const newEmail = document.getElementById('editEmail').value.trim();
        const newSubject = document.getElementById('editSubject').value.trim();
        
        if (!newName || !newEmail) {
            showToast('Name and Email are required', 'error');
            return;
        }
        
        try {
            showLoading('Updating profile...');
            
            // Update Firestore Data
            const updates = {
                name: newName,
                subject: newSubject,
                email: newEmail
            };
            
            await Firebase.db.updateDoc('users', user.uid, updates);
            
            // Update local state
            AppState.currentUserData = { ...AppState.currentUserData, ...updates };
            
            // Refresh UI
            renderUserProfileCard();
            
            hideLoading();
            showToast('Profile updated successfully', 'success');
            closeModal();
            
        } catch (error) {
            hideLoading();
            console.error('Profile update error:', error);
            showToast('Failed to update profile: ' + error.message, 'error');
        }
    });
}