export interface Course {
  id: string;
  title: string;
  category?: string;
  description?: string;
  duration?: string | number; // Può essere sia string che number
  status?: string;
  createdAt: string;
  updatedAt: string;
  code?: string;
  validityYears?: number; // Int in the Prisma schema
  renewalDuration?: string;
  pricePerPerson?: number; // Float in the Prisma schema
  certifications?: string;
  maxPeople?: number; // Int in the Prisma schema
  regulation?: string;
  contents?: string;
  price?: number; // Float in the Prisma schema
}

export interface CourseSchedule {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseEnrollment {
  id: string;
  scheduleId: string;
  employeeId: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: {
      id: string;
      name: string;
    };
  };
}

export interface CourseFormProps {
  course?: Course;
  onSubmit: () => void;
  onCancel: () => void;
}