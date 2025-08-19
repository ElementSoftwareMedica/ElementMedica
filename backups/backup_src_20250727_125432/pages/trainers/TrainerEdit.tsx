import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import TrainerForm from '../../components/trainers/TrainerForm';
import { apiGet, apiPost, apiPut } from '../../services/api';

export default function TrainerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      apiGet(`/trainers/${id}`)
        .then(data => setTrainer(data))
        .catch(err => setError(err.message || 'Trainer not found'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      if (id) {
        await apiPut(`/trainers/${id}`, data);
        navigate(`/trainers/${id}`);
      } else {
        const created = await apiPost('/trainers', data);
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
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Back to {id ? 'Trainer Details' : 'Trainers'}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            {id ? 'Edit Trainer' : 'Add New Trainer'}
          </h1>
          <TrainerForm
            trainer={trainer}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}