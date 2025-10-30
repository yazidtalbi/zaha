export default function HeroCard() {
  return (
    <div className="px-4">
      <div className="rounded-2xl overflow-hidden relative">
        <img
          src="/banners/holiday.jpg" // your Supabase storage URL or local image
          alt="Discover our holiday picks"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4 text-white">
          <h2 className="text-lg font-semibold">Discover our holiday picks</h2>
          <button className="mt-2 bg-white text-black px-4 py-1 rounded-full text-sm w-fit">
            Get gifting
          </button>
        </div>
      </div>
    </div>
  );
}
