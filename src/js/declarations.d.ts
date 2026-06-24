/// <reference types="vite/client" />

declare module 'plotly.js-basic-dist' {
  export const Plots: {
    resize: (_el: HTMLElement) => void;
  };
  export function react(
    _el: HTMLElement,
    _data: unknown[],
    _layout: unknown,
    _config?: unknown
  ): void;
}

declare module 'html2pdf.js' {
  interface Html2PdfBuilder {
    from: (_element: Element | null) => Html2PdfBuilder;
    set: (_options: unknown) => Html2PdfBuilder;
    save: () => Promise<void>;
    output: (_type: string) => Promise<Blob>;
  }
  function html2pdf(): Html2PdfBuilder;
  export default html2pdf;
}
