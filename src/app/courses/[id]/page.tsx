'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Removed unused Course import - using CourseFormData type instead
import { createCourse, getCourse, updateCourse } from '@/services/courses';
import { Button } from '@/design-system/atoms/Button';
import { Input } from '@/design-system/atoms/Input';
import { Label } from '@/design-system/atoms/Label';
import { Select } from '@/design-system/atoms/Select';
import { toast } from 'sonner';

type CourseFormData = {
  title: string;
  category: string;
  description: string;
  duration: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  riskLevel: '' | 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C';
  courseType: '' | 'PRIMO_CORSO' | 'AGGIORNAMENTO';
};

const initialFormData: CourseFormData = {
  title: '',
  category: '',
  description: '',
  duration: '',
  status: 'DRAFT',
  riskLevel: '',
  courseType: '',
};

export default function CourseForm({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const isEditing = params.id !== 'new';

  const loadCourse = useCallback(async () => {
    try {
      const course = await getCourse(params.id);
      if (course) {
        setFormData({
          title: course.title,
          category: course.category || '',
          description: course.description || '',
          duration: (course as any).duration || '',
          status: (course as any).status || 'DRAFT',
          riskLevel: (course as any).riskLevel || '',
          courseType: (course as any).courseType || '',
        });
      }
    } catch {
      toast.error('Failed to load course');
      router.push('/courses');
    }
  }, [params.id, router]);

  useEffect(() => {
    if (isEditing) {
      loadCourse();
    }
  }, [isEditing, loadCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateCourse(params.id, {
          ...formData,
          duration: formData.duration && String(formData.duration).trim() !== '' ? String(formData.duration).trim() : undefined,
        } as any);
        toast.success('Course updated successfully');
      } else {
        await createCourse({
          ...formData,
          duration: formData.duration && String(formData.duration).trim() !== '' ? String(formData.duration).trim() : undefined,
        } as any);
        toast.success('Course created successfully');
      }
      router.push('/courses');
    } catch {
      toast.error('Failed to save course');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="duration">Duration</Label>
        <Input
          id="duration"
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: (e.target as HTMLSelectElement).value as any })}
          options={[
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Published', value: 'PUBLISHED' },
            { label: 'Archived', value: 'ARCHIVED' },
          ]}
        />
      </div>
      <div>
        <Label htmlFor="riskLevel">Risk Level</Label>
        <Select
          id="riskLevel"
          value={formData.riskLevel}
          onChange={(e) => setFormData({ ...formData, riskLevel: (e.target as HTMLSelectElement).value as any })}
          options={[
            { label: 'N/A', value: '' },
            { label: 'Alto', value: 'ALTO' },
            { label: 'Medio', value: 'MEDIO' },
            { label: 'Basso', value: 'BASSO' },
            { label: 'A', value: 'A' },
            { label: 'B', value: 'B' },
            { label: 'C', value: 'C' },
          ]}
        />
      </div>
      <div>
        <Label htmlFor="courseType">Course Type</Label>
        <Select
          id="courseType"
          value={formData.courseType}
          onChange={(e) => setFormData({ ...formData, courseType: (e.target as HTMLSelectElement).value as any })}
          options={[
            { label: 'N/A', value: '' },
            { label: 'Primo Corso', value: 'PRIMO_CORSO' },
            { label: 'Aggiornamento', value: 'AGGIORNAMENTO' },
          ]}
        />
      </div>
      <Button type="submit">Save</Button>
    </form>
  );
}