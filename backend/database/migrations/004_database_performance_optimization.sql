-- Week 5 Database Performance Optimization Migration
-- Date: 19 January 2024
-- Purpose: Add missing indexes and optimize database performance

-- Add indexes for foreign keys to improve JOIN performance
CREATE INDEX IF NOT EXISTS idx_employee_company_id ON "Employee"("companyId");
CREATE INDEX IF NOT EXISTS idx_course_schedule_course_id ON "CourseSchedule"("courseId");
CREATE INDEX IF NOT EXISTS idx_course_schedule_company_id ON "CourseSchedule"("companyId");
CREATE INDEX IF NOT EXISTS idx_course_schedule_trainer_id ON "CourseSchedule"("trainerId");
CREATE INDEX IF NOT EXISTS idx_course_enrollment_schedule_id ON "CourseEnrollment"("scheduleId");
CREATE INDEX IF NOT EXISTS idx_course_enrollment_employee_id ON "CourseEnrollment"("employeeId");
CREATE INDEX IF NOT EXISTS idx_course_session_schedule_id ON "CourseSession"("scheduleId");
CREATE INDEX IF NOT EXISTS idx_course_session_trainer_id ON "CourseSession"("trainerId");
CREATE INDEX IF NOT EXISTS idx_course_session_co_trainer_id ON "CourseSession"("coTrainerId");
CREATE INDEX IF NOT EXISTS idx_schedule_company_schedule_id ON "ScheduleCompany"("scheduleId");
CREATE INDEX IF NOT EXISTS idx_schedule_company_company_id ON "ScheduleCompany"("companyId");

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_employee_codice_fiscale ON "Employee"("codice_fiscale");
CREATE INDEX IF NOT EXISTS idx_employee_email ON "Employee"("email");
CREATE INDEX IF NOT EXISTS idx_course_code ON "Course"("code");
CREATE INDEX IF NOT EXISTS idx_course_category ON "Course"("category");
CREATE INDEX IF NOT EXISTS idx_course_schedule_start_date ON "CourseSchedule"("start_date");
CREATE INDEX IF NOT EXISTS idx_course_schedule_end_date ON "CourseSchedule"("end_date");
CREATE INDEX IF NOT EXISTS idx_course_schedule_status ON "CourseSchedule"("status");
CREATE INDEX IF NOT EXISTS idx_course_session_date ON "CourseSession"("date");
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"("username");
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_user_role_id ON "User"("roleId");
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON "ActivityLog"("timestamp");
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON "ActivityLog"("action");
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON "ActivityLog"("resource");

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_course_schedule_company_date ON "CourseSchedule"("companyId", "start_date");
CREATE INDEX IF NOT EXISTS idx_course_enrollment_schedule_employee ON "CourseEnrollment"("scheduleId", "employeeId");
CREATE INDEX IF NOT EXISTS idx_employee_company_status ON "Employee"("companyId", "status");
CREATE INDEX IF NOT EXISTS idx_course_schedule_trainer_date ON "CourseSchedule"("trainerId", "start_date");
CREATE INDEX IF NOT EXISTS idx_activity_log_user_timestamp ON "ActivityLog"("userId", "timestamp");

-- Add indexes for soft delete patterns (eliminato field)
CREATE INDEX IF NOT EXISTS idx_company_eliminato ON "Company"("eliminato");
CREATE INDEX IF NOT EXISTS idx_employee_eliminato ON "Employee"("eliminato");
CREATE INDEX IF NOT EXISTS idx_course_eliminato ON "Course"("eliminato");
CREATE INDEX IF NOT EXISTS idx_course_schedule_eliminato ON "CourseSchedule"("eliminato");
CREATE INDEX IF NOT EXISTS idx_trainer_eliminato ON "Trainer"("eliminato");
CREATE INDEX IF NOT EXISTS idx_user_eliminato ON "User"("eliminato");

