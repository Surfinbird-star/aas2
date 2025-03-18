'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import React from 'react'

interface UserDocument {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  created_at: string;
  is_admin: boolean;
  documents?: UserDocument[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{id: string, content: string, mimeType: string, filename: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  // Проверка прав администратора
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [user, isAdmin, isLoading, router]);

  // Загрузка пользователей
  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        
        // Получаем всех пользователей из profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          throw profilesError;
        }
        
        // Получаем документы для всех пользователей
        const { data: documentsData, error: documentsError } = await supabase
          .from('user_documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (documentsError) {
          throw documentsError;
        }
        
        // Объединяем данные
        const usersWithDocuments = profilesData.map((profile: UserProfile) => {
          const userDocuments = documentsData.filter(
            (doc: UserDocument) => doc.user_id === profile.id
          );
          
          return {
            ...profile,
            documents: userDocuments || []
          };
        });
        
        setUsers(usersWithDocuments);
      } catch (err: unknown) {
        console.error('Error loading users:', err);
        setError(err instanceof Error ? err.message : 'Ошибка при загрузке пользователей');
      } finally {
        setLoading(false);
      }
    }
    
    if (user && isAdmin && !isLoading) {
      loadUsers();
    }
  }, [user, isAdmin, isLoading]);
  
  // Просмотр документа
  const viewDocument = async (documentId: string) => {
    try {
      // Получаем содержимое документа
      const { data, error } = await supabase
        .from('user_documents')
        .select('content, mime_type, filename')
        .eq('id', documentId)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Проверяем, что content существует и является строкой
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('Содержимое документа отсутствует или повреждено');
      }
      
      // Обработка base64 для корректного отображения
      let safeContent = data.content;
      // Убедимся, что нет экранированных символов и некорректных символов
      safeContent = safeContent.replace(/\\\\x/g, '').replace(/\\\\\\\\/g, '');
      
      setViewingDocument({
        id: documentId,
        content: safeContent,
        mimeType: data.mime_type,
        filename: data.filename
      });
    } catch (err: unknown) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке документа');
    }
  };
  
  // Удаление документа
  const deleteDocument = async (documentId: string) => {
    if (!selectedUser || deleting) return;
    
    try {
      setDeleting(true);
      setError(null);
      
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) {
        console.error('Error deleting document:', error);
        setError(`Ошибка при удалении документа: ${error.message}`);
        return;
      }
      
      // Обновляем список документов пользователя
      if (selectedUser && selectedUser.documents) {
        const updatedDocuments = selectedUser.documents.filter(doc => doc.id !== documentId);
        
        // Обновляем выбранного пользователя
        setSelectedUser({
          ...selectedUser,
          documents: updatedDocuments
        });
        
        // Обновляем список всех пользователей
        setUsers(users.map(user => {
          if (user.id === selectedUser.id) {
            return {
              ...user,
              documents: updatedDocuments
            };
          }
          return user;
        }));
      }
      
      // Показываем сообщение об успехе
      setSuccessMessage('Документ успешно удален');
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err: unknown) {
      console.error('Error in document deletion:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении документа');
    } finally {
      setDeleting(false);
    }
  };
  
  // Закрыть просмотр документа
  const closeDocumentView = () => {
    setViewingDocument(null);
  };
  
  // Выбор пользователя для просмотра его документов
  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
  };
  
  // Вернуться к списку пользователей
  const backToUserList = () => {
    setSelectedUser(null);
  };

  // Отображение админ-панели
  if (isLoading || !user || !isAdmin) {
    return <div className="container mx-auto p-4">Проверка прав доступа...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Управление пользователями</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Загрузка данных...</div>
        </div>
      ) : selectedUser ? (
        // Отображение информации о выбранном пользователе и его документах
        <div className="bg-white rounded-lg shadow-md p-6 admin-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-gray-800">
              Пользователь: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
            </h2>
            <button
              onClick={backToUserList}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md text-sm font-medium transition duration-200"
            >
              Назад к списку
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Информация о пользователе:</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-200 admin-user-info">
              <div>
                <p><span className="font-medium">ID:</span> {selectedUser.id}</p>
                <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                <p><span className="font-medium">Имя:</span> {selectedUser.first_name || 'Не указано'}</p>
                <p><span className="font-medium">Фамилия:</span> {selectedUser.last_name || 'Не указано'}</p>
                <p><span className="font-medium">Телефон:</span> {selectedUser.phone || 'Не указан'}</p>
              </div>
              <div>
                <p><span className="font-medium">Роль:</span> <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${selectedUser.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{selectedUser.is_admin ? 'Администратор' : 'Пользователь'}</span></p>
                <p><span className="font-medium">Адрес:</span> {selectedUser.address || 'Не указан'}</p>
                <p><span className="font-medium">Дата регистрации:</span> {new Date(selectedUser.created_at).toLocaleString('ru-RU')}</p>
              </div>
            </div>
          </div>
          
          <div className="user-documents-list">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Документы пользователя:</h3>
            
            {/* Сообщение об успешном удалении */}
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}
            
            {selectedUser.documents && selectedUser.documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Имя файла</th>
                      <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Тип</th>
                      <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Размер</th>
                      <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Дата загрузки</th>
                      <th className="py-3 px-4 text-left font-medium text-xs uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.documents.map((doc) => (
                      <tr key={doc.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">{doc.filename}</td>
                        <td className="py-3 px-4">{doc.mime_type}</td>
                        <td className="py-3 px-4">{Math.round(doc.file_size / 1024)} KB</td>
                        <td className="py-3 px-4">{new Date(doc.created_at).toLocaleString('ru-RU')}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => viewDocument(doc.id)}
                              className="px-3 py-1 bg-gray-600 text-white hover:bg-gray-700 rounded-md text-xs font-medium transition duration-200"
                            >
                              Просмотреть
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              disabled={deleting}
                              className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded-md text-xs font-medium transition duration-200"
                            >
                              {deleting ? 'Удаление...' : 'Удалить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded text-center">
                У пользователя нет загруженных документов
              </div>
            )}
          </div>
        </div>
      ) : (
        // Список всех пользователей
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMAIL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ИМЯ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ДАТА РЕГИСТРАЦИИ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">РОЛЬ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ДОКУМЕНТЫ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ДЕЙСТВИЯ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 border-b">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{`${user.first_name || ''} ${user.last_name || ''}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{new Date(user.created_at).toLocaleString('ru-RU')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${user.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.is_admin ? 'Админ' : 'Пользователь'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.documents?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => selectUser(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Модальное окно для просмотра документа */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50" onClick={closeDocumentView}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{viewingDocument.filename}</h3>
              <button
                onClick={closeDocumentView}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDocument.mimeType.startsWith('image/') ? (
                <div className="text-center">
                  <p className="mb-2">Изображение: {viewingDocument.filename}</p>
                  {/* Используем обработчик ошибок для изображения */}
                  <img
                    src={`data:${viewingDocument.mimeType};base64,${viewingDocument.content}`}
                    alt={viewingDocument.filename}
                    className="max-w-full max-h-[60vh] mx-auto border"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder-image.png';
                      console.error('Ошибка загрузки изображения:', viewingDocument.filename);
                      setError('Не удалось загрузить изображение. Формат данных некорректен.');
                    }}
                  />
                </div>
              ) : viewingDocument.mimeType === 'application/pdf' ? (
                <div className="h-[70vh]">
                  <iframe
                    src={`data:${viewingDocument.mimeType};base64,${viewingDocument.content}`}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="p-4 bg-gray-100 rounded">
                  <p>Предпросмотр для этого типа файла недоступен.</p>
                  <p>Тип файла: {viewingDocument.mimeType}</p>
                  <button
                    onClick={() => {
                      try {
                        const blob = new Blob(
                          [Uint8Array.from(atob(viewingDocument.content), c => c.charCodeAt(0))], 
                          { type: viewingDocument.mimeType }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = viewingDocument.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Ошибка скачивания файла:', err);
                        setError('Не удалось скачать файл. Возможно, данные повреждены.');
                      }
                    }}
                    className="mt-2 inline-block py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Скачать документ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
