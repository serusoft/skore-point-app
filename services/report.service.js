// Report Generation Service
import GradingUtils from '/utils/grading.js';

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
                    const grade = GradingUtils.calculateGrade(score, level);
                    const gradePoints = GradingUtils.getGradePoints(grade, level);
                    
                    processedMarks.push({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        score: Math.round(score),
                        grade: grade,
                        gradePoints: gradePoints,
                        papers: typeof mark === 'object' ? mark : null,
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
        
        if (level === 'alevel') {
            aggregate = GradingUtils.calculateALevelAggregate(marks);
        } else {
            aggregate = marks.reduce((sum, mark) => sum + mark.gradePoints, 0);
        }
        
        const division = GradingUtils.calculateDivision(average, aggregate, level);
        
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
        const data = [
            ['SKORE POINT - STUDENT REPORT'],
            ['Generated with Skore Point - Professional Report Card Generator'],
            [''],
            ['Student Information'],
            ['Name:', reportData.student.name],
            ['Class:', reportData.student.className],
            ['Term:', reportData.term],
            ['Generated:', new Date().toLocaleDateString()],
            [''],
            ['Performance Summary'],
            ['Total Subjects', 'Average Score', 'Aggregate', 'Division'],
            [
                reportData.summary.totalSubjects,
                `${reportData.summary.average}%`,
                reportData.summary.aggregate,
                reportData.summary.division
            ],
            [''],
            ['Subject Performance'],
            ['Subject', 'Score', 'Grade', 'Grade Points', 'Remarks']
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
        
        return XLSX.utils.aoa_to_sheet(data);
    },
    
    createClassWorksheet(reportData) {
        const data = [
            ['SKORE POINT - CLASS PERFORMANCE REPORT'],
            ['Generated with Skore Point - Professional Report Card Generator'],
            [''],
            ['Class Information'],
            ['Class:', reportData.class.name],
            ['Term:', reportData.term],
            ['Total Students:', reportData.statistics.totalStudents],
            ['Class Average:', `${reportData.statistics.classAverage}%`],
            ['Generated:', new Date().toLocaleDateString()],
            [''],
            ['Student Performance Ranking'],
            ['Rank', 'Student Name', 'Average Score', 'Grade', 'Division', 'Aggregate']
        ];
        
        reportData.studentReports.forEach((report, index) => {
            data.push([
                index + 1,
                report.student.name,
                `${report.summary.average}%`,
                GradingUtils.calculateGrade(report.summary.average, reportData.level),
                report.summary.division,
                report.summary.aggregate
            ]);
        });
        
        return XLSX.utils.aoa_to_sheet(data);
    },
    
    createSubjectWorksheet(reportData) {
        const data = [
            ['SKORE POINT - SUBJECT ANALYSIS REPORT'],
            ['Generated with Skore Point - Professional Report Card Generator'],
            [''],
            ['Subject Information'],
            ['Subject:', reportData.subject.name],
            ['Class:', reportData.class?.name || 'All Classes'],
            ['Term:', reportData.term],
            ['Generated:', new Date().toLocaleDateString()],
            [''],
            ['Subject Statistics'],
            ['Total Students', 'Average Score', 'Highest Score', 'Lowest Score', 'Pass Rate'],
            [
                reportData.statistics.totalStudents,
                `${reportData.statistics.averageScore}%`,
                `${reportData.statistics.highestScore}%`,
                `${reportData.statistics.lowestScore}%`,
                `${reportData.statistics.passRate}%`
            ],
            [''],
            ['Grade Distribution'],
            ['Grade', 'Count', 'Percentage']
        ];
        
        Object.entries(reportData.statistics.gradeDistribution).forEach(([grade, count]) => {
            const percentage = reportData.statistics.studentsWithMarks > 0 
                ? Math.round((count / reportData.statistics.studentsWithMarks) * 100) 
                : 0;
            data.push([grade, count, `${percentage}%`]);
        });
        
        data.push([''], ['Top Performers'], ['Rank', 'Student Name', 'Score', 'Grade']);
        
        reportData.marks.slice(0, 20).forEach((mark, index) => {
            data.push([
                index + 1,
                mark.student.name,
                `${mark.score}%`,
                mark.grade
            ]);
        });
        
        return XLSX.utils.aoa_to_sheet(data);
    }
};

export default ReportService;