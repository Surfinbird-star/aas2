'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Типы данных
type Order = {
  id: number
  status: 'processing' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

type OrderItem = {
  id: number
  product_id: number
  quantity: number
  product_name: string
  product_unit: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  // Загрузка заказов пользователя
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Получаем данные текущего пользователя
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error('Пользователь не авторизован')
        }

        // Получаем заказы пользователя, отсортированные по дате создания (сначала новые)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError

        // Для каждого заказа получаем информацию о товарах
        const ordersWithItems = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                product_id,
                quantity,
                products (
                  name,
                  unit
                )
              `)
              .eq('order_id', order.id)

            if (itemsError) throw itemsError

            // Преобразуем данные в более удобный формат
            const items = (itemsData || []).map(item => ({
              id: item.id,
              product_id: item.product_id,
              quantity: item.quantity,
              product_name: item.products && 'name' in item.products ? item.products.name : 'Неизвестный товар',
              product_unit: item.products && 'unit' in item.products ? item.products.unit : 'шт.'
            }))

            return {
              ...order,
              items
            }
          })
        )

        setOrders(ordersWithItems)
      } catch (error: any) {
        console.error('Ошибка при загрузке заказов:', error)
        setError(error.message || 'Не удалось загрузить заказы')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // Перевод статуса заказа на русский
  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return 'На обработке'
      case 'confirmed':
        return 'Подтвержден'
      case 'cancelled':
        return 'Отменен'
      case 'completed':
        return 'Выполнен'
      default:
        return status
    }
  }

  // Цвет для статуса заказа
  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Переключение развернутого/свернутого состояния заказа
  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-lg shadow-md max-w-md mx-auto my-10">
        <h2 className="text-xl font-bold mb-2">Ошибка</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link 
          href="/products" 
          className="mr-3 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition duration-200"
        >
          <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-blue-700">Мои заказы</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <svg 
            className="w-16 h-16 text-gray-400 mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
            />
          </svg>
          <h2 className="text-xl font-semibold mb-4">У вас пока нет заказов</h2>
          <p className="text-gray-600 mb-6">
            Выберите товары из каталога и оформите свой первый заказ
          </p>
          <Link
            href="/products"
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300"
          >
            Перейти к товарам
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div>
                  <h3 className="font-medium">Заказ #{order.id}</h3>
                  <p className="text-sm text-gray-600">
                    Создан: {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} shadow-sm`}>
                    {getStatusText(order.status)}
                  </span>
                  <svg 
                    className={`w-5 h-5 ml-2 transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 9l-7 7-7-7" 
                    />
                  </svg>
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h4 className="font-medium mb-3 text-blue-700">Состав заказа:</h4>
                  <ul className="divide-y divide-gray-200 mb-3">
                    {order.items && order.items.map((item) => (
                      <li key={item.id} className="py-3 flex justify-between items-center">
                        <span className="text-gray-800 font-medium">{item.product_name}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                          {item.quantity} {item.product_unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.status === 'confirmed' && (
                    <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md">
                      <p className="text-sm">
                        Ваш заказ подтвержден администратором. Вы можете забрать его в пункте выдачи.
                      </p>
                    </div>
                  )}
                  {order.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md">
                      <p className="text-sm">
                        К сожалению, ваш заказ был отменен. Пожалуйста, свяжитесь с администратором для получения дополнительной информации.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
