import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  redirect('/admin/orders');
  
  // Этот код выполнится только если redirect не сработает
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-2xl font-bold">
          Перенаправление на страницу заказов...
        </h1>
      </main>
    </div>
  );
}
