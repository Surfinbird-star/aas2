'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Типы данных
type Category = {
  id: number
  name: string
  products_count?: number
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Состояние для модального окна добавления/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')

  // Состояние для подтверждения удаления
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  // Загрузка категорий и количества товаров в каждой категории
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        // Загружаем категории
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name')

        if (categoriesError) throw categoriesError

        // Загружаем количество товаров в каждой категории
        const categoriesWithCounts = await Promise.all(
          (categoriesData || []).map(async (category) => {
            const { count, error: countError } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id)

            if (countError) throw countError

            return {
              ...category,
              products_count: count || 0
            }
          })
        )

        setCategories(categoriesWithCounts)
      } catch (error: any) {
        console.error('Ошибка при загрузке категорий:', error)
        setError(error.message || 'Не удалось загрузить категории')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Открытие модального окна для добавления новой категории
  const openAddModal = () => {
    setCategoryName('')
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  // Открытие модального окна для редактирования категории
  const openEditModal = (category: Category) => {
    setCategoryName(category.name)
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  // Сохранение категории (добавление или редактирование)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      if (editingCategory) {
        // Редактирование существующей категории
        const { error } = await supabase
          .from('categories')
          .update({ name: categoryName })
          .eq('id', editingCategory.id)

        if (error) throw error

        // Обновляем локальное состояние
        setCategories(prevCategories => 
          prevCategories.map(cat => 
            cat.id === editingCategory.id 
              ? { ...cat, name: categoryName } 
              : cat
          )
        )

        setSuccessMessage(`Категория "${categoryName}" успешно обновлена`)
      } else {
        // Добавление новой категории
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: categoryName })
          .select()

        if (error) throw error

        // Добавляем новую категорию в локальное состояние
        if (data && data.length > 0) {
          const newCategory = {
            ...data[0],
            products_count: 0
          }
          setCategories(prevCategories => [...prevCategories, newCategory])
        }

        setSuccessMessage(`Категория "${categoryName}" успешно добавлена`)
      }

      // Закрываем модальное окно
      closeModal()
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при сохранении категории:', error)
      setError(error.message || 'Не удалось сохранить категорию')
    } finally {
      setLoading(false)
    }
  }

  // Открытие диалога подтверждения удаления
  const openDeleteConfirmation = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteConfirmationOpen(true)
  }

  // Закрытие диалога подтверждения удаления
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false)
    setCategoryToDelete(null)
  }

  // Удаление категории
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      setLoading(true)
      setError(null)

      // Проверяем, есть ли товары в этой категории
      if ((categoryToDelete.products_count || 0) > 0) {
        throw new Error(`Нельзя удалить категорию, так как в ней есть товары (${categoryToDelete.products_count}). Сначала переместите или удалите товары.`)
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id)

      if (error) throw error

      // Удаляем категорию из локального состояния
      setCategories(prevCategories => 
        prevCategories.filter(category => category.id !== categoryToDelete.id)
      )

      setSuccessMessage(`Категория "${categoryToDelete.name}" успешно удалена`)
      
      // Закрываем диалог подтверждения
      closeDeleteConfirmation()
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при удалении категории:', error)
      setError(error.message || 'Не удалось удалить категорию')
    } finally {
      setLoading(false)
    }
  }

  if (loading && categories.length === 0) {
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

      {/* Кнопка добавления категории */}
      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
            />
          </svg>
          Добавить категорию
        </button>
      </div>

      {/* Таблица категорий */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Список категорий</h3>
        </div>

        {categories.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Нет категорий для отображения
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество товаров
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.products_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(category)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => openDeleteConfirmation(category)}
                        className={`text-red-600 hover:text-red-900 ${(category.products_count || 0) > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={(category.products_count || 0) > 0}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно добавления/редактирования категории */}
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
                      {editingCategory ? 'Редактирование категории' : 'Добавление категории'}
                    </h3>
                    <div className="mt-2">
                      <form onSubmit={handleSaveCategory} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Название категории *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={loading || !categoryName.trim()}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    (loading || !categoryName.trim()) ? 'opacity-70 cursor-not-allowed' : ''
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

      {/* Диалог подтверждения удаления */}
      {deleteConfirmationOpen && (
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
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg 
                      className="h-6 w-6 text-red-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Подтверждение удаления
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Вы уверены, что хотите удалить категорию "{categoryToDelete?.name}"? Это действие нельзя отменить.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={loading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Удаление...' : 'Удалить'}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteConfirmation}
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
