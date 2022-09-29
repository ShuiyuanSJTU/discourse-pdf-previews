import { withPluginApi } from "discourse/lib/plugin-api";
import { iconHTML } from "discourse-common/lib/icon-library";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews-shuiyuan",
  initialize(container) {
    withPluginApi("0.8.41", (api) => {
      const site = container.lookup("service:site");
      if (site.mobileView) {
        return;
      }

      try {
        const previewModeSetting = settings.preview_mode;
        const maxPreviewSize = settings.max_preview_size;
        const newTabIcon = () => {
          const template = document.createElement("template");
          template.innerHTML = iconHTML("external-link-alt", {
            class: "new-tab-pdf-icon",
          });
          return template.content.firstChild;
        };

        const createPreviewElement = () => {
          const iframe = document.createElement("iframe");
          iframe.src = "";
          iframe.type = "application/pdf";
          iframe.height = PREVIEW_HEIGHT;
          iframe.loading = "lazy";
          iframe.classList.add("pdf-preview");

          return iframe;
        };

        const setUpPreviewType = (pdf, renderMode) => {
          if (renderMode === "Inline") {
            const preview = createPreviewElement();
            pdf.classList.add("pdf-attachment");
            pdf.after(preview);

            return preview;
          }

          if (renderMode === "New Tab") {
            pdf.classList.add("new-tab-pdf");
            pdf.prepend(newTabIcon());
          }
        };

        // const humanFileSize = (size) => {
        //   let i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
        //   return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
        // };

        api.decorateCookedElement(
          (post) => {
            const attachments = [...post.querySelectorAll(".attachment")];

            const pdfs = attachments.filter((attachment) =>
              /\.pdf$/i.test(attachment.href)
            );

            pdfs.forEach(async (pdf) => {

              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText;

              // open the pdf in a new tab if either the global setting is
              // "New Tab" or if the pdf description starts with a whitespace
              // otherwise, render the preview in the inline in the post
              const renderMode =
                previewModeSetting === "New Tab" ||
                startsWithWhitespace.test(fileName)
                  ? "New Tab"
                  : "Inline";

              // we don't need the space anymore.
              pdf.innerText = pdf.innerText.trim();

              const responseHeader = await fetch(pdf.href, { method: "HEAD" });
              const contentSize = parseInt(responseHeader.headers.get("Content-Length"),10);

              if (contentSize > maxPreviewSize) { return; }

              // the pdf is set to Content-Disposition: attachment; filename="filename.jpg"
              // on the server. this means we can't just use the href as the
              // src for the pdf preview elements.
              const responseFile = await fetch(pdf.href, { method: "GET" });
              if (!responseFile.ok) {
                return;
              }
              const blobSrc = URL.createObjectURL(await responseFile.blob());

              // hide file size
              const fileSizeNode = pdf.nextSibling;
              if (fileSizeNode) {
                fileSizeNode.remove();
              }
              
              // handle preview type
              const preview = setUpPreviewType(pdf, renderMode);

              if (renderMode === "Inline") {
                preview.src = blobSrc;
              }

              if (renderMode === "New Tab") {
                pdf.addEventListener("click", (event) => {
                  event.preventDefault();
                  window.open(blobSrc);
                });
              }
            });
          },
          {
            id: "pdf-previews-shuiyuan",
            onlyStream: true,
          }
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          "There's an issue in the pdf previews theme component",
          error
        );
      }
    });
  },
};
