// pages/profile/profile.js
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be initialized and user data to be loaded
    document.addEventListener('user:loaded', setupProfilePage);

    // If user is already loaded (e.g., navigating back), setup immediately
    if (window.AppState && window.AppState.currentUserData) {
        setupProfilePage();
    }
});

function setupProfilePage() {
    if (!window.AppState.currentUser) {
        window.navigateTo('login');
        return;
    }
    
    loadProfileData();
    setupEventListeners();
}

async function loadProfileData() {
    try {
        const user = window.AppState.currentUser;
        const userData = window.AppState.currentUserData || {};
        
        // Update UI with user data
        document.getElementById('profileUserName').textContent = userData.name || 'User';
        document.getElementById('profileUserEmail').textContent = user.email || '';
        document.getElementById('profileUserRole').textContent = userData.role || 'Teacher';
        
        // Set form values
        document.getElementById('profileName').value = userData.name || '';
        document.getElementById('profileSubject').value = userData.subject || '';
        document.getElementById('profileEmail').value = user.email || '';
        
        // Load profile picture
        const profilePictureContainer = document.getElementById('currentProfilePicture');
        if (userData.profileUrl) {
            profilePictureContainer.innerHTML = `
                <img src="${userData.profileUrl}" 
                     alt="${userData.name || 'Profile'}" 
                     onerror="handleProfileImageError(this)">
            `;
        } else {
            profilePictureContainer.innerHTML = window.getInitials(userData.name || 'User');
            profilePictureContainer.className = 'profile-picture initials';
        }
        
    } catch (error) {
        console.error('Error loading profile data:', error);
        window.UI.showToast('Error loading profile', 'error');
    }
}

function setupEventListeners() {
    const updateForm = document.getElementById('updateProfileForm');
    const editPictureBtn = document.getElementById('editProfilePictureBtn');
    
    // Handle profile picture update
    editPictureBtn.addEventListener('click', () => {
        showProfilePictureModal();
    });
    
    // Handle form submission
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('profileName').value.trim();
        const subject = document.getElementById('profileSubject').value.trim();
        
        if (!name || !subject) {
            showProfileError('Please fill in all required fields');
            return;
        }
        
        try {
            window.UI.showLoading('Updating profile...');
            
            // Update Firestore user document
            await window.Firebase.db.updateDoc('users', window.AppState.currentUser.uid, {
                name: name,
                subject: subject,
                updatedAt: window.Firebase.db.serverTimestamp()
            });
            
            // Update Firebase Auth profile
            await window.Firebase.auth.updateProfile(window.AppState.currentUser, {
                displayName: name
                // Note: photoURL is updated separately when picture changes
            });
            
            // Update app state
            window.AppState.currentUserData.name = name;
            window.AppState.currentUserData.subject = subject;
            
            // Update navbar
            await window.loadUserProfileInNavbar();
            
            window.UI.hideLoading();
            showProfileSuccess();
            
            // Reload profile data
            setTimeout(() => {
                loadProfileData();
            }, 1500);
            
        } catch (error) {
            window.UI.hideLoading();
            console.error('Error updating profile:', error);
            showProfileError('Error updating profile. Please try again.');
        }
    });

    const menuBtn = document.getElementById('profileMenuBtn');
    const menuDropdown = document.getElementById('profileMenuDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileSettingsLink = document.getElementById('profileSettingsLink');

    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (menuDropdown && !menuDropdown.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
            menuDropdown.classList.remove('active');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
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

    if (profileSettingsLink) {
        profileSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.navigateTo('settings');
        });
    }
}

function showProfilePictureModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Update Profile Picture</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="alert error" id="pictureError" style="display: none;">
                <i class="fas fa-exclamation-circle"></i>
                <span id="pictureErrorText"></span>
            </div>
            <div class="picture-upload-container">
                <div class="image-upload" id="pictureUploadArea">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Upload New Photo</p>
                    <span>Click to upload (Max 5MB)</span>
                    <div class="image-preview" id="picturePreview" style="display: none;">
                        <img id="picturePreviewImg" src="" alt="Preview">
                    </div>
                    <input type="file" class="file-input" id="pictureFile" accept="image/*">
                </div>
                <p class="text-center">or</p>
                <button class="btn btn-secondary btn-block" id="removePictureBtn">
                    <i class="fas fa-trash"></i> Remove Current Picture
                </button>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelPictureBtn">
                    Cancel
                </button>
                <button class="btn btn-primary" id="savePictureBtn" disabled>
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let selectedFile = null;
    const pictureUploadArea = modal.querySelector('#pictureUploadArea');
    const pictureFileInput = modal.querySelector('#pictureFile');
    const picturePreview = modal.querySelector('#picturePreview');
    const picturePreviewImg = modal.querySelector('#picturePreviewImg');
    const savePictureBtn = modal.querySelector('#savePictureBtn');
    const removePictureBtn = modal.querySelector('#removePictureBtn');
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancelPictureBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Handle file upload
    pictureUploadArea.addEventListener('click', () => pictureFileInput.click());
    
    pictureFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validation
        if (!file.type.match('image.*')) {
            showPictureError('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showPictureError('Image size should be less than 5MB');
            return;
        }
        
        selectedFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            picturePreviewImg.src = e.target.result;
            picturePreview.style.display = 'block';
            savePictureBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });
    
    // Handle save
    savePictureBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showPictureError('Please select a new picture');
            return;
        }
        
        try {
            window.UI.showLoading('Uploading picture...');
            
            // Upload to Cloudinary
            const uploadedUrl = await window.uploadToCloudinary(selectedFile, 'user_pictures');
            
            // Update Firestore
            await window.Firebase.db.updateDoc('users', window.AppState.currentUser.uid, {
                profileUrl: uploadedUrl,
                updatedAt: window.Firebase.db.serverTimestamp()
            });
            
            // Update Firebase Auth
            await window.Firebase.auth.updateProfile(window.AppState.currentUser, {
                photoURL: uploadedUrl
            });
            
            // Update app state
            window.AppState.currentUserData.profileUrl = uploadedUrl;
            
            // Update navbar
            await window.loadUserProfileInNavbar();
            
            window.UI.hideLoading();
            document.body.removeChild(modal);
            
            // Reload profile page
            loadProfileData();
            
            window.UI.showToast('Profile picture updated successfully!', 'success');
            
        } catch (error) {
            window.UI.hideLoading();
            console.error('Error updating profile picture:', error);
            showPictureError('Error updating picture. Please try again.');
        }
    });
    
    // Handle remove picture
    removePictureBtn.addEventListener('click', async () => {
        try {
            window.UI.showLoading('Removing picture...');
            
            // Update Firestore (set profileUrl to empty)
            await window.Firebase.db.updateDoc('users', window.AppState.currentUser.uid, {
                profileUrl: '',
                updatedAt: window.Firebase.db.serverTimestamp()
            });
            
            // Update Firebase Auth
            await window.Firebase.auth.updateProfile(window.AppState.currentUser, {
                photoURL: null
            });
            
            // Update app state
            window.AppState.currentUserData.profileUrl = '';
            
            // Update navbar
            await window.loadUserProfileInNavbar();
            
            window.UI.hideLoading();
            document.body.removeChild(modal);
            
            // Reload profile page
            loadProfileData();
            
            window.UI.showToast('Profile picture removed', 'success');
            
        } catch (error) {
            window.UI.hideLoading();
            console.error('Error removing profile picture:', error);
            showPictureError('Error removing picture. Please try again.');
        }
    });
    
    function showPictureError(message) {
        const errorEl = modal.querySelector('#pictureError');
        const errorText = modal.querySelector('#pictureErrorText');
        
        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
}

function handleProfileImageError(imgElement) {
    // Replace broken image with initials
    const container = imgElement.parentElement;
    const userName = window.AppState.currentUserData?.name || 'User';
    container.innerHTML = window.getInitials(userName);
    container.className = 'profile-picture initials';
}

function showProfileError(message) {
    const errorEl = document.getElementById('profileError');
    const errorText = document.getElementById('profileErrorText');
    
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.style.display = 'flex';
        setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
    }
}

function showProfileSuccess() {
    const successEl = document.getElementById('profileSuccess');
    if (successEl) {
        successEl.style.display = 'flex';
        setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    }
}