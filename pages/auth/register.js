// pages/auth/register.js

document.addEventListener('DOMContentLoaded', () => {
    initRegistrationPage();
});

function initRegistrationPage() {
    const registerForm = document.getElementById('registerForm');
    const profileUploadArea = document.getElementById('profileUploadArea');
    const profileFileInput = document.getElementById('profileFile');
    const profilePreview = document.getElementById('profilePreview');
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    
    let selectedFile = null; // We'll store the File object, not the data URL
    
    // Handle profile image upload area click
    profileUploadArea?.addEventListener('click', () => {
        profileFileInput.click();
    });
    
    // Handle file selection and preview
    profileFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Basic client-side validation
        if (!file.type.match('image.*')) {
            showRegisterError('Please select an image file (JPEG, PNG, GIF).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showRegisterError('Image size should be less than 5MB.');
            return;
        }
        
        selectedFile = file; // Store the file object

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreviewImg.src = e.target.result;
            profilePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
    
    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const passwordInput = e.currentTarget.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            e.currentTarget.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });
    
    // Form submission handler
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const subject = document.getElementById('regSubject').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // --- Validation ---
        if (!selectedFile) {
            showRegisterError('Profile picture is required.');
            return;
        }
        if (!name || !email || !subject) {
            showRegisterError('Please fill in all required fields.');
            return;
        }
        if (!isValidEmail(email)) {
            showRegisterError('Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            showRegisterError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            showRegisterError('Passwords do not match.');
            return;
        }
        
        // --- Registration Process ---
        try {
            UI.showLoading('Creating your account...');

            // 1. Upload profile picture to Cloudinary
            let uploadedProfileUrl = '';
            try {
                UI.updateLoadingMessage('default', 'Uploading profile picture...');
                uploadedProfileUrl = await window.uploadToCloudinary(selectedFile, 'user_pictures');
            } catch (uploadError) {
                throw new Error('Profile picture upload failed. Please try again.');
            }

            // 2. Create user with Firebase Auth
            UI.updateLoadingMessage('Finalizing account...');
            const userCredential = await Firebase.auth.createUserWithEmailAndPassword(email, password);
            
            // 3. Update Firebase Auth profile
            await Firebase.auth.updateProfile(userCredential.user, {
                displayName: name,
                photoURL: uploadedProfileUrl // Also save to Firebase Auth profile
            });
            
            // 4. Create user document in Firestore
            const userData = {
                name: name,
                email: email,
                subject: subject,
                profileUrl: uploadedProfileUrl, // Use the URL from Cloudinary
                role: 'teacher',
                assignedSubjects: [], // Will be populated when joining a school
                createdAt: Firebase.db.serverTimestamp()
            };
            await Firebase.db.setDoc('users', userCredential.user.uid, userData);

            UI.hideLoading();
            showRegisterSuccess();

            // Update app state with user data including profile URL
            AppState.currentUserData = userData;
            AppState.currentUser = userCredential.user;

            // Update navbar immediately
            if (typeof loadUserProfileInNavbar === 'function') {
                setTimeout(() => {
                    loadUserProfileInNavbar();
                }, 100);
            }

            // Redirect to dashboard
            setTimeout(() => {
                window.navigateTo('dashboard'); // Use window.navigateTo for consistency
            }, 2000);
            
        } catch (error) {
            UI.hideLoading();
            console.error('Registration error:', error);

            let errorMessage = 'Registration failed. Please try again.';
            const code = error.code || (error.message.includes('auth/') ? error.message.split(' ')[0] : null);
            
            switch (code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists. Please log in instead.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'The email address format is invalid. Please enter a valid email (e.g., name@example.com).';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'The password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'We couldn\'t connect to the server. Please check your internet connection.';
                    break;
                default:
                    if (error.message) errorMessage = `Registration error: ${error.message}`;
            }
            showRegisterError(errorMessage);
        }
    });
    
    document.getElementById('regName')?.focus();
}

function showRegisterError(message) {
    const errorEl = document.getElementById('registerError');
    const errorText = document.getElementById('registerErrorText');
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.style.display = 'flex';
        setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
    }
}

function showRegisterSuccess() {
    const successEl = document.getElementById('registerSuccess');
    if (successEl) {
        successEl.style.display = 'flex';
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}
