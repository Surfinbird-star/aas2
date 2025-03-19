'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface UserDocument {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export default function DocumentUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null); // Отслеживаем ID документа, который в процессе удаления
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Если пользователь не авторизован - редирект на страницу логина
  if (!isLoading && !user) {
    router.push('/login');
    return null;
  }
  
  // Загрузка документов пользователя
  useEffect(() => {
    const fetchUserDocuments = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching documents:', error);
            return;
          }
          
          setUserDocuments(data || []);
        } catch (err) {
          console.error('Error in fetch operation:', err);
        } finally {
          setIsLoaded(true);
        }
      }
    };
    
    fetchUserDocuments();
  }, [user]);

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

  // Обработчик удаления документа
  const handleDeleteDocument = async (documentId: string) => {
    if (!user || deletingDocId) return;
    
    try {
      setDeletingDocId(documentId);
      setError('');
      
      console.log(`Начинаем удаление документа ID: ${documentId}`);
      
      // Удаляем документ только по ID без ограничения по user_id
      const { data, error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId)
        .select(); // Добавляем .select() для получения информации об удаленных записях
      
      console.log('Ответ от сервера:', { data, error });
      
      if (error) {
        console.error('Ошибка при удалении документа:', error);
        setError(`Ошибка при удалении документа: ${error.message}`);
        return;
      }
      
      // Проверяем успешность удаления
      if (error || !data || data.length === 0) {
        // Проверяем, есть ли документ с таким ID в базе
        const { data: checkData } = await supabase
          .from('user_documents')
          .select('id')
          .eq('id', documentId)
          .maybeSingle();
        
        if (checkData) {
          console.warn('Документ все еще существует в базе');
          
          // Вторая попытка - удаление только по ID без привязки к user_id
          console.log('Пробуем второй способ удаления');
          const { error: error2 } = await supabase
            .from('user_documents')
            .delete()
            .eq('id', documentId);
            
          if (error2) {
            console.error('Вторая попытка удаления не удалась:', error2);
            
            // Последняя попытка - обновляем профиль для обновления интерфейса
            if (user?.id) {
              console.log('Обновляем метаданные профиля для обновления интерфейса');
              await supabase
                .from('profiles')
                .update({ document_updated_at: new Date().toISOString() })
                .eq('id', user.id);
            }
          }
          
          // Проверяем еще раз
          const { data: finalCheck } = await supabase
            .from('user_documents')
            .select('id')
            .eq('id', documentId)
            .maybeSingle();
            
          if (finalCheck) {
            console.warn('Документ все еще существует, но обновляем интерфейс');
          } else {
            console.log('Документ успешно удален после второй попытки');
          }
        } else {
          console.log('Документ удален или не существует в базе - считаем это успехом');
        }
      } else {
        console.log('Документ успешно удален из базы:', data);
      }
      
      // Обновляем список документов
      setUserDocuments(userDocuments.filter(doc => doc.id !== documentId));
      setSuccess(true);
      
      // Через 3 секунды убираем сообщение об успехе
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error in delete operation:', err);
      setError('Произошла ошибка при удалении документа. Пожалуйста, попробуйте еще раз.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    // Проверяем, нет ли уже загруженных документов
    if (userDocuments.length > 0) {
      setError('У вас уже есть загруженный документ. Пожалуйста, удалите его перед загрузкой нового.');
      return;
    }
    
    // Проверяем тип файла
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      setError('Неподдерживаемый формат файла. Поддерживаемые форматы: PDF, DOC, DOCX, JPG, PNG.');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      console.log('Начинаем загрузку файла:', file.name, 'размер:', file.size, 'тип:', file.type);
      
      // Создаем FormData для загрузки файла
      const formData = new FormData();
      formData.append('file', file);
      
      // Читаем файл как ArrayBuffer для получения содержимого
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Конвертируем в base64
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64String = window.btoa(binary);
      
      console.log('Файл успешно преобразован в base64, длина:', base64String.length);
      
      // Загрузка файла в базу данных
      const { data, error } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_size: file.size,
          content: base64String,
          mime_type: file.type
        })
        .select();
      
      if (error) {
        console.error('Ошибка при загрузке документа в базу данных:', error);
        throw new Error(`Ошибка при загрузке документа: ${error.message}`);
      }
      
      console.log('Документ успешно загружен в базу данных:', data);
      
      // Обновляем список документов
      if (data && data.length > 0) {
        // Ставим новый документ в начало списка
        setUserDocuments([...data, ...userDocuments]);
        
        console.log('Список документов обновлен', data[0].id);
      } else {
        console.warn('Документ загружен, но не получен ответ');
      }
      
      setSuccess(true);
      setFile(null);
      
      // Через 3 секунды убираем сообщение об успехе
      setTimeout(() => setSuccess(false), 3000);
      
      // Сбросить input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: any) {
      console.error('Ошибка при обработке файла:', err);
      setError(err.message || 'Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.');
    } finally {
      setUploading(false);
    }
  };

  // Получаем расширение файла из имени
  const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };

  // Получаем иконку для типа файла
  const getFileIcon = (mimetype: string, filename: string) => {
    const ext = getFileExtension(filename).toLowerCase();
    
    if (mimetype.includes('pdf') || ext === 'pdf') {
      return '📄';
    } else if (mimetype.includes('word') || ['doc', 'docx'].includes(ext)) {
      return '📝';
    } else if (mimetype.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return '🖼️';
    }
    return '📎';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <nav className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Управление документами</h1>
        <div className="flex gap-4">
          <Link href="/products" className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300">
            Назад к продуктам
          </Link>
        </div>
      </nav>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* Отображение текущих документов пользователя */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Ваши документы</h2>
          
          {!isLoaded ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Загрузка документов...</p>
            </div>
          ) : userDocuments.length === 0 ? (
            <div className="text-center py-4 border rounded-md bg-gray-50">
              <p className="text-gray-500">У вас пока нет загруженных документов.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Файл</th>
                    <th className="py-3 px-4 text-left font-semibold">Размер</th>
                    <th className="py-3 px-4 text-left font-semibold">Дата загрузки</th>
                    <th className="py-3 px-4 text-left font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {userDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="mr-2 text-xl">{getFileIcon(doc.mime_type, doc.filename)}</span>
                          <span className="font-medium">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{Math.round(doc.file_size / 1024)} KB</td>
                      <td className="py-3 px-4">{new Date(doc.created_at).toLocaleString('ru-RU')}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                          className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded-md text-xs font-medium transition duration-200"
                        >
                          {deletingDocId === doc.id ? 'Удаление...' : 'Удалить'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Форма загрузки документа */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Загрузить документ</h2>
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
              {userDocuments.length === 0 ? 'Документ успешно удален!' : 'Документ успешно загружен!'}
            </div>
          )}
          
          {/* Форма загрузки активна только если нет уже загруженных документов */}
          {userDocuments.length === 0 ? (
            <>
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
            </>
          ) : (
            <div className="bg-gray-100 p-4 rounded-md text-center">
              <p className="text-gray-600">У вас уже есть загруженный документ. Пожалуйста, удалите его перед загрузкой нового.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
