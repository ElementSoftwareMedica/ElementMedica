import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

// Tipi semplificati per data e ora
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  capacity?: number;
  booked?: number;
}

interface StepDateTimeSimpleProps {
  selectedDate: string;
  selectedTime: string;
  selectedLocation: string;
  availableTimeSlots: TimeSlot[];
  locations: string[];
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onLocationChange: (location: string) => void;
  className?: string;
}

const StepDateTimeSimple: React.FC<StepDateTimeSimpleProps> = ({
  selectedDate,
  selectedTime,
  selectedLocation,
  availableTimeSlots = [],
  locations = [],
  onDateChange,
  onTimeChange,
  onLocationChange,
  className = ''
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
  };

  const getAvailabilityStatus = (slot: TimeSlot) => {
    if (!slot.available) return 'Non disponibile';
    if (slot.capacity && slot.booked) {
      const remaining = slot.capacity - slot.booked;
      if (remaining === 0) return 'Completo';
      return `${remaining} posti disponibili`;
    }
    return 'Disponibile';
  };

  const getAvailabilityColor = (slot: TimeSlot) => {
    if (!slot.available) return 'text-red-500';
    if (slot.capacity && slot.booked) {
      const remaining = slot.capacity - slot.booked;
      if (remaining === 0) return 'text-red-500';
      if (remaining <= 2) return 'text-orange-500';
    }
    return 'text-green-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Selezione Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleziona Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-date">Data dell'evento</Label>
              <Input
                id="event-date"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="mt-1"
                min={new Date().toISOString().split('T')[0]} // Non permettere date passate
              />
            </div>
            {selectedDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  Data selezionata: {formatDate(selectedDate)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selezione Orario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Seleziona Orario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-gray-500 text-center py-4">
              Seleziona prima una data per vedere gli orari disponibili
            </p>
          ) : availableTimeSlots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nessun orario disponibile per la data selezionata
            </p>
          ) : (
            <div className="space-y-3">
              {availableTimeSlots.map((slot) => {
                const isSelected = selectedTime === slot.startTime;
                const isAvailable = slot.available && (
                  !slot.capacity || 
                  !slot.booked || 
                  slot.capacity > slot.booked
                );
                
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : isAvailable
                        ? 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                    onClick={() => isAvailable && onTimeChange(slot.startTime)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => isAvailable && onTimeChange(slot.startTime)}
                        disabled={!isAvailable}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        <div className={`text-sm ${getAvailabilityColor(slot)}`}>
                          {getAvailabilityStatus(slot)}
                        </div>
                      </div>
                    </div>
                    {slot.capacity && slot.booked && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {slot.booked}/{slot.capacity}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selezione Luogo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Seleziona Luogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-location">Luogo dell'evento</Label>
              <select
                id="event-location"
                value={selectedLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona un luogo...</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
            {selectedLocation && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Luogo selezionato: {selectedLocation}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo Selezione */}
      {(selectedDate || selectedTime || selectedLocation) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Riepilogo Programmazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatDate(selectedDate)}</span>
                </div>
              )}
              {selectedTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {formatTime(selectedTime)} - {formatTime(
                      availableTimeSlots.find(s => s.startTime === selectedTime)?.endTime || ''
                    )}
                  </span>
                </div>
              )}
              {selectedLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{selectedLocation}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StepDateTimeSimple;
export type { StepDateTimeSimpleProps, TimeSlot };