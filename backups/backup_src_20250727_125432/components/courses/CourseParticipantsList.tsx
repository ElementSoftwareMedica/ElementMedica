import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import type { Database, PersonData } from '../../types';

// Alias per compatibilità
type Employee = PersonData;
type Company = Database['public']['Tables']['companies']['Row'];

interface CourseParticipantsListProps {
  companies: Company[];
  onParticipantsSelected: (participants: string[]) => void;
}

export default function CourseParticipantsList({
  companies,
  onParticipantsSelected
}: CourseParticipantsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<Employee[]>([]);

  const handleParticipantSelect = (employee: Employee) => {
    setSelectedParticipants(prev => {
      const isSelected = prev.some(p => p.id === employee.id);
      if (isSelected) {
        return prev.filter(p => p.id !== employee.id);
      }
      return [...prev, employee];
    });
  };

  const handleSubmit = () => {
    onParticipantsSelected(selectedParticipants.map(p => p.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Available Employees</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {/* We'll populate this with filtered employees */}
            {/* {filteredEmployees.map((employee) => ( */}
            {/*   <div */}
            {/*     key={employee.id} */}
            {/*     className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" */}
            {/*     onClick={() => handleParticipantSelect(employee)} */}
            {/*   > */}
            {/*     <div> */}
            {/*       <div className="text-sm font-medium text-gray-900"> */}
            {/*         {employee.firstName} {employee.lastName} */}
            {/*       </div> */}
            {/*       <div className="text-sm text-gray-500"> */}
            {/*         {employee.title} • {companies.find(c => c.id === employee.companyId)?.name} */}
            {/*       </div> */}
            {/*     </div> */}
            {/*     <Plus className="h-5 w-5 text-gray-400" /> */}
            {/*   </div> */}
            {/* ))} */}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Selected Participants</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {selectedParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {participant.firstName} {participant.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {participant.title} • {companies.find(c => c.id === participant.companyId)?.name}
                  </div>
                </div>
                <button
                  onClick={() => handleParticipantSelect(participant)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            {selectedParticipants.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No participants selected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSubmit}
          disabled={selectedParticipants.length === 0}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          Add Participants
        </button>
      </div>
    </div>
  );
}