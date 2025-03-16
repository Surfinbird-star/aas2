'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'

type Product = Tables['products']
type Category = Tables['categories']

// Тип для корзины 
type CartItem = {
  id: number
  name: string
  quantity: number
  unit: string
}

// Ключ для хранения корзины в localStorage
const CART_STORAGE_KEY = 'cart'

export default function ProductsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cartLoaded, setCartLoaded] = useState(false)

  // Загрузка корзины из localStorage
  useEffect(() => {
    // Загружаем корзину из localStorage только один раз при загрузке страницы
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY)
        console.log('Загрузка корзины из localStorage:', savedCart)
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart)
          console.log('Парсинг корзины:', parsedCart)
          setCart(parsedCart)
        }
        setCartLoaded(true)
      } catch (e) {
        console.error('Ошибка при загрузке корзины из localStorage:', e)
        localStorage.removeItem(CART_STORAGE_KEY)
        setCartLoaded(true)
      }
    }

    loadCart()

    // Добавляем слушатель для синхронизации корзины между вкладками
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const newCart = JSON.parse(e.newValue)
          console.log('Обновление корзины из storage event:', newCart)
          setCart(newCart)
        } catch (err) {
          console.error('Ошибка при обработке storage event:', err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  // Сохранение корзины в localStorage при каждом её изменении
  useEffect(() => {
    // Сохраняем только если корзина уже загружена, чтобы избежать перезаписи при старте
    if (cartLoaded) {
      console.log('Сохранение корзины в localStorage:', cart)
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart, cartLoaded])

  // Загрузка категорий и товаров
  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        // Загружаем категории
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name')

        if (categoriesError) throw categoriesError

        setCategories(categoriesData || [])

        // Если категории есть, выбираем первую по умолчанию
        if (categoriesData?.length) {
          setSelectedCategory(categoriesData[0].id)
        }

        // Загружаем все товары
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('name')

        if (productsError) throw productsError

        setProducts(productsData || [])
      } catch (error: any) {
        console.error('Ошибка при загрузке данных:', error)
        setError(error.message || 'Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoriesAndProducts()

      // Загрузка корзины теперь происходит в отдельном useEffect
  }, [])

  // Сохранение корзины теперь происходит в первом useEffect

  // Добавление товара в корзину
  const addToCart = (product: Product) => {
    console.log('Добавление товара в корзину:', product.name)
    setCart((prevCart) => {
      // Проверяем, есть ли уже этот товар в корзине
      const existingItem = prevCart.find((item) => item.id === product.id)

      let newCart;
      if (existingItem) {
        // Увеличиваем количество товара
        newCart = prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        // Добавляем новый товар в корзину
        newCart = [...prevCart, { id: product.id, name: product.name, quantity: 1, unit: product.unit }]
      }
      
      return newCart
    })
  }
  
  // Удаление товара из корзины (уменьшение количества)
  const removeFromCart = (productId: number) => {
    console.log('Удаление товара из корзины:', productId)
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      
      let newCart;
      if (existingItem) {
        if (existingItem.quantity > 1) {
          // Если товаров больше одного, уменьшаем количество
          newCart = prevCart.map((item) =>
            item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
          )
        } else {
          // Если товар один, удаляем его из корзины
          newCart = prevCart.filter((item) => item.id !== productId)
        }
        return newCart
      }
      
      return prevCart
    })
  }

  // Переход в корзину
  const goToCart = () => {
    console.log('Переход в корзину')
    router.push('/cart')
  }

  // Отфильтрованные товары по категории
  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category_id === selectedCategory)
    : products

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Загрузка товаров...</h2>
          <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-500 p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold mb-2">Ошибка</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">Список товаров</h1>
      
      {/* Информация о корзине и заказах */}
      <div className="bg-blue-100 p-4 rounded-md mb-6 flex flex-col sm:flex-row justify-between items-center border-2 border-blue-200 gap-3">
        <div>
          <p className="font-semibold text-blue-800">Товаров в корзине: {cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/orders" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold transition-colors duration-200 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Мои заказы
          </Link>
          <button
            onClick={goToCart}
            className="bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800 font-semibold transition-colors duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Перейти в корзину
          </button>
        </div>
      </div>

      {/* Выбор категории */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-fr">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm h-full w-full flex items-center justify-center ${
                selectedCategory === category.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Список товаров */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">В данной категории нет товаров</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            // Проверяем, есть ли товар в корзине
            const cartItem = cart.find((item) => item.id === product.id)

            return (
              <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-200 flex flex-col h-full">
                <div className="p-5 flex flex-col flex-grow">
                  <h2 className="text-xl font-bold mb-3 text-blue-800 line-clamp-2 h-14">{product.name}</h2>
                  {product.description && (
                    <p className="text-gray-700 mb-4 flex-grow line-clamp-3 min-h-[4.5rem]">{product.description}</p>
                  )}
                  {!product.description && <div className="flex-grow min-h-[4.5rem]"></div>}
                  <p className="text-gray-600 mb-4 font-medium">Единица: {product.unit}</p>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-auto">
                    {cartItem ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="bg-red-600 text-white py-1 px-3 rounded-md hover:bg-red-700 font-bold"
                        >
                          -
                        </button>
                        <span className="font-medium text-blue-800">{cartItem.quantity} в корзине</span>
                        <button
                          onClick={() => addToCart(product)}
                          className="bg-blue-700 text-white py-1 px-3 rounded-md hover:bg-blue-800 font-bold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800 font-medium w-full transition-colors duration-200"
                      >
                        Добавить в корзину
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
