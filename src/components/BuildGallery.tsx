'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ContentImage from '@/components/ContentImage';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function BuildGallery({ imageIds, alt }: { imageIds: string[]; alt: string }) {
    const { dict } = useDictionary();
    const [active, setActive] = useState(0);

    if (imageIds.length === 0) {
        return <div className="aspect-[4/3] w-full rounded-2xl bg-gray-100" />;
    }

    const step = (delta: number) => setActive(current => (current + delta + imageIds.length) % imageIds.length);

    // Arrow keys step the gallery while focus is anywhere inside it: the arrows, or a thumbnail.
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    };

    const imageLabel = (index: number) =>
        dict.builds.imageOf.replace('{n}', String(index + 1)).replace('{total}', String(imageIds.length));

    return (
        <div className="min-w-0 space-y-3" role="group" aria-label={alt} onKeyDown={onKeyDown}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <ContentImage
                    imageId={imageIds[active]}
                    alt={alt}
                    sizes="(max-width: 1024px) 100vw, 640px"
                    className="h-full w-full object-contain"
                />

                {imageIds.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={dict.builds.previousImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-gray-200 hover:bg-white"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-gray-900" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={dict.builds.nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-gray-200 hover:bg-white"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-gray-900" />
                        </button>
                        {/* Read out on change, so a screen reader hears which image the arrows moved to. */}
                        <span aria-live="polite" className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                            <span className="sr-only">{imageLabel(active)}</span>
                            <span aria-hidden>{active + 1} / {imageIds.length}</span>
                        </span>
                    </>
                )}
            </div>

            {imageIds.length > 1 && (
                <div className="flex w-full min-w-0 gap-2 overflow-x-auto no-scrollbar">
                    {imageIds.map((id, index) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActive(index)}
                            aria-label={imageLabel(index)}
                            aria-current={index === active}
                            className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                                index === active ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <ContentImage imageId={id} alt="" sizes="80px" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
