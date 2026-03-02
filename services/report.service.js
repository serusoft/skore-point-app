// Report Generation Service
import GradingUtils from '../utils/grading.js';

/**
 * Get the current Ugandan school term based on the month.
 * @returns {string} 'I', 'II', or 'III'
 */
function getUgandanTerm() {
    const month = new Date().getMonth() + 1; // getMonth() is 0-indexed
    if (month >= 2 && month <= 4) return 'I';      // Term I: Feb - Apr
    if (month >= 5 && month <= 8) return 'II';     // Term II: May - Aug
    return 'III';                                  // Term III: Sep - Dec (and Jan holidays)
}

// A-Level Combination Mapping - Maps subject sets to their exact codes
const ALEVEL_COMBINATIONS = {
    'Physics,Mathematics,Chemistry': 'PCM',
    'Physics,Mathematics,Biology': 'PMB',
    'Physics,Chemistry,Biology': 'PCB',
    'Physics,Mathematics,Economics': 'PEM',
    'Physics,Mathematics,Geography': 'PMG',
    'Physics,Mathematics,Entrepreneurship': 'PEM',
    'Biology,Chemistry,Mathematics': 'BCM',
    'Biology,Chemistry,Geography': 'BCG',
    'Biology,Chemistry,Economics': 'BCE',
    'Biology,Chemistry,Agriculture': 'BCA',
    'Mathematics,Economics,Geography': 'MEG',
    'Mathematics,Economics,Entrepreneurship': 'MEE',
    'Economics,Geography,History': 'HEG',
    'Economics,Geography,Divinity': 'EGD',
    'Economics,Geography,Entrepreneurship': 'GEE',
    'Economics,Geography,Literature': 'LEG',
    'History,Economics,Geography': 'HEG',
    'History,Economics,Divinity': 'HED',
    'History,Economics,Literature': 'HEL',
    'History,Geography,Divinity': 'HDG',
    'History,Geography,Literature': 'HGL',
    'Literature,Economics,Geography': 'LEG',
    'Literature,Economics,Divinity': 'LED',
    'Literature,History,Geography': 'LHG',
    'Divinity,Economics,Geography': 'DEG',
    'Divinity,History,Geography': 'DHG',
    'Divinity,Literature,Geography': 'DLG',
    'Art,Economics,Geography': 'GEA',
    'Art,History,Geography': 'HAG',
    'Music,Economics,Geography': 'MEG',
    'Music,History,Geography': 'MGH',
    'Agriculture,Chemistry,Biology': 'BAC',
    'Agriculture,Economics,Geography': 'GEA',
    'Agriculture,Biology,Geography': 'BAG',
    'Art,Economics,Mathematics': 'MEA',
    'Art,Entrepreneurship,Mathematics': 'MEA'
};

// A-Level Subject Codes - For generating combinations not in the standard list
const ALEVEL_SUBJECT_CODES = {
    'Physics': 'P', 'Mathematics': 'M', 'Chemistry': 'C', 'Biology': 'B',
    'Economics': 'E', 'Geography': 'G', 'History': 'H', 'Entrepreneurship': 'E',
    'Agriculture': 'A', 'Art': 'A', 'Music': 'M', 'Literature': 'L', 'Divinity': 'D'
};

// Helper function to get A-Level combination code
function getALevelCombination(subjectNames) {
    if (!subjectNames || subjectNames.length === 0) return 'N/A';
    if (subjectNames.length === 3) {
        const sorted = subjectNames.sort().join(',');
        if (ALEVEL_COMBINATIONS[sorted]) return ALEVEL_COMBINATIONS[sorted];
    }
    const codes = subjectNames.map(name => ALEVEL_SUBJECT_CODES[name] || name.charAt(0).toUpperCase()).sort();
    return codes.join('');
}

// Helper to use global Firebase instance
const db = {
    get: async (collection, id) => {
        const doc = await window.Firebase.db.getDoc(collection, id);
        return doc.exists() ? { id: doc.id, ...doc.data() } : null;
    },
    query: async (collection, constraints) => {
        return await window.Firebase.db.query(collection, constraints);
    }
};

