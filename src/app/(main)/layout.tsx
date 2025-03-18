'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ first_name?: string, last_name?: string } | null>(null)
  
  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error)
    }
  }

  useEffect(() => {
    // Проверяем аутентификацию пользователя при загрузке макета
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Пользователь не аутентифицирован, перенаправляем на страницу входа
          router.push('/login')
        } else {
          setUser(session.user)
          
          // Получаем данные профиля пользователя
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single()
          
          if (profileData) {
            setProfile(profileData)
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('Ошибка при проверке сессии:', error)
        router.push('/login')
      }
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Загрузка...</h2>
          <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {profile && (
          <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100 text-center">
            <p className="text-blue-800">
              Здравствуйте, <span className="font-semibold">{profile.first_name} {profile.last_name}</span>! Добро пожаловать в сервис AAS.
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
