// Registration page functionality
document.addEventListener('DOMContentLoaded', () => {
    initRegistrationPage();
});

function initRegistrationPage() {
    const registerForm = document.getElementById('registerForm');
    const profileUploadArea = document.getElementById('profileUploadArea');
    const profileFileInput = document.getElementById('profileFile');
    const profilePreview = document.getElementById('profilePreview');
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    const profileUrlInput = document.getElementById('profileUrl');
    
    let profileImageUrl = '';
    
    // Handle profile image upload
    profileUploadArea?.addEventListener('click', () => {
        profileFileInput.click();
    });
    
    profileFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showRegisterError('Please select an image file (JPEG, PNG, GIF)');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showRegisterError('Image size should be less than 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            profileImageUrl = e.target.result;
            profilePreviewImg.src = profileImageUrl;
            profilePreview.style.display = 'block';
            profileUrlInput.value = profileImageUrl;
        };
        reader.readAsDataURL(file);
    });
    
    // Password toggles
    document.querySelectorAll('.password-toggle').forEach((toggle, index) => {
        toggle.addEventListener('click', () => {
            const passwordInput = index === 0 ? 
                document.getElementById('regPassword') : 
                document.getElementById('confirmPassword');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggle.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });
    
    // Form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const subject = document.getElementById('regSubject').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!profileImageUrl) {
            showRegisterError('Profile picture is required');
            return;
        }
        
        if (!name || !email || !subject) {
            showRegisterError('Please fill in all required fields');
            return;
        }
        
        if (!isValidEmail(email)) {
            showRegisterError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            showRegisterError('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            showRegisterError('Passwords do not match');
            return;
        }
        
        try {
            console.log('Register: submitting', { name, email, subject });
            UI.showLoading('Creating account...');

            if (!window.Firebase || !Firebase.auth || typeof Firebase.auth.createUserWithEmailAndPassword !== 'function') {
                UI.hideLoading();
                console.error('Firebase auth function not available', window.Firebase);
                showRegisterError('Authentication service unavailable. Please try again later.');
                return;
            }

            // Create user with Firebase
            const userCredential = await Firebase.auth.createUserWithEmailAndPassword(email, password);
            console.log('Register: createUserWithEmailAndPassword result', userCredential);
            
            // Update user profile
            await Firebase.auth.updateProfile(userCredential.user, {
                displayName: name
            });
            
            // Create user document in Firestore
            const userData = {
                name: name,
                email: email,
                subject: subject,
                profileUrl: profileImageUrl,
                role: 'teacher',
                createdAt: Firebase.db.serverTimestamp()
            };
            
            const dbRes = await Firebase.db.setDoc('users', userCredential.user.uid, userData);
            console.log('Register: setDoc result', dbRes);

            UI.hideLoading();
            
            // Show success message
            showRegisterSuccess();
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                Router.navigateTo('dashboard');
            }, 2000);
            
        } catch (error) {
            UI.hideLoading();
            console.error('Registration error:', error);

            let errorMessage = 'Registration failed. ';
            const code = error && (error.code || (error.message && error.message.code)) ? (error.code || error.message.code) : null;
            switch (code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'Email is already registered.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password is too weak.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage += 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage += (error && (error.message || error)) || 'Please try again.';
            }

            showRegisterError(errorMessage);
        }
    });
    
    // Auto-focus name input
    document.getElementById('regName')?.focus();
}

function showRegisterError(message) {
    const errorEl = document.getElementById('registerError');
    const errorText = document.getElementById('registerErrorText');
    
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.style.display = 'flex';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
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
    return re.test(email);
}