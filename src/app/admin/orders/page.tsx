'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import React from 'react'

// Типы данных
type OrderStatus = 'archived' | 'processing' | 'completed' | 'cancelled'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  product_name: string
  product_unit: string
}

interface ProfileData {
  email?: string
  first_name?: string
  last_name?: string
}

interface Order {
  id: string
  user_id: string
  status: OrderStatus
  created_at: string
  items: OrderItem[]
  user_email: string
  user_name: string
}

interface OrderData {
  id: string
  user_id: string
  status: OrderStatus
  created_at: string
  profiles: ProfileData | null
}

// Функция для форматирования даты
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

// Перевод статусов заказа на русский язык
const translateStatus = (status: OrderStatus) => {
  const statusMap: Record<OrderStatus, string> = {
    archived: 'Архивный',
    processing: 'В обработке',
    completed: 'Выполнен',
    cancelled: 'Отменен'
  }
  return statusMap[status] || status
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [editedQuantities, setEditedQuantities] = useState<{[key: string]: number}>({})
  const [savingQuantities, setSavingQuantities] = useState<{[key: string]: boolean}>({})

  // Получение списка заказов
  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Получаем заказы
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles (
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: dateSort === 'asc' })
      
      // Приводим данные к типу OrderData[]
      const typedOrdersData = ordersData as unknown as OrderData[]

      if (ordersError) throw ordersError

      // Для каждого заказа получаем его товары
      const ordersWithItems = await Promise.all(
        (typedOrdersData || []).map(async (order) => {
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

          // Преобразуем данные заказа к нужному формату
          const items: OrderItem[] = (itemsData || []).map(item => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            product_name: item.products && 'name' in item.products ? item.products.name as string : 'Неизвестный товар',
            product_unit: item.products && 'unit' in item.products ? item.products.unit as string : 'шт.'
          }))

          const orderObj: Order = {
            id: order.id,
            user_id: order.user_id,
            status: order.status as OrderStatus,
            created_at: order.created_at,
            user_email: order.profiles?.email || 'Нет данных',
            user_name: order.profiles?.first_name && order.profiles?.last_name 
              ? `${order.profiles.first_name} ${order.profiles.last_name}`
              : 'Неизвестный пользователь',
            items
          }
          
          return orderObj
        })
      )

      setOrders(ordersWithItems)
    } catch (error) {
      console.error('Ошибка при загрузке заказов:', error)
      setError('Не удалось загрузить заказы. Пожалуйста, попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  // Вызываем загрузку заказов при первом рендере и изменении сортировки
  useEffect(() => {
    fetchOrders()
  }, [dateSort])

  // Фильтрация и поиск заказов
  const filteredOrders = orders.filter(order => {
    // Фильтрация по статусу
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }
    
    // Поиск по запросу (проверяем ID, имя пользователя и email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesId = String(order.id).toLowerCase().includes(query)
      const matchesName = order.user_name.toLowerCase().includes(query)
      const matchesEmail = order.user_email.toLowerCase().includes(query)
      
      if (!matchesId && !matchesName && !matchesEmail) {
        return false
      }
    }
    
    return true
  })

  // Изменение статуса заказа
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId)
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
      
      if (error) throw error
      
      // Обновляем статус в локальном состоянии
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus } 
            : order
        )
      )
      
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error)
      alert('Не удалось обновить статус заказа')
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Обновление количества товара в заказе
  const updateItemQuantity = async (orderId: string, itemId: string, newQuantity: number) => {
    try {
      setSavingQuantities(prev => ({ ...prev, [itemId]: true }))
      
      // Обновляем количество в базе данных
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)
        .eq('order_id', orderId)
      
      if (error) throw error
      
      // Обновляем количество в локальном состоянии
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            const updatedItems = order.items.map(item => 
              item.id === itemId
                ? { ...item, quantity: newQuantity }
                : item
            )
            return { ...order, items: updatedItems }
          }
          return order
        })
      )
      
      // Очищаем отредактированное состояние для этого элемента
      setEditedQuantities(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
      
    } catch (error) {
      console.error('Ошибка при обновлении количества товара:', error)
      alert('Не удалось обновить количество товара в заказе')
    } finally {
      setSavingQuantities(prev => ({ ...prev, [itemId]: false }))
    }
  }

  // Экспорт в Excel
  const exportToExcel = () => {
    // Создаем структуру данных для Excel
    const worksheetData = filteredOrders.map(order => ({
      'ID заказа': order.id,
      'Дата создания': formatDate(order.created_at),
      'Клиент': order.user_name,
      'Email': order.user_email,
      'Количество товаров': order.items.reduce((total, item) => total + item.quantity, 0),
      'Статус': translateStatus(order.status)
    }))
    
    // Создаем рабочую книгу Excel
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы')
    
    // Устанавливаем ширину столбцов
    const columnWidths = [
      { wch: 15 }, // ID 
      { wch: 20 }, // Дата
      { wch: 25 }, // Клиент
      { wch: 25 }, // Email
      { wch: 15 }, // Количество
      { wch: 15 }, // Сумма
      { wch: 15 }, // Статус
    ]
    worksheet['!cols'] = columnWidths
    
    // Преобразуем в бинарный формат и сохраняем
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const date = new Date().toISOString().split('T')[0]
    const fileName = `Заказы_AAS_${date}.xlsx`
    
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(blob, fileName)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Управление заказами</h1>
        <button
          onClick={exportToExcel}
          disabled={filteredOrders.length === 0}
          className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center ${
            filteredOrders.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Экспорт в Excel
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Статус заказа
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Все статусы</option>
              <option value="archived">Архивные</option>
              <option value="processing">В обработке</option>
              <option value="completed">Выполненные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="dateSort" className="block text-sm font-medium text-gray-700 mb-1">
              Сортировка по дате
            </label>
            <select
              id="dateSort"
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value as 'asc' | 'desc')}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
              Поиск по ID/Клиенту/Email
            </label>
            <input
              id="searchQuery"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Отображение ошибки */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Индикатор загрузки */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Количество заказов */}
          <div className="mb-4 text-gray-500">
            {filteredOrders.length === 0 ? (
              'Заказы не найдены'
            ) : (
              `Найдено заказов: ${filteredOrders.length}`
            )}
          </div>

          {/* Список заказов */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID заказа
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Кол-во товаров
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map(order => (
                    <React.Fragment key={order.id}>
                      {/* Строка с основной информацией о заказе */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{order.user_name}</div>
                          <div className="text-xs text-gray-400">{order.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {translateStatus(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items.length ? order.items.reduce((total, item) => total + item.quantity, 0) : 0} шт.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <span className="mr-1">{expandedOrder === order.id ? 'Скрыть' : 'Детали'}</span>
                              <svg className={`w-4 h-4 transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Детали заказа (отображаются при раскрытии) */}
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Товары в заказе</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                {order.items.map(item => (
                                  <div key={item.id} className="bg-white p-3 rounded border border-gray-200">
                                    <div className="font-medium text-gray-800">{item.product_name}</div>
                                    <div className="text-sm text-gray-600 mt-1 flex items-center justify-between">
                                      <span>Количество:</span>
                                      <div className="flex items-center">
                                        <input 
                                          type="number" 
                                          min="1"
                                          value={editedQuantities[item.id] !== undefined ? editedQuantities[item.id] : item.quantity} 
                                          onChange={(e) => {
                                            const newValue = parseInt(e.target.value, 10) || 1;
                                            setEditedQuantities(prev => ({ ...prev, [item.id]: newValue }))
                                          }}
                                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded mr-2"
                                        />
                                        <span>{item.product_unit}</span>
                                        {editedQuantities[item.id] !== undefined && editedQuantities[item.id] !== item.quantity && (
                                          <button 
                                            className="ml-2 text-blue-600 p-1 rounded hover:bg-blue-50 disabled:opacity-50"
                                            disabled={savingQuantities[item.id]}
                                            onClick={() => updateItemQuantity(order.id, item.id, editedQuantities[item.id])}
                                          >
                                            {savingQuantities[item.id] ? (
                                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                            ) : (
                                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <h4 className="font-medium text-gray-900 mb-2 mt-4">Изменить статус</h4>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'archived')}
                                  disabled={order.status === 'archived' || updatingStatus === order.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    order.status === 'archived' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                  }`}
                                >
                                  Архивный
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'processing')}
                                  disabled={order.status === 'processing' || updatingStatus === order.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    order.status === 'processing' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  }`}
                                >
                                  В обработке
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'completed')}
                                  disabled={order.status === 'completed' || updatingStatus === order.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    order.status === 'completed' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  Выполнен
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                  disabled={order.status === 'cancelled' || updatingStatus === order.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    order.status === 'cancelled' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                >
                                  Отменен
                                </button>
                                
                                {updatingStatus === order.id && (
                                  <span className="text-xs text-gray-500 flex items-center ml-2">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Обновление...
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500">
                Заказы не найдены. Попробуйте изменить параметры фильтрации.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
