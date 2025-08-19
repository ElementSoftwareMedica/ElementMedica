import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { CourseForm } from '../../components/courses/CourseForm';
import { useToast } from '../../hooks/useToast';

const CourseCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSuccess = () => {
    navigate('/courses');
  };

  const handleClose = () => {
    navigate('/courses');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link 
          to="/courses" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Torna all'elenco corsi
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuovo Corso</h1>
        <p className="text-gray-600 mt-1">Inserisci i dettagli del nuovo corso</p>
      </div>
      
      <CourseForm 
        onSubmit={handleSuccess} 
        onCancel={handleClose}
        submitLabel="Crea Corso"
        cancelLabel="Annulla"
      />
    </div>
  );
};

export default CourseCreate; 