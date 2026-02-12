// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
});

function initLoginPage() {
    // Debug flag to confirm initialization
    window.loginInit = true;
    console.log('initLoginPage called');
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Login form element not found in DOM');
        return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.querySelector('.password-toggle');
    const loginError = document.getElementById('loginError');
    const loginErrorText = document.getElementById('loginErrorText');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // Clear error when user starts typing
    const clearError = () => { if(loginError) loginError.style.display = 'none'; };
    if(emailInput) emailInput.addEventListener('input', clearError);
    if(passwordInput) passwordInput.addEventListener('input', clearError);
    
    // Password toggle
    passwordToggle?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
    
    // Form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validation
        if (!email || !password) {
            showLoginError('Please enter both email and password');
            return;
        }
        
        if (!isValidEmail(email)) {
            showLoginError('Please enter a valid email address');
            return;
        }
        
        try {
            // Show loading
            UI.showLoading('Signing in...');
            
            // Sign in with Firebase
            await Firebase.auth.signInWithEmailAndPassword(email, password);
            
            // Success - navigation handled by auth state change
            
        } catch (error) {
            if (typeof UI !== 'undefined') UI.hideLoading();
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'The email address format is invalid. Please check for typos.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled. Please contact support for assistance.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account exists with this email address. Please check the email or sign up.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'The password you entered is incorrect. Please try again.';
                    break;
                case 'auth/invalid-login-credentials':
                case 'auth/invalid-credential':
                    errorMessage = 'Incorrect email or password. Please try again.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'We couldn\'t connect to the server. Please check your internet connection.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed login attempts. Please wait a few minutes before trying again.';
                    break;
                default:
                    if (error.message) errorMessage = `Login error: ${error.message}`;
            }
            
            showLoginError(errorMessage);
        }
    });
    
    // Forgot password
    forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
    
    // Auto-focus email input
    emailInput?.focus();
    console.log('login page initialized:', { loginFormExists: !!loginForm, emailInputExists: !!emailInput, passwordInputExists: !!passwordInput });
}

function showLoginError(message) {
    const loginError = document.getElementById('loginError');
    const loginErrorText = document.getElementById('loginErrorText');
    
    if (loginError && loginErrorText) {
        loginErrorText.textContent = message;
        loginError.style.display = 'flex';
        
        // Scroll to error to ensure visibility
        loginError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide removed to ensure user sees the message
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Reset Password</h3>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="alert error" id="forgotError" style="display: none;">
                <i class="fas fa-exclamation-circle"></i>
                <span id="forgotErrorText"></span>
            </div>
            <div class="alert success" id="forgotSuccess" style="display: none;">
                <i class="fas fa-check-circle"></i>
                <span>Password reset email sent!</span>
            </div>
            <form id="forgotPasswordForm">
                <div class="form-group">
                    <label for="resetEmail">
                        <i class="fas fa-envelope"></i> Email Address
                    </label>
                    <input type="email" id="resetEmail" placeholder="Enter your email" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-key"></i> Send Reset Link
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Form submission
    const form = modal.querySelector('#forgotPasswordForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = modal.querySelector('#resetEmail').value.trim();
        
        if (!email || !isValidEmail(email)) {
            showForgotError('Please enter a valid email address');
            return;
        }
        
        try {
            UI.showLoading('Sending reset email...');
            
            await Firebase.auth.sendPasswordResetEmail(email);
            
            UI.hideLoading();
            
            // Show success
            modal.querySelector('#forgotError').style.display = 'none';
            modal.querySelector('#forgotSuccess').style.display = 'flex';
            
            // Close modal after 3 seconds
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 3000);
            
        } catch (error) {
            UI.hideLoading();
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to send reset email. Please try again.';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'We couldn\'t find an account with this email. Please check the spelling.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'The email address format is invalid. Please check for typos.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many requests. Please wait a moment before trying again.';
                    break;
            }
            
            showForgotError(errorMessage);
        }
    });
    
    function showForgotError(message) {
        const errorEl = modal.querySelector('#forgotError');
        const errorText = modal.querySelector('#forgotErrorText');
        
        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
}