// Validation Utility Functions
// Handles form validation and data integrity checks

const Validators = {
    // Email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return 'Email is required';
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return null;
    },
    
    // Password validation
    validatePassword(password) {
        if (!password) return 'Password is required';
        if (password.length < 6) return 'Password must be at least 6 characters';
        return null;
    },
    
    // Confirm password validation
    validateConfirmPassword(password, confirmPassword) {
        if (!confirmPassword) return 'Please confirm your password';
        if (password !== confirmPassword) return 'Passwords do not match';
        return null;
    },
    
    // Name validation
    validateName(name, fieldName = 'Name') {
        if (!name || name.trim().length === 0) return `${fieldName} is required`;
        if (name.length < 2) return `${fieldName} must be at least 2 characters`;
        if (name.length > 50) return `${fieldName} must be less than 50 characters`;
        return null;
    },
    
    // School name validation
    validateSchoolName(name) {
        if (!name || name.trim().length === 0) return 'School name is required';
        if (name.length < 3) return 'School name must be at least 3 characters';
        if (name.length > 100) return 'School name must be less than 100 characters';
        return null;
    },
    
    // School code validation
    validateSchoolCode(code) {
        if (!code) return 'School code is required';
        if (code.length !== 6) return 'School code must be exactly 6 characters';
        if (!/^[A-Z0-9]{6}$/.test(code)) return 'School code must contain only uppercase letters and numbers';
        return null;
    },
    
    // Phone number validation
    validatePhone(phone) {
        if (!phone) return 'Phone number is required';
        // Simple validation - adjust for your country
        const phoneRegex = /^\+?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
        return null;
    },
    
    // Marks validation (0-100)
    validateMarks(marks, subjectName) {
        if (marks === undefined || marks === null || marks === '') {
            return `Marks for ${subjectName} are required`;
        }
        
        const numericMarks = Number(marks);
        if (isNaN(numericMarks)) {
            return `Marks for ${subjectName} must be a number`;
        }
        
        if (numericMarks < 0 || numericMarks > 100) {
            return `Marks for ${subjectName} must be between 0 and 100`;
        }
        
        if (!Number.isInteger(numericMarks)) {
            return `Marks for ${subjectName} must be a whole number`;
        }
        
        return null;
    },
    
    // File validation
    validateFile(file, allowedTypes, maxSizeMB) {
        if (!file) return 'File is required';
        
        // Check file type
        const fileType = file.type;
        const isValidType = allowedTypes.some(type => 
            fileType.includes(type) || file.name.endsWith(`.${type}`)
        );
        
        if (!isValidType) {
            return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        }
        
        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return `File size must be less than ${maxSizeMB}MB`;
        }
        
        return null;
    },
    
    // Image validation
    validateImage(file, maxSizeMB = 2) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return this.validateFile(file, allowedTypes, maxSizeMB);
    },
    
    // Excel file validation
    validateExcel(file, maxSizeMB = 5) {
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls',
            'xlsx'
        ];
        return this.validateFile(file, allowedTypes, maxSizeMB);
    },
    
    // Form validation helper
    validateForm(formData, validationRules) {
        const errors = {};
        
        Object.keys(validationRules).forEach(field => {
            const value = formData[field];
            const rules = validationRules[field];
            
            rules.forEach(rule => {
                const error = rule(value, formData);
                if (error) {
                    errors[field] = error;
                }
            });
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },
    
    // Real-time validation for input fields
    setupInputValidation(inputElement, validationFn) {
        inputElement.addEventListener('blur', () => {
            const error = validationFn(inputElement.value);
            this.showValidationError(inputElement, error);
        });
        
        inputElement.addEventListener('input', () => {
            this.clearValidationError(inputElement);
        });
    },
    
    // Show validation error
    showValidationError(inputElement, errorMessage) {
        this.clearValidationError(inputElement);
        
        if (errorMessage) {
            inputElement.classList.add('invalid');
            
            const errorElement = document.createElement('div');
            errorElement.className = 'validation-error';
            errorElement.textContent = errorMessage;
            errorElement.style.cssText = `
                color: var(--error);
                font-size: 12px;
                margin-top: 5px;
            `;
            
            inputElement.parentNode.appendChild(errorElement);
        }
    },
    
    // Clear validation error
    clearValidationError(inputElement) {
        inputElement.classList.remove('invalid');
        
        const existingError = inputElement.parentNode.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }
    }
};

export default Validators;