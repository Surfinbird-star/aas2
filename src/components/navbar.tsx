'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Проверяем, что пользователь авторизован и находится в основном разделе
  const isMainSection = pathname.includes('/(main)')
  
  // Меню доступно только для авторизованных пользователей в основном разделе
  if (!isMainSection) return null

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/products" className="text-xl font-bold">
              AAS
            </Link>
          </div>
          
          {/* Мобильное меню */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none"
            >
              <svg 
                className="h-6 w-6" 
                stroke="currentColor" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          
          {/* Десктопное меню */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link 
              href="/products" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname.includes('/products') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              Товары
            </Link>
            <Link 
              href="/cart" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname.includes('/cart') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              Корзина
            </Link>
            <Link 
              href="/orders" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname.includes('/orders') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              Мои заказы
            </Link>
            <Link 
              href="/documents" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname.includes('/documents') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              Документы
            </Link>
            <button 
              onClick={() => {/* Здесь будет логика выхода */}}
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
      
      {/* Мобильное меню (открывается/закрывается) */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/products" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.includes('/products') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Товары
            </Link>
            <Link 
              href="/cart" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.includes('/cart') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Корзина
            </Link>
            <Link 
              href="/orders" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.includes('/orders') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Мои заказы
            </Link>
            <Link 
              href="/documents" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.includes('/documents') ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Документы
            </Link>
            <button 
              onClick={() => {/* Здесь будет логика выхода */}}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
