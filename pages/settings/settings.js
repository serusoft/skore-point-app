// pages/settings/settings.js

document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be initialized and user data to be loaded
    document.addEventListener('user:loaded', setupSettingsPage);

    // If user is already loaded (e.g., navigating back), setup immediately
    if (window.AppState && window.AppState.currentUserData) {
        setupSettingsPage();
    }
});

function setupSettingsPage() {
    const profilePicturePreview = document.getElementById('profilePicturePreview');
    const profilePictureInput = document.getElementById('profilePictureInput');
    const uploadProfilePictureBtn = document.getElementById('uploadProfilePictureBtn');
    const uploadStatus = document.getElementById('uploadStatus');

    const user = window.AppState.currentUser;
    const userData = window.AppState.currentUserData;

    if (!user) {
        // This should be handled by the auth guard, but as a fallback:
        window.navigateTo('login');
        return;
    }

    // 1. Display current profile picture
    if (userData && userData.profileUrl) {
        profilePicturePreview.src = userData.profileUrl;
    } else {
        // Fallback to a generic avatar or the one from ui-avatars if needed
        const name = (userData && userData.name) || (user && user.displayName) || (user && user.email) || '';
        const initials = window.getInitials(name);
        profilePicturePreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=100`;
    }

    // 2. Handle file selection
    let selectedFile = null;
    profilePictureInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            uploadProfilePictureBtn.disabled = false;
            // Optional: show a preview of the selected file
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicturePreview.src = e.target.result;
            };
            reader.readAsDataURL(selectedFile);
        } else {
            uploadProfilePictureBtn.disabled = true;
        }
    });

    // 3. Handle upload button click
    uploadProfilePictureBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showStatus('Please select a file first.', 'warning');
            return;
        }

        uploadProfilePictureBtn.disabled = true;
        uploadProfilePictureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        showStatus('Uploading image...', 'info');

        try {
            // Step 1: Upload to Cloudinary
            const cloudinaryUrl = await window.uploadToCloudinary(selectedFile, 'user_pictures');

            // Step 2: Update user's profileUrl in Firestore
            await window.Firebase.db.updateDoc('users', user.uid, {
                profileUrl: cloudinaryUrl
            });

            // Step 3: Update local AppState and UI immediately
            window.AppState.currentUserData.profileUrl = cloudinaryUrl;
            
            // This will trigger the navbar to update
            document.dispatchEvent(new CustomEvent('user-info:updated'));

            showStatus('Profile picture updated successfully!', 'success');
            profilePictureInput.value = ''; // Reset file input
            selectedFile = null;

        } catch (error) {
            console.error('Failed to update profile picture:', error);
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            uploadProfilePictureBtn.disabled = false;
            uploadProfilePictureBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Picture';
        }
    });

    function showStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = `alert alert-${type}`;
        uploadStatus.style.display = 'block';
    }
}
