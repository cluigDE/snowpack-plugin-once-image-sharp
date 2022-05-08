import "./_snowpack/pkg/lazysizes.js";
import "./_snowpack/pkg/lazysizes/plugins/parent-fit/ls.parent-fit.js";
async function getJSON(url = "") {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    redirect: "follow",
    referrerPolicy: "no-referrer"
  });
  return response.json();
}
(async function() {
  const folder = "/assets/img/";
  const image_sizes = await getJSON("/image_sizes/image_sizes.json");
  if (document.querySelectorAll(".once-image-sharp").length) {
    document.querySelectorAll(".once-image-sharp").forEach((image) => {
      const imageName = image.getAttribute("data-file");
      let srcSet = Object.keys(image_sizes[folder][imageName]).map((file) => {
        const conf = image_sizes[folder][imageName][file];
        return `${folder + file} ${conf.width}w,`;
      }).join(" \n");
      image.setAttribute("data-srcset", srcSet);
      image.classList.add("lazyload");
    });
  }
})();
