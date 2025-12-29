import React, { useState, useEffect } from 'react';
import { 
  getTrainers, 
  createTrainer, 
  updateTrainer, 
  Trainer,
  CreateTrainerDTO,
  UpdateTrainerDTO
} from '../services/trainers';
import { useQuery } from '@tanstack/react-query';

// Re-export DTOs for convenience
export type { CreateTrainerDTO, UpdateTrainerDTO };

// Legacy aliases - deprecated, use DTOs directly
/** @deprecated Use CreateTrainerDTO instead */
export type TrainerInsert = CreateTrainerDTO;
/** @deprecated Use UpdateTrainerDTO instead */
export type TrainerUpdate = UpdateTrainerDTO;

export function useTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrainers();
  }, []);

  async function loadTrainers() {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrainers();
      
      const processedData = data.map(trainer => ({
        ...trainer,
        specialties: trainer.specialties || [],
        certifications: trainer.certifications || [],
        status: trainer.status || 'Active'
      }));
      
      setTrainers(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  }

  async function addTrainer(trainer: CreateTrainerDTO) {
    try {
      setError(null);
      const newTrainer = await createTrainer(trainer);
      setTrainers(prev => [...prev, newTrainer]);
      return newTrainer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trainer');
      throw err;
    }
  }

  async function editTrainer(id: string, trainer: UpdateTrainerDTO) {
    try {
      setError(null);
      const updatedTrainer = await updateTrainer(id, trainer);
      setTrainers(prev => prev.map(t => t.id === id ? updatedTrainer : t));
      return updatedTrainer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trainer');
      throw err;
    }
  }

  return {
    trainers,
    loading,
    error,
    addTrainer,
    editTrainer,
    refresh: loadTrainers
  };
}

export default useTrainers;