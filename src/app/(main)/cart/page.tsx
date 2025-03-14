'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Тип для элемента корзины
type CartItem = {
  id: number
  name: string
  quantity: number
  unit: string
  price?: number
}

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [hasProcessingOrder, setHasProcessingOrder] = useState(false)

  // Загрузка корзины из localStorage и проверка активных заказов
  useEffect(() => {
    // Загружаем корзину из localStorage
    const loadCart = () => {
      const savedCart = localStorage.getItem('cart')
      console.log('Загрузка корзины из localStorage:', savedCart)
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart)
          console.log('Парсинг корзины:', parsedCart)
          setCart(parsedCart)
        } catch (e) {
          console.error('Ошибка при загрузке корзины из localStorage:', e)
          localStorage.removeItem('cart')
        }
      }
    }
    
    loadCart()

    // Проверяем, есть ли заказы в статусе "processing"
    const checkProcessingOrders = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'processing')
            .limit(1)

          if (error) throw error

          setHasProcessingOrder(orders && orders.length > 0)
        }
      } catch (error) {
        console.error('Ошибка при проверке заказов:', error)
      } finally {
        setLoading(false)
      }
    }

    checkProcessingOrders()
  }, [])

  // Сохранение корзины в localStorage при её изменении
  useEffect(() => {
    if (cart.length > 0) {
      console.log('Сохранение корзины в localStorage:', cart)
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart])

  // Изменение количества товара
  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id)
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  // Удаление товара из корзины
  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  // Очистка корзины
  const clearCart = () => {
    setCart([])
    console.log('Очистка корзины')
    localStorage.removeItem('cart')
  }

  // Оформление заказа
  const placeOrder = async () => {
    setOrderLoading(true)
    setError(null)

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Пользователь не авторизован')
      }

      // Проверяем, есть ли товары в корзине
      if (cart.length === 0) {
        throw new Error('Корзина пуста')
      }

      // Рассчитываем общую сумму заказа
      const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

      // Создаем заказ с правильными полями
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            status: 'processing',
            total: total || 0,
            phone: '',  // Можно добавить получение телефона из профиля пользователя
            address: '', // Можно добавить получение адреса из профиля пользователя
            comments: ''
          },
        ])
        .select()

      if (orderError) throw orderError

      if (!orderData || orderData.length === 0) {
        throw new Error('Не удалось создать заказ')
      }

      const orderId = orderData[0].id

      // Добавляем товары в заказ (бесплатная раздача еды)
      const orderItems = cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name, // Имя продукта
        product_unit: item.unit, // Единица измерения
        price: 0, // Цена всегда 0, так как это бесплатная раздача
        quantity: item.quantity, // Количество
        total: 0, // Общая стоимость всегда 0 (бесплатная раздача)
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Заказ успешно оформлен
      setOrderSuccess(true)
      clearCart()
      
      // Не перенаправляем автоматически, пользователь сам решит куда перейти
    } catch (error: any) {
      console.error('Ошибка при оформлении заказа:', error)
      setError(error.message || 'Не удалось оформить заказ')
    } finally {
      setOrderLoading(false)
    }
  }

  // Показываем сообщение об успешном оформлении заказа
  if (orderSuccess) {
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
          <h1 className="text-2xl font-bold text-blue-700">Корзина</h1>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <div className="text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg 
                className="w-12 h-12 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Заказ успешно оформлен!</h2>
            <p className="text-gray-600 mb-6">Ваш заказ принят в обработку и скоро будет рассмотрен администратором.</p>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link href="/orders" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300 font-medium">
                Мои заказы
              </Link>
              <Link href="/products" className="px-6 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition duration-300 font-medium">
                Вернуться к товарам
              </Link>
            </div>
          </div>
        </div>
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
        <h1 className="text-3xl font-bold text-blue-800">Корзина</h1>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6 border-2 border-red-200 font-medium">
          {error}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-lg text-center border border-gray-200">
          <svg 
            className="w-20 h-20 text-blue-500 mx-auto mb-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
            />
          </svg>
          <h2 className="text-2xl font-bold mb-4 text-blue-800">Ваша корзина пуста</h2>
          <p className="text-gray-700 mb-8 text-lg">
            Добавьте товары из каталога, чтобы сформировать заказ
          </p>
          <Link
            href="/products"
            className="bg-blue-700 text-white py-3 px-8 rounded-md hover:bg-blue-800 font-medium text-lg transition-colors duration-200 inline-block"
          >
            Перейти к товарам
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Товар
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Единица
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cart.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-base font-semibold text-blue-800">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-base text-gray-600 font-medium">{item.unit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded-l-md font-bold transition-colors duration-200"
                      >
                        -
                      </button>
                      <div className="bg-gray-100 text-gray-800 px-5 py-1 font-bold text-base">
                        {item.quantity}
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-blue-700 text-white hover:bg-blue-800 px-3 py-1 rounded-r-md font-bold transition-colors duration-200"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-900 font-semibold py-1 px-3 border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-6 bg-blue-50 border-t-2 border-blue-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            <button
              onClick={clearCart}
              className="bg-gray-100 text-gray-800 py-3 px-6 rounded-md hover:bg-gray-200 w-full sm:w-auto font-medium border border-gray-300 transition-colors duration-200 shadow-sm"
            >
              Очистить корзину
            </button>
            <button
              onClick={placeOrder}
              disabled={orderLoading || hasProcessingOrder || cart.length === 0}
              className={`bg-blue-700 text-white py-3 px-8 rounded-md hover:bg-blue-800 w-full sm:w-auto font-semibold text-lg shadow-md transition-colors duration-200 ${
                (orderLoading || hasProcessingOrder || cart.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {orderLoading ? 'Оформляем заказ...' : 'Оформить заказ'}
            </button>
          </div>

          {hasProcessingOrder && (
            <div className="p-4 bg-yellow-50 text-yellow-800 border-t border-yellow-200">
              <p className="text-center">
                У вас уже есть заказ в обработке. Вы сможете оформить новый заказ после того, как администратор обработает текущий.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
