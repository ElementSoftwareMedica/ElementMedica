import React, { useState, useEffect } from 'react';
import { getCourses, createCourse, updateCourse, createCourseSchedule, enrollEmployees } from '../services/courses';
import { Course, CourseSchedule } from '../services/courses';

export interface CourseInsert {
  title: string;
  category?: string;
  description?: string;
  duration?: string;
  status?: 'Active' | 'Inactive';
  validityYears?: number;
  code?: string;
  pricePerPerson?: number;
  maxPeople?: number;
  renewalDuration?: string;
  regulation?: string;
  certifications?: string;
  contents?: string;
}

export interface CourseUpdate {
  title?: string;
  category?: string;
  description?: string;
  duration?: string;
  status?: 'Active' | 'Inactive';
  validityYears?: number;
  code?: string;
  pricePerPerson?: number;
  maxPeople?: number;
  renewalDuration?: string;
  regulation?: string;
  certifications?: string;
  contents?: string;
}

export interface CourseScheduleInsert {
  courseId: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  status?: string;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  async function addCourse(course: CourseInsert) {
    try {
      setError(null);
      const newCourse = await createCourse(course);
      setCourses(prev => [...prev, newCourse]);
      return newCourse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
      throw err;
    }
  }

  async function editCourse(id: string, course: CourseUpdate) {
    try {
      setError(null);
      const updatedCourse = await updateCourse(id, course);
      setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
      return updatedCourse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
      throw err;
    }
  }

  async function scheduleCourse(schedule: CourseScheduleInsert) {
    try {
      setError(null);
      const newSchedule = await createCourseSchedule(schedule);
      return newSchedule;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule course');
      throw err;
    }
  }

  async function enrollInCourse(scheduleId: string, employeeIds: string[]) {
    try {
      setError(null);
      const enrollments = await enrollEmployees(scheduleId, employeeIds);
      return enrollments;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll employees');
      throw err;
    }
  }

  return {
    courses,
    loading,
    error,
    addCourse,
    editCourse,
    scheduleCourse,
    enrollInCourse,
    refresh: loadCourses
  };
}

export default useCourses;