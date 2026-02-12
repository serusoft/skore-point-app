document.addEventListener('DOMContentLoaded', () => {
    if (window.appInitialized) {
        initProfilePage();
    } else {
        document.addEventListener('app:initialized', initProfilePage);
    }
});

async function initProfilePage() {
    // Ensure user is logged in
    if (!AppState.currentUser) {
        window.navigateTo('login');
        return;
    }

    // Inject Navbar
    if (window.UI && typeof window.UI.injectNavbar === 'function') {
        window.UI.injectNavbar();
    }

    loadProfileData();
    setupEventListeners();
}

function loadProfileData() {
    const user = AppState.currentUser;
    const userData = AppState.currentUserData || {};

    // Update Header
    document.getElementById('displayName').textContent = userData.name || user.displayName || 'User';
    document.getElementById('displayRole').textContent = (userData.role || 'Teacher').toUpperCase();

    // Update Form Fields
    document.getElementById('fullName').value = userData.name || user.displayName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('subject').value = userData.subject || '';

    // Update Profile Image
    const imgEl = document.getElementById('profileImage');
    if (userData.profileUrl) {
        imgEl.src = userData.profileUrl;
    } else {
        // Generate placeholder with initials
        const initials = getInitials(userData.name || 'User');
        imgEl.src = `https://ui-avatars.com/api/?name=${initials}&background=4361ee&color=fff&size=128`;
    }
}

function setupEventListeners() {
    // Back Button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.history.back();
    });

    // Image Upload Trigger
    document.getElementById('uploadTrigger').addEventListener('click', () => {
        document.getElementById('profileUpload').click();
    });

    // Handle Image Selection
    document.getElementById('profileUpload').addEventListener('change', handleImagePreview);

    // Handle Form Submit
    document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profileImage').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const fileInput = document.getElementById('profileUpload');
    
    if (!name || !email) {
        showToast('Name and Email are required', 'error');
        return;
    }

    try {
        showLoading('Saving profile...');
        
        let profileUrl = AppState.currentUserData.profileUrl;

        // Upload new image if selected
        if (fileInput.files.length > 0) {
            if (window.uploadToCloudinary) {
                profileUrl = await window.uploadToCloudinary(fileInput.files[0], 'user_pictures');
            } else {
                console.warn('Cloudinary service not found');
            }
        }

        const updates = {
            name: name,
            email: email,
            subject: subject,
            profileUrl: profileUrl,
            updatedAt: Firebase.db.serverTimestamp()
        };

        // Update Firestore
        await Firebase.db.updateDoc('users', AppState.currentUser.uid, updates);

        // Update Local State
        AppState.currentUserData = { ...AppState.currentUserData, ...updates };

        // Refresh UI
        loadProfileData();
        
        hideLoading();
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error saving profile:', error);
        showToast('Failed to save profile. Please try again.', 'error');
    }
}