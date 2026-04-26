'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiGet, apiDelete } from '@/lib/api';
import type { WardrobeItem } from '@/types';
import Image from 'next/image';

export default function WardrobePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wardrobe'],
    queryFn: () => apiGet<{ items: WardrobeItem[] }>('/wardrobe'),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasProcessing = items.some(
        (i) => i.classification_status === 'pending' || i.classification_status === 'processing'
      );
      return hasProcessing ? 5000 : false;
    },
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => apiDelete(`/wardrobe/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe'] }),
  });

  function handleDelete(id: string) {
    if (!window.confirm('Remove this item from your wardrobe?')) return;
    deleteItem(id);
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Wardrobe</h1>
        <button
          onClick={() => router.push('/wardrobe/add')}
          className="bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
        >
          + Add Item
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading wardrobe...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-xl font-bold mb-2">Your wardrobe is empty</p>
          <p className="text-gray-400">Add your first item to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group aspect-square bg-gray-900 rounded-xl overflow-hidden relative"
            >
              {item.photo_thumbnail_url ? (
                <Image
                  src={item.photo_thumbnail_url}
                  alt={item.label ?? item.item_type}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span className="text-gray-500 text-xs capitalize">{item.item_type}</span>
                  {item.label && (
                    <span className="text-gray-300 text-sm font-medium">{item.label}</span>
                  )}
                  {item.colors.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.colors.slice(0, 3).map((color) => (
                        <span key={color} className="text-gray-500 text-xs">{color}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Delete button — revealed on hover */}
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center hover:bg-red-900/80 transition"
              >
                ×
              </button>

              {/* Classification status overlay */}
              {(item.classification_status === 'pending' ||
                item.classification_status === 'processing') && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Analysing...</span>
                </div>
              )}
              {item.classification_status === 'failed' && (
                <div className="absolute bottom-0 inset-x-0 bg-red-900/80 px-2 py-1">
                  <span className="text-red-300 text-xs">Analysis failed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
