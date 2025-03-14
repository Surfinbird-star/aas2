'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Типы данных
type User = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  is_admin: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Состояние для модального окна редактирования
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    phone: '',
    address: '',
    is_admin: false
  })

  // Загрузка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        // Получаем профили пользователей
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesError) throw profilesError

        // Форматируем данные
        const formattedUsers = profiles.map(profile => ({
          id: profile.id,
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          is_admin: profile.is_admin || false,
          created_at: profile.created_at
        }))

        setUsers(formattedUsers)
      } catch (error: any) {
        console.error('Ошибка при загрузке пользователей:', error)
        setError(error.message || 'Не удалось загрузить пользователей')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Открытие модального окна для редактирования пользователя
  const openEditModal = (user: User) => {
    setFormData({
      name: user.name,
      phone: user.phone || '',
      address: user.address || '',
      is_admin: user.is_admin
    })
    setEditingUser(user)
    setIsModalOpen(true)
  }

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  // Обновление данных формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Сохранение пользователя (редактирование)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUser) return

    try {
      setLoading(true)
      setError(null)

      // Обновление профиля пользователя
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          is_admin: formData.is_admin
        })
        .eq('id', editingUser.id)

      if (error) throw error

      // Обновляем локальное состояние
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                name: formData.name || user.name,
                phone: formData.phone || user.phone,
                address: formData.address || user.address,
                is_admin: !!formData.is_admin
              } 
            : user
        )
      )

      setSuccessMessage(`Данные пользователя "${formData.name}" успешно обновлены`)
      
      // Закрываем модальное окно
      closeModal()
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при обновлении пользователя:', error)
      setError(error.message || 'Не удалось обновить данные пользователя')
    } finally {
      setLoading(false)
    }
  }

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          <h3 className="font-medium mb-2">Ошибка</h3>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Закрыть
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md">
          <p>{successMessage}</p>
        </div>
      )}

      {/* Таблица пользователей */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Список пользователей</h3>
        </div>

        {users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Нет пользователей для отображения
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Имя
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.is_admin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Администратор
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Пользователь
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно редактирования пользователя */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Редактирование пользователя
                    </h3>
                    <div className="mt-2">
                      <form onSubmit={handleSaveUser} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Имя
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Телефон
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            id="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                            Адрес
                          </label>
                          <textarea
                            name="address"
                            id="address"
                            rows={3}
                            value={formData.address}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_admin"
                            id="is_admin"
                            checked={!!formData.is_admin}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                            Администратор
                          </label>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={loading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
