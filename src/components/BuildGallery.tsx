'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { imageUrl, imageSrcSet } from '@/services/imageService';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function BuildGallery({ imageIds, alt }: { imageIds: string[]; alt: string }) {
    const { dict } = useDictionary();
    const [active, setActive] = useState(0);

    if (imageIds.length === 0) {
        return <div className="aspect-[4/3] w-full rounded-2xl bg-gray-100" />;
    }

    const step = (delta: number) => setActive(current => (current + delta + imageIds.length) % imageIds.length);

    return (
        <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl(imageIds[active])}
                    srcSet={imageSrcSet(imageIds[active])}
                    sizes="(max-width: 1024px) 100vw, 640px"
                    alt={alt}
                    className="h-full w-full object-contain"
                />

                {imageIds.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={dict.admin.previousImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-gray-200 hover:bg-white"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-gray-900" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={dict.admin.nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-gray-200 hover:bg-white"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-gray-900" />
                        </button>
                        <span className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                            {active + 1} / {imageIds.length}
                        </span>
                    </>
                )}
            </div>

            {imageIds.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {imageIds.map((id, index) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActive(index)}
                            aria-label={`${dict.sections.image} ${index + 1}`}
                            aria-current={index === active}
                            className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                                index === active ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${imageUrl(id)}?w=384`} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
