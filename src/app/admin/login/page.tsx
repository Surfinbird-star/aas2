'use client'

import { useState, FormEvent, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <LoginContent />
    </Suspense>
  )
}

// Компонент, который использует useSearchParams
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // При загрузке страницы входа удаляем любые флаги авторизации
  useEffect(() => {
    // Удаляем флаг перенаправления, чтобы избежать зацикливания
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_redirect');
    }
  }, [])

  // Добавляем базовые сообщения об ошибках из URL
  const errorParam = searchParams.get('error')
  const errorMessage = errorParam === 'not_admin' 
    ? 'У вас нет прав администратора' 
    : null

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Введите email и пароль')
      return
    }
    
    try {
      // Начинаем процесс входа
      setLoading(true)
      setError(null)
      
      // Вход через Supabase
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      // Обработка ошибки входа
      if (loginError) {
        console.error('Ошибка входа:', loginError)
        setError(loginError.message || 'Ошибка при входе')
        setLoading(false)
        return
      }
      
      // Проверяем, что пользователь получен
      if (!data.user) {
        setError('Не удалось получить данные пользователя')
        setLoading(false)
        return
      }
      
      console.log('Успешный вход:', data.user.email)
      
      // Проверяем права администратора
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single()
        
        console.log('Проверка прав администратора:', profileData)
        
        if (profileError) {
          console.error('Ошибка при получении профиля:', profileError)
          setError('Ошибка при проверке прав администратора')
          // Сначала устанавливаем флаг перенаправления
          sessionStorage.setItem('admin_redirect', 'true');
          // Выходим из аккаунта, так как не можем проверить права
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        // Проверяем, что пользователь является администратором
        if (!profileData || profileData.is_admin !== true) {
          console.log('Отказ в доступе: пользователь не является администратором')
          setError('У вас нет прав администратора')
          // Выходим из аккаунта администратора и перенаправляем на страницу с товарами
          sessionStorage.setItem('admin_redirect', 'true');
          await supabase.auth.signOut()
          setLoading(false)
          // Используем жесткое перенаправление
          window.location.replace('/products')
          return
        }
        
        // Пользователь имеет права администратора, устанавливаем флаг перенаправления
        sessionStorage.setItem('admin_authenticated', 'true');
        console.log('Доступ разрешен: пользователь является администратором')
        
        // Используем жесткое перенаправление вместо router.push для надежности
        window.location.replace('/admin/orders')
      } catch (profileCheckError: any) {
        console.error('Ошибка при проверке прав администратора:', profileCheckError)
        setError('Ошибка при проверке прав администратора')
        setLoading(false)
      }
    } catch (error: any) {
      // Общий обработчик ошибок
      console.error('Непредвиденная ошибка:', error)
      setError('Произошла ошибка при входе. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Вход в панель администратора
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          AAS Food Admin Panel
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {(error || errorMessage) && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
              {error || errorMessage}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  или
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link 
                href="/"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Вернуться на сайт
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
