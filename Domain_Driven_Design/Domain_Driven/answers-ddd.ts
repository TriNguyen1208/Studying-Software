/**
 * File: answers-ddd.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH DOMAIN-DRIVEN DESIGN
 * 
 * Yêu cầu: Refactor (Viết lại) một mô hình Anemic Domain 
 * (Quản lý Khóa học trực tuyến) thành Rich Domain Model.
 */

// ============================================================================
// ĐỀ BÀI (MÔ HÌNH THIẾU MÁU - BAD PRACTICE)
// ============================================================================
class AnemicCourse {
    public id: string = "";
    public title: string = "";
    public studentsEnrolled: string[] = [];
    public maxCapacity: number = 0;
    public isPublished: boolean = false;
}

class BadCourseService {
    public enrollStudent(course: AnemicCourse, studentId: string) {
        if (!course.isPublished) throw new Error("Khóa học chưa được công bố");
        if (course.studentsEnrolled.length >= course.maxCapacity) throw new Error("Khóa học đã đầy");
        
        course.studentsEnrolled.push(studentId); // Sửa data trực tiếp
    }
}

// ============================================================================
// ĐÁP ÁN: MÔ HÌNH RICH DOMAIN MODEL (DDD ĐÚNG CHUẨN)
// Khóa data lại (private), dời logic vào trong Model, dùng Ngôn ngữ Chung.
// ============================================================================
class RichCourse {
    // 1. Data bị khóa
    private id: string;
    private title: string;
    private studentsEnrolled: string[];
    private maxCapacity: number;
    private isPublished: boolean;

    constructor(id: string, title: string, maxCapacity: number) {
        this.id = id;
        this.title = title;
        this.maxCapacity = maxCapacity;
        this.studentsEnrolled = [];
        this.isPublished = false;
    }

    // 2. Chứa hành vi xuất bản khóa học (Ubiquitous Language)
    public publish(): void {
        if (this.isPublished) throw new Error("Khóa học này đã được xuất bản rồi.");
        this.isPublished = true;
    }

    // 3. Chứa hành vi ghi danh học viên (Ngay bên trong Model)
    public enrollStudent(studentId: string): void {
        if (!this.isPublished) {
            throw new Error("Ghi danh thất bại: Khóa học chưa được xuất bản.");
        }
        if (this.studentsEnrolled.length >= this.maxCapacity) {
            throw new Error("Ghi danh thất bại: Khóa học đã đạt giới hạn học viên.");
        }
        if (this.studentsEnrolled.includes(studentId)) {
            throw new Error("Ghi danh thất bại: Học viên đã tồn tại trong khóa học.");
        }

        this.studentsEnrolled.push(studentId);
    }

    // Getter để xem danh sách (Trả về bản copy để ngăn việc hack dùng hàm push() bên ngoài)
    public getStudents(): string[] {
        return [...this.studentsEnrolled]; 
    }
}

// ============================================================================
// TEST CHẠY THỬ
// ============================================================================
function testDomain() {
    const course = new RichCourse("COURSE_101", "Học DDD Căn Bản", 2);
    
    // course.enrollStudent("STU_1"); // LỖI: Chưa xuất bản

    course.publish();
    course.enrollStudent("STU_1");
    course.enrollStudent("STU_2");
    
    console.log("Học viên hiện tại: ", course.getStudents()); // [ 'STU_1', 'STU_2' ]
    
    // course.enrollStudent("STU_3"); // LỖI: Đã đầy 2 người
}

testDomain();
