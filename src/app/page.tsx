import { redirect } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  // В будущем тут будет проверка авторизации
  // и редирект на соответствующую страницу
  redirect('/login');

  // Этот код выполнится только если redirect не сработает
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-4xl font-bold">
          AAS - Формирование заказов на бесплатную еду
        </h1>
        <p className="text-xl">Загрузка приложения...</p>
      </main>
    </div>
  );
}
