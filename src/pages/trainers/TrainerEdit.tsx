import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import TrainerForm from '../../components/trainers/TrainerForm';
import TrainersService, { getTrainerById, createTrainer, updateTrainer } from '../../services/trainers';

export default function TrainerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      getTrainerById(id)
        .then(data => setTrainer(data))
        .catch(err => setError(err?.message || 'Trainer not found'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      if (id) {
        await updateTrainer(id, data as any);
        navigate(`/trainers/${id}`);
      } else {
        const created = await createTrainer(data as any);
        navigate(`/trainers/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trainer');
    }
  };

  const handleCancel = () => {
    navigate(id ? `/trainers/${id}` : '/trainers');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-80">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-80 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link 
          to={id ? `/trainers/${id}` : '/trainers'} 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {id ? 'Torna al dettaglio formatore' : 'Torna ai formatori'}
        </Link>
      </div>

      <TrainerForm
        trainer={trainer}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        roleType="TRAINER"
      />
    </div>
  );
}