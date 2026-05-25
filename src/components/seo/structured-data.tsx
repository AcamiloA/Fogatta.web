type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

type StructuredDataProps = {
  data: StructuredDataValue;
  id?: string;
};

export function StructuredData({ data, id }: StructuredDataProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
