'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function DocumentUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Если пользователь не авторизован - редирект на страницу логина
  if (!isLoading && !user) {
    router.push('/login');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    // Проверка на наличие файла
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Проверка размера файла (до 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Размер файла превышает 5MB. Пожалуйста, выберите файл меньшего размера.');
      setFile(null);
      // Сбросить input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    try {
      setUploading(true);
      
      // Чтение файла как ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Преобразование в base64 для хранения в Supabase
      const base64String = btoa(String.fromCharCode(...uint8Array));
      
      // Загрузка файла в базу данных
      const { error } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_size: file.size,
          content: base64String,
          mime_type: file.type
        });
      
      if (error) {
        console.error('Error uploading document:', error);
        setError(`Ошибка при загрузке документа: ${error.message}`);
        return;
      }
      
      setSuccess(true);
      setFile(null);
      
      // Сбросить input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <nav className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Загрузка документов</h1>
        <div className="flex gap-4">
          <Link href="/products" className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300">
            Назад к продуктам
          </Link>
        </div>
      </nav>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Загрузите документ</h2>
          <p className="text-gray-600 mb-4">
            Вы можете загрузить один документ размером до 5MB. 
            Поддерживаемые форматы: PDF, DOC, DOCX, JPG, PNG.
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Документ успешно загружен!
            </div>
          )}
          
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 
                file:mr-4 file:py-2 file:px-4 
                file:rounded file:border-0 
                file:text-sm file:font-semibold 
                file:bg-blue-50 file:text-blue-700 
                hover:file:bg-blue-100"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>
          
          {file && (
            <div className="bg-gray-100 p-3 rounded mb-4">
              <p><span className="font-semibold">Выбранный файл:</span> {file.name}</p>
              <p><span className="font-semibold">Размер:</span> {Math.round(file.size / 1024)} KB</p>
              <p><span className="font-semibold">Тип:</span> {file.type}</p>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`w-full py-2 px-4 rounded font-medium ${
              !file || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Загрузка...' : 'Загрузить документ'}
          </button>
        </div>
      </div>
    </div>
  );
}