const ReportService = {
    // Initialize service
    init() {
        console.log('Report Service initialized');
    },
    
    // Generate student report card
    async generateStudentReport(studentId, term, level) {
        try {
            const student = await db.get('students', studentId);
            if (!student) throw new Error('Student not found');
            
            const classData = await db.get('classes', student.classId);
            const marks = await this.getStudentMarks(studentId, term);
            
            // Get subjects for this level
            const subjects = await db.query('subjects', [
                { field: 'schoolId', op: '==', value: student.schoolId },
                { field: 'category', op: '==', value: level }
            ]);
            
            // Process marks
            const processedMarks = [];
            subjects.forEach(subject => {
                const mark = marks[subject.id];
                if (mark !== undefined) {
                    const score = this.calculateScore(mark, subject);
                    let grade, gradePoints;
                    let paperDetails = [];
                    
                    if (level === 'olevel') {
                        if (score >= 90) grade = 'A';
                        else if (score >= 80) grade = 'B';
                        else if (score >= 70) grade = 'C';
                        else if (score >= 55) grade = 'D';
                        else grade = 'E';
                        gradePoints = 0;
                    } else if (level === 'alevel') {
                        if (subject.type === 'principal') {
                            // Principal Subject Logic
                            if (typeof mark === 'object') {
                                const paperGrades = [];
                                Object.keys(mark).sort().forEach(key => {
                                    if (key.startsWith('paper') && typeof mark[key] === 'number') {
                                        const pScore = mark[key];
                                        const pGrade = GradingUtils.calculateALevelPaperScoreToGrade(pScore);
                                        paperGrades.push(pGrade);
                                        paperDetails.push(`${key.replace('paper', 'P')}: ${pScore}`);
                                    }
                                });
                                
                                if (paperGrades.length > 0) {
                                    grade = GradingUtils.calculateALevelPaperGrade(paperGrades);
                                    gradePoints = GradingUtils.getGradePoints(grade, level);
                                } else {
                                    grade = 'F'; gradePoints = 0;
                                }
                            } else {
                                grade = GradingUtils.calculateGrade(score, level);
                                gradePoints = GradingUtils.getGradePoints(grade, level);
                            }
                        } else {
                            // Subsidiary / GP
                            grade = score >= 50 ? 'Pass' : 'Fail';
                            gradePoints = score >= 50 ? 1 : 0;
                        }
                    } else {
                        grade = GradingUtils.calculateGrade(score, level);
                        gradePoints = GradingUtils.getGradePoints(grade, level);
                    }
                    
                    processedMarks.push({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        score: Math.round(score),
                        grade: grade,
                        gradePoints: gradePoints,
                        papers: typeof mark === 'object' ? mark : null,
                        paperDetails: paperDetails,
                        type: subject.type || 'regular'
                    });
                }
            });
            
            // Calculate summary
            const summary = this.calculateStudentSummary(processedMarks, level);
            
            return {
                type: 'student',
                level: level,
                student: {
                    ...student,
                    className: classData?.name || 'N/A'
                },
                class: classData,
                term: this.getTermDisplayName(term),
                marks: processedMarks,
                summary: summary,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error generating student report:', error);
            throw error;
        }
    },
    
    // Generate class report
    async generateClassReport(classId, term, level) {
        try {
            const classData = await db.get('classes', classId);
            const students = await db.query('students', [
                { field: 'classId', op: '==', value: classId }
            ]);
            
            const studentReports = [];
            let classTotal = 0;
            let studentCount = 0;
            
            for (const student of students) {
                const marks = await this.getStudentMarks(student.id, term);
                if (marks) {
                    const report = await this.generateStudentReport(student.id, term, level);
                    if (report.summary.average > 0) {
                        studentReports.push(report);
                        classTotal += report.summary.average;
                        studentCount++;
                    }
                }
            }
            
            // Calculate class statistics
            const classAverage = studentCount > 0 ? classTotal / studentCount : 0;
            
            // Sort by performance
            studentReports.sort((a, b) => b.summary.average - a.summary.average);
            
            return {
                type: 'class',
                level: level,
                class: classData,
                term: this.getTermDisplayName(term),
                studentReports: studentReports,
                statistics: {
                    totalStudents: students.length,
                    studentsWithMarks: studentReports.length,
                    classAverage: Math.round(classAverage),
                    topPerformer: studentReports[0] || null,
                    lowestPerformer: studentReports[studentReports.length - 1] || null
                },
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error generating class report:', error);
            throw error;
        }
    },
    
    // Generate subject analysis report
    async generateSubjectAnalysis(subjectId, classId, term, level) {
        try {
            const subject = await db.get('subjects', subjectId);
            const classData = await db.get('classes', classId);
            const students = await db.query('students', [
                { field: 'classId', op: '==', value: classId }
            ]);
            
            const subjectMarks = [];
            let totalMarks = 0;
            let markCount = 0;
            
            for (const student of students) {
                const marks = await this.getStudentMarks(student.id, term);
                if (marks && marks[subjectId] !== undefined) {
                    const mark = marks[subjectId];
                    const score = this.calculateScore(mark, subject);
                    
                    if (score > 0) {
                        subjectMarks.push({
                            student: student,
                            score: Math.round(score),
                            grade: GradingUtils.calculateGrade(score, level)
                        });
                        
                        totalMarks += score;
                        markCount++;
                    }
                }
            }
            
            // Calculate statistics
            const averageScore = markCount > 0 ? totalMarks / markCount : 0;
            const passCount = subjectMarks.filter(m => m.score >= 40).length;
            const passRate = markCount > 0 ? (passCount / markCount) * 100 : 0;
            
            // Sort by score
            subjectMarks.sort((a, b) => b.score - a.score);
            
            // Grade distribution
            const gradeDistribution = {};
            subjectMarks.forEach(mark => {
                const grade = mark.grade;
                gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
            });
            
            return {
                type: 'subject',
                level: level,
                class: classData,
                subject: subject,
                term: this.getTermDisplayName(term),
                marks: subjectMarks,
                statistics: {
                    totalStudents: students.length,
                    studentsWithMarks: subjectMarks.length,
                    averageScore: Math.round(averageScore),
                    highestScore: subjectMarks[0]?.score || 0,
                    lowestScore: subjectMarks[subjectMarks.length - 1]?.score || 0,
                    passRate: Math.round(passRate),
                    gradeDistribution: gradeDistribution
                },
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error generating subject analysis:', error);
            throw error;
        }
    },
    
    // Export report as PDF
    async exportReportPDF(reportData, format = 'pdf') {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Add Skore Point branding
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('SKORE POINT - Professional Report Card Generator', 105, 10, { align: 'center' });
            doc.text('A product of SERUSOFT', 105, 15, { align: 'center' });
            
            // Add school information
            if (reportData.school) {
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.text(reportData.school.name, 105, 30, { align: 'center' });
            }
            
            // Add report title
            doc.setFontSize(14);
            const reportTitle = this.getReportTitle(reportData);
            doc.text(reportTitle, 105, 40, { align: 'center' });
            
            // Add generation date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 50, { align: 'center' });
            
            // Save the PDF
            const fileName = `Report_${reportData.type}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            
            return {
                success: true,
                fileName: fileName,
                message: 'PDF exported successfully'
            };
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            return {
                success: false,
                message: `Failed to export PDF: ${error.message}`
            };
        }
    },
    
    // Export report as Excel
    async exportReportExcel(reportData, format = 'excel') {
        try {
            const wb = XLSX.utils.book_new();
            
            // Create worksheet based on report type
            let ws;
            let fileName;
            
            switch (reportData.type) {
                case 'student':
                    ws = this.createStudentWorksheet(reportData);
                    fileName = `Student_Report_${reportData.student.name.replace(/\s+/g, '_')}.xlsx`;
                    break;
                    
                case 'class':
                    ws = this.createClassWorksheet(reportData);
                    fileName = `Class_Report_${reportData.class.name.replace(/\s+/g, '_')}.xlsx`;
                    break;
                    
                case 'subject':
                    ws = this.createSubjectWorksheet(reportData);
                    fileName = `Subject_Analysis_${reportData.subject.name.replace(/\s+/g, '_')}.xlsx`;
                    break;
                    
                case 'school':
                    ws = this.createSchoolWorksheet(reportData);
                    fileName = `School_Summary_${reportData.term.replace(/\s+/g, '_')}.xlsx`;
                    break;
                    
                default:
                    throw new Error('Unsupported report type');
            }
            
            XLSX.utils.book_append_sheet(wb, ws, 'Report');
            XLSX.writeFile(wb, fileName);
            
            return {
                success: true,
                fileName: fileName,
                message: 'Excel exported successfully'
            };
            
        } catch (error) {
            console.error('Error exporting Excel:', error);
            return {
                success: false,
                message: `Failed to export Excel: ${error.message}`
            };
        }
    },
    
    // Helper methods
    async getStudentMarks(studentId, term) {
        try {
            const marksDoc = await db.get('marks', `${studentId}_${term}`);
            return marksDoc || {};
        } catch (error) {
            console.error('Error getting student marks:', error);
            return {};
        }
    },
    
    calculateScore(mark, subject) {
        if (typeof mark === 'object' && mark.paper1 !== undefined) {
            // Calculate average of papers for A-Level subjects
            const paperScores = Object.values(mark).filter(v => typeof v === 'number');
            return paperScores.length > 0 ? paperScores.reduce((a, b) => a + b) / paperScores.length : 0;
        } else if (typeof mark === 'number') {
            return mark;
        }
        return 0;
    },
    
    calculateStudentSummary(marks, level) {
        if (marks.length === 0) {
            return {
                totalSubjects: 0,
                totalMarks: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                aggregate: 0,
                division: 'N/A'
            };
        }
        
        const totalMarks = marks.reduce((sum, mark) => sum + mark.score, 0);
        const average = Math.round(totalMarks / marks.length);
        const highest = Math.max(...marks.map(m => m.score));
        const lowest = Math.min(...marks.map(m => m.score));
        
        let aggregate = 0;
        let division;
        
        if (level === 'alevel') {
            aggregate = GradingUtils.calculateALevelAggregate(marks);
        } else if (level === 'olevel') {
            // O-Level Result Logic
            if (marks.length === 0) division = '4';
            else if (marks.length < 9) division = '2';
            else {
                const hasPassing = marks.some(m => m.score >= 55);
                const allE = marks.every(m => m.score < 55);
                if (allE) division = '3';
                else if (hasPassing) division = '1';
                else division = '3';
            }
            aggregate = totalMarks; // Use Total Score for O-Level
            return {
                totalSubjects: marks.length,
                totalMarks: totalMarks,
                average: average,
                highest: highest,
                lowest: lowest,
                aggregate: aggregate,
                division: division
            };
        } else {
            aggregate = marks.reduce((sum, mark) => sum + mark.gradePoints, 0);
        }
        
        division = GradingUtils.calculateDivision(average, aggregate, level, marks.length);
        
        return {
            totalSubjects: marks.length,
            totalMarks: totalMarks,
            average: average,
            highest: highest,
            lowest: lowest,
            aggregate: aggregate,
            division: division
        };
    },
    
    getTermDisplayName(term) {
        const termNames = {
            'beginning': 'Beginning of Term',
            'mid': 'Mid Term',
            'end': 'End of Term'
        };
        return termNames[term] || term;
    },
    
    getReportTitle(reportData) {
        const typeTitles = {
            'student': 'Student Progress Report',
            'class': 'Class Performance Report',
            'subject': 'Subject Analysis Report',
            'school': 'School Summary Report'
        };
        
        return `${typeTitles[reportData.type]} - ${reportData.term}`;
    },
    
    createStudentWorksheet(reportData) {
        const schoolName = reportData.school ? reportData.school.name.toUpperCase() : 'STUDENT REPORT';
        const termName = reportData.term.toUpperCase();
        const year = new Date().getFullYear();
        const termNum = getUgandanTerm();
        const analysisTitle = `STUDENT PROGRESS REPORT - ${termName} TERM ${termNum} ${year}`;
        
        const isALevel = reportData.level === 'alevel';

        const data = [
            [schoolName],
            ['Generated with Skore Point'],
            [''],
            ['STUDENT INFORMATION'],
            ['Name:', reportData.student.name, '', 'Term:', `${reportData.term} (TERM ${termNum}, ${year})`],
            ['Class:', reportData.student.className, '', 'Date:', new Date().toLocaleDateString()],
            [''],
            ['PERFORMANCE SUMMARY'],
            ['Total Marks', 'Average', isALevel ? 'Points' : 'Aggregate', 'Division'],
            [
                reportData.summary.totalMarks,
                `${reportData.summary.average}%`,
                reportData.summary.aggregate,
                reportData.summary.division
            ],
            [''],
            ['SUBJECT PERFORMANCE'],
            ['Subject', 'Score', 'Grade', 'Points', 'Remarks']
        ];
        
        reportData.marks.forEach(mark => {
            data.push([
                mark.subjectName,
                `${mark.score}%`,
                mark.grade,
                mark.gradePoints,
                GradingUtils.getGradeRemark(mark.grade)
            ]);
        });
        
        data.push(['']);
        data.push(['Generated by Skore Point']);
        
        return XLSX.utils.aoa_to_sheet(data);
    },
    
    createClassWorksheet(reportData) {
        const isALevel = reportData.level === 'alevel';
        // Collect all unique subjects across all students
        const allSubjects = new Set();
        reportData.studentReports.forEach(report => {
            report.marks.forEach(mark => {
                allSubjects.add(mark.subjectName);
            });
        });
        const sortedSubjects = Array.from(allSubjects).sort();
        const schoolName = reportData.school ? reportData.school.name.toUpperCase() : 'CLASS REPORT';
        const className = reportData.class.name.toUpperCase();
        const termName = reportData.term.toUpperCase();
        
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        let termNumber = 'III';
        if (month >= 2 && month <= 4) termNumber = 'I';
        if (month >= 5 && month <= 8) termNumber = 'II';
        
        const analysisTitle = `${className} CLASS PERFORMANCE ANALYSIS ${termName} ${termNumber} ${year}`;

        const data = [
            [schoolName],
            [analysisTitle],
            [`Generated: ${date.toLocaleDateString()}`],
            ['']
        ];
        
        // Build Header Row
        const headerRow = ['Position', 'Student Name'];
        if (isALevel) headerRow.push('Combination');
        sortedSubjects.forEach(subject => {
            headerRow.push(subject);
            headerRow.push('Grade');
        });
        headerRow.push('Total');
        headerRow.push('Average');
        headerRow.push(isALevel ? 'Points' : 'Aggregate');
        headerRow.push('Division');
        
        data.push(headerRow);
        
        // Build Student Rows
        // Ensure sorted by average descending for ranking
        const sortedReports = [...reportData.studentReports].sort((a, b) => b.summary.average - a.summary.average);

        sortedReports.forEach((report, index) => {
            const row = [
                index + 1, // Position
                report.student.name
            ];

            if (isALevel) {
                const principalSubjects = report.marks.filter(m => m.type === 'principal');
                const principalSubjectNames = principalSubjects.map(m => m.subjectName);
                row.push(getALevelCombination(principalSubjectNames));
            }

            // Map marks to sorted subjects
            const marksMap = new Map();
            report.marks.forEach(m => marksMap.set(m.subjectName, m));

            sortedSubjects.forEach(subject => {
                const mark = marksMap.get(subject);
                if (mark) {
                    row.push(mark.score);
                    row.push(mark.grade);
                } else {
                    row.push('-');
                    row.push('-');
                }
            });

            row.push(report.summary.totalMarks);
            row.push(report.summary.average);
            row.push(report.summary.aggregate);
            row.push(report.summary.division);

            data.push(row);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Compact Column Widths
        const colWidths = [];
        colWidths.push({ wch: 11 });  // Position
        colWidths.push({ wch: 33 }); // Student Name
        if (isALevel) colWidths.push({ wch: 12 }); // Combination
        
        // Subjects (Score & Grade)
        sortedSubjects.forEach(() => {
            colWidths.push({ wch: 7 }); // Score
            colWidths.push({ wch: 6 }); // Grade
        });
        
        // Summary
        colWidths.push({ wch: 8 }); // Total
        colWidths.push({ wch: 8 }); // Avg
        colWidths.push({ wch: 8 }); // Agg
        colWidths.push({ wch: 13 }); // Division
        
        ws['!cols'] = colWidths;

        // Merge Headers (Center School Name & Title)
        const totalCols = headerRow.length;
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // School Name
            { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }  // Date
        ];

        // Attempt to set styles (works if library supports it)
        if (ws['A1']) ws['A1'].s = { font: { name: "Arial Black", sz: 26, bold: true }, alignment: { horizontal: "center" } };
        if (ws['A2']) ws['A2'].s = { font: { name: "Algerian", sz: 20, bold: true }, alignment: { horizontal: "center" } };
        if (ws['A3']) ws['A3'].s = { alignment: { horizontal: "center" } };
        
        const headerRowIndex = 4;

        // Apply Styles & Zebra Striping
        if (ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            
            // Header Row Styles (Arial Narrow, 12)
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_ref = XLSX.utils.encode_cell({c: C, r: headerRowIndex});
                if (ws[cell_ref]) {
                    if (!ws[cell_ref].s) ws[cell_ref].s = {};
                    ws[cell_ref].s.font = { name: "Arial Narrow", sz: 12, bold: true };
                }
            }

            for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
                // Bold Student Names (Column B / Index 1)
                const name_cell_ref = XLSX.utils.encode_cell({c: 1, r: R});
                if (ws[name_cell_ref]) {
                    if (!ws[name_cell_ref].s) ws[name_cell_ref].s = {};
                    if (!ws[name_cell_ref].s.font) ws[name_cell_ref].s.font = {};
                    ws[name_cell_ref].s.font.bold = true;
                }
                
                // Center Combination (Column C / Index 2) if A-Level
                if (isALevel) {
                    const combo_cell_ref = XLSX.utils.encode_cell({c: 2, r: R});
                    if (ws[combo_cell_ref]) {
                        if (!ws[combo_cell_ref].s) ws[combo_cell_ref].s = {};
                        ws[combo_cell_ref].s.alignment = { horizontal: "center" };
                    }
                }

                // Zebra Striping (Odd rows relative to data start)
                if ((R - (headerRowIndex + 1)) % 2 !== 0) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
                        if (ws[cell_ref]) {
                            if (!ws[cell_ref].s) ws[cell_ref].s = {};
                            ws[cell_ref].s.fill = { patternType: "solid", fgColor: { rgb: "E6F2FF" } };
                        }
                    }
                }
            }
        }
        
        return ws;
    },

    createSchoolWorksheet(reportData) {
        const schoolName = reportData.school ? reportData.school.name.toUpperCase() : 'SCHOOL REPORT';
        const termName = reportData.term.toUpperCase();
        const year = new Date().getFullYear();
        const termNum = getUgandanTerm();
        const title = `SCHOOL PERFORMANCE SUMMARY - ${termName} TERM ${termNum} ${year}`;
        
        const data = [
            [schoolName],
            [title],
            [`Generated: ${new Date().toLocaleDateString()}`],
            [''],
            ['SCHOOL STATISTICS'],
            ['Statistic', 'Value'],
            ['School Average', `${reportData.statistics.schoolAverage}%`],
            ['Total Classes', reportData.statistics.totalClasses],
            ['Classes with Data', reportData.statistics.classesWithData],
            ['Best Performing Class', reportData.statistics.bestPerformingClass ? `${reportData.statistics.bestPerformingClass.className} (${reportData.statistics.bestPerformingClass.average}%)` : 'N/A'],
            ['Lowest Performing Class', reportData.statistics.lowestPerformingClass ? `${reportData.statistics.lowestPerformingClass.className} (${reportData.statistics.lowestPerformingClass.average}%)` : 'N/A'],
            [''],
            ['CLASS PERFORMANCE RANKING'],
            ['Rank', 'Class', 'Total Students', 'With Marks', 'Average']
        ];
        
        reportData.classReports.forEach((report, index) => {
            data.push([
                index + 1,
                report.className,
                report.totalStudents,
                report.studentsWithMarks,
                `${report.average}%`
            ]);
        });
        
        data.push(['']);
        data.push(['SUBJECT PERFORMANCE RANKING']);
        data.push(['Rank', 'Subject', 'Average Score']);
        
        if (reportData.subjectRankings) {
            reportData.subjectRankings.forEach((subj, index) => {
                data.push([index + 1, subj.name, `${subj.average}%`]);
            });
        }
        
        return XLSX.utils.aoa_to_sheet(data);
    },

    createSubjectWorksheet(reportData) {
        const schoolName = reportData.school ? reportData.school.name.toUpperCase() : 'SUBJECT REPORT';
        const subjectName = reportData.subject ? reportData.subject.name.toUpperCase() : 'SUBJECT';
        const termName = reportData.term.toUpperCase();
        const year = new Date().getFullYear();
        const termNum = getUgandanTerm();
        const analysisTitle = `${subjectName} SUBJECT ANALYSIS ${termName} ${termNum} ${year}`;
        
        const data = [
            [schoolName],
            [analysisTitle],
            ['Generated with Skore Point'],
            ['SUBJECT INFORMATION'],
            ['Subject:', reportData.subject.name, '', 'Term:', `${reportData.term} (TERM ${termNum}, ${year})`],
            ['Class:', reportData.class?.name || 'All Classes', '', 'Date:', new Date().toLocaleDateString()],
            [''],
            ['STATISTICS'],
            ['Students', 'Average', 'Highest', 'Lowest', 'Pass Rate'],
            [
                reportData.statistics.totalStudents,
                `${reportData.statistics.averageScore}%`,
                `${reportData.statistics.highestScore}%`,
                `${reportData.statistics.lowestScore}%`,
                `${reportData.statistics.passRate}%`
            ],
            [''],
            ['GRADE DISTRIBUTION'],
            ['Grade', 'Count', 'Percentage']
        ];
        
        Object.entries(reportData.statistics.gradeDistribution).forEach(([grade, count]) => {
            const percentage = reportData.statistics.studentsWithMarks > 0 
                ? Math.round((count / reportData.statistics.studentsWithMarks) * 100) 
                : 0;
            data.push([grade, count, `${percentage}%`]);
        });
        
        data.push(['']);
        data.push(['STUDENT RANKING']);
        data.push(['Rank', 'Student Name', 'Score', 'Grade', 'Remarks']);
        
        // Sort marks by score descending
        const sortedMarks = [...reportData.marks].sort((a, b) => b.score - a.score);
        
        sortedMarks.forEach((mark, index) => {
            data.push([
                index + 1,
                mark.student.name,
                `${mark.score}%`,
                mark.grade,
                GradingUtils.getGradeRemark(mark.grade)
            ]);
        });
        
        data.push(['']);
        data.push(['Generated by Skore Point']);
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Merge Headers
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // School Name
            { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }  // Title
        ];

        // Set styles for bigger fonts
        if (ws['A1']) ws['A1'].s = { font: { name: "Arial Black", sz: 26, bold: true }, alignment: { horizontal: "center" } };
        if (ws['A2']) ws['A2'].s = { font: { name: "Algerian", sz: 20, bold: true }, alignment: { horizontal: "center" } };

        return ws;
    }
};

export default ReportService;