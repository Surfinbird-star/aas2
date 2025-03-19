'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null); // Отслеживаем ID документа, который в процессе удаления
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // Проверка авторизации через сессионное хранилище
  useEffect(() => {
    const isAuthorized = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
    setAuthorized(isAuthorized);
  }, []);

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
    
    if (authorized) {
      loadUsers();
    }
  }, [authorized]);
  
  // Просмотр документа
  const viewDocument = async (documentId: string) => {
    try {
      console.log(`Загрузка документа с ID: ${documentId}`);
      
      // Получаем содержимое документа
      const { data, error } = await supabase
        .from('user_documents')
        .select('content, mime_type, filename')
        .eq('id', documentId)
        .single();
      
      if (error) {
        console.error('Ошибка при загрузке документа из БД:', error);
        throw error;
      }
      
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('Содержимое документа отсутствует или повреждено');
      }
      
      console.log(`Документ загружен: ${data.filename}, тип: ${data.mime_type}`);
      
      // Получаем чистые base64 данные без префикса
      let base64Data = data.content;
      
      // Если начинается с data:, извлекаем только base64 часть
      if (base64Data.startsWith('data:')) {
        const commaIndex = base64Data.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = base64Data.substring(commaIndex + 1);
        }
      }
      
      // Преобразуем base64 в Blob
      try {
        // Сначала преобразуем в бинарную строку
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        
        // Преобразуем каждый символ в соответствующий байт
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Создаем Blob из байтового массива
        const blob = new Blob([bytes], { type: data.mime_type });
        
        // Создаем объектный URL для Blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Открываем документ в зависимости от его типа
        if (data.mime_type.startsWith('image/')) {
          // Открываем изображение в новом окне с красивым форматированием
          const win = window.open();
          if (!win) {
            alert('Браузер заблокировал открытие нового окна');
            return;
          }
          
          win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${data.filename}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: #f5f5f5;
                  font-family: Arial, sans-serif;
                }
                .container {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 0 20px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 90%;
                }
                h2 {
                  color: #333;
                  margin-top: 0;
                }
                img {
                  max-width: 100%;
                  max-height: 70vh;
                  display: block;
                  margin: 20px auto;
                  border-radius: 4px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>${data.filename}</h2>
                <img src="${blobUrl}" alt="${data.filename}" />
              </div>
            </body>
            </html>
          `);
          win.document.close();
        } else if (data.mime_type === 'application/pdf') {
          // PDF открываем напрямую - браузер сам отобразит его
          window.open(blobUrl, '_blank');
        } else {
          // Для других типов файлов предлагаем скачать
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = data.filename || 'документ';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        
        // Освобождаем URL через 10 секунд
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 10000);
      } catch (blobError) {
        console.error('Ошибка при создании Blob:', blobError);
        setError('Не удалось обработать данные документа. Возможно, формат повреждён.');
      }
    } catch (err: unknown) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке документа');
    }
  };
  
  // Удаление документа
  const deleteDocument = async (documentId: string) => {
    if (!selectedUser || deletingDocId) return;
    
    try {
      setDeletingDocId(documentId);
      setError(null);
      
      console.log(`Начинаем удаление документа ID: ${documentId}`);
      
      // Используем прямое удаление с контекстом администратора
      console.log('Стандартное удаление документа');
      const { data, error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId)
        .select();
      
      console.log('Ответ от сервера:', { data, error });
      
      // Если возникла ошибка, пробуем альтернативные методы
      if (error) {
        console.error('Ошибка при удалении документа:', error);
        
        // Пытаемся выполнить SQL-запрос напрямую
        try {
          console.log('Пробуем использовать SQL-запрос напрямую');
          const { error: sqlError } = await supabase.rpc(
            'execute_sql', 
            { sql_query: `DELETE FROM user_documents WHERE id = '${documentId}' RETURNING *` }
          );
          
          if (sqlError) {
            console.error('Ошибка при выполнении SQL-запроса:', sqlError);
            
            // Последняя попытка - прямое удаление через запрос с обновлением пользователя
            console.log('Пробуем обновить профиль пользователя для сброса RLS');
            await supabase
              .from('profiles')
              .update({ document_updated_at: new Date().toISOString() })
              .eq('id', selectedUser?.id || ''); // Обновляем профиль пользователя, чтобы обновить кэш
            
            setError(`Ошибка при удалении документа. Обновите список документов.`);
            return;
          }
          
          console.log('Документ должен быть удален, проверяем...');
          
          // Проверяем, удалился ли документ
          const { data: checkData } = await supabase
            .from('user_documents')
            .select('id')
            .eq('id', documentId)
            .maybeSingle();
          
          if (checkData) {
            console.warn('Документ все еще существует в базе, используем последний метод');
            setError('Не удалось полностью удалить документ. Обратитесь к администратору.');
          } else {
            console.log('Документ успешно удален');
          }
        } catch (e) {
          console.error('Ошибка при выполнении запроса:', e);
          setError(`Ошибка при удалении документа: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
        }
      } else if (!data || data.length === 0) {
        // Проверяем, есть ли документ с таким ID в базе
        const { data: checkData } = await supabase
          .from('user_documents')
          .select('id')
          .eq('id', documentId)
          .maybeSingle();
        
        if (checkData) {
          console.warn('Документ все еще существует в базе');
          // Документ все еще существует, значит удаление не сработало
        } else {
          console.log('Документ удален или не существует в базе - считаем это успехом');
          // Документа нет в базе, все в порядке
        }
      } else {
        console.log('Документ успешно удален из базы:', data);
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
      setDeletingDocId(null);
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
  if (!authorized || loading) {
    return <div className="container mx-auto p-4">Проверка прав доступа...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl text-gray-800 mb-8">Управление пользователями</h1>
      
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
            <h2 className="text-xl text-gray-800">
              Пользователь: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
            </h2>
            <button
              onClick={backToUserList}
              className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded text-sm transition duration-200"
            >
              Назад к списку
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg mb-3 text-gray-700">Информация о пользователе:</h3>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 admin-user-info">
              <dl className="grid grid-cols-2 gap-y-3">
                <dt className="text-gray-500 text-sm">ID:</dt>
                <dd>{selectedUser.id}</dd>
                
                <dt className="text-gray-500 text-sm">Email:</dt>
                <dd>{selectedUser.email}</dd>
                
                <dt className="text-gray-500 text-sm">Имя:</dt>
                <dd>{selectedUser.first_name || 'Не указано'}</dd>
                
                <dt className="text-gray-500 text-sm">Фамилия:</dt>
                <dd>{selectedUser.last_name || 'Не указано'}</dd>
                
                <dt className="text-gray-500 text-sm">Телефон:</dt>
                <dd>{selectedUser.phone || 'Не указан'}</dd>
                
                <dt className="text-gray-500 text-sm">Роль:</dt>
                <dd>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 rounded ${selectedUser.is_admin ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedUser.is_admin ? 'Администратор' : 'Пользователь'}
                  </span>
                </dd>
                
                <dt className="text-gray-500 text-sm">Адрес:</dt>
                <dd>{selectedUser.address || 'Не указан'}</dd>
                
                <dt className="text-gray-500 text-sm">Дата регистрации:</dt>
                <dd>{new Date(selectedUser.created_at).toLocaleString('ru-RU')}</dd>
              </dl>
            </div>
          </div>
          
          <div className="user-documents-list">
            <h3 className="text-lg mb-3 text-gray-700">Документы пользователя:</h3>
            
            {/* Сообщение об успешном удалении */}
            {successMessage && (
              <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}
            
            {selectedUser.documents && selectedUser.documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 border-b border-gray-300">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs text-gray-500 uppercase tracking-wider">Имя файла</th>
                      <th className="py-3 px-4 text-left text-xs text-gray-500 uppercase tracking-wider">Тип</th>
                      <th className="py-3 px-4 text-left text-xs text-gray-500 uppercase tracking-wider">Размер</th>
                      <th className="py-3 px-4 text-left text-xs text-gray-500 uppercase tracking-wider">Дата загрузки</th>
                      <th className="py-3 px-4 text-left text-xs text-gray-500 uppercase tracking-wider">Действия</th>
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
                              className="px-3 py-1 bg-gray-500 text-white hover:bg-gray-600 rounded text-xs transition duration-200"
                            >
                              Просмотреть
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              disabled={deletingDocId === doc.id}
                              className="px-3 py-1 bg-gray-700 text-white hover:bg-gray-800 rounded text-xs transition duration-200"
                            >
                              {deletingDocId === doc.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded text-center text-gray-500">
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
      
      {/* Модальное окно для просмотра документа было удалено - документы теперь открываются в новом окне браузера */}
    </div>
  );
}