-- Add indexes for document generation tracking
CREATE INDEX IF NOT EXISTS idx_attestato_schedule_partecipante ON "Attestato"("scheduledCourseId", "partecipanteId");
CREATE INDEX IF NOT EXISTS idx_lettera_incarico_schedule_trainer ON "LetteraIncarico"("scheduledCourseId", "trainerId");
CREATE INDEX IF NOT EXISTS idx_preventivo_schedule ON "Preventivo"("scheduledCourseId");
CREATE INDEX IF NOT EXISTS idx_fattura_schedule ON "Fattura"("scheduledCourseId");
CREATE INDEX IF NOT EXISTS idx_test_document_schedule ON "TestDocument"("scheduledCourseId");
CREATE INDEX IF NOT EXISTS idx_test_document_trainer ON "TestDocument"("trainerId");

-- Add indexes for date-based queries and reporting
CREATE INDEX IF NOT EXISTS idx_company_created_at ON "Company"("created_at");
CREATE INDEX IF NOT EXISTS idx_employee_created_at ON "Employee"("created_at");
CREATE INDEX IF NOT EXISTS idx_employee_hired_date ON "Employee"("hired_date");
CREATE INDEX IF NOT EXISTS idx_course_created_at ON "Course"("created_at");
CREATE INDEX IF NOT EXISTS idx_course_schedule_created_at ON "CourseSchedule"("created_at");
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("created_at");
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "User"("lastLogin");

-- Add partial indexes for active records only (better performance)
CREATE INDEX IF NOT EXISTS idx_company_active ON "Company"("id") WHERE "eliminato" = false;
CREATE INDEX IF NOT EXISTS idx_employee_active ON "Employee"("id") WHERE "eliminato" = false;
CREATE INDEX IF NOT EXISTS idx_course_active ON "Course"("id") WHERE "eliminato" = false;
CREATE INDEX IF NOT EXISTS idx_course_schedule_active ON "CourseSchedule"("id") WHERE "eliminato" = false;
CREATE INDEX IF NOT EXISTS idx_trainer_active ON "Trainer"("id") WHERE "eliminato" = false;
CREATE INDEX IF NOT EXISTS idx_user_active ON "User"("id") WHERE "eliminato" = false;

-- Add indexes for search functionality
CREATE INDEX IF NOT EXISTS idx_company_ragione_sociale_search ON "Company" USING gin(to_tsvector('italian', "ragione_sociale"));
CREATE INDEX IF NOT EXISTS idx_employee_name_search ON "Employee" USING gin(to_tsvector('italian', "first_name" || ' ' || "last_name"));
CREATE INDEX IF NOT EXISTS idx_course_title_search ON "Course" USING gin(to_tsvector('italian', "title"));
CREATE INDEX IF NOT EXISTS idx_trainer_name_search ON "Trainer" USING gin(to_tsvector('italian', "first_name" || ' ' || "last_name"));

-- Performance optimization: Update table statistics
ANALYZE "Company";
ANALYZE "Employee";
ANALYZE "Course";
ANALYZE "CourseSchedule";
ANALYZE "CourseEnrollment";
ANALYZE "Trainer";
ANALYZE "User";
ANALYZE "ActivityLog";

-- Add comments for documentation
COMMENT ON INDEX idx_employee_company_id IS 'Improves JOIN performance between Employee and Company';
COMMENT ON INDEX idx_course_schedule_company_date IS 'Optimizes queries for company schedules by date range';
COMMENT ON INDEX idx_activity_log_user_timestamp IS 'Optimizes user activity history queries';
COMMENT ON INDEX idx_company_ragione_sociale_search IS 'Full-text search index for company names';
COMMENT ON INDEX idx_employee_name_search IS 'Full-text search index for employee names';

-- Log completion
INSERT INTO "ActivityLog" ("id", "userId", "action", "resource", "details", "timestamp") 
VALUES (
    gen_random_uuid(),
    (SELECT "id" FROM "User" WHERE "username" = 'system' LIMIT 1),
    'database_optimization',
    'migration',
    'Week 5 database performance optimization completed - added 50+ indexes for improved query performance',
    NOW()
) ON CONFLICT DO NOTHING;

COMMIT;