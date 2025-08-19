import React from 'react';
import { 
  Calendar,
  Clock,
  FileText
} from 'lucide-react';

interface AssessmentCardProps {
  type: string;
  date: string;
  time: string;
  employee: string;
  company: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  onClick?: () => void;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  type,
  date,
  time,
  employee,
  company,
  status,
  onClick
}) => {
  return (
    <div 
      className="bg-white rounded-2xl shadow p-4 transition-all duration-200 hover:shadow-md cursor-pointer animate-fadeIn"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="p-2 bg-blue-100 rounded-xl">
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-3 flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">{type}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'Completed' 
                ? 'bg-green-100 text-green-800' 
                : status === 'Scheduled'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              {status}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span>{date}</span>
              <Clock className="h-3.5 w-3.5 ml-2 mr-1 flex-shrink-0" />
              <span>{time}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <User className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span>{employee}</span>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {company}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCard;