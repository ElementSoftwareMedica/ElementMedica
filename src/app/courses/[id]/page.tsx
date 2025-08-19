'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Removed unused Course import - using CourseFormData type instead
import { createCourse, getCourse, updateCourse } from '@/api/courses';
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
};

const initialFormData: CourseFormData = {
  title: '',
  category: '',
  description: '',
  duration: '',
  status: 'DRAFT',
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
          duration: course.duration || '',
          status: course.status || 'DRAFT',
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
        await updateCourse(params.id, formData);
        toast.success('Course updated successfully');
      } else {
        await createCourse(formData);
        toast.success('Course created successfully');
      }
      router.push('/courses');
    } catch {
      toast.error(isEditing ? 'Failed to update course' : 'Failed to create course');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Edit Course' : 'New Course'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="w-full min-h-[100px] p-2 border rounded-md"
          />
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            name="duration"
            value={formData.duration || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>

        <div className="flex gap-4">
          <Button type="submit">
            {isEditing ? 'Update Course' : 'Create Course'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/courses')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}