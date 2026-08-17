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
  export function purge(_el: HTMLElement): void;
}

declare module 'html2pdf.js' {
  interface Html2PdfWorker {
    from: (_element: Element | HTMLElement | string | null) => Html2PdfWorker;
    set: (_options: unknown) => Html2PdfWorker;
    save: () => Promise<void>;
    output: (_type: string) => Promise<Blob>;
  }
  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
