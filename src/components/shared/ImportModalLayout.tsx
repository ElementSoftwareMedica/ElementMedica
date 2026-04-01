import React, { ReactNode } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface ImportModalLayoutProps {
  title: string;
  onClose: () => void;
  onImport: () => void;
  importing: boolean;
  preview: any[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrag: (e: React.DragEvent) => void;
  error?: string;
  children: ReactNode;
}

const ImportModalLayout: React.FC<ImportModalLayoutProps> = ({
  title,
  onClose,
  onImport,
  importing,
  preview,
  fileInputRef,
  handleFileInput,
  handleDrag,
  error,
  children,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-black/30 max-w-4xl w-full mx-auto p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <span className="sr-only">Chiudi</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    {!preview.length ? (
      <div
        className={`relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-gray-400 dark:hover:border-gray-500`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrag}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Trascina qui il file CSV, oppure{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
          >
            sfoglia
          </button>
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Formato supportato: CSV (separatore punto e virgola)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv"
          onChange={handleFileInput}
        />
      </div>
    ) : (
      <div>{children}</div>
    )}
    {error && (
      <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Errore</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )}
    <div className="mt-6 flex justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        Annulla
      </button>
      <button
        type="button"
        onClick={onImport}
        disabled={preview.length === 0 || importing}
        className="px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {importing ? 'Importazione...' : 'Importa'}
      </button>
    </div>
  </div>
);

export default ImportModalLayout; 