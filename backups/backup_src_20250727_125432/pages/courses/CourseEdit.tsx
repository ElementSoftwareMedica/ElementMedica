import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CourseForm } from '../../components/courses/CourseForm';
import { useToast } from '../../hooks/useToast';
import { getCourse, updateCourse } from '../../services/courses';
import type { Course } from '../../types/courses';

const CourseEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  
  // Utilizziamo un ref per tracciare se stiamo già eseguendo una richiesta
  const isLoadingRef = useRef(false);
  // E un ref per contare i tentativi automatici
  const fetchAttemptsRef = useRef(0);

  const fetchCourse = useCallback(async (shouldShowLoading = true) => {
    if (!id) return;
    
    // Evita chiamate multiple simultanee
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    if (shouldShowLoading) {
      setLoading(true);
    }
    
    try {
      // Aggiungiamo un piccolo delay prima di ogni fetch per dare tempo al browser di liberare risorse
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = await getCourse(id);
      setCourse(data);
      setError(null);
      fetchAttemptsRef.current = 0; // Reset dei tentativi dopo successo
    } catch (e) {
      console.error('Error fetching course:', e);
      
      // Gestione specifica per ERR_INSUFFICIENT_RESOURCES
      const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
      const errorCode = (e as any)?.code || '';
      
      if (errorCode === 'ERR_INSUFFICIENT_RESOURCES' || errorCode === 'ERR_NETWORK') {
        setError(`Problema di risorse del browser. ${fetchAttemptsRef.current > 0 ? 'Ritenta tra qualche secondo.' : 'Riprova.'}`);
        
        // Limita i tentativi automatici a 1
        if (fetchAttemptsRef.current < 1) {
          fetchAttemptsRef.current++;
          
          // Se è un problema di risorse, attendiamo più a lungo prima di riprovare automaticamente
          setTimeout(() => {
            console.log("Ritentativo automatico dopo errore di risorse");
            setIsRetrying(true);
            fetchCourse(true);
          }, 3000); // Attendi 3 secondi prima di riprovare
        }
      } else {
        setError(`Errore durante il caricamento: ${errorMessage}`);
        
        if (e instanceof Error && e.message.includes('404')) {
          setError('Corso non trovato. Verifica l\'URL e riprova.');
        }
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
      isLoadingRef.current = false;
    }
  }, [id]);

  // Effetto iniziale con cleanup per evitare effetti con componente smontato
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      await fetchCourse(true);
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [fetchCourse]);

  const handleRetry = () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    
    // Attendi un po' prima di ritentare per dare tempo al sistema di liberare risorse
    setTimeout(() => {
      fetchCourse(true);
    }, 2000);
  };

  const handleSave = async (formData: any) => {
    try {
      if (!id) return;
      
      await updateCourse(id, formData);
      
      showToast({
        message: 'Corso aggiornato con successo!',
        type: 'success'
      });
      
      navigate(`/courses/${id}`);
    } catch (e) {
      console.error('Error saving course:', e);
      
      showToast({
        message: `Errore durante il salvataggio: ${e instanceof Error ? e.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4">
            {isRetrying ? 'Ritentativo di caricamento...' : 'Caricamento corso...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-3">Errore</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isRetrying ? 'Caricamento...' : 'Riprova'}
            </button>
            <Link to="/courses" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">
              Torna ai corsi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link 
          to={`/courses/${id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-5 w-5" />
          </span>
          <span>Torna ai dettagli del corso</span>
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifica Corso</h1>
        <p className="text-gray-600 mt-1">Modifica i dettagli del corso {course?.title}</p>
      </div>
      
      {course && (
        <CourseForm
          course={course}
          onSubmit={handleSave}
          onCancel={() => navigate(`/courses/${id}`)}
          submitLabel="Aggiorna Corso"
          cancelLabel="Annulla"
        />
      )}
    </div>
  );
};

export default CourseEdit; 