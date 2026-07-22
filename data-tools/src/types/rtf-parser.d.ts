declare module "rtf-parser" {
  type RtfStyle = {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    [key: string]: unknown;
  };

  type RtfSpan = {
    value: string;
    style: RtfStyle;
  };

  type RtfParagraph = {
    content: RtfSpan[];
    style: RtfStyle;
  };

  type RtfDocument = {
    content: RtfParagraph[];
  };

  type Callback = (error: Error | null, document: RtfDocument) => void;

  const parseRtf: {
    string(value: string, callback: Callback): void;
  };

  export default parseRtf;
}
