import { useTypographyStore, FONT_FAMILY_CLASSES, FONT_SIZE_CLASSES } from '../../store/typographyStore';

interface SceneDisplayProps {
  content: string;
}

export function SceneDisplay({ content }: SceneDisplayProps) {
  const { fontFamily, fontSize, lineHeight } = useTypographyStore();

  // Split content into paragraphs for better rendering
  const paragraphs = content.split('\n\n').filter(Boolean);

  const fontFamilyClass = FONT_FAMILY_CLASSES[fontFamily];
  const fontSizeClass = FONT_SIZE_CLASSES[fontSize];

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={`narrative-text text-text-main ${fontFamilyClass} ${fontSizeClass}`}
          style={{ lineHeight }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
