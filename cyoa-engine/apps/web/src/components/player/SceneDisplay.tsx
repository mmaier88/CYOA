interface SceneDisplayProps {
  content: string;
}

export function SceneDisplay({ content }: SceneDisplayProps) {
  // Split content into paragraphs for better rendering
  const paragraphs = content.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="narrative-text text-text-main leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
