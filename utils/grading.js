// Grading Utilities for Different Academic Levels

const GradingUtils = {
    // Grade calculation for different levels
    calculateGrade(score, level) {
        if (level === 'alevel') {
            return this.calculateALevelGrade(score);
        } else if (level === 'olevel') {
            return this.calculateOLevelGrade(score);
        } else if (level.includes('primary')) {
            return this.calculatePrimaryGrade(score, level);
        }
        return 'N/A';
    },
    
    // A-Level Grade Calculation (Numerical to Letter)
    calculateALevelGrade(score) {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        if (score >= 35) return 'O';
        return 'F';
    },
    
    // O-Level Grade Calculation
    calculateOLevelGrade(score) {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
    },
    
    // Primary Grade Calculation
    calculatePrimaryGrade(score, level) {
        if (level === 'lower-primary') {
            return this.calculateLowerPrimaryGrade(score);
        } else {
            return this.calculateUpperPrimaryGrade(score);
        }
    },
    
    // Lower Primary (Remarks based)
    calculateLowerPrimaryGrade(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'V.GOOD';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Fair';
        if (score >= 50) return 'Pass';
        return 'Fail';
    },
    
    // Upper Primary (Grade points)
    calculateUpperPrimaryGrade(score) {
        if (score >= 90) return 'D1';
        if (score >= 80) return 'D2';
        if (score >= 75) return 'C3';
        if (score >= 70) return 'C4';
        if (score >= 65) return 'C5';
        if (score >= 60) return 'C6';
        if (score >= 50) return 'P7';
        if (score >= 40) return 'P8';
        return 'F9';
    },
    
    // Get grade points for different levels
    getGradePoints(grade, level) {
        const gradePoints = {
            'alevel': {
                'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2, 'O': 1, 'F': 0
            },
            'olevel': {
                'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 9
            },
            'upper-primary': {
                'D1': 1, 'D2': 2, 'C3': 3, 'C4': 4, 'C5': 5, 'C6': 6, 'P7': 7, 'P8': 8, 'P9': 9, 'F9': 9
            },
            'lower-primary': {
                'Excellent': 1, 'V.GOOD': 2, 'Good': 3, 'Fair': 4, 'Pass': 5, 'Fail': 9
            }
        };
        
        return gradePoints[level]?.[grade] || 0;
    },
    
    // Calculate division
    calculateDivision(average, aggregate, level, subjectCount) {
        if (level === 'alevel') {
            if (aggregate <= 12) return 'Division 1';
            if (aggregate <= 24) return 'Division 2';
            if (aggregate <= 36) return 'Division 3';
            return 'Division 4';
        } else if (level === 'olevel') {
            if (average >= 80) return 'Division 1';
            if (average >= 70) return 'Division 2';
            if (average >= 60) return 'Division 3';
            if (average >= 50) return 'Division 4';
            return 'Fail';
        } else if (level === 'upper-primary') {
            if (subjectCount !== undefined && subjectCount < 4) return 'U';
            if (aggregate <= 12) return 'Division 1';
            if (aggregate <= 23) return 'Division 2';
            if (aggregate <= 28) return 'Division 3';
            if (aggregate <= 34) return 'Division 4';
            return 'U';
        }
        return 'N/A';
    },
    
    // Get grade remarks
    getGradeRemark(grade) {
        const remarks = {
            'A': 'Exceptional',
            'B': 'Outstanding',
            'C': 'Good',
            'D': 'Fair',
            'E': 'Pass',
            'O': 'Low Pass',
            'F': 'Fail',
            'D1': 'Distinction',
            'D2': 'Very Good',
            'C3': 'Credit',
            'C4': 'Credit',
            'C5': 'Credit',
            'C6': 'Credit',
            'P7': 'Pass',
            'P8': 'Pass',
            'P9': 'Pass',
            'F9': 'Fail',
            'Excellent': 'Excellent',
            'V.GOOD': 'Very Good',
            'Good': 'Good',
            'Fair': 'Fair',
            'Pass': 'Pass',
            'Fail': 'Fail'
        };
        
        return remarks[grade] || 'N/A';
    },
    
    // A-Level Paper Score to Grade (1-9)
    calculateALevelPaperScoreToGrade(score) {
        if (score >= 75) return '1';
        if (score >= 70) return '2';
        if (score >= 65) return '3';
        if (score >= 60) return '4';
        if (score >= 55) return '5';
        if (score >= 50) return '6';
        if (score >= 45) return '7';
        if (score >= 40) return '8';
        return '9';
    },

    // Get primary remarks
    getPrimaryRemark(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'V.GOOD';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Fair';
        if (score >= 50) return 'Pass';
        return 'Fail';
    },
    
    // A-Level paper combination grade calculation
    calculateALevelPaperGrade(paperGrades) {
        // Convert grades to numerical values
        const gradeValues = paperGrades.map(grade => this.gradeToNumber(grade));
        const aggregate = gradeValues.reduce((a, b) => a + b, 0);
        
        // Determine final grade based on paper count and aggregate
        if (paperGrades.length === 2) {
            return this.calculateTwoPaperGrade(gradeValues, aggregate);
        } else if (paperGrades.length === 3) {
            return this.calculateThreePaperGrade(gradeValues, aggregate);
        }
        
        return 'F';
    },
    
    gradeToNumber(grade) {
        const values = {
            '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
            '6': 6, '7': 7, '8': 8, '9': 9
        };
        return values[grade] || 9;
    },
    
    calculateTwoPaperGrade(paperValues, aggregate) {
        const [p1, p2] = paperValues;
        
        if (aggregate <= 3) return 'A';
        if (aggregate <= 5) return 'B';
        if (aggregate <= 8) return 'C';
        if (aggregate <= 12) return 'D';
        if (aggregate <= 14) return 'E';
        if (aggregate <= 15) return 'O';
        return 'F';
    },
    
    calculateThreePaperGrade(paperValues, aggregate) {
        const sorted = [...paperValues].sort((a, b) => a - b);
        const [lowest, middle, highest] = sorted;
        
        if (aggregate <= 5 && highest <= 2) return 'A';
        if (aggregate <= 7 && highest <= 3) return 'B';
        if (aggregate <= 10 && highest <= 4) return 'C';
        if (aggregate <= 13 && highest <= 5) return 'D';
        if (aggregate <= 17 && highest <= 6) return 'E';
        if (aggregate <= 19 && highest <= 7) return 'O';
        return 'F';
    },
    
    // Calculate aggregate for A-Level
    calculateALevelAggregate(marks) {
        let aggregate = 0;
        
        // Get principal subjects (sorted by grade points)
        const principalSubjects = marks
            .filter(mark => mark.type === 'principal')
            .sort((a, b) => b.gradePoints - a.gradePoints)
            .slice(0, 3); // Take best 3
        
        // Add principal subject points
        principalSubjects.forEach(subject => {
            aggregate += subject.gradePoints;
        });
        
        // Add General Paper if score >= 50%
        const generalPaper = marks.find(mark => mark.type === 'general');
        if (generalPaper && generalPaper.score >= 50) {
            aggregate += 1;
        }
        
        // Add Subsidiary if score >= 50%
        const subsidiary = marks.find(mark => mark.type === 'subsidiary');
        if (subsidiary && subsidiary.score >= 50) {
            aggregate += 1;
        }
        
        return aggregate;
    }
};

export default GradingUtils;