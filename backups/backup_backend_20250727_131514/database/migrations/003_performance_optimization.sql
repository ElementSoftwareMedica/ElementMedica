-- Migration: Performance Optimization
-- Description: Add indexes, optimize queries, and improve database performance
-- Date: 2024-01-15
-- Week: 5 - Database and Performance

-- Add indexes for frequently queried columns

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON "Company" ("name");
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON "Company" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_companies_active ON "Company" ("isActive") WHERE "isActive" = true;

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON "Employee" ("companyId");
CREATE INDEX IF NOT EXISTS idx_employees_email ON "Employee" ("email");
CREATE INDEX IF NOT EXISTS idx_employees_name ON "Employee" ("firstName", "lastName");
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON "Employee" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_employees_active ON "Employee" ("isActive") WHERE "isActive" = true;

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_name ON "Course" ("name");
CREATE INDEX IF NOT EXISTS idx_courses_category ON "Course" ("category");
CREATE INDEX IF NOT EXISTS idx_courses_duration ON "Course" ("duration");
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON "Course" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_courses_active ON "Course" ("isActive") WHERE "isActive" = true;

-- Course Schedules table indexes
CREATE INDEX IF NOT EXISTS idx_course_schedules_course_id ON "CourseSchedule" ("courseId");
CREATE INDEX IF NOT EXISTS idx_course_schedules_company_id ON "CourseSchedule" ("companyId");
CREATE INDEX IF NOT EXISTS idx_course_schedules_trainer_id ON "CourseSchedule" ("trainerId");
CREATE INDEX IF NOT EXISTS idx_course_schedules_date_range ON "CourseSchedule" ("startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_course_schedules_status ON "CourseSchedule" ("status");
CREATE INDEX IF NOT EXISTS idx_course_schedules_created_at ON "CourseSchedule" ("createdAt");

-- Course Enrollments table indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_schedule_id ON "CourseEnrollment" ("scheduleId");
CREATE INDEX IF NOT EXISTS idx_course_enrollments_employee_id ON "CourseEnrollment" ("employeeId");
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON "CourseEnrollment" ("status");
CREATE INDEX IF NOT EXISTS idx_course_enrollments_created_at ON "CourseEnrollment" ("createdAt");

-- Trainers table indexes
CREATE INDEX IF NOT EXISTS idx_trainers_name ON "Trainer" ("firstName", "lastName");
CREATE INDEX IF NOT EXISTS idx_trainers_email ON "Trainer" ("email");
CREATE INDEX IF NOT EXISTS idx_trainers_specialization ON "Trainer" ("specialization");
CREATE INDEX IF NOT EXISTS idx_trainers_active ON "Trainer" ("isActive") WHERE "isActive" = true;

-- Course Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_course_sessions_schedule_id ON "CourseSession" ("scheduleId");
CREATE INDEX IF NOT EXISTS idx_course_sessions_date ON "CourseSession" ("date");
CREATE INDEX IF NOT EXISTS idx_course_sessions_status ON "CourseSession" ("status");

-- Users table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON "User" ("email") WHERE "User"."email" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON "User" ("roleId") WHERE "User"."roleId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON "User" ("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "User" ("createdAt");

-- Activity Log table indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON "ActivityLog" ("userId");
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON "ActivityLog" ("action");
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON "ActivityLog" ("timestamp");
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON "ActivityLog" ("entityType", "entityId");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_employees_company_active ON "Employee" ("companyId", "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_schedules_company_date ON "CourseSchedule" ("companyId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_enrollments_schedule_status ON "CourseEnrollment" ("scheduleId", "status");
CREATE INDEX IF NOT EXISTS idx_sessions_schedule_date ON "CourseSession" ("scheduleId", "date");

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_schedules_upcoming ON "CourseSchedule" ("startDate") 
  WHERE "startDate" > CURRENT_DATE AND "status" = 'SCHEDULED';

CREATE INDEX IF NOT EXISTS idx_enrollments_active ON "CourseEnrollment" ("scheduleId", "employeeId") 
  WHERE "status" IN ('ENROLLED', 'COMPLETED');

-- Add database statistics update
ANALYZE "Company";
ANALYZE "Employee";
ANALYZE "Course";
ANALYZE "CourseSchedule";
ANALYZE "CourseEnrollment";
ANALYZE "Trainer";
ANALYZE "CourseSession";
ANALYZE "User";
ANALYZE "ActivityLog";

-- Create materialized view for dashboard statistics (if supported)
-- This will be created as a regular view for compatibility
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM "Company" WHERE "isActive" = true) as active_companies,
  (SELECT COUNT(*) FROM "Employee" WHERE "isActive" = true) as active_employees,
  (SELECT COUNT(*) FROM "Course" WHERE "isActive" = true) as active_courses,
  (SELECT COUNT(*) FROM "CourseSchedule" WHERE "status" = 'SCHEDULED') as scheduled_courses,
  (SELECT COUNT(*) FROM "CourseEnrollment" WHERE "status" = 'ENROLLED') as active_enrollments,
  (SELECT COUNT(*) FROM "Trainer" WHERE "isActive" = true) as active_trainers,
  CURRENT_TIMESTAMP as last_updated;

-- Create function for cache invalidation triggers (if needed)
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to notify application about data changes
  -- for cache invalidation purposes
  PERFORM pg_notify('cache_invalidation', TG_TABLE_NAME || ':' || TG_OP);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add triggers for cache invalidation on critical tables
DROP TRIGGER IF EXISTS cache_invalidation_companies ON "Company";
CREATE TRIGGER cache_invalidation_companies
  AFTER INSERT OR UPDATE OR DELETE ON "Company"
  FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

DROP TRIGGER IF EXISTS cache_invalidation_courses ON "Course";
CREATE TRIGGER cache_invalidation_courses
  AFTER INSERT OR UPDATE OR DELETE ON "Course"
  FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

DROP TRIGGER IF EXISTS cache_invalidation_schedules ON "CourseSchedule";
CREATE TRIGGER cache_invalidation_schedules
  AFTER INSERT OR UPDATE OR DELETE ON "CourseSchedule"
  FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

-- Performance monitoring table for query statistics
CREATE TABLE IF NOT EXISTS query_performance_log (
  id SERIAL PRIMARY KEY,
  query_name VARCHAR(255) NOT NULL,
  execution_time_ms DECIMAL(10,2) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parameters JSONB,
  result_count INTEGER,
  INDEX idx_query_perf_name (query_name),
  INDEX idx_query_perf_time (executed_at),
  INDEX idx_query_perf_duration (execution_time_ms)
);

-- Add comments for documentation
COMMENT ON INDEX idx_companies_name IS 'Index for company name searches';
COMMENT ON INDEX idx_employees_company_id IS 'Index for employee-company relationship queries';
COMMENT ON INDEX idx_course_schedules_date_range IS 'Index for date range queries on course schedules';
COMMENT ON VIEW dashboard_stats IS 'Optimized view for dashboard statistics';
COMMENT ON FUNCTION notify_cache_invalidation() IS 'Function to notify application about data changes for cache invalidation';
COMMENT ON TABLE query_performance_log IS 'Table for monitoring query performance and optimization';

-- Migration completion log
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES (
  '003_performance_optimization', 
  CURRENT_TIMESTAMP, 
  'Added database indexes, views, and performance monitoring for Week 5 optimization'
) ON CONFLICT (migration_name) DO UPDATE SET 
  executed_at = CURRENT_TIMESTAMP,
  description = EXCLUDED.description;