'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Типы данных
type Product = {
  id: number
  name: string
  description?: string
  unit: string
  image_url?: string
  category_id: number
  category_name?: string
}

type Category = {
  id: number
  name: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Состояние для модального окна добавления/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'category_name'>>({
    name: '',
    description: '',
    unit: '',
    image_url: '',
    category_id: 0
  })

  // Состояние для подтверждения удаления
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Загрузка товаров и категорий
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Загружаем категории
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name')

        if (categoriesError) throw categoriesError

        setCategories(categoriesData || [])

        // Загружаем товары с информацией о категориях
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            categories (
              name
            )
          `)
          .order('name')

        if (productsError) throw productsError

        // Форматируем данные о товарах
        const formattedProducts = productsData.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          image_url: product.image_url,
          category_id: product.category_id,
          category_name: product.categories ? product.categories.name : 'Без категории'
        }))

        setProducts(formattedProducts)
      } catch (error: any) {
        console.error('Ошибка при загрузке данных:', error)
        setError(error.message || 'Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Открытие модального окна для добавления нового товара
  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      unit: '',
      image_url: '',
      category_id: categories.length > 0 ? categories[0].id : 0
    })
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  // Открытие модального окна для редактирования товара
  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      unit: product.unit,
      image_url: product.image_url || '',
      category_id: product.category_id
    })
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  // Обновление данных формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category_id' ? parseInt(value) : value
    }))
  }

  // Сохранение товара (добавление или редактирование)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      if (editingProduct) {
        // Редактирование существующего товара
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description || null,
            unit: formData.unit,
            image_url: formData.image_url || null,
            category_id: formData.category_id
          })
          .eq('id', editingProduct.id)

        if (error) throw error

        // Обновляем локальное состояние
        setProducts(prevProducts => 
          prevProducts.map(prod => 
            prod.id === editingProduct.id 
              ? { 
                  ...prod, 
                  ...formData,
                  category_name: categories.find(c => c.id === formData.category_id)?.name
                } 
              : prod
          )
        )

        setSuccessMessage(`Товар "${formData.name}" успешно обновлен`)
      } else {
        // Добавление нового товара
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            description: formData.description || null,
            unit: formData.unit,
            image_url: formData.image_url || null,
            category_id: formData.category_id
          })
          .select()

        if (error) throw error

        // Добавляем новый товар в локальное состояние
        if (data && data.length > 0) {
          const newProduct = {
            ...data[0],
            category_name: categories.find(c => c.id === formData.category_id)?.name
          }
          setProducts(prevProducts => [...prevProducts, newProduct])
        }

        setSuccessMessage(`Товар "${formData.name}" успешно добавлен`)
      }

      // Закрываем модальное окно
      closeModal()
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при сохранении товара:', error)
      setError(error.message || 'Не удалось сохранить товар')
    } finally {
      setLoading(false)
    }
  }

  // Открытие диалога подтверждения удаления
  const openDeleteConfirmation = (product: Product) => {
    setProductToDelete(product)
    setDeleteConfirmationOpen(true)
  }

  // Закрытие диалога подтверждения удаления
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false)
    setProductToDelete(null)
  }

  // Удаление товара
  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      // Удаляем товар из локального состояния
      setProducts(prevProducts => 
        prevProducts.filter(product => product.id !== productToDelete.id)
      )

      setSuccessMessage(`Товар "${productToDelete.name}" успешно удален`)
      
      // Закрываем диалог подтверждения
      closeDeleteConfirmation()
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при удалении товара:', error)
      setError(error.message || 'Не удалось удалить товар')
    } finally {
      setLoading(false)
    }
  }

  if (loading && products.length === 0) {
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

      {/* Кнопка добавления товара */}
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
          Добавить товар
        </button>
      </div>

      {/* Таблица товаров */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Список товаров</h3>
        </div>

        {products.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Нет товаров для отображения
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
                    Единица
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => openDeleteConfirmation(product)}
                        className="text-red-600 hover:text-red-900"
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

      {/* Модальное окно добавления/редактирования товара */}
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
                      {editingProduct ? 'Редактирование товара' : 'Добавление товара'}
                    </h3>
                    <div className="mt-2">
                      <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Название *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Описание
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                            Единица измерения *
                          </label>
                          <input
                            type="text"
                            name="unit"
                            id="unit"
                            value={formData.unit}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                            URL изображения
                          </label>
                          <input
                            type="url"
                            name="image_url"
                            id="image_url"
                            value={formData.image_url}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                            Категория *
                          </label>
                          <select
                            name="category_id"
                            id="category_id"
                            value={formData.category_id}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveProduct}
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
                        Вы уверены, что хотите удалить товар "{productToDelete?.name}"? Это действие нельзя отменить.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteProduct}
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
