import prisma from '@/lib/prisma';
import { Course } from '@prisma/client';

export async function getCourses() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

export async function getCourse(id: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id },
    });
    return course;
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
}

export async function createCourse(data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const course = await prisma.course.create({
      data,
    });
    return course;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

export async function updateCourse(id: string, data: Partial<Course>) {
  try {
    const course = await prisma.course.update({
      where: { id },
      data,
    });
    return course;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

export async function deleteCourse(id: string) {
  try {
    const course = await prisma.course.delete({
      where: { id },
    });
    return course;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
}