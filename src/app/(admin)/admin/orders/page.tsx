'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Типы данных
type Order = {
  id: number
  created_at: string
  status: 'processing' | 'confirmed' | 'cancelled' | 'completed'
  user_id: string
  user_name: string
  user_phone: string
  items: OrderItem[]
}

type OrderItem = {
  id: number
  product_id: number
  quantity: number
  product_name: string
  product_unit: string
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')
  
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Загрузка заказов
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        setError(null)

        // Подготавливаем запрос заказов
        let query = supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            user_id,
            profiles (
              first_name,
              last_name,
              phone
            )
          `)
          .order('created_at', { ascending: false })

        // Применяем фильтр по статусу, если выбран
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data: ordersData, error: ordersError } = await query

        if (ordersError) throw ordersError

        if (!ordersData) {
          setOrders([])
          return
        }

        // Получаем детали заказов (товары)
        const ordersWithDetails = await Promise.all(
          ordersData.map(async (order) => {
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
              product_name: item.products.name,
              product_unit: item.products.unit
            }))

            return {
              id: order.id,
              created_at: order.created_at,
              status: order.status,
              user_id: order.user_id,
              user_name: `${order.profiles.first_name} ${order.profiles.last_name}`,
              user_phone: order.profiles.phone,
              items
            }
          })
        )

        setOrders(ordersWithDetails)

        // Если передан ID заказа в URL, выбираем его
        if (orderId) {
          const orderToSelect = ordersWithDetails.find(o => o.id === parseInt(orderId))
          if (orderToSelect) {
            setSelectedOrder(orderToSelect)
          }
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке заказов:', error)
        setError(error.message || 'Не удалось загрузить заказы')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [orderId, statusFilter])

  // Изменение статуса заказа
  const updateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      setStatusLoading(true)
      setError(null)
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // Обновляем статус в локальном состоянии
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }

      setSuccessMessage(`Статус заказа #${orderId} изменен на "${getStatusText(newStatus)}"`)
      
      // Скрываем сообщение об успешном изменении через 3 секунды
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса заказа:', error)
      setError(error.message || 'Не удалось обновить статус заказа')
    } finally {
      setStatusLoading(false)
    }
  }

  // Получение текстового представления статуса
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

  // Получение цвета статуса
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

  // Выбор заказа для просмотра подробностей
  const selectOrder = (order: Order) => {
    setSelectedOrder(order)
  }

  // Закрытие подробностей заказа
  const closeOrderDetails = () => {
    setSelectedOrder(null)
    
    // Удаляем параметр id из URL
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    window.history.replaceState({}, '', url)
  }

  if (loading) {
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
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md">
          <p>{successMessage}</p>
        </div>
      )}

      {/* Фильтр статусов */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="font-medium mb-3">Фильтр по статусу</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === 'processing' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            На обработке
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === 'confirmed' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Подтверждены
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === 'cancelled' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Отменены
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === 'completed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Выполнены
          </button>
        </div>
      </div>

      {/* Подробности заказа (если выбран) */}
      {selectedOrder && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium">
                Заказ #{selectedOrder.id}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(selectedOrder.created_at)}
              </p>
            </div>
            <button
              onClick={closeOrderDetails}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Информация о клиенте</h4>
              <p className="mb-1">
                <span className="text-gray-500">Имя:</span> {selectedOrder.user_name}
              </p>
              <p>
                <span className="text-gray-500">Телефон:</span> {selectedOrder.user_phone}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Статус заказа</h4>
              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>
            </div>
          </div>

          <h4 className="font-medium mb-2 text-gray-700">Товары в заказе</h4>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Наименование
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Единица
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.product_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-medium mb-3 text-gray-700">Изменить статус</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                disabled={statusLoading || selectedOrder.status === 'processing'}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  selectedOrder.status === 'processing'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                На обработке
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                disabled={statusLoading || selectedOrder.status === 'confirmed'}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  selectedOrder.status === 'confirmed'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Подтвердить
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                disabled={statusLoading || selectedOrder.status === 'cancelled'}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  selectedOrder.status === 'cancelled'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Отменить
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                disabled={statusLoading || selectedOrder.status === 'completed'}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  selectedOrder.status === 'completed'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Выполнен
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список заказов */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Все заказы</h3>
        </div>

        {orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {statusFilter === 'all'
              ? 'В системе пока нет заказов'
              : `Нет заказов со статусом "${getStatusText(statusFilter as Order['status'])}"`}
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
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товары
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr 
                    key={order.id}
                    className={selectedOrder?.id === order.id ? 'bg-blue-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.user_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => selectOrder(order)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Подробнее
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
