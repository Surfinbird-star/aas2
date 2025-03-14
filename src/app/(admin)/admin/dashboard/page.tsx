'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Типы для статистики
type DashboardStats = {
  totalOrders: number
  processingOrders: number
  confirmedOrders: number
  completedOrders: number
  totalProducts: number
  totalUsers: number
  recentOrders: RecentOrder[]
}

type RecentOrder = {
  id: number
  created_at: string
  status: string
  user_first_name: string
  user_last_name: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Получаем общее количество заказов
        const { data: totalOrdersData, error: totalOrdersError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })

        if (totalOrdersError) throw totalOrdersError

        // Получаем количество заказов в статусе "processing"
        const { data: processingOrdersData, error: processingOrdersError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')

        if (processingOrdersError) throw processingOrdersError

        // Получаем количество заказов в статусе "confirmed"
        const { data: confirmedOrdersData, error: confirmedOrdersError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'confirmed')

        if (confirmedOrdersError) throw confirmedOrdersError

        // Получаем количество заказов в статусе "completed"
        const { data: completedOrdersData, error: completedOrdersError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')

        if (completedOrdersError) throw completedOrdersError

        // Получаем общее количество товаров
        const { data: totalProductsData, error: totalProductsError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })

        if (totalProductsError) throw totalProductsError

        // Получаем общее количество пользователей
        const { data: totalUsersData, error: totalUsersError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .not('is_admin', 'eq', true)

        if (totalUsersError) throw totalUsersError

        // Получаем последние 5 заказов
        const { data: recentOrdersData, error: recentOrdersError } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            profiles (
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentOrdersError) throw recentOrdersError

        // Форматируем данные последних заказов
        const recentOrders = recentOrdersData.map(order => ({
          id: order.id,
          created_at: order.created_at,
          status: order.status,
          user_first_name: order.profiles.first_name,
          user_last_name: order.profiles.last_name
        }))

        // Устанавливаем статистику
        setStats({
          totalOrders: totalOrdersData.count || 0,
          processingOrders: processingOrdersData.count || 0,
          confirmedOrders: confirmedOrdersData.count || 0,
          completedOrders: completedOrdersData.count || 0,
          totalProducts: totalProductsData.count || 0,
          totalUsers: totalUsersData.count || 0,
          recentOrders
        })
      } catch (error: any) {
        console.error('Ошибка при загрузке статистики:', error)
        setError(error.message || 'Не удалось загрузить статистику')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Обработка</span>
      case 'confirmed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Подтвержден</span>
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Отменен</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Завершен</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Заказы</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-md p-3">
              <p className="text-sm text-blue-700">Всего</p>
              <p className="text-2xl font-bold text-blue-800">{stats?.totalOrders}</p>
            </div>
            <div className="bg-yellow-50 rounded-md p-3">
              <p className="text-sm text-yellow-700">В обработке</p>
              <p className="text-2xl font-bold text-yellow-800">{stats?.processingOrders}</p>
            </div>
            <div className="bg-green-50 rounded-md p-3">
              <p className="text-sm text-green-700">Подтверждено</p>
              <p className="text-2xl font-bold text-green-800">{stats?.confirmedOrders}</p>
            </div>
            <div className="bg-blue-50 rounded-md p-3">
              <p className="text-sm text-blue-700">Завершено</p>
              <p className="text-2xl font-bold text-blue-800">{stats?.completedOrders}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/orders"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              Управление заказами
              <svg 
                className="w-4 h-4 ml-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Товары</h3>
          <div className="bg-blue-50 rounded-md p-6 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-blue-800">{stats?.totalProducts}</p>
            <p className="text-sm text-blue-700 mt-2">Всего товаров в системе</p>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/products"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              Управление товарами
              <svg 
                className="w-4 h-4 ml-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Пользователи</h3>
          <div className="bg-blue-50 rounded-md p-6 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-blue-800">{stats?.totalUsers}</p>
            <p className="text-sm text-blue-700 mt-2">Зарегистрированных пользователей</p>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/users"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              Управление пользователями
              <svg 
                className="w-4 h-4 ml-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Последние заказы */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Последние заказы</h3>
        </div>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Нет заказов для отображения
                  </td>
                </tr>
              ) : (
                stats?.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.user_first_name} {order.user_last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders?id=${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Просмотр
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <Link
            href="/admin/orders"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center"
          >
            Показать все заказы
            <svg 
              className="w-4 h-4 ml-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M9 5l7 7-7 7" 
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
