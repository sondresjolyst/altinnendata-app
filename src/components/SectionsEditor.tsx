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
} from '@sjolystinnovation/app-kit/sections';
import ImageService from '@/services/imageService';
import type { Dictionary } from '@/i18n/dictionaries';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { createSection, type FeedAvailability, type FeedSection, type HeroSection, type Section, type SectionType, type StatSource, type StatsSection } from '@/types/content';

export const sectionImages: SectionImages = { upload: file => ImageService.upload(file) };

/** The editor's labels in the dictionary's language. */
export function sectionsEditorStrings(dict: Dictionary): SectionsEditorStrings {
    const s = dict.sections;
    return {
        hide: dict.common.hide,
        show: dict.common.show,
        moveUp: s.moveUp,
        moveDown: s.moveDown,
        duplicate: s.duplicate,
        remove: dict.common.delete,
        addSection: s.add,
        heading: s.heading,
        headingOptional: s.headingOptional,
        subheading: s.subheading,
        text: s.text,
        body: s.body,
        primaryButtonLabel: s.button1Label,
        primaryButtonHref: s.button1Href,
        secondaryButtonLabel: s.button2Label,
        secondaryButtonHref: s.button2Href,
        buttonLabel: s.buttonLabel,
        buttonHref: s.buttonHref,
        bullets: s.bullets,
        addBullet: s.addBullet,
        count: s.count,
        stats: s.numbers,
        source: s.source,
        sourceStatic: s.sourceStatic,
        value: s.value,
        label: s.label,
        addStat: s.addNumber,
        layout: s.layout,
        layoutStandard: s.layoutStandard,
        layoutFull: s.layoutFull,
        layoutLeft: s.layoutLeft,
        layoutRight: s.layoutRight,
        layoutOverlay: s.layoutOverlay,
        layoutOverlayFull: s.layoutOverlayFull,
        altText: s.altText,
        caption: s.caption,
        image: s.image,
        uploadImage: s.uploadImage,
        replaceImage: s.replaceImage,
        uploading: dict.admin.uploading,
        removeImage: dict.common.remove,
        uploadFailed: s.uploadFailed,
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
    const { dict } = useDictionary();
    return (
        <BaseSectionsEditor
            sections={sections}
            onChange={onChange}
            types={types}
            createSection={createSection}
            editors={editors}
            images={sectionImages}
            strings={sectionsEditorStrings(dict)}
            typeLabels={dict.sectionTypes}
        />
    );
}
