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
  // Nuovi campi per frontend pubblico
  subcategory?: string;
  riskLevel?: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C';
  courseType?: 'PRIMO_CORSO' | 'AGGIORNAMENTO';
  shortDescription?: string;
  fullDescription?: string;
  image1Url?: string;
  image2Url?: string;
  isPublic?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
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