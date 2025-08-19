import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Label } from './label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  maxSizeKB?: number;
  acceptedTypes?: string[];
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  maxSizeKB = 1024, // 1MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxSizeKB: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcola le dimensioni mantenendo l'aspect ratio
        const maxWidth = 1200;
        const maxHeight = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Disegna l'immagine compressa
        ctx?.drawImage(img, 0, 0, width, height);

        // Converti in base64 con qualità progressiva
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Riduci la qualità fino a raggiungere la dimensione desiderata
        while (dataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) { // 1.37 è il fattore di conversione base64
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verifica tipo file
    if (!acceptedTypes.includes(file.type)) {
      alert(`Tipo di file non supportato. Tipi accettati: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Verifica dimensione file (controllo iniziale)
    if (file.size > maxSizeKB * 1024 * 10) { // 10x il limite per file molto grandi
      alert(`File troppo grande. Dimensione massima: ${maxSizeKB}KB`);
      return;
    }

    setIsUploading(true);

    try {
      const compressedDataUrl = await compressImage(file, maxSizeKB);
      setPreview(compressedDataUrl);
      onChange(compressedDataUrl);
    } catch (error) {
      console.error('Errore nella compressione dell\'immagine:', error);
      alert('Errore nel processamento dell\'immagine');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-48 mx-auto rounded-lg object-contain"
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Nessuna immagine selezionata
            </p>
          </div>
        )}

        {!disabled && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {preview ? 'Cambia immagine' : 'Carica immagine'}
                </>
              )}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      <p className="text-xs text-gray-500">
        Formati supportati: {acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()}
        <br />
        Dimensione massima: {maxSizeKB}KB (l'immagine verrà compressa automaticamente)
      </p>
    </div>
  );
};