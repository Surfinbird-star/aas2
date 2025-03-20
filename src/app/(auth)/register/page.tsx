'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getSupabaseAdmin } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    console.log('Начало процесса регистрации')

    try {
      // Регистрация в Supabase Auth
      console.log('Отправка запроса на регистрацию в Supabase')
      
      // Убираем параметр emailRedirectTo, так как он может вызывать проблемы
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })
      console.log('Ответ от Supabase:', authData, authError)

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Добавление профиля пользователя с дополнительной информацией
        try {
          console.log('Создание профиля для пользователя:', authData.user.id);
          
          // Создаем запись в profiles
          const { data, error } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                email: email,
                created_at: new Date().toISOString()
              }
            ])
            .select();
          
          if (error) {
            console.error('Ошибка при создании профиля:', error.message);
            // Продолжаем выполнение, даже если есть ошибка при создании профиля
          } else {
            console.log('Профиль успешно создан:', data);
          }
        } catch (profileErr) {
          console.error('Ошибка при создании профиля:', profileErr);
          // Продолжаем выполнение, даже если есть ошибка при создании профиля
        }
        
        // Показываем сообщение об успешной регистрации в любом случае
        console.log('Регистрация успешна, показываем сообщение о проверке почты');
        setRegistered(true);
      }
    } catch (error: any) {
      console.error('Ошибка регистрации:', error);
      
      // Более подробное объяснение ошибки
      let errorMessage = 'Ошибка при регистрации';
      
      if (error.message) {
        console.log('Текст ошибки:', error.message);
        
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Пользователь с таким email уже существует';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Неверный формат данных. Проверьте введенные значения';
        } else if (error.message.includes('column')) {
          errorMessage = 'Ошибка в структуре базы данных: ' + error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      {registered ? (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600">AAS</h1>
            <p className="mt-2 text-gray-600">Регистрация успешна</p>
          </div>
          <div className="bg-green-50 text-green-700 p-6 rounded-md text-center space-y-4">
            <h2 className="text-xl font-semibold">Регистрация успешна!</h2>
            <p>Пожалуйста, проверьте вашу почту <strong>{email}</strong> и подтвердите регистрацию, перейдя по ссылке в письме.</p>
            <p className="text-sm">После подтверждения почты вы сможете войти в систему.</p>
            <Link href="/login" className="mt-4 inline-block py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Перейти к странице входа
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600">AAS</h1>
            <p className="mt-2 text-gray-600">Регистрация в приложении</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Минимум 6 символов"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-500">
                Войти
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
