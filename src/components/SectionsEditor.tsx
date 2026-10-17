"use client";

import {
    FeedSectionEditor,
    HeroSectionEditor,
    ImagePicker,
    SectionsEditor as BaseSectionsEditor,
    StatsSectionEditor,
    type SectionEditorProps,
    type SectionEditors,
    type SectionImages,
    type SectionsEditorStrings,
    defaultSectionsEditorStrings,
} from '@sjolystinnovation/app-kit/sections';
import { nbSectionTypeLabels, nbSectionsEditorStrings } from '@sjolystinnovation/app-kit/locales/nb';
import ImageService from '@/services/imageService';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { createSection, type FeedAvailability, type FeedSection, type HeroSection, type Section, type SectionType, type StatSource, type StatsSection } from '@/types/content';

export const sectionImages: SectionImages = { upload: file => ImageService.upload(file) };

/**
 * The editor's labels: app-kit's Norwegian set, or its English defaults. Removing a section says Delete, so
 * in English it is not named like the Remove button of an image.
 */
export function sectionsEditorStrings(locale: Locale): SectionsEditorStrings {
    return {
        ...(locale === 'no' ? nbSectionsEditorStrings : defaultSectionsEditorStrings),
        remove: getDictionary(locale).common.delete,
    };
}

function HeroEditor(props: SectionEditorProps<HeroSection>) {
    const { dict } = useDictionary();
    const { section, patch } = props;
    return (
        <HeroSectionEditor
            {...props}
            media={
                <div>
                    <ImagePicker
                        imageId={section.backgroundImageId}
                        onChange={backgroundImageId => patch({ backgroundImageId })}
                        label={dict.sections.backgroundImage}
                        images={props.images}
                        strings={props.strings}
                    />
                    <p className="mt-1 text-xs text-gray-500">{dict.sections.backgroundHint}</p>
                </div>
            }
        />
    );
}

function FeedEditor(props: SectionEditorProps<FeedSection>) {
    const { dict } = useDictionary();
    const { section, patch } = props;
    return (
        <FeedSectionEditor {...props} className="grid sm:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sections.showing}</label>
                <select
                    value={section.availability ?? 'all'}
                    onChange={e => patch({ availability: e.target.value as FeedAvailability })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    <option value="all">{dict.sections.showingAll}</option>
                    <option value="available">{dict.sections.showingAvailable}</option>
                    <option value="reserved">{dict.sections.showingReserved}</option>
                    <option value="sold">{dict.sections.showingSold}</option>
                </select>
            </div>
        </FeedSectionEditor>
    );
}

function StatsEditor(props: SectionEditorProps<StatsSection>) {
    const { dict } = useDictionary();
    return (
        <StatsSectionEditor<StatSource>
            {...props}
            sources={[
                { value: 'builds', label: dict.sections.sourceBuilds, defaultItemLabel: dict.stats.builds },
                { value: 'parts', label: dict.sections.sourceParts, defaultItemLabel: dict.stats.parts },
            ]}
        />
    );
}

const editors: SectionEditors<Section> = { hero: HeroEditor, feed: FeedEditor, stats: StatsEditor };

export default function SectionsEditor({
    sections,
    onChange,
    types,
}: {
    sections: Section[];
    onChange: (sections: Section[]) => void;
    types?: SectionType[];
}) {
    const { locale, dict } = useDictionary();
    return (
        <BaseSectionsEditor
            sections={sections}
            onChange={onChange}
            types={types}
            createSection={createSection}
            editors={editors}
            images={sectionImages}
            strings={sectionsEditorStrings(locale)}
            // The feed lists this app's computers.
            typeLabels={{ ...(locale === 'no' ? nbSectionTypeLabels : undefined), feed: dict.sectionTypes.feed }}
        />
    );
}
