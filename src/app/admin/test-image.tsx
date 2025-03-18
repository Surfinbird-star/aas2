'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestImageView() {
  const [documentId, setDocumentId] = useState<string>('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('')
  const [filename, setFilename] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchImage = async () => {
    if (!documentId) {
      setError('Пожалуйста, введите ID документа')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Загружаем документ с ID: ${documentId}`)
      
      const { data, error } = await supabase
        .from('user_documents')
        .select('content, mime_type, filename')
        .eq('id', documentId)
        .single()
      
      if (error) {
        console.error('Ошибка при загрузке документа:', error)
        setError(`Ошибка: ${error.message}`)
        return
      }
      
      if (!data || !data.content) {
        console.error('Документ не содержит данных')
        setError('Документ не содержит данных')
        return
      }
      
      console.log(`Загружен документ: ${data.filename}, тип: ${data.mime_type}`)
      console.log('Первые 100 символов Base64:', data.content.substring(0, 100))
      
      setImageData(data.content)
      setMimeType(data.mime_type)
      setFilename(data.filename)
      
    } catch (err: any) {
      console.error('Ошибка:', err)
      setError(err.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест просмотра изображений</h1>
      
      <div className="mb-6">
        <label className="block mb-2">ID документа:</label>
        <div className="flex">
          <input 
            type="text" 
            value={documentId} 
            onChange={(e) => setDocumentId(e.target.value)}
            className="px-4 py-2 border rounded-l-md w-full"
            placeholder="Введите ID документа"
          />
          <button 
            onClick={fetchImage}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {imageData && (
        <div className="border p-4 rounded-md">
          <h2 className="text-xl mb-4">{filename}</h2>
          <p className="mb-2">Тип: {mimeType}</p>
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-medium mb-2">Стандартный способ:</h3>
              <img 
                src={`data:${mimeType};base64,${imageData}`} 
                alt="Изображение"
                className="max-w-full h-auto border"
                onError={() => console.error('Ошибка при загрузке изображения (способ 1)')}
              />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Альтернативный способ (через Blob):</h3>
              {mimeType.startsWith('image/') && (
                <img 
                  src={URL.createObjectURL(
                    new Blob(
                      [Uint8Array.from(atob(imageData), c => c.charCodeAt(0))], 
                      { type: mimeType }
                    )
                  )}
                  alt="Изображение (blob)"
                  className="max-w-full h-auto border"
                  onError={() => console.error('Ошибка при загрузке изображения (способ 2)')}
                />
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Первые 100 символов Base64:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                {imageData.substring(0, 100)}...
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
