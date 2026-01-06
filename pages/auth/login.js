// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
});

function initLoginPage() {
    // Debug flag to confirm initialization
    window.loginInit = true;
    console.log('initLoginPage called');
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.querySelector('.password-toggle');
    const loginError = document.getElementById('loginError');
    const loginErrorText = document.getElementById('loginErrorText');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
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
            UI.hideLoading();
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. ';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage += 'Account has been disabled.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage += 'Invalid email or password.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage += 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage += error.message;
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
        
        // Hide after 5 seconds
        setTimeout(() => {
            loginError.style.display = 'none';
        }, 5000);
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
            
            let errorMessage = 'Error sending reset email. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'No account found with this email.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                default:
                    errorMessage += 'Please try again.';
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