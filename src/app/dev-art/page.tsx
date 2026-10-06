import { ProductArt } from "@/components/brand/product-art";
import { Badge, Star, Wordmark } from "@/components/brand/logo";
import { seedMenu } from "@/domain/menu";

export default function Page() {
  const menu = seedMenu();
  return (
    <main className="p-6">
      <div className="flex items-center gap-6 mb-6">
        <Badge size={64} />
        <Wordmark className="h-12 text-orange" />
        <div className="bg-orange px-6 py-4 rounded-2xl"><Wordmark className="h-10 text-white" /></div>
        <Star className="w-8 h-8 text-orange" />
      </div>
      <div className="grid grid-cols-8 gap-3">
        {menu.map((m) => (
          <div key={m.id} className="text-[11px] font-semibold">
            <ProductArt art={m.art} className="w-full rounded-2xl" />
            <div className="mt-1 truncate">{m.name}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
